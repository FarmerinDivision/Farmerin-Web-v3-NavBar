import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { GiFarmer } from 'react-icons/gi';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Button, Alert, Modal, Form, Badge, InputGroup, FormControl } from 'react-bootstrap';
import { useRouter } from 'next/router';
import MachosHembrasBoton from '../components/utils/MachosHembrasBoton';
import InformacionTambo from '../components/utils/ObtenerInfoTambo';
import { ObtenerAnimalesPerfilForm } from '../components/utils/obtenerAnimalesPerfil';
import { NotificacionesContext } from '../components/utils/NotificationsProvider';
import { ContenedorAlertas } from '../components/ui/Elementos';
import styles from '../styles/perfilFarmerin.module.scss';
import PerfilFarmerinConsumo from "../components/layout/PerfilFarmerinConsumo";
import PerfilCalcularConsumo from "../components/layout/PerfilCalcularConsumo";
import PerfilCambiarRacion from "../components/layout/PerfilCambiarRacion";


const UserProfile = () => {
  const { usuario, tamboSel, guardarTamboSel, firebase } = useContext(FirebaseContext);
  const { notificaciones, sinLeer, marcarComoLeidas, historial, ultimoCambio, marcarUltimoCambioComoLeido } = useContext(NotificacionesContext);
  const router = useRouter();

  const [show, setShow] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [verMas, setVerMas] = useState(false);
  const [error, guardarError] = useState(false);
  const [descError, guardarDescError] = useState('');
  const [animacionLeido, setAnimacionLeido] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => {
    marcarComoLeidas();
    setShow(true);
  };

  const handleHistorialClose = () => setShowHistorial(false);
  const handleHistorialShow = () => setShowHistorial(true);

  const formatFecha = (fecha) => {
    if (!fecha) return "Fecha desconocida";
    if (fecha.toDate) return fecha.toDate().toLocaleDateString();
    return new Date(fecha).toLocaleDateString();
  };

  const handleCloseChangePass = () => {
    setShowChangePass(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const user = firebase.auth.currentUser;
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(newPassword);
      setSuccessMsg('¡Contraseña actualizada correctamente!');
    } catch (error) {
      setErrorMsg(error.message || 'Ocurrió un error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  function cerrarSesion() {
    guardarTamboSel(null);
    firebase.logout();
    return router.push('/login');
  }

  async function eliminarTambo() {
    try {
      const snapshot = await firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).get();
      if (snapshot.docs.length === 0) {
        await firebase.db.collection('tambo').doc(tamboSel.id).delete();
        handleClose();
      } else {
        guardarDescError("No se puede eliminar el tambo, tiene animales asociados");
        guardarError(true);
      }
    } catch (error) {
      guardarDescError(error.message);
      guardarError(true);
    }
  }
  const handleMarcarLeidoConAnimacion = async () => {
    setAnimacionLeido(true);
    setTimeout(async () => {
      await marcarUltimoCambioComoLeido();
      setAnimacionLeido(false);
    }, 500);
  };
  return (
    <Layout>
      <div className={styles.farmerinCardContainer}>
        <div className={styles.farmerinCard}>
          {usuario ? (
            <div className={styles.farmerinCardInfos}>
              <div className={styles.farmerinCardImage}>
                <GiFarmer size={50} />
              </div>
              <div className={styles.farmerinCardInfo}>
                <h5 className={styles.farmerinCardName}>{usuario.displayName}</h5>
                <p className={styles.farmerinCardTambo}>
                  {tamboSel?.nombre || 'No seleccionado'}
                </p>
              </div>
            </div>
          ) : (
            <Alert variant="warning">No hay información de usuario disponible.</Alert>
          )}
        </div>

        <div className={styles.perfilContenidoDosColumnas}>
          {/* Columna izquierda: Notificación + historial */}
          <div className={styles.perfilColIzquierda}>
            {ultimoCambio && (
              <div
                className={`${styles.alertaNotificacionBox} ${ultimoCambio.visto ? styles.visto : ''
                  } ${animacionLeido ? styles.fadeOut : ''}`}
              >
                <p className={styles.alertaNotificacionTexto}>
                  <strong>
                    {new Date(ultimoCambio.fecha?.toDate?.() || ultimoCambio.fecha).toLocaleDateString()}:
                  </strong>{' '}
                  {ultimoCambio.mensaje}
                </p>
                <div className={styles.alertaBotones}>
                  {!ultimoCambio.visto ? (
                    <button
                      className={`${styles.btnNoti} ${styles.btnMarcarLeido}`}
                      onClick={handleMarcarLeidoConAnimacion}
                    >
                      ✅ Marcar como leída
                    </button>
                  ) : (
                    <span className={styles.badgeLeido}>✔️ Leída</span>
                  )}
                  <button
                    className={`${styles.btnNoti} ${styles.btnVerHistorial}`}
                    onClick={() => setShowHistorial(true)}
                  >
                    📜 Ver historial de cambios
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: Botones de acción */}
          <div className={styles.perfilColDerecha}>
            <div className={styles.farmerinCardActions}>
              {/* <PerfilFarmerinConsumo />*/}
              <PerfilCalcularConsumo />
              <PerfilCambiarRacion />
              <InformacionTambo tambo={tamboSel} fetch={fetch} />
              <ObtenerAnimalesPerfilForm />
            </div>
          </div>
        </div>

        {/* Opciones de Usuario */}
        <button className={`${styles.configPerfilButton} ${styles.buttonPerfil}`} onClick={() => setShowConfigMenu(!showConfigMenu)}>
          <svg className={styles.svgIconPerfil} width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="2" />
            <path d="M19 12h3m-3 0a7 7 0 0 0-14 0m14 0a7 7 0 0 1-14 0m-3 0h3" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className={styles.configPerfilLabel}>Opciones de usuario</span>
        </button>

        {showConfigMenu && (
          <div className={styles.configPerfilCard}>
            <ul className={styles.configPerfilList}>
              <li className={styles.configPerfilItem} onClick={() => { handleShow(); setShowConfigMenu(false); }}>
                <svg className={styles.configPerfilIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f05454" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-7 6v6m4-6v6" />
                </svg>
                <p className={styles.configPerfilLabel}>Borrar Tambo</p>
              </li>
              <li className={styles.configPerfilItem} onClick={() => { cerrarSesion(); setShowConfigMenu(false); }}>
                <svg className={styles.configPerfilIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7e8590" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <p className={styles.configPerfilLabel}>Cerrar Sesión</p>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Modal: Eliminar Tambo */}
      <Modal className={styles.warningBorrarGeneral} show={show} onHide={handleClose} centered>
        <Modal.Body>
          <div className={styles.confirmBorrarDiv}>
            <p>
              <strong>¿Estás seguro de querer eliminar este {tamboSel ? tamboSel.nombre : 'tambo'}?</strong>
              <span>No podrás recuperar la información del tambo una vez eliminado.</span>
            </p>
            <div className={styles.modalBorrarContainer}>
              <button className={styles.redBtnBorrar} onClick={handleClose}>No, cancelar</button>
              <button className={styles.greenBtnBorrar} onClick={eliminarTambo}>Borrar</button>
            </div>
          </div>
          <Alert variant="danger" show={error}>
            <Alert.Heading>Oops! Se ha producido un error</Alert.Heading>
            <p>{descError}</p>
          </Alert>
        </Modal.Body>
      </Modal>

      {/* Modal: Historial de cambios */}
      <Modal size="lg" show={showHistorial} onHide={() => setShowHistorial(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Historial de cambios</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className={styles.historialContainer}>
            {historial.length > 0 ? (
              <>
                {(mostrarTodos ? historial : historial.slice(0, 5)).map((cambio) => (
                  <div key={cambio.id} className={styles.historialItem}>
                    <div className={styles.historialFecha}>
                      {new Date(cambio.fecha?.toDate?.() || cambio.fecha).toLocaleDateString()}
                    </div>
                    <div className={styles.historialMensaje}>{cambio.mensaje}</div>
                  </div>
                ))}

                {historial.length > 5 && (
                  <div className="d-flex justify-content-center mt-3">
                    <Button
                      variant="secondary"
                      onClick={() => setMostrarTodos(!mostrarTodos)}
                    >
                      {mostrarTodos ? 'Ver menos' : 'Ver más'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Alert variant="info">No hay cambios registrados.</Alert>
            )}
          </div>
        </Modal.Body>
      </Modal>


    </Layout >
  );

};

export default UserProfile;
