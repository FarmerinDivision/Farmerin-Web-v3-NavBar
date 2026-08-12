import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FirebaseContext } from '../../firebase2';
import { ContenedorSpinner } from '../ui/Elementos';
import DetalleHorario from './detalleHorario';
import ModalTamboForm from '../../pages/tambos/ModalTamboForm';
import { useAdmin } from '../utils/AdminContext';
import { format } from 'date-fns';
import { Button, Modal, Row, Col, Form, Spinner, Table, Alert } from 'react-bootstrap';
import { HiOutlineInformationCircle, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { FaMapMarkerAlt } from 'react-icons/fa';
import styles from '../../styles/Tambos.module.scss';
import modalStyles from '../../styles/modalTamboForm.module.scss';

const DetalleTambos = ({ tambo }) => {
  const fetch = require('node-fetch');
  const { id, nombre, ubicacion, bajadas, turnos, tolvas, link } = tambo;
  const { usuario, firebase, guardarTamboSel } = useContext(FirebaseContext);
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
  const [showEditar, setShowEditar] = useState(false);
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
      <div className={styles.tamboCard}>
        {/* ENCABEZADO DE LA TARJETA */}
        <div className={styles.cardHeader}>

          {/* TÍTULO Y UBICACIÓN */}
          <div className={styles.titleWrap}>
            <h3>{nombre}</h3>
            <div className={styles.location}>
              <FaMapMarkerAlt size={12} color="#97a0aeff" />
              {ubicacion}
            </div>
          </div>

          {/* ACCIONES SECUNDARIAS (Visibles al hover) */}
          <div className={styles.cardActions}>
            <button className={styles.iconBtn} onClick={handleShowData} title="Información">
              <HiOutlineInformationCircle size={18} />
            </button>
            <button className={styles.iconBtn} onClick={() => setShowEditar(true)} title="Editar">
              <HiOutlinePencil size={18} />
            </button>
            <button className={`${styles.iconBtn} ${styles.btnDelete}`} onClick={handleShow} title="Eliminar">
              <HiOutlineTrash size={18} />
            </button>
          </div>
        </div>

        {/* BOTÓN PRINCIPAL */}
        <button className={styles.btnIngresar} onClick={selecTambo} disabled={cargando}>
          Ingresar al Tambo
        </button>
      </div>

      {/* Modal Confirmación */}
      <Modal 
        show={show} 
        onHide={handleClose}
        size="md"
        centered
        dialogClassName={modalStyles.premiumModalTamboSmall}
        backdropClassName={modalStyles.premiumBackdropTambo}
      >
        <div className={modalStyles.header}>
          <div>
            <h2 className={modalStyles.title}>¡Atención!</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Confirmación de eliminación
            </p>
          </div>
          <button type="button" className={modalStyles.closeButton} onClick={handleClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={modalStyles.body}>
          <div className={modalStyles.sectionBlock} style={{ textAlign: 'center', marginBottom: 0 }}>
            <h3 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '16px', fontWeight: '600' }}>
              ¿Desea eliminar el tambo <strong>{nombre}</strong>?
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: error ? '16px' : '0' }}>
              Esta acción no se puede deshacer.
            </p>

            <Alert variant="danger" show={error} style={{ textAlign: 'left', marginBottom: 0, marginTop: '16px', borderRadius: '8px' }}>
              <Alert.Heading style={{ fontSize: '15px' }}>Oops! Se ha producido un error!</Alert.Heading>
              <p style={{ margin: 0, fontSize: '14px' }}>{descError}</p>
            </Alert>
          </div>
        </div>

        <div className={modalStyles.footer}>
          <button type="button" className={modalStyles.btnSecondary} onClick={handleClose}>
            Cancelar
          </button>
          <button type="button" className={modalStyles.btnDanger} onClick={eliminarTambo}>
            Sí, eliminar tambo
          </button>
        </div>
      </Modal>

      {/* Modal Información */}
      <Modal 
        show={showData} 
        onHide={handleCloseData}
        size="md"
        centered
        dialogClassName={modalStyles.premiumModalTamboSmall}
        backdropClassName={modalStyles.premiumBackdropTambo}
      >
        <div className={modalStyles.header}>
          <div>
            <h2 className={modalStyles.title}>{nombre}</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Información operativa del establecimiento
            </p>
          </div>
          <button type="button" className={modalStyles.closeButton} onClick={handleCloseData} aria-label="Cerrar">
            ✕
          </button>
        </div>
        
        <div className={modalStyles.body}>
          <div className={modalStyles.sectionBlock}>
            <h3 className={modalStyles.sectionTitle}>Información General</h3>
            <div className={modalStyles.gridRowTwoCols}>
              <div className={modalStyles.infoCard}>
                <p className={modalStyles.infoCardLabel}>Ubicación</p>
                <p className={modalStyles.infoCardValue}>{ubicacion || '-'}</p>
              </div>
              <div className={modalStyles.infoCard}>
                <p className={modalStyles.infoCardLabel}>Turnos</p>
                <p className={modalStyles.infoCardValue}>{turnos || 0}</p>
              </div>
              <div className={modalStyles.infoCard}>
                <p className={modalStyles.infoCardLabel}>Bajadas</p>
                <p className={modalStyles.infoCardValue}>{bajadas || 0}</p>
              </div>
              <div className={modalStyles.infoCard}>
                <p className={modalStyles.infoCardLabel}>Tolvas (kg)</p>
                <p className={modalStyles.infoCardValue}>{tolvas || 0}</p>
              </div>
            </div>
          </div>

          <div className={modalStyles.sectionBlock}>
            <h3 className={modalStyles.sectionTitle}>Horarios de Operación</h3>
            
            <div className={modalStyles.gridRowTwoCols} style={{ alignItems: 'flex-end', marginBottom: '0' }}>
              <div className={modalStyles.formGroup}>
                <Form.Label>Fecha</Form.Label>
                <Form.Control type="date" value={fecha} onChange={handleChange} required />
              </div>
              <div>
                <button type="button" className={modalStyles.btnPrimary} onClick={buscarHorarios} style={{ width: '100%' }}>
                  Ver Horarios
                </button>
              </div>
            </div>

            <div className="mt-4">
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
          </div>
        </div>

        <div className={modalStyles.footer}>
          <button type="button" className={modalStyles.btnSecondary} onClick={handleCloseData}>
            Cerrar
          </button>
        </div>
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
              Ingresando a <strong>{nombre}</strong>...
            </p>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default DetalleTambos;
