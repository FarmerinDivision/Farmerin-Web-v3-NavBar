import React, { useContext, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { FirebaseContext } from "../../firebase2";
import { GiInfo } from 'react-icons/gi';

const PerfilFarmerinConsumo = () => {
  const { tamboSel } = useContext(FirebaseContext);

  const [showModal, setShowModal] = useState(false);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // 🔐 URL protegida
  const urlFinal =
    tamboSel && desde && hasta
      ? `https://us-central1-farmerin-navarro.cloudfunctions.net/proxyMonitor/verConsumo?tamboId=${tamboSel.id}&desde=${desde}&hasta=${hasta}`
      : null;

  return (
    <>
      {/* BOTÓN */}
      <div className="card-fondoBotones">
        <div className="button-containerInfoTambo">
          <button
            className="custom-obtenerInfoTambo-button"
            style={{ "--clr": "#007bff" }}
            onClick={() => setShowModal(true)}
            disabled={!tamboSel}
          >
            <span className="custom-obtenerInfoTambo-button-decor"></span>

            <div className="custom-obtenerInfoTambo-button-content">
              <div className="custom-obtenerInfoTambo-button__icon">
                <GiInfo size={24} style={{ color: "#fff" }} />
              </div>

              <span className="custom-obtenerInfoTambo-button__text">
                Consumo de Ración
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* MODAL */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Consumo de ración</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Desde</Form.Label>
                  <Form.Control
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Hasta</Form.Label>
                  <Form.Control
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>

          {urlFinal ? (
            <div style={{ height: 600 }}>
              <iframe
                src={urlFinal}
                title="Consumo"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: 8,
                }}
              />
            </div>
          ) : (
            <p style={{ opacity: 0.6 }}>
              Seleccioná un rango de fechas para visualizar el consumo.
            </p>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PerfilFarmerinConsumo;
