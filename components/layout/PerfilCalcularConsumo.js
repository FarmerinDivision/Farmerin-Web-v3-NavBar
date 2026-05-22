import React, { useContext, useState } from "react";
import { Modal, Button, Form, Row, Col, Card, Spinner, Alert } from "react-bootstrap";
import { FirebaseContext } from "../../firebase2";
import { GiHistogram, GiWheat, GiWrench, GiCog } from "react-icons/gi";

const PerfilCalcularConsumo = () => {
  const { tamboSel } = useContext(FirebaseContext);
  const [showModal, setShowModal] = useState(false);
  const [showConstruccionModal, setShowConstruccionModal] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultados, setResultados] = useState([]);
  const allowedTamboId = "jGWqeJjPAW3yJtAZpKJr";

  const baseFunctionUrl = "https://us-central1-farmerin-navarro.cloudfunctions.net/getConsumos";

  const handleCalcular = async (e) => {
    e.preventDefault();
    if (!tamboSel || !fechaInicio || !fechaFin) return;

    setLoading(true);
    setError(null);
    setResultados([]);

    try {
      const response = await fetch(
        `${baseFunctionUrl}?idtambo=${tamboSel.id}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
      );

      if (!response.ok) {
        throw new Error("Error al obtener los consumos");
      }

      const data = await response.json();
      setResultados(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setResultados([]);
    setFechaInicio("");
    setFechaFin("");
    setError(null);
  };

  const handleOpen = () => {
    if (!tamboSel) return;
    if (tamboSel.id === allowedTamboId) {
      setShowModal(true);
      return;
    }
    setShowConstruccionModal(true);
  };

  const getCardConfig = (tipo) => {
    switch (tipo.toLowerCase()) {
      case 'estandar':
        return {
          color: '#007bff',
          icon: <GiWheat size={40} />,
          label: 'Ración Estándar',
          bg: 'rgba(0, 123, 255, 0.1)',
          description: 'Ración que se despacha cuando la mangada es incompleta.'
        };
      case 'manual':
        return {
          color: '#fd7e14',
          icon: <GiWrench size={40} />,
          label: 'Ración Manual',
          bg: 'rgba(253, 126, 20, 0.1)',
          description: 'Ración de los pulsados manuales tradicionales.'
        };
      case 'normal':
        return {
          color: '#28a745',
          icon: <GiCog size={40} />,
          label: 'Ración Normal',
          bg: 'rgba(40, 167, 69, 0.1)',
          description: 'Ración despachada de acuerdo a los parámetros del tambo.'
        };
      default:
        return {
          color: '#6c757d',
          icon: <GiHistogram size={40} />,
          label: `Ración ${tipo}`,
          bg: 'rgba(108, 117, 125, 0.1)',
          description: `Consumo total para la ración de tipo ${tipo}.`
        };
    }
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
                <GiHistogram size={24} style={{ color: "#fff" }} />
              </div>

              <span className="custom-obtenerInfoTambo-button__text">
                Calcular Consumos
              </span>
            </div>
          </button>
        </div>
      </div>

      <Modal
        show={showModal}
        onHide={handleClose}
        centered
        dialogClassName="custom-modal-consumos"
        contentClassName="custom-modal-content"
      >
        <Modal.Header closeButton className="custom-modal-header">
          <Modal.Title style={{ fontWeight: '700', color: '#2d3748' }}>
            📊 Cálculo de Consumos de Ración
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="custom-modal-body">
          <Form onSubmit={handleCalcular} className="mb-4">
            <Row>
              <Col md={6} className="mb-3">
                <Form.Group controlId="fechaInicio">
                  <Form.Label><strong>Fecha Inicio</strong></Form.Label>
                  <Form.Control
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    required
                    style={{ borderRadius: '10px' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="fechaFin">
                  <Form.Label><strong>Fecha Fin</strong></Form.Label>
                  <Form.Control
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    required
                    style={{ borderRadius: '10px' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="mt-2 text-center">
              <Button
                variant="primary"
                type="submit"
                disabled={loading || !fechaInicio || !fechaFin}
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '12px 25px',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}
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
                    {" Procesando..."}
                  </>
                ) : (
                  "Obtener Consumos"
                )}
              </Button>
            </div>
          </Form>

          {error && (
            <Alert variant="danger" className="mt-3" style={{ borderRadius: '10px' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          {resultados && resultados.length > 0 ? (
            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-4 pb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h5 style={{ color: '#495057', fontWeight: '700', margin: 0 }}>
                  Resumen de Consumo por Tipo
                </h5>
                <div className="text-end">
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#64748b', 
                    fontWeight: '700', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '2px'
                  }}>
                    Total Despachado
                  </div>
                  <div style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: '800', 
                    color: '#007bff',
                    lineHeight: '1'
                  }}>
                    {resultados.reduce((sum, item) => sum + item.kg, 0).toLocaleString()}
                    <span style={{ fontSize: '1rem', marginLeft: '4px', color: '#94a3b8', fontWeight: '600' }}>kg</span>
                  </div>
                </div>
              </div>
              <div className="cards-horizontal-row">
                {resultados.map((item, index) => {
                  const config = getCardConfig(item.tipo);
                  return (
                    <div key={index} className="consumption-card-item">
                      <Card className="consumption-card">
                        {/* Overlay visible on hover */}
                        <div className="card-description-overlay">
                          <span className="card-description-text">
                            {config.description}
                          </span>
                        </div>

                        <Card.Body style={{ padding: '1.75rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <div
                            style={{
                              backgroundColor: config.bg,
                              color: config.color,
                              padding: '15px',
                              borderRadius: '50%',
                              marginBottom: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 4px 12px ${config.bg}`
                            }}
                          >
                            {config.icon}
                          </div>
                          
                          <div style={{ 
                            fontWeight: '600', 
                            color: '#64748b', 
                            fontSize: '0.85rem', 
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {config.label}
                          </div>

                          <div className="mt-1">
                            <h3 style={{
                              margin: 0,
                              fontWeight: '800',
                              color: '#1e293b',
                              fontSize: '2.25rem',
                              lineHeight: '1'
                            }}>
                              {item.kg.toLocaleString()}
                              <span style={{ 
                                fontSize: '1.1rem', 
                                marginLeft: '5px', 
                                color: '#94a3b8',
                                fontWeight: '600'
                              }}>kg</span>
                            </h3>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            !loading && !error && (
              <div className="text-center mt-5 mb-4">
                <div style={{ fontSize: '3rem', opacity: 0.2 }}>📉</div>
                <p className="text-muted mt-3">
                  No hay datos para mostrar. Seleccione un rango de fechas para calcular los consumos.
                </p>
              </div>
            )
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: 'none', padding: '1.5rem' }}>
          <Button
            variant="outline-secondary"
            onClick={handleClose}
            style={{ borderRadius: '10px', padding: '8px 20px' }}
          >
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

export default PerfilCalcularConsumo;
