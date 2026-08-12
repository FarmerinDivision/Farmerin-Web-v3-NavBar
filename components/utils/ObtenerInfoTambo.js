import React, { useState } from 'react';
import { Modal, Spinner, Alert, Table } from 'react-bootstrap';
import { RiAddBoxLine } from 'react-icons/ri';
import { format } from 'date-fns';
import { GiInfo } from 'react-icons/gi';
import DetalleHorario from '../layout/detalleHorario';
import styles from '../../styles/Control.module.scss';

const InformacionTambo = ({ tambo = {}, fetch }) => {
  const { id, nombre, ubicacion, turnos, bajadas, tolvas, link } = tambo || {};

  const [fecha, setFecha] = useState(format(Date.now(), 'yyyy-MM-dd'));
  const [horarios, setHorarios] = useState(null);
  const [estadoApi, setEstadoApi] = useState('');
  const [showData, setShowData] = useState(false);
  const [showTambo, setShowTambo] = useState(true);

  const handleShowData = () => setShowData(true);
  const handleClose = () => setShowData(false);

  const handleChange = e => setFecha(e.target.value);

  const buscarHorarios = async () => {
    setEstadoApi('buscando');
    const url = `${link}/horarios/${fecha}`;
    const login = 'farmerin';
    const password = 'Farmerin*2021';

    try {
      const api = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${login}:${password}`),
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
      const hs = await api.json();
      setHorarios(hs);
      setEstadoApi('resultados');
    } catch (error) {
      setEstadoApi('error');
    }
  };

  return (
    <>
      {showTambo && tambo ? (
        <div className="card-fondoBotones">
          <div className="button-containerInfoTambo">
            <button className="custom-obtenerInfoTambo-button" style={{ "--clr": "#00ad54" }} onClick={handleShowData}>
              <span className="custom-obtenerInfoTambo-button-decor"></span>
              <div className="custom-obtenerInfoTambo-button-content">
                <div className="custom-obtenerInfoTambo-button__icon">
                  <GiInfo size={24} style={{ color: '#fff' }} />
                </div>
                <span className="custom-obtenerInfoTambo-button__text">Obtener Información del Tambo</span>
              </div>
            </button>
          </div>
          {/* Contenedor del formulario */}
          <Modal show={showData} onHide={handleClose} size="lg" centered>
            <Modal.Header
              closeButton
              className="border-0 pb-0"
            >
              <Modal.Title>

                <strong>Información del Tambo {nombre}</strong>

              </Modal.Title>
            </Modal.Header>
            <Modal.Body>

              <div className={styles.tamboDashboard}>

                {/* Encabezado */}

                <div className={styles.tamboHeader}>

                  <div>
                    <h3>{nombre}</h3>
                    <span className="ubicacion">
                      📍 {ubicacion}
                    </span>
                  </div>

                </div>


                {/* Cards */}

                <div className={styles.row}>

                  <div className={styles.infoCard}>
                    <small>Turnos</small>
                    <h1>{turnos}</h1>
                  </div>

                  <div className={styles.infoCard}>
                    <small>Bajadas</small>
                    <h1>{bajadas}</h1>
                  </div>

                  <div className={styles.infoCard}>
                    <small>Kg. Tolvas</small>
                    <h1>{tolvas}</h1>
                  </div>

                </div>


                <div className={styles.buscarCard}>

                  <h5>Consultar horarios</h5>

                  <div className={styles.buscarRow}>

                    <div className={styles.buscarFechaGroup}>
                      <label>Fecha</label>
                      <input
                        type="date"
                        value={fecha}
                        onChange={handleChange}
                      />
                    </div>

                    <button
                      className={styles.btnConsultar}
                      onClick={buscarHorarios}
                    >
                      🔍 Ver horarios
                    </button>

                  </div>

                </div>


                {/* Resultados */}

                <div className={styles.mt4}>

                  {estadoApi === 'buscando' && (
                    <div className={styles.textCenter}>
                      <Spinner animation="border" />
                    </div>
                  )}

                  {estadoApi === 'error' && (
                    <Alert variant={styles.alertDanger}>
                      No se puede acceder al tambo.
                    </Alert>
                  )}

                  {estadoApi === 'resultados' && horarios && (
                    <div className={styles.tablaCard}>

                      <h5 className={styles.mb3}>
                        Horarios
                      </h5>

                      <Table hover responsive className={styles.table}>

                        <thead>

                          <tr className={styles.tr}>
                            <th>Turno</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                          </tr>

                        </thead>

                        <tbody className={styles.tbody} style={{ background: 'white' }} >

                          {horarios.map(h => (
                            <DetalleHorario
                              key={h.id}
                              horario={h}
                            />
                          ))}

                        </tbody>

                      </Table>

                    </div>
                  )}

                </div>

              </div>

            </Modal.Body>
          </Modal>
        </div>
      ) : (
        <Alert variant="warning">Información del tambo no disponible</Alert>
      )}
    </>
  );
};

export default InformacionTambo;
