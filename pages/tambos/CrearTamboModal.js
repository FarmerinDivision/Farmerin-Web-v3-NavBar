import React, { useState, useContext } from 'react';
import { Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { FirebaseContext } from '../../firebase2';
import useValidacion from '../../hook/useValidacion';
import validarCrearTambo from '../../validacion/validarCrearTambo';
import { format } from 'date-fns';
import modalStyles from '../../styles/modalTamboForm.module.scss';

const STATE_INICIAL = {
  nombre: '',
  ubicacion: '',
  bajadas: 1,
  turnos: 1,
  tolvas: 10,
  freclimp: 15,
  link: '',
  host: '',
  monitor: '',
  raciones: '',
  noreg: '',
  version: '1',
  finMañana:'',
  finTarde:'',
  porcentaje:'0'
};

const CrearTamboModal = ({ show, onHide, onSuccess }) => {
  const { usuario, firebase } = useContext(FirebaseContext);
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState(false);
  const [descError, setDescError] = useState('');
  const [descExito, setDescExito] = useState('');

  const { valores, errores, handleSubmit, handleChange, handleBlur } = useValidacion(
    STATE_INICIAL,
    validarCrearTambo,
    crearTambo
  );

  const {
    nombre,
    ubicacion,
    bajadas,
    turnos,
    tolvas,
    freclimp,
    link,
    host,
    monitor,
    raciones,
    noreg
  } = valores;

  async function crearTambo() {
    setProcesando(true);
    setError(false);

    const nuevoTambo = {
      nombre,
      ubicacion,
      bajadas,
      turnos,
      tolvas,
      freclimp,
      ultlimp: firebase.fechaTimeStamp(format(Date.now(), 'yyyy-MM-dd')),
      usuarios: [usuario.uid],
      link,
      host,
      monitor,
      raciones,
      noreg,
    };

    try {
      await firebase.db.collection('tambo').add(nuevoTambo);
      setExito(true);
      setDescExito('Tambo creado con éxito!');
      onSuccess?.(); // Para refrescar el listado
      onHide(); // Cierra el modal
    } catch (error) {
      setDescError(error.message);
      setError(true);
    }

    setProcesando(false);
  }

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      dialogClassName={modalStyles.premiumModalTambo}
      backdropClassName={modalStyles.premiumBackdropTambo}
    >
      <div className={modalStyles.header}>
        <h2 className={modalStyles.title}>Crear nuevo Tambo</h2>
        <button type="button" className={modalStyles.closeButton} onClick={onHide} aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className={modalStyles.body}>
        {procesando ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted fw-semibold">Guardando tambo...</p>
          </div>
        ) : (
          <>
            {exito && <Alert variant="success" className="mb-4">{descExito}</Alert>}
            {error && (
              <Alert variant="danger" className="mb-4">
                <Alert.Heading>Oops! Error</Alert.Heading>
                <p>{descError}</p>
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <div className={modalStyles.gridRowTwoCols}>
                <div className={modalStyles.sectionBlock} style={{ marginBottom: 0 }}>
                  <h3 className={modalStyles.sectionTitle}>Información General</h3>
                  <div className={modalStyles.gridRowOneCol}>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Nombre</Form.Label>
                      <Form.Control
                        type="text"
                        name="nombre"
                        value={nombre}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {errores.nombre && <div className="text-danger mt-1" style={{fontSize: '12px'}}>{errores.nombre}</div>}
                    </div>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Ubicación</Form.Label>
                      <Form.Control
                        type="text"
                        name="ubicacion"
                        value={ubicacion}
                        onChange={handleChange}
                      />
                    </div>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Turnos diarios</Form.Label>
                      <Form.Control
                        type="number"
                        name="turnos"
                        value={turnos}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className={modalStyles.sectionBlock} style={{ marginBottom: 0 }}>
                  <h3 className={modalStyles.sectionTitle}>Configuración Operativa</h3>
                  <div className={modalStyles.gridRowTwoCols}>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Bajadas</Form.Label>
                      <Form.Control
                        type="number"
                        name="bajadas"
                        value={bajadas}
                        onChange={handleChange}
                      />
                    </div>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Tolvas (kg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="tolvas"
                        value={tolvas}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className={modalStyles.gridRowOneCol}>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Limpieza tolvas (días)</Form.Label>
                      <Form.Control
                        type="number"
                        name="freclimp"
                        value={freclimp}
                        onChange={handleChange}
                      />
                    </div>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Link</Form.Label>
                      <Form.Control
                        type="text"
                        name="link"
                        value={link}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    <div className={modalStyles.formGroup}>
                      <Form.Label>Host</Form.Label>
                      <Form.Control
                        type="text"
                        name="host"
                        value={host}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={modalStyles.footer}>
                <button type="button" className={modalStyles.btnSecondary} onClick={onHide} disabled={procesando}>
                  Cancelar
                </button>
                <button type="submit" className={modalStyles.btnPrimary} disabled={procesando}>
                  Crear
                </button>
              </div>
            </Form>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CrearTamboModal;
