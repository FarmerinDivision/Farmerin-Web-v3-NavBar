import React, { useState, useContext, useEffect, useRef } from 'react';
import { FirebaseContext } from '../../firebase2';
import { RiPencilLine, RiSettings4Line } from 'react-icons/ri';
import { Button, OverlayTrigger, Tooltip, Modal } from 'react-bootstrap';
import styles from '../../styles/Control.module.scss';
import { explicarDecisionAlimentacion } from '../../utils/explicarDecisionAlimentacion';

function etiquetaValorDecision(criterio) {
   if (criterio === 'Días de Lactancia') return 'Días de Lactancia del animal';
   if (criterio === 'Producción (Último Control)') return 'Litros de UC del animal';
   return 'Datos del animal';
}

const DetalleControl = ({ animal, animales, guardarAnimales, racionModificada, parametrosFlat = [] }) => {

   const { id, rp, categoria, racion, sugerido, rodeo, grupo } = animal;
   const [sug, guardarSug] = useState(0);
   const [colorCelda, guardarColorCelda] = useState('');
   const [editando, setEditando] = useState(false);
   const target = useRef(null);
   const { firebase } = useContext(FirebaseContext);
   const [showSuccessModal, setShowSuccessModal] = useState(false);
   const [showErrorModal, setShowErrorModal] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");
   const [manual, setManual] = useState(!!animal.racionManual);

   const explicacion = explicarDecisionAlimentacion(animal, parametrosFlat);

   useEffect(() => {
      setManual(!!animal.racionManual);
   }, [animal.racionManual]);

   useEffect(() => {
      guardarSug(sugerido);
      guardarColorCelda('text-info');
      if (Number.parseInt(sugerido) < Number.parseInt(racion)) guardarColorCelda('text-danger');
      if (Number.parseInt(sugerido) > Number.parseInt(racion)) guardarColorCelda('text-success');
   }, []);

   function cambiarRacion() {
      const animalesAct = animales.map(a => {
         if (a.id === id) {
            async function fEditar(a) {
               let racionAnt = a.racion;
               let racionManual = false;
               try {
                  a.racion = sug;
                  a.fracion = firebase.nowTimeStamp();
                  a.actu = true;
                  if (sug != a.sugerido) {
                     racionManual = true;
                  }
                  const anim = {
                     racion: a.racion,
                     fracion: a.fracion,
                     racionManual: racionManual
                  }
                  await firebase.db.collection('animal').doc(a.id).update(anim);
                  return a;
               } catch (error) {
                  a.racion = racionAnt;
                  a.actu = false;
                  setErrorMessage(error.message || "Ocurrió un error al modificar la ración.");
                  setShowErrorModal(true);
                  return a;
               }
            }
            fEditar(a);
            setShowSuccessModal(true);
            setEditando(false);
         }
         return a;
      });

      guardarAnimales(animalesAct);
   };

   const changeSugerido = e => {
      guardarSug(e.target.value);
   }

   const toggleRacionManual = async () => {
      try {
         const nuevoValor = !manual;

         await firebase.db.collection("animal").doc(id).update({
            racionManual: nuevoValor
         });

         setManual(nuevoValor);

         // Al cambiar a Manual → abrir editor; al cambiar a Automático → cerrar editor
         if (nuevoValor) {
            setEditando(true);
         } else {
            setEditando(false);
         }

         const animalesAct = animales.map(a =>
            a.id === id ? { ...a, racionManual: nuevoValor } : a
         );
         guardarAnimales(animalesAct);

      } catch (error) {
         setErrorMessage("Error al actualizar estado manual");
         setShowErrorModal(true);
      }
   };

   const handleGuardarEdicion = () => {
      cambiarRacion();
   };

   return (
      <tr className={`${styles.dataRow} ${manual ? styles.rowManual : styles.rowAuto}`}>
         {/* 1. Animal */}
         <td className={styles.colAnimal}>
            <div className={styles.animalCell}>
               <span className={styles.animalRp}>{rp}</span>
               <div className={styles.animalMeta}>
                  <span>Grupo {grupo ?? '—'}</span>
                  <span className={styles.metaDot}>·</span>
                  <span>{categoria}</span>
                  <span className={styles.metaDot}>·</span>
                  <span>Rodeo {rodeo ?? '—'}</span>
               </div>
            </div>
         </td>

         {/* 2. Alimentación */}
         <td className={styles.colAlimentacion}>
            <div className={styles.alimentacionCell}>
               {editando ? (
                  <div className={styles.editInline}>
                     <input
                        className={`${styles.inputRacion} ${colorCelda}`}
                        type="number"
                        min="1"
                        max="50"
                        value={sug}
                        onChange={changeSugerido}
                        autoFocus
                     />
                     <span className={styles.kgLabel}>kg</span>
                     <button type="button" className={styles.btnGuardarInline} onClick={handleGuardarEdicion}>
                        Guardar
                     </button>
                     <button type="button" className={styles.btnCancelarInline} onClick={() => setEditando(false)}>
                        Cancelar
                     </button>
                  </div>
               ) : (
                  <>
                     <span className={styles.racionPrincipal}>{racionModificada} kg</span>
                     <span className={manual ? styles.modoManual : styles.modoAuto}>
                        {manual ? '✋ Manual' : '⚙ Automático'}
                     </span>
                  </>
               )}
            </div>
         </td>

         {/* 3. Decisión */}
         <td className={styles.colDecision}>
            {explicacion.modo === 'manual' ? (
               <div className={styles.decisionCell}>
                  <p className={styles.decisionTitulo}>{explicacion.titulo}</p>
                  <p className={styles.decisionSubtitulo}>{explicacion.subtitulo}</p>
                  <div className={styles.decisionPreview}>
                     <span className={styles.decisionPreviewLabel}>Si hoy volviera al modo Automático:</span>
                     {explicacion.sinParametro ? (
                        <>
                           <span className={styles.decisionPreviewValor}>{explicacion.racionAutomatica} kg</span>
                           <span className={styles.decisionPreviewDetalle}>
                              No se encontró un parámetro que coincida con las condiciones actuales.
                           </span>
                        </>
                     ) : (
                        <div className={styles.decisionGrid}>
                           <div className={styles.decisionItem}>
                              <span className={styles.decisionLabel}>Criterio</span>
                              <span className={styles.decisionValue}>{explicacion.criterio}</span>
                           </div>
                           <div className={styles.decisionItem}>
                              <span className={styles.decisionLabel}>{etiquetaValorDecision(explicacion.criterio)}</span>
                              <span className={styles.decisionValue}>{explicacion.valor}</span>
                           </div>
                           <div className={styles.decisionItem}>
                              <span className={styles.decisionLabel}>Regla aplicada</span>
                              <span className={styles.decisionValue}>{explicacion.regla}</span>
                           </div>
                           <div className={styles.decisionItem}>
                              <span className={styles.decisionLabel}>Resultado</span>
                              <span className={styles.decisionResultado}>{explicacion.racionAutomatica} kg</span>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            ) : (
               <div className={styles.decisionCell}>
                  <p className={styles.decisionTitulo}>{explicacion.titulo}</p>
                  <div className={styles.decisionGrid}>
                     <div className={styles.decisionItem}>
                        <span className={styles.decisionLabel}>Criterio</span>
                        <span className={styles.decisionValue}>{explicacion.criterio}</span>
                     </div>
                     <div className={styles.decisionItem}>
                        <span className={styles.decisionLabel}>{etiquetaValorDecision(explicacion.criterio)}</span>
                        <span className={styles.decisionValue}>{explicacion.valor}</span>
                     </div>
                     <div className={styles.decisionItem}>
                        <span className={styles.decisionLabel}>Regla aplicada</span>
                        <span className={styles.decisionValue}>{explicacion.regla}</span>
                     </div>
                     <div className={styles.decisionItem}>
                        <span className={styles.decisionLabel}>Resultado</span>
                        <span className={styles.decisionResultado}>{explicacion.resultado} kg</span>
                     </div>
                  </div>
               </div>
            )}
         </td>

         {/* 4. Estado */}
         <td className={styles.colEstado}>
            <span className={manual ? styles.badgeManual : styles.badgeAuto}>
               {manual ? '🟠 Manual' : '🟢 Automático'}
            </span>
         </td>

         {/* 5. Acciones */}
         <td className={styles.colAcciones}>
            <div className={styles.accionesCell}>
               <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip>{manual ? 'Cambiar a Automático' : 'Cambiar a Manual'}</Tooltip>}
               >
                  <button
                     ref={target}
                     type="button"
                     className={`${styles.btnAccion} ${styles.btnAccionModo}`}
                     onClick={toggleRacionManual}
                     disabled={editando}
                  >
                     <RiSettings4Line size={16} />
                     <span>Cambiar modo</span>
                  </button>
               </OverlayTrigger>
               {manual && !editando && (
                  <OverlayTrigger placement="top" overlay={<Tooltip>Editar ración</Tooltip>}>
                     <button
                        type="button"
                        className={styles.btnAccion}
                        onClick={() => setEditando(true)}
                     >
                        <RiPencilLine size={16} />
                        <span>Editar ración</span>
                     </button>
                  </OverlayTrigger>
               )}
            </div>

            <Modal
               show={showErrorModal}
               onHide={() => setShowErrorModal(false)}
               centered
               size="sm"
               backdrop="static"
               dialogClassName="modal-alert-error"
            >
               <Modal.Body className="text-center p-4">
                  <div className="mb-3">
                     <span
                        style={{
                           display: 'inline-block',
                           backgroundColor: '#dc3545',
                           borderRadius: '50%',
                           width: '70px',
                           height: '70px',
                           lineHeight: '70px',
                        }}
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="white" viewBox="0 0 16 16">
                           <path d="M7.001 4a.999.999 0 0 1 2 0l-.35 4.35a.65.65 0 0 1-1.3 0L7 4zM8 12a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 8 12z" />
                        </svg>
                     </span>
                  </div>
                  <h5 className="fw-bold text-danger">Error</h5>
                  <p className="text-muted mb-0">{errorMessage}</p>
               </Modal.Body>
            </Modal>

            <Modal
               show={showSuccessModal}
               onHide={() => setShowSuccessModal(false)}
               centered
               size="sm"
               backdrop="static"
               dialogClassName="modal-alert-success"
            >
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="white" viewBox="0 0 16 16">
                           <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.07 0l3.992-3.992a.75.75 0 1 0-1.06-1.06L7.5 9.439 5.53 7.47a.75.75 0 0 0-1.06 1.06l2.5 2.5z" />
                        </svg>
                     </span>
                  </div>
                  <h5 className="fw-bold text-success">¡Ración modificada!</h5>
                  <p className="text-muted mb-0">Los cambios fueron guardados correctamente.</p>
               </Modal.Body>
               <Modal.Footer className="justify-content-center">
                  <Button variant="success" onClick={() => setShowSuccessModal(false)}>
                     Cerrar
                  </Button>
               </Modal.Footer>
            </Modal>
         </td>
      </tr>
   );
}

export default DetalleControl;
