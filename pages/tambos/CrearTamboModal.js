import React, { useState, useContext } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FirebaseContext } from '../../firebase2';
import useValidacion from '../../hook/useValidacion';
import validarCrearTambo from '../../validacion/validarCrearTambo';
import { format } from 'date-fns';

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
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Crear nuevo Tambo</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {procesando ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p>Guardando tambo...</p>
          </div>
        ) : (
          <>
            {exito && <Alert variant="success">{descExito}</Alert>}
            {error && (
              <Alert variant="danger">
                <Alert.Heading>Oops! Error</Alert.Heading>
                <p>{descError}</p>
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col>
                  <Form.Group>
                    <Form.Label>Nombre</Form.Label>
                    <Form.Control
                      type="text"
                      name="nombre"
                      value={nombre}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errores.nombre && <div className="text-danger">{errores.nombre}</div>}
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Ubicación</Form.Label>
                    <Form.Control
                      type="text"
                      name="ubicacion"
                      value={ubicacion}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Turnos diarios</Form.Label>
                    <Form.Control
                      type="number"
                      name="turnos"
                      value={turnos}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mt-3">
                <Col>
                  <Form.Group>
                    <Form.Label>Bajadas</Form.Label>
                    <Form.Control
                      type="number"
                      name="bajadas"
                      value={bajadas}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Tolvas</Form.Label>
                    <Form.Control
                      type="number"
                      name="tolvas"
                      value={tolvas}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Limpieza tolvas (días)</Form.Label>
                    <Form.Control
                      type="number"
                      name="freclimp"
                      value={freclimp}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mt-3">
                <Col>
                  <Form.Group>
                    <Form.Label>Link</Form.Label>
                    <Form.Control
                      type="text"
                      name="link"
                      value={link}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Host</Form.Label>
                    <Form.Control
                      type="text"
                      name="host"
                      value={host}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </Form.Group>
                </Col>
                <Col></Col>
              </Row>

              <div className="text-end mt-4">
                <Button type="submit" variant="success">
                  Guardar
                </Button>
              </div>
            </Form>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default CrearTamboModal;
