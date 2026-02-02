import React, { useContext, useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { FirebaseContext } from "../../firebase2";
import styles from "../../styles/PerfilFarmerin.module.scss"; // 👈 mismo SCSS
import { GiInfo } from 'react-icons/gi';

const PerfilFarmerinConsumo = () => {
  const { firebase, tamboSel } = useContext(FirebaseContext);

  const [showModal, setShowModal] = useState(false);
  const [linkBase, setLinkBase] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  /* 🔹 Trae el link desde el tambo */
  useEffect(() => {
    const obtenerLink = async () => {
      if (!tamboSel) return;

      const doc = await firebase.db
        .collection("tambo")
        .doc(tamboSel.id)
        .get();

      if (doc.exists && doc.data().consumo) {
        setLinkBase(doc.data().consumo);
      }
    };

    obtenerLink();
  }, [tamboSel]);

  /* 🔹 Construye la URL FINAL */
  const urlFinal =
    desde && hasta ? `http://${linkBase}/${desde}/${hasta}` : null;

  return (
    <>
      {/* 🔹 BOTÓN (misma estética que "Obtener info del tambo") */}
      <div className="card-fondoBotones">
        <div className="button-containerInfoTambo">
          <button
            className="custom-obtenerInfoTambo-button"
            style={{ "--clr": "#007bff" }} // azul (podés usar el mismo verde si querés)
            onClick={() => setShowModal(true)}
            disabled={!linkBase}
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

      {/* 🔹 MODAL */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Consumo de ración manual</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* 🔹 FILTRO FECHA */}
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

          {/* 🔹 IFRAME */}
          {urlFinal && (
            <div style={{ height: 600 }}>
              <iframe
                src={urlFinal}
                title="Consumo de ración"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: 8,
                }}
              />
            </div>
          )}

          {!urlFinal && (
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
