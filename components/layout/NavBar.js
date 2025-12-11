import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import styles from '../../styles/Sidebar.module.scss';
import { FirebaseContext } from '../../firebase2';
import { useRouter } from 'next/router';
import { Button, Modal, Badge, Alert } from 'react-bootstrap';
import { ContenedorAlertas } from '../ui/Elementos';
import { useDispatch, useSelector } from "react-redux";
import { updateValor } from '../../redux/valorSlice';

const NavBar = () => {
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
    <header className={styles.navbar}>
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
          <Link href="/"><span>Tambos</span></Link>
          <Link href="/animales"><span>Animales</span></Link>

          <div className={styles.dropdown}>
            <button className={styles.dropbtn}>Nutrición</button>

            <div className={styles.dropdownContent}>

              <Link href="/parametros"><span>Parámetros</span></Link>
              <Link href="/control"><span>Control</span></Link>

              {/* SUBMENÚ LATERAL Control Lechero */}
              <div className={styles.subDropdown}>
                <span className={styles.subDropbtn}>Control Lechero</span>

                <div className={styles.subDropdownContent}>
                  <Link href="/controlLechero"><span>Cargar Control Lechero</span></Link>
                  <Link href="/ControlLecheroMensual"><span>Reporte Control Lechero</span></Link>
                </div>
              </div>

            </div>
          </div>



          <div className={styles.dropdown}>
            <button className={styles.dropbtn}>Reportes</button>
            <div className={styles.dropdownContent}>
              <Link href="/gralAnimales"><span>Gral. Animales</span></Link>
              <Link href="/produccion"><span>Producción</span></Link>
              <Link href="/parteDiario"><span>Parte Diario</span></Link>
              <Link href="/recepciones"><span>Recepciones</span></Link>
            </div>
          </div>

          <div className={styles.dropdown}>
            <button className={styles.dropbtn}>Herramientas</button>
            <div className={styles.dropdownContent}>
              <Link href="/monitor"><span>Monitor de Ingreso</span></Link>
              <Link href="/raciones"><span>Control de Ingreso</span></Link>
              <Link href="/IngresosTurnos"><span>Control de Turnos</span></Link>
            </div>
          </div>

          <div className={styles.dropdown}>
            <button className={styles.dropbtn}>Configuración</button>
            <div className={styles.dropdownContent}>
              <Link href="/listados"><span>Listados</span></Link>
              <Link href="/altaMasiva"><span>Alta Masiva</span></Link>
              <Link href="/actualizacion"><span>Actualización Masiva</span></Link>
            </div>
          </div>
          <div className={styles.dropdown}>
            <button className={styles.dropbtn}>Dirsa</button>
            <div className={styles.dropdownContent}>
              <Link href="/dirsa"><span>Cargar eventos</span></Link>
              <Link href="/ProductividadMensualDirsa"><span>Reporte de producción</span></Link>
              <Link href="/reporteDirsa"><span>Reporte de eventos</span></Link>
            </div>
          </div>
          <Link href="/ayuda"><span>Ayuda</span></Link>
          <Link href="/perfilFarmerin">
            <span style={{ position: "relative", display: "inline-block" }}>
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
