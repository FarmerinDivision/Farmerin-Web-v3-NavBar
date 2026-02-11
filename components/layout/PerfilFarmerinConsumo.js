import React, { useContext, useState } from "react";
import { Modal } from "react-bootstrap";
import { FirebaseContext } from "../../firebase2";
import { GiInfo } from "react-icons/gi";

const PerfilFarmerinConsumo = () => {
  const { tamboSel } = useContext(FirebaseContext);
  const [showModal, setShowModal] = useState(false);

  // 🔐 URL de tu Cloud Function
  const baseFunctionUrl =
    "https://us-central1-farmerin-navarro.cloudfunctions.net/proxyMonitor";

  // 🔹 URL protegida
  const urlProtegida =
    tamboSel
      ? `${baseFunctionUrl}/verConsumo?tamboId=${tamboSel.id}`
      : null;

  return (
    <>
      {/* 🔹 BOTÓN */}
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
                Consumo
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 🔹 MODAL SOLO IFRAME */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="xl"
        centered
      >
        <Modal.Body style={{ padding: 0, height: "80vh" }}>
          {urlProtegida && (
            <iframe
              src={urlProtegida}
              title="Consumo"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default PerfilFarmerinConsumo;
