import React, { useState, useEffect, useContext } from 'react'
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import SelectTambo from '../components/layout/selectTambo';
import { Button, Form, Modal } from 'react-bootstrap';
import { RiEdit2Line, RiDeleteBin2Line, RiAddLine } from 'react-icons/ri';
import { FaTools, FaPills, FaStethoscope, FaBan } from 'react-icons/fa';
import ListadoModal from './listados/[id]';
import styles from '../styles/Listados.module.scss';

const Listados = () => {

  const [listados, guardarListados] = useState([]);
  const [tipo, guardarTipo] = useState('todos');
  const { firebase, tamboSel } = useContext(FirebaseContext);

  // states modal editar/crear
  const [showModal, setShowModal] = useState(false);
  const [idListadoSel, setIdListadoSel] = useState("0");

  // states modal eliminar
  const [showEliminar, setShowEliminar] = useState(false);
  const [idEliminar, setIdEliminar] = useState(null);

  useEffect(() => {
    if (tamboSel) {
      const obtenerListados = () => {
        firebase.db
          .collection('listado')
          .where('idtambo', '==', tamboSel.id)
          .onSnapshot(manejarSnapshot)
      }
      obtenerListados();
    }
  }, [tipo, tamboSel]);

  function manejarSnapshot(snapshot) {
    const listadosData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (tipo !== "todos") {
      const filtro = listadosData.filter(l => l.tipo.includes(tipo));
      guardarListados(filtro);
    } else {
      guardarListados(listadosData);
    }
  }

  const handleChipClick = (nuevoTipo) => {
    guardarTipo(nuevoTipo);
  };

  const abrirModal = (id) => {
    setIdListadoSel(id);
    setShowModal(true);
  };

  const handleShowElim = (id) => {
    setIdEliminar(id);
    setShowEliminar(true);
  };

  const eliminarListado = async () => {
    if (!idEliminar) return;
    try {
      await firebase.db.collection('listado').doc(idEliminar).delete();
    } catch (error) {
      console.error("Error eliminando listado:", error);
    }
    setShowEliminar(false);
    setIdEliminar(null);
  };

  const getIconForType = (tipoStr) => {
    const t = tipoStr.toLowerCase();
    if (t.includes('servicio')) return <FaTools color="#4db150" />;
    if (t.includes('tratamiento')) return <FaPills color="#1f8ef1" />;
    if (t.includes('enfermedad')) return <FaStethoscope color="#ff9800" />;
    if (t.includes('baja')) return <FaBan color="#ef4444" />;
    return <FaTools color="#94a3b8" />; // Default
  };

  return (
    <Layout titulo="Administrador de Listados">
      <div className={styles.pageContainer}>
        <div className={styles.contentWrapper}>
          
          <header className={styles.header}>
            <h1>Administrador de Listados</h1>
            <p>
              Desde aquí podés crear y administrar todos los listados personalizados utilizados en tu tambo.
            </p>
          </header>

          <div className={styles.topBar}>
            <div className={styles.filtersWrapper}>
              <span className={styles.filtersLabel}>Filtrar por tipo</span>
              <div className={styles.chipsContainer}>
                <button 
                  className={`${styles.chip} ${tipo === 'todos' ? styles.active : ''}`}
                  onClick={() => handleChipClick('todos')}
                >
                  Todos
                </button>
                <button 
                  className={`${styles.chip} ${tipo === 'servicio' ? styles.active : ''}`}
                  onClick={() => handleChipClick('servicio')}
                >
                  Servicio
                </button>
                <button 
                  className={`${styles.chip} ${tipo === 'tratamiento' ? styles.active : ''}`}
                  onClick={() => handleChipClick('tratamiento')}
                >
                  Tratamiento
                </button>
                <button 
                  className={`${styles.chip} ${tipo === 'enfermedad' ? styles.active : ''}`}
                  onClick={() => handleChipClick('enfermedad')}
                >
                  Enfermedad
                </button>
                <button 
                  className={`${styles.chip} ${tipo === 'baja' ? styles.active : ''}`}
                  onClick={() => handleChipClick('baja')}
                >
                  Motivo de Baja
                </button>
              </div>
            </div>

            <button
              className={styles.btnNuevo}
              onClick={() => abrirModal("0")}
            >
              <RiAddLine size={20} />
              Nuevo Listado
            </button>
          </div>

          {tamboSel ? (
            listados.length > 0 ? (
              <div className={styles.gridContainer}>
                {listados.map(l => (
                  <div className={styles.listCard} key={l.id}>
                    <div className={styles.cardIcon}>
                      {getIconForType(l.tipo)}
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardType}>{l.tipo}</div>
                      <h3 className={styles.cardDesc} title={l.descripcion}>
                        {l.descripcion}
                      </h3>
                    </div>
                    <div className={styles.cardActions}>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => abrirModal(l.id)}
                        title="Editar"
                      >
                        <RiEdit2Line size={20} />
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                        onClick={() => handleShowElim(l.id)}
                        title="Eliminar"
                      >
                        <RiDeleteBin2Line size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No se encontraron listados para este filtro.</p>
              </div>
            )
          ) : (
            <div className="container mt-4">
              <SelectTambo />
            </div>
          )}

        </div>

        {/* Modal para alta/edición (Mantiene componente original) */}
        <ListadoModal
          show={showModal}
          onHide={() => setShowModal(false)}
          idListado={idListadoSel}
        />

        {/* Modal confirmación eliminar */}
        <Modal show={showEliminar} onHide={() => setShowEliminar(false)} centered dialogClassName={styles.customModal}>
          <Modal.Header closeButton className={styles.headerEditar}>
            <Modal.Title style={{ fontWeight: 600, fontSize: '1.25rem' }}>Confirmar eliminación</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '20px 24px', fontSize: '16px', color: '#475569' }}>
            ¿Seguro que deseas eliminar este listado? Esta acción no se puede deshacer.
          </Modal.Body>
          <Modal.Footer style={{ borderTop: 'none', padding: '16px 24px' }}>
            <Button variant="light" onClick={() => setShowEliminar(false)} style={{ fontWeight: 500 }}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={eliminarListado} style={{ fontWeight: 600, padding: '8px 16px', borderRadius: '8px' }}>
              Eliminar
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Layout>
  )
}

export default Listados;
