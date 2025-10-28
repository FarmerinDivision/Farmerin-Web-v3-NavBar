// src/components/Parametros.js
import React, { useState, useEffect, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleParametro from '../components/layout/detalleParametro';
import SelectTambo from '../components/layout/selectTambo';
import { Button, DropdownButton, Dropdown, Row, Col, Modal } from 'react-bootstrap';
import { RiAddLine, RiEditBoxLine, RiDeleteBin2Line } from 'react-icons/ri';
import { format } from 'date-fns';
import { addNotification } from '../redux/notificacionSlice';
import styles from '../styles/Parametro.module.scss';
import { Mensaje } from '../components/ui/Elementos';

const Parametros = () => {
  const [valor, setValor] = useState(0);
  const { firebase, setPorc, tamboSel } = useContext(FirebaseContext);
  const [selectedChange, setSelectedChange] = useState(null);
  const [isIncrease, setIsIncrease] = useState(true);
  const [grupos, setGrupos] = useState([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [showNuevoGrupo, setShowNuevoGrupo] = useState(false);
  const [nuevoGrupoId, setNuevoGrupoId] = useState(null);
  const [editGroup, setEditGroup] = useState({ id: null, value: '', subtitle: '' });
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [showSuccessGroup, setShowSuccessGroup] = useState(false);
  const [successMsgGroup, setSuccessMsgGroup] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [showSubtitleModal, setShowSubtitleModal] = useState(false);



  const dispatch = useDispatch();

  useEffect(() => {
    if (tamboSel) {
      obtenerPorcentaje();
      cargarGrupos();
    } else {
      setGrupos([]);
    }
  }, [tamboSel]);

  const obtenerPorcentaje = async () => {
    try {
      const snapshot = await firebase.db.collection('tambo').doc(tamboSel.id).get();
      snapshotParametros(snapshot);
    } catch (error) {
      console.log(error);
    }
  };

  const abrirEditarGrupo = (g) => {
    setEditGroup({ id: g.id, value: String(g.grupo ?? ''), subtitle: g.subtitulo || '' });
  };

const guardarEdicionGrupo = async () => {
  if (!editGroup.id) return;
  try {
    const num = Number(editGroup.value);
    if (!Number.isFinite(num)) return;

    const update = {
      grupo: num,
      subtitulo: (editGroup.subtitle || '').trim(),
    };

    await firebase.db.collection('parametro').doc(editGroup.id).update(update);

    // 🔹 Cierra el modal de edición inmediatamente
    setEditGroup({ id: null, value: '', subtitle: '' });

    // 🔹 Espera un instante para permitir que se cierre el modal anterior
    setTimeout(async () => {
      await cargarGrupos();
      setShowSubtitleModal(true); // 🔹 Muestra el modal de confirmación
    }, 250);
  } catch (e) {
    console.error('Error renombrando grupo', e);
    setSuccessMsgGroup('No se pudo actualizar el subtítulo. Intente nuevamente.');
    setShowSuccessGroup(true);
  }
};



  const confirmarEliminarGrupo = (id) => setDeleteGroupId(id);

  const eliminarGrupo = async () => {
    if (!deleteGroupId || deletingGroup) return;
    const idAEliminar = deleteGroupId;
    setDeletingGroup(true);
    // Optimista: cerrar modal, mostrar éxito y actualizar UI al instante
    const gruposPrevios = grupos;
    setDeleteGroupId(null);
    setGrupos(prev => prev.filter(g => g.id !== idAEliminar));
    setSuccessMsgGroup('Grupo eliminado correctamente.');
    setShowSuccessGroup(true);

    try {
      await firebase.db.collection('parametro').doc(idAEliminar).delete();
      // Refrescar en background para asegurar consistencia
      cargarGrupos();
    } catch (e) {
      console.error('Error eliminando grupo', e);
      // Revertir cambios optimistas
      setGrupos(gruposPrevios);
      setSuccessMsgGroup('No se pudo eliminar el grupo. Intente nuevamente.');
      setShowSuccessGroup(true);
    } finally {
      setDeletingGroup(false);
    }
  };

  function snapshotParametros(snapshot) {
    setValor(snapshot.data().porcentaje);
  }

  const cargarGrupos = async () => {
    if (!tamboSel) return;
    setCargandoGrupos(true);
    try {
      let snap;
      try {
        snap = await firebase.db
          .collection('parametro')
          .where('idtambo', '==', tamboSel.id)
          .orderBy('grupo')
          .get();
      } catch (errOrder) {
        // fallback sin orderBy por si falta índice o hay tipos mixtos
        console.warn('Fallo orderBy("grupo"), usando fallback sin orden.', errOrder);
        snap = await firebase.db
          .collection('parametro')
          .where('idtambo', '==', tamboSel.id)
          .get();
      }
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        // Solo documentos de grupo (tienen el campo 'parametros' como array)
        .filter(d => Array.isArray(d.parametros))
        .sort((a, b) => Number(a.grupo ?? 0) - Number(b.grupo ?? 0));
      setGrupos(data);
    } catch (error) {
      console.error('Error cargando grupos', error);
    } finally {
      setCargandoGrupos(false);
    }
  };

  const crearNuevoGrupo = async () => {
    if (!tamboSel || creatingGroup) return;
    setCreatingGroup(true);
    try {
      // calcular próximo número de grupo en memoria
      const maxGrupo = grupos.reduce((acc, g) => Math.max(acc, Number(g.grupo ?? 0)), -1);
      const nuevoGrupoNumero = isFinite(maxGrupo) && maxGrupo >= 0 ? maxGrupo + 1 : 0;
      const base = {
        idtambo: tamboSel.id,
        grupo: nuevoGrupoNumero,
        parametros: [
          { categoria: 'Vaca', rodeos: [] },
          { categoria: 'Vaquillona', rodeos: [] }
        ]
      };

      // crear ref primero para obtener ID inmediatamente y abrir el modal sin esperar red
      const ref = firebase.db.collection('parametro').doc();
      setNuevoGrupoId(ref.id);
      setShowNuevoGrupo(true); // abrir modal ya

      // escribir en background (sin bloquear UI)
      ref.set(base)
        .then(() => {
          // refrescar lista sin bloquear
          cargarGrupos();
        })
        .catch((error) => {
          console.error('Error creando grupo', error);
          setShowNuevoGrupo(false);
          setSuccessMsgGroup('No se pudo crear el grupo. Intente nuevamente.');
          setShowSuccessGroup(true);
        })
        .finally(() => setCreatingGroup(false));
    } catch (error) {
      console.error('Error creando grupo', error);
      setCreatingGroup(false);
    }
  };

  const handleApplyChange = async () => {
    if (selectedChange === null || !tamboSel) return;

    let nuevoPorcentaje = selectedChange;
    if (nuevoPorcentaje > 100) nuevoPorcentaje = 100;
    if (nuevoPorcentaje < -50) nuevoPorcentaje = -50;

    const porcentajeAnimal = { porcentaje: 1 + nuevoPorcentaje / 100 };
    const p = { porcentaje: nuevoPorcentaje };

    // ✅ Cambio instantáneo en pantalla
    setValor(nuevoPorcentaje);
    setPorc(nuevoPorcentaje);
    setSelectedChange(null);

    try {
      // ✅ Actualiza el porcentaje general en el tambo
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);

      // ✅ Batch update para animales (más rápido)
      const snapshot = await firebase.db
        .collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .get();

      const batch = firebase.db.batch();
      snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return !data.fbaja && !data.mbaja;
        })
        .forEach(doc => {
          const ref = firebase.db.collection('animal').doc(doc.id);
          batch.update(ref, porcentajeAnimal);
        });

      await batch.commit();

      // ✅ Notificación
      const noti = {
        mensaje: isIncrease
          ? `AUMENTO DEL ${nuevoPorcentaje} %`
          : `REDUCCIÓN DEL ${nuevoPorcentaje} %`,
        fecha: firebase.nowTimeStamp(),
      };

      await firebase.db
        .collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .add(noti);

      dispatch(addNotification({
        ...noti,
        id: Date.now(),
      }));

    } catch (error) {
      console.error("Error al aplicar cambio:", error);
    }
  };


  const restablecer = async () => {
    if (!tamboSel) return;

    const p = { porcentaje: 0 };
    const pAnimal = { porcentaje: 1 };

    // ✅ Cambio instantáneo en pantalla
    setValor(0);
    setSelectedChange(null);
    setIsIncrease(true);

    try {
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);

      const snapshot = await firebase.db
        .collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .get();

      const batch = firebase.db.batch();
      snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return !data.fbaja && !data.mbaja;
        })
        .forEach(doc => {
          const ref = firebase.db.collection('animal').doc(doc.id);
          batch.update(ref, pAnimal);
        });

      await batch.commit();

      const noti = {
        mensaje: 'SE VOLVIÓ AL VALOR ORIGINAL DE LA RACIÓN.',
        fecha: firebase.nowTimeStamp(),
      };

      await firebase.db
        .collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .add(noti);

      dispatch(addNotification({
        ...noti,
        id: Date.now(),
      }));

    } catch (error) {
      console.error("Error al restablecer:", error);
    }
  };



  let porcentaje;
  if (valor >= -50 && valor <= 100 && valor % 10 === 0) {
    porcentaje = 1 + valor / 100;
  }

  return (
    <Layout titulo="Parámetros Nutricionales">
      <div className={styles.container}>
        <h1 className={styles.titulo}>🥩 Parametros de Alimentación</h1>

        <div className={styles.estadoActual}>
          <span className={styles.estadoLabel}>Estado actual:</span>
          <span className={styles.estadoValor}>
            {valor === 0
              ? "Por defecto"
              : valor < 0
                ? `Reducción del ${valor}%`
                : `Aumento del ${valor}%`}
          </span>
        </div>

        <div className={styles.bloqueBotones}>
          <DropdownButton
            id="dropdown-aumentar-button"
            title={
              isIncrease && selectedChange !== null
                ? `Aumento: ${selectedChange}%`
                : "Seleccionar Aumento"
            }
            className={`${styles.dropdownAumentarButton} ${styles.dropdownEstilo}`}
            variant=""
            onSelect={(e) => {
              setSelectedChange(parseInt(e));
              setIsIncrease(true);
            }}
          >
            {["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"].map(
              (p) => (
                <Dropdown.Item key={p} eventKey={p}>
                  {p}%
                </Dropdown.Item>
              )
            )}
          </DropdownButton>

          <Button className={styles.botonRestablecer} onClick={restablecer}>
            Restablecer
          </Button>

          <DropdownButton
            id="dropdown-reducir-button"
            title={
              !isIncrease && selectedChange !== null
                ? `Reducción: ${selectedChange}%`
                : "Seleccionar Reducción"
            }
            className={`${styles.dropdownReducirButton} ${styles.dropdownEstilo}`}
            variant=""
            onSelect={(e) => {
              setSelectedChange(parseInt(e));
              setIsIncrease(false);
            }}
          >
            {["-10", "-20", "-30", "-40", "-50"].map((p) => (
              <Dropdown.Item key={p} eventKey={p}>
                {p}%
              </Dropdown.Item>
            ))}
          </DropdownButton>

          <Button className={`${styles.nuevoGrupoBtn} ${styles.mlAuto}`} onClick={crearNuevoGrupo} disabled={creatingGroup}>
            <RiAddLine size={18} />
            {creatingGroup ? 'Creando…' : 'Nuevo grupo'}
          </Button>
        </div>

        {selectedChange !== null && (
          <div className={styles.botonAplicarWrapper}>
            <Button className={styles.botonAplicar} onClick={handleApplyChange}>
              Aplicar cambio
            </Button>
          </div>
        )}

        {tamboSel ? (
          <>
            {/* Botón de nuevo grupo movido a la barra de acciones superior */}
            {cargandoGrupos ? (
              <div className={styles.spinnerContainerParametros}>
                <div className={styles.spinnerParametros}></div>
                <div className={styles.loaderParametros}>
                  <p>Cargando</p>
                  <div className={styles.wordsParametros}>
                    <span className={styles.wordParametro}>Grupos configurados</span>
                    <span className={styles.wordParametro}>Paratros de Vacas</span>
                    <span className={styles.wordParametro}>Parametros de Vaquillonas</span>
                    <span className={styles.wordParametro}>Unidades de medida</span>
                    <span className={styles.wordParametro}>Rodeo y Orden</span>
                  </div>
                </div>
              </div>
            ) : grupos.length === 0 ? (
              <Mensaje>
                <div className={styles.sinGruposCard}>
                  <h3>📋 Sin grupos configurados</h3>
                  <p>Comience creando un nuevo grupo para definir los parámetros de alimentación.</p>
                </div>
              </Mensaje>

            ) : (
              grupos.map((g) => (
                <div key={g.id} className={styles.cardGrupo}>
                  <div className={styles.headerGrupo}>
                    <h2 className={styles.tituloGrupo}>Grupo {g.grupo}{g.subtitulo ? ` - ${g.subtitulo}` : ''}</h2>
                    <div className={styles.accionesGrupo}>
                      <div className={styles.tooltipWrapper}>
                        <Button variant="outline-primary" size="sm" onClick={() => abrirEditarGrupo(g)}>
                          <RiEditBoxLine size={25} />
                        </Button>
                        <span className={styles.tooltipText}>Editar grupo</span>
                      </div>
                      <div className={styles.tooltipWrapper}>
                        <Button variant="outline-danger" size="sm" onClick={() => confirmarEliminarGrupo(g.id)}>
                          <RiDeleteBin2Line size={25} />
                        </Button>
                        <span className={styles.tooltipText}>Eliminar grupo</span>
                      </div>
                    </div>
                  </div>
                  <Row className="gx-4 gy-4 mt-2">
                    {(g.parametros || []).map((cat) => (
                      <Col md={6} key={cat.categoria}>
                        <DetalleParametro
                          idTambo={tamboSel.id}
                          groupId={g.id}
                          categoria={cat.categoria}
                          porcentaje={porcentaje}
                        />
                      </Col>
                    ))}
                  </Row>
                </div>
              ))
            )}
          </>
        ) : (
          <SelectTambo />
        )}
      </div>

      {showNuevoGrupo && (
        <div className={styles.overlayCard}>
          <div className={styles.paramCardContainer}>
            <div className={styles.paramCardHeader}>
              <h4 className={styles.paramCardTitle}>
                Nuevo Grupo creado • Añadir parámetros iniciales
              </h4>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setShowNuevoGrupo(false)}
              >
                ✕
              </Button>
            </div>

            <div className={styles.paramCardBody}>
              <Row className="gx-4 gy-4">
                <Col md={6} className={styles.modalParamCol}>
                  <h5 className={styles.modalParamColTitulo}>Parametros para Vaca</h5>
                  <DetalleParametro
                    idTambo={tamboSel?.id}
                    groupId={nuevoGrupoId}
                    categoria="Vaca"
                    porcentaje={porcentaje}
                  />
                </Col>
                <Col md={6} className={styles.modalParamCol}>
                  <h5 className={styles.modalParamColTitulo}>Parametros para Vaquillona</h5>
                  <DetalleParametro
                    idTambo={tamboSel?.id}
                    groupId={nuevoGrupoId}
                    categoria="Vaquillona"
                    porcentaje={porcentaje}
                  />
                </Col>
              </Row>
            </div>

            <div className={styles.paramCardFooter}>
              <Button variant="primary" onClick={() => setShowNuevoGrupo(false)}>
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Modal éxito acciones sobre grupo */}
      <Modal show={showSuccessGroup} onHide={() => setShowSuccessGroup(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>✅ Acción completada</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{successMsgGroup}</p>
          <p className="text-muted">(Si no ve el cambio, salga y vuelva a entrar para actualizar.)</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccessGroup(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal editar grupo */}
      <Modal show={!!editGroup.id} onHide={() => setEditGroup({ id: null, value: '', subtitle: '' })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar número de grupo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Número de grupo</label>
            <input
              type="number"
              className="form-control"
              value={editGroup.value}
              onChange={(e) => setEditGroup({ ...editGroup, value: e.target.value })}
              min={0}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Subtítulo (opcional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Holando"
              value={editGroup.subtitle}
              onChange={(e) => setEditGroup({ ...editGroup, subtitle: e.target.value })}
              maxLength={40}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditGroup({ id: null, value: '', subtitle: '' })}>Cancelar</Button>
          <Button variant="primary" onClick={guardarEdicionGrupo}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal eliminar grupo */}
      <Modal show={!!deleteGroupId} onHide={() => setDeleteGroupId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>¿Eliminar grupo?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Esta acción eliminará el grupo y todos sus parámetros. ¿Desea continuar?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteGroupId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminarGrupo}>Eliminar</Button>
        </Modal.Footer>
      </Modal>
      {/* 🔹 Modal específico para cambio de subtítulo */}
      <Modal
        show={showSubtitleModal}
        onHide={() => setShowSubtitleModal(false)}
        centered
        size="sm"
        backdrop={true}
        dialogClassName="modal-alert-success"
      >
        <Modal.Header closeButton>
          <Modal.Title></Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4">
          <div className="mb-3">
            <span
              style={{
                display: 'inline-block',
                backgroundColor: '#28a745',
                borderRadius: '50%',
                width: '70px',
                height: '70px',
                lineHeight: '70px',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                fill="white"
                viewBox="0 0 16 16"
              >
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.07 0l3.992-3.992a.75.75 0 1 0-1.06-1.06L7.5 9.439 5.53 7.47a.75.75 0 0 0-1.06 1.06l2.5 2.5z" />
              </svg>
            </span>
          </div>
          <h5 className="fw-bold text-success">Subtítulo cambiado correctamente</h5>
          <p className="text-muted mb-0">
            Si no ve el cambio reflejado, salga y vuelva a entrar en la sección Parámetros.
          </p>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="success" onClick={() => setShowSubtitleModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

    </Layout >
  );
};

export default Parametros;
