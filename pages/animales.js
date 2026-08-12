import React, { useState, useEffect, useContext } from 'react'
import { FirebaseContext } from '../firebase2';
import { Mensaje } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleAnimal from '../components/layout/detalleAnimal';
import SelectTambo from '../components/layout/selectTambo';
import { useDispatch } from 'react-redux';
import { addNotification } from '../redux/notificacionSlice';
import { Button, Modal } from 'react-bootstrap';
import { RiAddBoxLine, RiSearchLine } from 'react-icons/ri';
import { FaSort } from 'react-icons/fa';
import { GiCow } from 'react-icons/gi';
import Lottie from 'lottie-react';
import vacaAnimacion from '../public/animaciones/Animation - Vaca.json';
import styles from '../styles/Animales.module.scss';
import { useAnimalesState } from '../hook/useAnimalesState';

const Animales = () => {
  const dispatch = useDispatch();
  const [elim, guardarElim] = useState(false);
  const [error, guardarError] = useState();
  const [animales, guardarAnimales] = useState([]);
  const [procesando, guardarProcesando] = useState(false);
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // ── Estado persistido en sessionStorage ────────────────────────────────────
  const {
    searchTerm,    setSearchTerm,
    filtroRapido,  setFiltroRapido,
    orderRp,       setOrderRp,
    orderEr,       setOrderEr,
    orderEp,       setOrderEp,
    animalesBase,  setAnimalesBase,
    hasCachedData,
    navigateWithState,
  } = useAnimalesState(tamboSel);

  // ── Carga de datos ─────────────────────────────────────────────────────────
  useEffect(() => {
    guardarElim(false);
    if (!tamboSel) return;

    // Si hay cache valido y el usuario no viene de edicion, no refetcheamos
    if (hasCachedData && !elim) return;

    guardarProcesando(true);
    buscarAnimales();
    mostrarMensajeModal();
    setTimeout(() => guardarProcesando(false), 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamboSel, elim]);

  // ── Logica reactiva de busqueda y filtros rapidos ─────────────────────────
  useEffect(() => {
    let filtrados = [...animalesBase];

    if (searchTerm) {
      const cond = searchTerm.toLowerCase();
      filtrados = filtrados.filter(animal =>
        (animal.rp?.toString().toLowerCase().includes(cond) ||
          animal.erp?.toString().toLowerCase().includes(cond))
      );
    }

    if (filtroRapido !== 'Todos') {
      filtrados = filtrados.filter(animal => {
        const estProd = animal.estpro?.toLowerCase() || '';
        const estRep  = animal.estrep?.toLowerCase() || '';
        if (filtroRapido === 'En Ordeñe') return estProd.includes('ordeñe');
        if (filtroRapido === 'Secas')     return estProd.includes('seca');
        if (filtroRapido === 'Preñadas')  return estRep.includes('preñada');
        if (filtroRapido === 'Vacías')    return estRep.includes('vacia');
        return true;
      });
    }

    guardarAnimales(filtrados);
  }, [searchTerm, filtroRapido, animalesBase]);

  // ── Funciones de Firestore ─────────────────────────────────────────────────
  function buscarAnimales() {
    if (!tamboSel) return;
    try {
      firebase.db.collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .where('fbaja', '==', '')
        .orderBy('rp')
        .get()
        .then(snapshotAnimal);
    } catch (err) {
      guardarError(err);
      console.log(err);
    }
  }

  function snapshotAnimal(snapshot) {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // setAnimalesBase persiste automaticamente en sessionStorage
    setAnimalesBase(data);
  }

  // ── Handlers de ordenamiento ───────────────────────────────────────────────
  const handleClickRP = () => {
    const orden = orderRp === 'asc' ? 'desc' : 'asc';
    setOrderRp(orden);
    const sorted = [...animalesBase].sort((a, b) => {
      const rpA = a.rp?.toString().toLowerCase() || '';
      const rpB = b.rp?.toString().toLowerCase() || '';
      return orden === 'asc' ? rpA.localeCompare(rpB) : rpB.localeCompare(rpA);
    });
    setAnimalesBase(sorted);
  };

  const handleClickER = () => {
    const orden = orderEr === 'asc' ? 'desc' : 'asc';
    setOrderEr(orden);
    const sorted = [...animalesBase].sort((a, b) => {
      const erA = a.estrep?.toString().toLowerCase() || '';
      const erB = b.estrep?.toString().toLowerCase() || '';
      return orden === 'asc' ? erA.localeCompare(erB) : erB.localeCompare(erA);
    });
    setAnimalesBase(sorted);
  };

  const handleClickEP = () => {
    const orden = orderEp === 'asc' ? 'desc' : 'asc';
    setOrderEp(orden);
    const sorted = [...animalesBase].sort((a, b) => {
      const epA = a.estpro?.toString().toLowerCase() || '';
      const epB = b.estpro?.toString().toLowerCase() || '';
      return orden === 'asc' ? epA.localeCompare(epB) : epB.localeCompare(epA);
    });
    setAnimalesBase(sorted);
  };

  // ── Modal de notificacion del tambo ───────────────────────────────────────
  const mostrarMensajeModal = async () => {
    try {
      const tamboDoc = await firebase.db.collection('tambo').doc(tamboSel.id).get();
      const porcentaje = tamboDoc.data().porcentaje;
      let mensaje;
      if (porcentaje > 0) mensaje = `AUMENTO DE LA RACION APLICADO.`;
      else if (porcentaje < 0) mensaje = `REDUCCION DE LA RACION APLICADO.`;

      if (mensaje) {
        setModalMessage(mensaje);
        dispatch(addNotification({ id: Date.now(), mensaje, fecha: firebase.nowTimeStamp() }));
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error fetching porcentaje:', err);
    }
  };

  // ── Helpers de badge ──────────────────────────────────────────────────────
  const getBadgeClass = (estado) => {
    const e = estado?.toLowerCase() || '';
    if (e.includes('ordeñe'))                    return styles.badgeGreen;
    if (e.includes('seca'))                      return styles.badgeYellow;
    if (e.includes('preñada'))                   return styles.badgeBlue;
    if (e.includes('vacia') || e.includes('rechazo')) return styles.badgeRed;
    return styles.badgeGray;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (procesando) {
    return (
      <Layout titulo="Cargando...">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
          <div className="text-center" style={{ maxWidth: 300 }}>
            <Lottie animationData={vacaAnimacion} loop autoplay />
            <p className="textoLoader">CARGANDO ANIMALES...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="Animales">
      <div className={styles.container}>

        {/* HEADER PRINCIPAL */}
        <div className={styles.mainHeader}>
          <h2 className={styles.title} style={{ margin: 0 }}>
            <GiCow /> Listado de Animales
            <span style={{ fontSize: '1rem', color: '#6b7280', marginLeft: '8px' }}>
              ({animales.length})
            </span>
          </h2>

          <div className={styles.searchSection}>
            <div style={{ position: 'relative', flex: 1 }}>
              <RiSearchLine
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar por RP, eRP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.inputRp}
                style={{ paddingLeft: '36px', width: '100%', margin: 0 }}
              />
            </div>

            <button
              type="button"
              onClick={() => navigateWithState('/animales/alta')}
              className={`${styles.customBtn} ${styles.addBtn}`}
              style={{ margin: 0 }}
            >
              <RiAddBoxLine size={20} className={styles.btnIcon} />
              Alta Animal
            </button>
          </div>
        </div>

        {/* FILTROS RÁPIDOS */}
        {tamboSel && (
          <div className={styles.quickFilters}>
            {['Todos', 'En Ordeñe', 'Secas', 'Preñadas', 'Vacías'].map(filtro => (
              <button
                key={filtro}
                className={`${styles.filterPill} ${filtroRapido === filtro ? styles.active : ''}`}
                onClick={() => setFiltroRapido(filtro)}
              >
                {filtro}
              </button>
            ))}
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {tamboSel ? (
          animales.length === 0 ? (
            <Mensaje className={styles.mensajeSinResultados}>
              <div className={styles.mensajeCaja}>
                <h2 className={styles.tituloSinResultados}>Sin resultados</h2>
                <p className={styles.textoSecundario}>
                  No se encontraron animales con los filtros actuales.
                </p>
              </div>
            </Mensaje>
          ) : (
            <div className={styles.modernTableContainer}>
              <table className={styles.modernTable}>
                <thead>
                  <tr>
                    <th onClick={handleClickRP}>
                      RP <FaSort style={{ marginLeft: 4 }} />
                    </th>
                    <th>eRP</th>
                    <th onClick={handleClickEP}>
                      Est. Productivo <FaSort style={{ marginLeft: 4 }} />
                    </th>
                    <th onClick={handleClickER}>
                      Est. Reproductivo <FaSort style={{ marginLeft: 4 }} />
                    </th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {animales.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.rp || '-'}</td>
                      <td style={{ color: '#4b5563' }}>{a.erp || '-'}</td>
                      <td>
                        <span className={`${styles.badge} ${getBadgeClass(a.estpro)}`}>
                          {a.estpro || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${getBadgeClass(a.estrep)}`}>
                          {a.estrep || '-'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <DetalleAnimal
                          animal={a}
                          guardarElim={guardarElim}
                          onNavigate={navigateWithState}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <SelectTambo />
        )}

        {/* MODAL NOTIFICACIONES */}

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Notificaciones</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>{modalMessage}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
    </Layout>
  );
};

export default Animales;
