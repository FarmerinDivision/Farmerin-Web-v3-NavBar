import React, { useContext, useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert, Row, Col } from "react-bootstrap";
import { FirebaseContext } from "../../firebase2";
import { GiWheat } from "react-icons/gi";
import modalStyles from '../../styles/modalTamboForm.module.scss';

const PerfilCambiarRacion = () => {
  const { tamboSel } = useContext(FirebaseContext);
  const [showModal, setShowModal] = useState(false);
  const [showConstruccionModal, setShowConstruccionModal] = useState(false);
  const [racion, setRacion] = useState("");
  const [racionManual, setRacionManual] = useState("");
  const [originalRacion, setOriginalRacion] = useState("");
  const [originalRacionManual, setOriginalRacionManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const allowedTamboId = "jGWqeJjPAW3yJtAZpKJr";

  const baseFunctionUrl = "https://us-central1-farmerin-navarro.cloudfunctions.net/setRacion";

  useEffect(() => {
    if (showModal && tamboSel) {
      const fetchRacion = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`${baseFunctionUrl}?idtambo=${tamboSel.id}`);
          if (!response.ok) {
            throw new Error("Error al obtener los datos de ración desde el servidor");
          }
          const data = await response.json();
          
          const valEst = data.racion_estandar || "";
          const valMan = data.racion_manual || "";
          
          setRacion(valEst);
          setRacionManual(valMan);
          setOriginalRacion(valEst);
          setOriginalRacionManual(valMan);
          setDataLoaded(true);
        } catch (err) {
          console.error("Error al obtener ración:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchRacion();
    }
  }, [showModal, tamboSel]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!tamboSel || !racion) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Función auxiliar para actualizar un parámetro individual
      const updateParam = async (nombre, valor) => {
        const response = await fetch(baseFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idtambo: tamboSel.id,
            valor: parseFloat(valor),
            nombre: nombre,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error al actualizar ${nombre}`);
        }
        return await response.json();
      };

      // Actualizamos ración estándar si cambió
      if (racion !== originalRacion) {
        await updateParam("racion_estandar", racion);
      }

      // Actualizamos ración manual si cambió y es versión 1
      if (tamboSel.version === 1 && racionManual !== originalRacionManual) {
        await updateParam("racion_manual", racionManual);
      }

      setSuccess(true);
      // Opcional: Cerrar modal después de unos segundos
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setRacion("");
    setRacionManual("");
    setOriginalRacion("");
    setOriginalRacionManual("");
    setDataLoaded(false);
    setError(null);
    setSuccess(false);
  };

  const handleOpen = () => {
    if (!tamboSel) return;
    if (tamboSel.id === allowedTamboId) {
      setShowModal(true);
      return;
    }
    setShowConstruccionModal(true);
  };

  return (
    <>
      <div className="card-fondoBotones">
        <div className="button-containerInfoTambo">
          <button
            className="custom-obtenerInfoTambo-button"
            style={{ "--clr": "#007bff" }}
            onClick={handleOpen}
            disabled={!tamboSel}
          >
            <span className="custom-obtenerInfoTambo-button-decor"></span>

            <div className="custom-obtenerInfoTambo-button-content">
              <div className="custom-obtenerInfoTambo-button__icon">
                <GiWheat size={24} style={{ color: "#fff" }} />
              </div>

              <span className="custom-obtenerInfoTambo-button__text">
                Cambiar Ración
              </span>
            </div>
          </button>
        </div>
      </div>

      <Modal 
        show={showModal} 
        onHide={handleClose} 
        centered
        dialogClassName={modalStyles.premiumModalTambo}
        backdropClassName={modalStyles.premiumBackdropTambo}
      >
        <div className={modalStyles.header}>
          <div>
            <h2 className={modalStyles.title}>Configuración de Ración</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Ajuste los valores de ración para el tambo.
            </p>
          </div>
          <button type="button" className={modalStyles.closeButton} onClick={handleClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={modalStyles.body}>
          {success && (
            <Alert variant="success" className="mb-4 border-0" style={{ borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#166534' }}>
              Ración actualizada correctamente.
            </Alert>
          )}

          {error && (
            <Alert variant="danger" className="mb-4 border-0" style={{ borderRadius: '12px', backgroundColor: '#fef2f2', color: '#991b1b' }}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleUpdate}>
            {!dataLoaded && loading && (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3" style={{ color: '#64748b', fontWeight: '500' }}>Obteniendo valores actuales...</p>
              </div>
            )}

            {dataLoaded && (
              <>
                <div className={modalStyles.sectionBlock}>
                  <h3 className={modalStyles.sectionTitle}>Valores Actuales</h3>
                  <div className={modalStyles.gridRowTwoCols} style={{ marginBottom: 0 }}>
                    <div className={modalStyles.infoCard}>
                      <p className={modalStyles.infoCardLabel}>Ración Estándar</p>
                      <h3 className={modalStyles.infoCardValue} style={{ color: '#0f172a' }}>
                        {originalRacion || '0'} <span style={{ fontSize: '14px', color: '#94a3b8' }}>kg</span>
                      </h3>
                    </div>
                    {tamboSel?.version === 1 && (
                      <div className={modalStyles.infoCard}>
                        <p className={modalStyles.infoCardLabel}>Ración Manual</p>
                        <h3 className={modalStyles.infoCardValue} style={{ color: '#0f172a' }}>
                          {originalRacionManual || '0'} <span style={{ fontSize: '14px', color: '#94a3b8' }}>kg</span>
                        </h3>
                      </div>
                    )}
                  </div>
                </div>

                <div className={modalStyles.sectionBlock} style={{ marginBottom: 0 }}>
                  <h3 className={modalStyles.sectionTitle}>Nuevos Valores</h3>
                  <div className={modalStyles.gridRowTwoCols} style={{ marginBottom: 0 }}>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Ración Estándar (kg)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={racion}
                        onChange={(e) => setRacion(e.target.value)}
                        required
                      />
                    </div>
                    {tamboSel?.version === 1 && (
                      <div className={modalStyles.formGroup}>
                        <Form.Label>Ración Manual (kg)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={racionManual}
                          onChange={(e) => setRacionManual(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className={modalStyles.footer} style={{ marginTop: '24px', padding: '0', borderTop: 'none', backgroundColor: 'transparent' }}>
              <button 
                type="button" 
                className={modalStyles.btnSecondary} 
                onClick={handleClose}
                disabled={loading || success}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className={modalStyles.btnPrimary} 
                disabled={loading || !racion || (tamboSel?.version === 1 && !racionManual) || success}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Guardando...
                  </>
                ) : (
                  "Actualizar Ración"
                )}
              </button>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        show={showConstruccionModal}
        onHide={() => setShowConstruccionModal(false)}
        centered
        dialogClassName={modalStyles.premiumModalTambo}
        backdropClassName={modalStyles.premiumBackdropTambo}
      >
        <div className={modalStyles.header}>
          <div>
            <h2 className={modalStyles.title}>Función no disponible</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Aviso del sistema
            </p>
          </div>
          <button type="button" className={modalStyles.closeButton} onClick={() => setShowConstruccionModal(false)} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className={modalStyles.body}>
          <div className={modalStyles.sectionBlock} style={{ marginBottom: 0, textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ color: '#475569', fontSize: '16px', margin: 0 }}>
              Sección en construcción. Próximamente activa.
            </p>
          </div>
          <div className={modalStyles.footer} style={{ marginTop: '24px', padding: '0', borderTop: 'none', backgroundColor: 'transparent' }}>
            <button
              type="button"
              className={modalStyles.btnPrimary}
              onClick={() => setShowConstruccionModal(false)}
              style={{ width: '100%' }}
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PerfilCambiarRacion;
