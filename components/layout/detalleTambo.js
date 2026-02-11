import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FirebaseContext } from '../../firebase2';
import { ContenedorSpinner } from '../ui/Elementos';
import MapContainer from './MapContainer';
import DetalleHorario from './detalleHorario';
import ModalTamboForm from '../../pages/tambos/ModalTamboForm'; // Nuevo
import { useAdmin } from '../utils/AdminContext';

import { format } from 'date-fns';
import {
  Card,
  Button,
  Modal,
  Row,
  Col,
  Form,
  Spinner,
  Table,
  Alert
} from 'react-bootstrap';

import {
  RiEdit2Line,
  RiAddBoxLine,
  RiDeleteBin2Line
} from 'react-icons/ri';

import styles from '../../styles/Tambos.module.scss';

const DetalleTambos = ({ tambo }) => {
  const fetch = require('node-fetch');

  const { id, nombre, ubicacion, bajadas, turnos, tolvas, link } = tambo;
  const { usuario, firebase, guardarTamboSel, tamboSel } = useContext(FirebaseContext);
  const router = useRouter();
  const { activateAdminMode, deactivateAdminMode } = useAdmin();

  const [error, guardarError] = useState(false);
  const [descError, guardarDescError] = useState('');
  const [animales, guardarAnimales] = useState([]);
  const [fecha, guardarFecha] = useState(null);
  const [horarios, guardarHorarios] = useState(null);
  const [estadoApi, guardarEstadoApi] = useState(null);
  const [show, setShow] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showEditar, setShowEditar] = useState(false); // Nuevo
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    let f = format(Date.now(), 'yyyy-MM-dd');
    guardarFecha(f);
    guardarEstadoApi('');
  }, []);

  const selecTambo = async () => {
    setCargando(true);
    try {
      await guardarTamboSel(tambo);

      // Verificación de Admin
      if (tambo.admin === true) {
        activateAdminMode();
      } else {
        deactivateAdminMode();
      }

      setTimeout(() => {
        router.push('/animales');
      }, 1000);
    } catch (error) {
      console.error('Error al ingresar al tambo:', error);
    }
  };

  const handleChange = e => guardarFecha(e.target.value);
  const handleClose = () => { setShow(false); guardarError(false); };
  const handleShow = () => { setShow(true); guardarError(false); };
  const handleShowData = () => setShowData(true);
  const handleCloseData = () => setShowData(false);

  async function buscarHorarios() {
    guardarEstadoApi('buscando');
    const url = `${link}/horarios/${fecha}`;
    const login = 'farmerin';
    const password = 'Farmerin*2021';

    try {
      const api = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${login}:${password}`),
          'Content-Type': 'application/json'
        }
      });
      const hs = await api.json();
      guardarHorarios(hs);
      guardarEstadoApi('resultados');
    } catch (error) {
      guardarEstadoApi('error');
      console.log(error);
    }
  }

  async function eliminarTambo() {
    try {
      await firebase.db
        .collection('animal')
        .where('idtambo', '==', id)
        .get()
        .then(snapshotAnimal);

      if (animales.length === 0) {
        await firebase.db.collection('tambo').doc(id).delete();
      } else {
        guardarDescError("No se puede eliminar el tambo, tiene animales asociados");
        guardarError(true);
      }
    } catch (error) {
      guardarDescError(error.message);
      guardarError(true);
    }
  }

  function snapshotAnimal(snapshot) {
    const animales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    guardarAnimales(animales);
  }

  return (
    <>
      <Card className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.nombreUbicacion}>
            <div className={styles.nombre}> {nombre}</div>
            <div className={styles.ubicacion}> {ubicacion}</div>
          </div>

          <div className={styles.botonCentro}>
            <Button className={styles.botonIngresar} onClick={selecTambo} disabled={cargando}>
              Ingresar al tambo
            </Button>
          </div>

          <div className={styles.acciones}>
            <div className={styles.tooltipWrapper}>
              <Button className={styles.btnIconoInfo} onClick={handleShowData}>
                <RiAddBoxLine size={20} />
              </Button>
              <span className={styles.tooltipText}>Ver información</span>
            </div>

            <div className={styles.tooltipWrapper}>
              <Button className={styles.btnIconoEditar} onClick={() => setShowEditar(true)}>
                <RiEdit2Line size={20} />
              </Button>
              <span className={styles.tooltipText}>Editar tambo</span>
            </div>

            <div className={styles.tooltipWrapper}>
              <Button className={styles.btnIconoBorrar} onClick={handleShow}>
                <RiDeleteBin2Line size={20} />
              </Button>
              <span className={styles.tooltipText}>Eliminar tambo</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal Confirmación */}
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Atención!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Desea eliminar el tambo {nombre}?</p>
          <Alert variant="danger" show={error}>
            <Alert.Heading>Oops! Se ha producido un error!</Alert.Heading>
            <p>{descError}</p>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={eliminarTambo}>Aceptar</Button>
          <Button variant="danger" onClick={handleClose}>Cancelar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Información */}
      <Modal show={showData} onHide={handleCloseData}>
        <Modal.Header closeButton>
          <Modal.Title>Tambo {nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row><Col><h5>Ubicación: {ubicacion}</h5></Col></Row>
          <Row>
            <Col><h5>Turnos: {turnos}</h5></Col>
            <Col><h5>Bajadas: {bajadas}</h5></Col>
            <Col><h5>Kgs. Tolvas: {tolvas}</h5></Col>
          </Row>
          <Row className="mt-3">
            <Col>
              <Form.Control type="date" value={fecha} onChange={handleChange} required />
            </Col>
            <Col>
              <Button variant="success" onClick={buscarHorarios}>Ver Horarios</Button>
            </Col>
          </Row>

          <div className="mt-3">
            {estadoApi === 'buscando' && (
              <ContenedorSpinner>
                <Spinner animation="border" variant="info" />
              </ContenedorSpinner>
            )}
            {estadoApi === 'error' && <Alert variant="danger">No se puede acceder al tambo</Alert>}
            {estadoApi === 'resultados' && horarios?.length === 0 && (
              <Alert variant="success">No hay resultados para la fecha seleccionada</Alert>
            )}
            {estadoApi === 'resultados' && horarios?.length > 0 && (
              <Table responsive>
                <thead>
                  <tr>
                    <th>Turno</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {horarios.map(h => (
                    <DetalleHorario key={h.id} horario={h} />
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="info" onClick={handleCloseData}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Edición */}
      {showEditar && (
        <ModalTamboForm
          tamboData={tambo}
          show={showEditar}
          onHide={() => setShowEditar(false)}
        />
      )}

      {/* Modal de carga bloqueante */}
      <Modal show={cargando} backdrop="static" keyboard={false} centered>
        <Modal.Body>
          <div className={styles.loadingWrapper}>
            <Spinner animation="border" role="status" variant="primary" />
            <p className={styles.nombreTambo}>
              Ingresando a <strong>{tamboSel?.nombre}</strong>...
            </p>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default DetalleTambos;
