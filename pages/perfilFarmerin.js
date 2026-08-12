import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { GiFarmer, GiHistogram, GiWheat, GiInfo, GiCow } from 'react-icons/gi';
import { FiSettings, FiLogOut, FiTrash2, FiChevronRight, FiClock, FiCheckCircle } from 'react-icons/fi';
import { Alert, Modal, Button } from 'react-bootstrap';
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
      <div className={styles.dashboardContainer}>

        {/* ── FILA SUPERIOR: Hero Card + Acciones Rápidas ── */}
        <div className={styles.dashboardTopRow}>

          {/* HERO CARD — Tarjeta del tambo */}
          <div className={styles.heroCard}>
            <div className={styles.heroCardTop}>
              <div className={styles.heroCardAvatar}>
                <GiFarmer size={32} color="#7dce80" />
              </div>
              {usuario ? (
                <div className={styles.heroCardUserInfo}>
                  <p className={styles.heroCardWelcome}>Bienvenido de nuevo</p>
                  <h2 className={styles.heroCardUserName}>{usuario.displayName}</h2>
                </div>
              ) : (
                <Alert variant="warning">No hay información de usuario disponible.</Alert>
              )}
            </div>

            <div className={styles.heroCardDivider} />

            <div className={styles.heroCardBottom}>
              <p className={styles.heroCardTamboLabel}>Actualmente estás trabajando en</p>
              <h1 className={styles.heroCardTamboName}>
                {tamboSel?.nombre || 'No seleccionado'}
              </h1>
              <div className={styles.heroCardStatusRow}>
                <div className={styles.heroCardStatusDot} />
                <p className={styles.heroCardStatusText}>Sesión activa</p>
              </div>
            </div>
          </div>

          {/* ACCIONES RÁPIDAS */}
          <div className={styles.actionPanel}>
            <p className={styles.actionPanelTitle}>Acciones rápidas</p>
            <div className={styles.actionGrid}>

              {/* Calcular Consumos */}
              <div className={styles.actionCard}>
                <div className={styles.actionCardIcon}>
                  <GiHistogram size={22} color="#4db150" />
                </div>
                <p className={styles.actionCardLabel}>Calcular consumos</p>
                {/* Componente original — su botón queda como overlay transparente */}
                <PerfilCalcularConsumo />
              </div>

              {/* Cambiar Ración */}
              <div className={styles.actionCard}>
                <div className={styles.actionCardIcon}>
                  <GiWheat size={22} color="#4db150" />
                </div>
                <p className={styles.actionCardLabel}>Cambiar ración</p>
                <PerfilCambiarRacion />
              </div>

              {/* Obtener Información */}
              <div className={styles.actionCard}>
                <div className={styles.actionCardIcon}>
                  <GiInfo size={22} color="#4db150" />
                </div>
                <p className={styles.actionCardLabel}>Obtener información</p>
                <InformacionTambo tambo={tamboSel} fetch={fetch} />
              </div>

              {/* Obtener Animales */}
              <div className={styles.actionCard}>
                <div className={styles.actionCardIcon}>
                  <GiCow size={22} color="#4db150" />
                </div>
                <p className={styles.actionCardLabel}>Obtener animales</p>
                <ObtenerAnimalesPerfilForm />
              </div>

            </div>
          </div>
        </div>

        {/* ── ACTIVIDAD RECIENTE ── */}
        <div className={styles.actividadSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionTitle}>Actividad reciente</p>
          </div>

          {ultimoCambio ? (
            <div
              className={`${styles.actividadCard} ${ultimoCambio.visto ? styles.actividadVista : styles.actividadNoLeida} ${animacionLeido ? styles.fadeOut : ''}`}
            >
              <div className={styles.actividadFecha}>
                <FiClock size={11} />
                {new Date(ultimoCambio.fecha?.toDate?.() || ultimoCambio.fecha).toLocaleDateString()}
              </div>

              <p className={styles.actividadMensaje}>
                {ultimoCambio.mensaje}
              </p>

              <div className={styles.actividadActions}>
                {!ultimoCambio.visto ? (
                  <button
                    className={styles.btnMarcarLeido}
                    onClick={handleMarcarLeidoConAnimacion}
                  >
                    <FiCheckCircle size={13} />
                    Marcar como leída
                  </button>
                ) : (
                  <span className={styles.badgeLeido}>
                    <FiCheckCircle size={12} />
                    Leída
                  </span>
                )}
                <button
                  className={styles.btnVerHistorial}
                  onClick={() => setShowHistorial(true)}
                >
                  Ver historial
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.actividadEmpty}>
              Sin actividad reciente registrada.
            </div>
          )}
        </div>

        {/* ── OPCIONES DE USUARIO ── */}
        <div className={styles.userOptionsSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionTitle}>Opciones de usuario</p>
          </div>

          <div className={styles.userOptionsCard}>
            {/* Borrar Tambo */}
            <div
              className={styles.userOptionItem}
              onClick={() => handleShow()}
            >
              <div className={`${styles.userOptionIcon} ${styles.iconDanger}`}>
                <FiTrash2 size={17} />
              </div>
              <div className={styles.userOptionText}>
                <p className={`${styles.userOptionLabel} ${styles.labelDanger}`}>Borrar Tambo</p>
                <p className={styles.userOptionDesc}>Elimina permanentemente este tambo y sus datos</p>
              </div>
              <FiChevronRight size={16} className={styles.userOptionChevron} />
            </div>

            {/* Cerrar Sesión */}
            <div
              className={styles.userOptionItem}
              onClick={() => cerrarSesion()}
            >
              <div className={`${styles.userOptionIcon} ${styles.iconNeutral}`}>
                <FiLogOut size={17} />
              </div>
              <div className={styles.userOptionText}>
                <p className={styles.userOptionLabel}>Cerrar sesión</p>
                <p className={styles.userOptionDesc}>Salir de tu cuenta de Farmerin</p>
              </div>
              <FiChevronRight size={16} className={styles.userOptionChevron} />
            </div>
          </div>
        </div>

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
