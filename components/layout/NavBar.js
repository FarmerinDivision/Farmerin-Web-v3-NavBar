import React, { useState, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '../../styles/Sidebar.module.scss';
import { FirebaseContext } from '../../firebase2';
import { useRouter } from 'next/router';
import { Button, Modal, Badge, Alert } from 'react-bootstrap';
import { ContenedorAlertas } from '../ui/Elementos';
import { useDispatch, useSelector } from "react-redux";
import { updateValor } from '../../redux/valorSlice';
import { useAdmin } from '../utils/AdminContext';

const NavBar = ({ noStickyHeader }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMobileMenu = () => setMenuOpen(!menuOpen);
  const { usuario, firebase, tambos, guardarTamboSel, tamboSel, porc } = useContext(FirebaseContext);
  const [alertas, setAlertas] = useState([]);
  const [alertasSinLeer, setAlertasSinLeer] = useState([]);
  const [show, setShow] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [ultimoCambio, setUltimoCambio] = useState(null);
  const [error, setError] = useState(false);
  const dispatch = useDispatch();
  const valor = useSelector((state) => state.valor);
  const { isAdminMode } = useAdmin();
  const router = useRouter();

  const navRef = useRef(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeSubDropdown, setActiveSubDropdown] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setActiveSubDropdown(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
        setActiveSubDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDropdown = (menuName) => {
    if (activeDropdown === menuName) {
      setActiveDropdown(null);
      setActiveSubDropdown(null);
    } else {
      setActiveDropdown(menuName);
      setActiveSubDropdown(null);
    }
  };

  const toggleSubDropdown = (e, subMenuName) => {
    e.stopPropagation();
    if (activeSubDropdown === subMenuName) {
      setActiveSubDropdown(null);
    } else {
      setActiveSubDropdown(subMenuName);
    }
  };

  const closeMenus = () => {
    setActiveDropdown(null);
    setActiveSubDropdown(null);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (porc !== undefined) {
      dispatch(updateValor(porc));
    }
  }, [porc, dispatch]);

  useEffect(() => {
    if (tamboSel && tamboSel.porcentaje !== undefined) {
      dispatch(updateValor(tamboSel.porcentaje));
    }
  }, [tamboSel, dispatch]);

  useEffect(() => {
    if (firebase && tambos) {
      obtenerAlertas();
    }
  }, [firebase, tambos]);

  useEffect(() => {
    if (tamboSel) {
      obtenerUltimoCambio();
      obtenerHistorial();
    }
  }, [tamboSel]);

  const handleCampanaClick = () => {
    setShow(true);
    if (alertasSinLeer.length > 0) {
      marcarComoLeidas();
    }
  };

  const handleClose = () => setShow(false);
  const handleHistorialClose = () => setShowHistorial(false);
  const handleHistorialShow = () => setShowHistorial(true);

  function cerrarSesion() {
    guardarTamboSel(null);
    firebase.logout();
    return router.push('/login');
  }

  async function vista(alerta) {
    try {
      await firebase.db.collection('alerta').doc(alerta.id).update({
        ...alerta,
        visto: true
      });
    } catch (error) {
      console.log(error);
    }
  }

  async function marcarComoLeidas() {
    for (const alerta of alertasSinLeer) {
      await vista(alerta);
    }
    setAlertasSinLeer([]);
    obtenerAlertas();
  }

  async function obtenerAlertas() {
    const tambosArray = tambos.map(t => t.id);
    if (!firebase || tambosArray.length === 0) return;
    try {
      const chunk = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
      const getFechaMs = (f) => {
        if (!f) return 0;
        if (f instanceof Date) return f.getTime();
        if (typeof f?.toDate === 'function') return f.toDate().getTime();
        if (typeof f === 'string') return new Date(f).getTime() || 0;
        return 0;
      };

      let docs = [];
      if (tambosArray.length <= 10) {
        const snapshot = await firebase.db.collection('alerta')
          .where('idtambo', 'in', tambosArray)
          .orderBy('fecha', 'desc')
          .get();
        docs = snapshot.docs;
      } else {
        const chunks = chunk(tambosArray, 10);
        const promises = chunks.map(ids =>
          firebase.db.collection('alerta')
            .where('idtambo', 'in', ids)
            .orderBy('fecha', 'desc')
            .get()
        );
        const snaps = await Promise.all(promises);
        docs = snaps.flatMap(s => s.docs);
      }

      const byId = new Map();
      for (const d of docs) {
        byId.set(d.id, { id: d.id, ...d.data() });
      }
      const alertasTambos = Array.from(byId.values()).sort((a, b) => getFechaMs(b.fecha) - getFechaMs(a.fecha));
      setAlertas(alertasTambos);
      const sinLeer = alertasTambos.filter(a => !a.visto);
      setAlertasSinLeer(sinLeer);
      if (sinLeer.length > 0) {
        setUltimoCambio(sinLeer[0]); // Muestra la más reciente
      }
    } catch (error) {
      console.log(error);
      setError(true);
    }
  }

  async function obtenerHistorial() {
    if (!tamboSel) return;
    try {
      const snapshot = await firebase.db.collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .orderBy('fecha', 'desc')
        .get();
      const historialData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistorial(historialData);
    } catch (error) {
      console.log(error);
    }
  }

  async function obtenerUltimoCambio() {
    if (!tamboSel) return;
    try {
      const snapshot = await firebase.db.collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .orderBy('fecha', 'desc')
        .limit(1)
        .get();
      const doc = snapshot.docs[0];
      if (doc) {
        setUltimoCambio({ id: doc.id, ...doc.data() });
      }
    } catch (error) {
      console.log(error);
    }
  }

  function formatFecha(fecha) {
    if (fecha instanceof Date) return fecha.toLocaleDateString();
    if (fecha?.toDate) return fecha.toDate().toLocaleDateString();
    if (typeof fecha === 'string') return new Date(fecha).toLocaleDateString();
    return 'Fecha desconocida';
  }

  // 🚫 OCULTAR NAVBAR SI NO HAY TAMBO SELECCIONADO
  if (!tamboSel) return null;


  return (
    <header className={styles.navbar} ref={navRef}>
      <div className={styles.navContainer}>
        <div className={styles.logo}>
          <Link href="/">
            <img src="/logoF (BLANCO).png" alt="Logo" className={styles.logoIcon} />
          </Link>
          <Link href="/">
            <img src="/logoLetras (BLANCO).png" alt="Farmerin" className={styles.logoText} />
          </Link>
        </div>

        <button className={styles.menuToggle} onClick={toggleMobileMenu}>
          Menú
        </button>

        <nav className={`${styles.navLinks} ${menuOpen ? styles.active : ''}`}>
          <Link href="/"><span onClick={closeMenus}>Tambos</span></Link>
          <Link href="/animales"><span onClick={closeMenus}>Animales</span></Link>

          {isAdminMode && (
            <div className={styles.dropdown}>
              <button
                className={`${styles.dropbtn} ${activeDropdown === 'admin' ? styles.activeBtn : ''}`}
                onClick={() => toggleDropdown('admin')}
                aria-expanded={activeDropdown === 'admin'}
                aria-haspopup="true"
              >
                Administrador
                <span className={styles.arrow}>▼</span>
              </button>
              {activeDropdown === 'admin' && (
                <div className={styles.dropdownContent}>
                  <Link href="/MOTIVODEBAJA"><span onClick={closeMenus}>Herramientas Administrativas</span></Link>
                  <Link href="/migrarEvento"><span onClick={closeMenus}>Migrar Evento</span></Link>
                  <Link href="/EncontrarERP"><span onClick={closeMenus}>Encontrar ERP</span></Link>
                  <Link href="/CambioRodeo"><span onClick={closeMenus}>Cambio Rodeo</span></Link>
                  <Link href="/CambioAseca"><span onClick={closeMenus}>Cambio a Seca</span></Link>
                  <Link href="/CambioEvento"><span onClick={closeMenus}>Cambio Evento</span></Link>
                  <Link href="/busquedaNuevaFuncion"><span onClick={closeMenus}>Cambio de Fracion a TimeStamp</span></Link>
                  <Link href="/BotonAgregar"><span onClick={closeMenus}>Boton Agregar Campo</span></Link>
                  <Link href="/agregarIDTAMBO"><span onClick={closeMenus}>Agregar ID Tambo a Eventos</span></Link>
                  <Link href="/colocarTemperatura"><span onClick={closeMenus}>Colocar Temperatura</span></Link>
                  <Link href="/AgregarCAanimal"><span onClick={closeMenus}>Agregar CA a Animales</span></Link>
                </div>
              )}
            </div>
          )}

          <div className={styles.dropdown}>
            <button
              className={`${styles.dropbtn} ${activeDropdown === 'nutricion' ? styles.activeBtn : ''}`}
              onClick={() => toggleDropdown('nutricion')}
              aria-expanded={activeDropdown === 'nutricion'}
              aria-haspopup="true"
            >
              Nutrición
              <span className={styles.arrow}>▼</span>
            </button>

            {activeDropdown === 'nutricion' && (
              <div className={styles.dropdownContent}>
                <Link href="/parametros"><span onClick={closeMenus}>Parámetros</span></Link>
                <Link href="/control"><span onClick={closeMenus}>Control</span></Link>

                {/* SUBMENÚ LATERAL Control Lechero */}
                <div className={styles.subDropdown}>
                  <button
                    className={`${styles.subDropbtn} ${activeSubDropdown === 'controlLechero' ? styles.activeBtn : ''}`}
                    onClick={(e) => toggleSubDropdown(e, 'controlLechero')}
                    aria-expanded={activeSubDropdown === 'controlLechero'}
                    aria-haspopup="true"
                  >
                    Control Lechero
                    <span className={styles.arrow}>▼</span>
                  </button>

                  {activeSubDropdown === 'controlLechero' && (
                    <div className={styles.subDropdownContent}>
                      <Link href="/controlLechero"><span onClick={closeMenus}>Cargar Control Lechero</span></Link>
                      <Link href="/ControlLecheroMensual"><span onClick={closeMenus}>Reporte Control Lechero</span></Link>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          <div className={styles.dropdown}>
            <button
              className={`${styles.dropbtn} ${activeDropdown === 'reportes' ? styles.activeBtn : ''}`}
              onClick={() => toggleDropdown('reportes')}
              aria-expanded={activeDropdown === 'reportes'}
              aria-haspopup="true"
            >
              Reportes
              <span className={styles.arrow}>▼</span>
            </button>

            {activeDropdown === 'reportes' && (
              <div className={styles.dropdownContent}>
                <Link href="/gralAnimales"><span onClick={closeMenus}>Gral. Animales</span></Link>
                <Link href="/produccion"><span onClick={closeMenus}>Producción</span></Link>
                <Link href="/parteDiario"><span onClick={closeMenus}>Parte Diario</span></Link>
                <Link href="/recepciones"><span onClick={closeMenus}>Recepciones</span></Link>
                <Link href="/GestionDeRemitos"><span onClick={closeMenus}>Gestion de Remitos</span></Link>
              </div>
            )}
          </div>

          <div className={styles.dropdown}>
            <button
              className={`${styles.dropbtn} ${activeDropdown === 'herramientas' ? styles.activeBtn : ''}`}
              onClick={() => toggleDropdown('herramientas')}
              aria-expanded={activeDropdown === 'herramientas'}
              aria-haspopup="true"
            >
              Herramientas
              <span className={styles.arrow}>▼</span>
            </button>

            {activeDropdown === 'herramientas' && (
              <div className={styles.dropdownContent}>
                <Link href="/monitor"><span onClick={closeMenus}>Monitor de Ingreso</span></Link>
                <Link href="/raciones"><span onClick={closeMenus}>Control de Ingreso</span></Link>
                <Link href="/IngresosTurnos"><span onClick={closeMenus}>Control de Turnos</span></Link>
              </div>
            )}
          </div>

          <div className={styles.dropdown}>
            <button
              className={`${styles.dropbtn} ${activeDropdown === 'configuracion' ? styles.activeBtn : ''}`}
              onClick={() => toggleDropdown('configuracion')}
              aria-expanded={activeDropdown === 'configuracion'}
              aria-haspopup="true"
            >
              Configuración
              <span className={styles.arrow}>▼</span>
            </button>

            {activeDropdown === 'configuracion' && (
              <div className={styles.dropdownContent}>
                <Link href="/listados"><span onClick={closeMenus}>Listados</span></Link>
                <Link href="/altaMasiva"><span onClick={closeMenus}>Alta Masiva</span></Link>
                <Link href="/actualizacion"><span onClick={closeMenus}>Actualización Masiva</span></Link>
              </div>
            )}
          </div>

          <div className={styles.dropdown}>
            <button
              className={`${styles.dropbtn} ${activeDropdown === 'dirsa' ? styles.activeBtn : ''}`}
              onClick={() => toggleDropdown('dirsa')}
              aria-expanded={activeDropdown === 'dirsa'}
              aria-haspopup="true"
            >
              Dirsa
              <span className={styles.arrow}>▼</span>
            </button>

            {activeDropdown === 'dirsa' && (
              <div className={styles.dropdownContent}>
                <Link href="/dirsa"><span onClick={closeMenus}>Cargar eventos</span></Link>
                <Link href="/ProductividadMensualDirsa"><span onClick={closeMenus}>Reporte de producción</span></Link>
                <Link href="/reporteDirsa"><span onClick={closeMenus}>Reporte de eventos</span></Link>
              </div>
            )}
          </div>

          <Link href="/ayuda"><span onClick={closeMenus}>Ayuda</span></Link>
          <Link href="/perfilFarmerin">
            <span onClick={closeMenus} style={{ position: "relative", display: "inline-block" }}>
              Mi Farmerin - {tamboSel.nombre}
              {ultimoCambio && !ultimoCambio.visto && (
                <Badge
                  bg="danger"
                  pill
                  style={{
                    position: "absolute",
                    top: -10,
                    right: -10,
                    fontSize: "0.65rem",
                    padding: "4px 6px",
                    backgroundColor: "#297fb8"
                  }}
                >
                  1
                </Badge>
              )}
            </span>
          </Link>

        </nav>
      </div>
    </header>
  );
};

export default NavBar;
