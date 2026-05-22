import React, { useContext, useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert, Row, Col } from "react-bootstrap";
import { FirebaseContext } from "../../firebase2";
import { GiWheat } from "react-icons/gi";

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

      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cambiar Ración Estándar</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {success && (
            <Alert variant="success">
              Ración actualizada correctamente
            </Alert>
          )}

          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleUpdate}>
            {!dataLoaded && loading && (
              <div className="text-center my-4">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Obteniendo valores actuales...</p>
              </div>
            )}

            {dataLoaded && (
              <>
                {/* Visualización de valores actuales */}
                <div className="current-values-box mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #dee2e6' }}>
                  <Row className="align-items-center">
                    <Col className="text-center border-right">
                      <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ración Estándar</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#007bff' }}>
                        {originalRacion || '0'} <span style={{ fontSize: '0.9rem', color: '#adb5bd' }}>kg</span>
                      </div>
                    </Col>
                    {tamboSel?.version === 1 && (
                      <Col className="text-center">
                        <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ración Manual</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fd7e14' }}>
                          {originalRacionManual || '0'} <span style={{ fontSize: '0.9rem', color: '#adb5bd' }}>kg</span>
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>

                <Form.Group controlId="racion">
                  <Form.Label>Ración Estándar</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    placeholder="Ingrese el valor de la ración"
                    value={racion}
                    onChange={(e) => setRacion(e.target.value)}
                    required
                  />
                </Form.Group>

                {tamboSel?.version === 1 && (
                  <Form.Group controlId="racionManual" className="mt-3">
                    <Form.Label>Ración manual</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      placeholder="Ingrese el valor de la ración manual"
                      value={racionManual}
                      onChange={(e) => setRacionManual(e.target.value)}
                      required
                    />
                  </Form.Group>
                )}

                <div className="d-flex justify-content-end mt-4">
                  <Button 
                    variant="primary" 
                    type="submit" 
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
                        />
                        {" Actualizando..."}
                      </>
                    ) : (
                      "Actualizar Ración"
                    )}
                  </Button>
                </div>
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showConstruccionModal}
        onHide={() => setShowConstruccionModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Funcion no disponible</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Seccion en construccion proximamente activa.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConstruccionModal(false)}
          >
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PerfilCambiarRacion;
