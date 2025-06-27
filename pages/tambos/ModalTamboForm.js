import React, { useEffect, useContext, useState } from 'react';
import { FirebaseContext } from '../../firebase2';
import useValidacion from '../../hook/useValidacion';
import validarCrearTambo from '../../validacion/validarCrearTambo';
import { Form, Button, Alert, Spinner, Row, Col, Modal } from 'react-bootstrap';
import { format } from 'date-fns';
import styles from '../../styles/Animales.module.scss';

const STATE_INICIAL = {
  idusuario: '',
  nombre: '',
  ubicacion: '',
  bajadas: 1,
  turnos: 1,
  tolvas: 10,
  freclimp: 15,
  link: '',
  host: '',
  ip: '',
  monitor: '',
  raciones: '',
  noreg: '',
  version: '1'
};

const ModalTamboForm = ({ tamboData, show, onHide }) => {
  const { firebase, usuario } = useContext(FirebaseContext);
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState(false);
  const [descExito, setDescExito] = useState('');
  const [error, setError] = useState(false);
  const [descError, setDescError] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);

  const {
    valores, errores, handleSubmit, handleChange, handleBlur, guardarValores
  } = useValidacion(STATE_INICIAL, validarCrearTambo, submitTambo);

  const {
    nombre, ubicacion, bajadas, turnos, tolvas, freclimp, link, host, monitor, raciones, noreg
  } = valores;

  useEffect(() => {
    if (tamboData?.id) {
      setModoEdicion(true);
      guardarValores(tamboData);
    } else {
      guardarValores({
        ...STATE_INICIAL,
        idusuario: usuario?.uid || ''
      });
    }
  }, [tamboData]);

  async function submitTambo() {
    setProcesando(true);
    setError(false);
    setExito(false);

    try {
      if (modoEdicion) {
        const t = { nombre, ubicacion, bajadas, turnos, tolvas, freclimp, link, host, monitor, raciones, noreg };
        await firebase.db.collection('tambo').doc(tamboData.id).update(t);
        setDescExito('Tambo editado con éxito!');
      } else {
        const nuevoTambo = {
          nombre, ubicacion, bajadas, turnos, tolvas, freclimp,
          ultlimp: firebase.fechaTimeStamp(format(Date.now(), 'yyyy-MM-dd')),
          usuarios: [usuario.uid], link, host, monitor, raciones, noreg
        };
        await firebase.db.collection('tambo').add(nuevoTambo);
        setDescExito('Tambo creado con éxito!');
      }
      setExito(true);
      setTimeout(() => onHide(), 1000);
    } catch (e) {
      setDescError(e.message);
      setError(true);
    }

    setProcesando(false);
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className={styles.modalAnimal}>
      <Modal.Header closeButton>
        <Modal.Title>{modoEdicion ? 'Editar Tambo' : 'Nuevo Tambo'}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {procesando && <Spinner animation="border" variant="info" className="mb-3" />}
        {exito && <Alert variant="success">{descExito}</Alert>}
        {error && <Alert variant="danger">{descError}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col><Form.Group><Form.Label>Nombre</Form.Label>
              <Form.Control type="text" name="nombre" value={nombre} onChange={handleChange} required />
            </Form.Group></Col>
            <Col><Form.Group><Form.Label>Ubicación</Form.Label>
              <Form.Control type="text" name="ubicacion" value={ubicacion} onChange={handleChange} />
            </Form.Group></Col>
            <Col><Form.Group><Form.Label>Turnos diarios</Form.Label>
              <Form.Control type="number" name="turnos" min={1} max={4} value={turnos} onChange={handleChange} required />
            </Form.Group></Col>
          </Row>

          <Row>
            <Col><Form.Group><Form.Label>Bajadas</Form.Label>
              <Form.Control type="number" name="bajadas" min={1} max={100} value={bajadas} onChange={handleChange} />
            </Form.Group></Col>
            <Col><Form.Group><Form.Label>Tolvas (kg)</Form.Label>
              <Form.Control type="number" name="tolvas" min={10} max={200} value={tolvas} onChange={handleChange} />
            </Form.Group></Col>
            <Col><Form.Group><Form.Label>Limpieza tolvas (días)</Form.Label>
              <Form.Control type="number" name="freclimp" min={5} max={30} value={freclimp} onChange={handleChange} />
            </Form.Group></Col>
          </Row>

          <Row>
            <Col><Form.Group><Form.Label>Link</Form.Label>
              <Form.Control type="text" name="link" value={link} onChange={handleChange} />
            </Form.Group></Col>
            <Col><Form.Group><Form.Label>Host</Form.Label>
              <Form.Control type="text" name="host" value={host} onChange={handleChange} />
            </Form.Group></Col>
          </Row>

          <div className="d-flex justify-content-end mt-4">
            <Button variant="secondary" onClick={onHide} className="me-2">Cancelar</Button>
            <Button variant="success" type="submit">Guardar</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ModalTamboForm;
