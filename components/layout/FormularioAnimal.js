import React, { useContext, useEffect, useState } from 'react';
import { FirebaseContext } from '../../firebase2';
import useValidacion from '../../hook/useValidacion';
import validarCrearAnimal from '../../validacion/validarCrearAnimal';
import { Form, Spinner, Modal, Alert, Button } from 'react-bootstrap';
import { format } from 'date-fns';
import { RiCloseLine, RiInformationLine, RiPulseLine, RiHeartPulseLine, RiChat1Line } from 'react-icons/ri';
import styles from '../../styles/formularioAnimal.module.scss';

const hoy = format(Date.now(), 'yyyy-MM-dd');

const STATE_INICIAL = {
  ingreso: hoy,
  idtambo: '',
  rp: '',
  erp: '',
  lactancia: 0,
  observaciones: '',
  estpro: 'seca',
  estrep: 'vacia',
  fparto: '',
  fservicio: '',
  categoria: 'Vaquillona',
  racion: 8,
  fracion: hoy,
  nservicio: 1,
  porcentaje: 1,
  uc: 0,
  fuc: hoy,
  ca: 0,
  anorm: '',
  fbaja: '',
  mbaja: '',
  rodeo: 0,
  grupo: 0,
  sugerido: 0
};

const FormularioAnimal = ({ modo = 'alta', animalId = null, onCancel, onSuccess }) => {
  const { firebase, usuario, tamboSel } = useContext(FirebaseContext);
  const [procesando, setProcesando] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const {
    valores,
    errores, // Mantenemos errores de useValidacion por compatibilidad
    handleSubmit,
    handleChange,
    guardarValores
  } = useValidacion(STATE_INICIAL, validarCrearAnimal, modo === 'alta' ? altaAnimal : editarAnimal);

  // Evaluamos las validaciones en tiempo real para la interfaz visual
  const erroresRealtime = validarCrearAnimal(valores);
  
  if (valores.estpro === 'En Ordeñe' && !valores.fparto) {
    erroresRealtime.fparto = "Atención: Recuerde que debe ingresar la fecha del último parto.";
  }
  if (valores.estrep === 'preñada' && !valores.fservicio) {
    erroresRealtime.fservicio = "Atención: Recuerde que debe ingresar la fecha del último servicio.";
  }
  if (valores.grupo === '' || valores.grupo === null || isNaN(valores.grupo)) {
    erroresRealtime.grupo = "El campo 'Grupo' es obligatorio y debe ser numérico.";
  }

  // Consolidamos todos los errores
  const todosLosErrores = { ...errores, ...erroresRealtime, ...serverErrors };
  const hayErrores = Object.keys(todosLosErrores).length > 0;

  const handleCustomChange = (e) => {
    handleChange(e);
    const { name } = e.target;
    if (serverErrors[name]) {
      setServerErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (globalError) setGlobalError('');
  };

  useEffect(() => {
    if (modo === 'alta') {
      guardarValores({
        ...STATE_INICIAL,
        idtambo: tamboSel?.id || '',
        ingreso: hoy,
        fracion: hoy,
        fuc: hoy
      });
    } else if (modo === 'edicion' && animalId) {
      cargarAnimal(animalId);
    }
  }, [modo, animalId]);

  const cargarAnimal = async (id) => {
    setProcesando(true);
    try {
      const doc = await firebase.db.collection('animal').doc(id).get();
      if (doc.exists) {
        guardarValores(doc.data());
      } else {
        setGlobalError("El animal no existe.");
      }
    } catch (e) {
      setGlobalError("Error al cargar el animal.");
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  // ✅ Función para validar el campo grupo
  const validarGrupo = () => {
    if (valores.grupo === '' || valores.grupo === null || isNaN(valores.grupo)) {
      throw new Error("El campo 'Grupo' es obligatorio y debe ser numérico.");
    }
  };

  async function altaAnimal() {
    setProcesando(true);
    setGlobalError('');
    setServerErrors({});
    setMensajeExito('');

    try {
      if (!usuario) throw new Error("No autorizado");
      validarGrupo();

      // Validar RP duplicado
      const rpSnap = await firebase.db.collection('animal')
        .where('idtambo', '==', valores.idtambo)
        .where('rp', '==', valores.rp)
        .where('fbaja', '==', '')
        .get();

      if (!rpSnap.empty) throw new Error("El RP ya está asociado a otro animal.");

      // Validar eRP duplicado
      if (valores.erp) {
        const erpSnap = await firebase.db.collection('animal')
          .where('idtambo', '==', valores.idtambo)
          .where('erp', '==', valores.erp)
          .where('fbaja', '==', '')
          .get();

        if (!rpSnap.empty) throw new Error("El eRP ya está asociado a otro animal.");
      }

      // 👉 Crear el animal en Firebase
      const docRef = await firebase.db.collection('animal').add(valores);

      const detalle = "RP: " + valores.rp + (valores.erp ? " - eRP: " + valores.erp : "");
      await firebase.db.collection('animal').doc(docRef.id).collection('eventos').add({
        fecha: firebase.fechaTimeStamp(valores.ingreso),
        tipo: 'Alta',
        detalle: detalle,
        usuario: usuario.displayName,
        tambo: tamboSel.id,
      });

      // ✅ Mostrar el modal de éxito inmediatamente
      setMensajeExito("✅ Animal dado de alta con éxito.");

    } catch (e) {
      if (e.message.includes("RP ya está asociado")) {
        setServerErrors(prev => ({ ...prev, rp: e.message }));
      } else if (e.message.includes("eRP ya está asociado")) {
        setServerErrors(prev => ({ ...prev, erp: e.message }));
      } else if (e.message.includes("Grupo")) {
        setServerErrors(prev => ({ ...prev, grupo: e.message }));
      } else {
        setGlobalError(e.message);
      }
    } finally {
      setProcesando(false);
    }
  }


  async function editarAnimal() {
    setProcesando(true);
    setGlobalError('');
    setServerErrors({});
    setMensajeExito('');
    try {
      if (!usuario) throw new Error("No autorizado");
      validarGrupo();

      // Validar duplicado RP
      const rpSnap = await firebase.db.collection('animal')
        .where('idtambo', '==', valores.idtambo)
        .where('rp', '==', valores.rp)
        .where('fbaja', '==', '')
        .get();

      if (!rpSnap.empty) {
        const duplicado = rpSnap.docs.find(doc => doc.id !== animalId);
        if (duplicado) throw new Error("El RP ya está asociado a otro animal.");
      }

      // Validar duplicado eRP
      if (valores.erp) {
        const erpSnap = await firebase.db.collection('animal')
          .where('idtambo', '==', valores.idtambo)
          .where('erp', '==', valores.erp)
          .where('fbaja', '==', '')
          .get();

        if (!rpSnap.empty) {
          const duplicado = erpSnap.docs.find(doc => doc.id !== animalId);
          if (duplicado) throw new Error("El eRP ya está asociado a otro animal.");
        }
      }

      await firebase.db.collection('animal').doc(animalId).update(valores);
      setMensajeExito("✅ Animal editado con éxito.");
      if (onSuccess) onSuccess();
    } catch (e) {
      if (e.message.includes("RP ya está asociado")) {
        setServerErrors(prev => ({ ...prev, rp: e.message }));
      } else if (e.message.includes("eRP ya está asociado")) {
        setServerErrors(prev => ({ ...prev, erp: e.message }));
      } else if (e.message.includes("Grupo")) {
        setServerErrors(prev => ({ ...prev, grupo: e.message }));
      } else {
        setGlobalError(e.message);
      }
    } finally {
      setProcesando(false);
    }
  }

  const {
    ingreso, rp, erp, lactancia, estpro, estrep, categoria,
    fservicio, fparto, uc, racion, observaciones,
    grupo
  } = valores;

  return (
    <div className={styles.formContainer}>
      
      {/* HEADER INTEGRADO */}
      <div className={styles.customHeader}>
        <div className={styles.headerTexts}>
          <h2 className={styles.mainTitle}>
            🐄 {modo === 'alta' ? 'Alta de Animal' : 'Editar Animal'}
          </h2>
          <p className={styles.subTitle}>
            {modo === 'alta' ? 'Registrar un nuevo animal dentro del tambo' : 'Modificar los datos del animal seleccionado'}
          </p>
        </div>
        {onCancel && (
          <button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Cerrar">
            <RiCloseLine size={24} />
          </button>
        )}
      </div>

      <Form onSubmit={handleSubmit} className={styles.formBody}>

        {globalError && (
          <Alert variant="danger" className="mb-4 text-center fw-bold">
            ⚠️ {globalError}
          </Alert>
        )}

        {procesando && (
          <div className="text-center mb-4">
            <Spinner animation="border" variant="primary" />
          </div>
        )}

        <div className={styles.grid4Cols}>
          
          {/* Card 1: Información General (1 col) */}
          <div className={styles.cardSection}>
            <div className={styles.cardTitle}>
              <RiInformationLine size={16} /> Info. General
            </div>
            <div className={styles.cardInnerGrid1Col}>
              <div className={styles.formGroup}>
                <Form.Label>Tambo</Form.Label>
                <Form.Control type="text" value={tamboSel?.nombre || ''} readOnly />
              </div>
              <div className={styles.formGroup}>
                <Form.Label>Ingreso</Form.Label>
                <Form.Control type="date" name="ingreso" value={ingreso} onChange={handleCustomChange} max={hoy} />
              </div>
            </div>
          </div>

          {/* Card 2: Información Productiva (1 col) */}
          <div className={styles.cardSection}>
            <div className={styles.cardTitle}>
              <RiPulseLine size={16} /> Productiva
            </div>
            <div className={styles.cardInnerGrid1Col}>
              <div className={styles.formGroup}>
                <Form.Label>Categoría</Form.Label>
                <Form.Control name="categoria" value={categoria} readOnly />
              </div>
              <div className={styles.formGroup}>
                <Form.Label>Lactancia</Form.Label>
                <Form.Control type="number" name="lactancia" value={lactancia} onChange={handleCustomChange} min="0" />
              </div>
            </div>
          </div>

          {/* Card 3: Estado (1 col) */}
          <div className={styles.cardSection}>
            <div className={styles.cardTitle}>
              <RiHeartPulseLine size={16} /> Estado
            </div>
            <div className={styles.cardInnerGrid1Col}>
              <div className={styles.formGroup}>
                <Form.Label>Estado Prod.</Form.Label>
                <Form.Control as="select" name="estpro" value={estpro} onChange={handleCustomChange}>
                  <option value="seca">Seca</option>
                  <option value="En Ordeñe">En Ordeñe</option>
                </Form.Control>
              </div>
              <div className={styles.formGroup}>
                <Form.Label>Últ. Control (Lts)</Form.Label>
                <Form.Control type="number" step="any" name="uc" value={uc} onChange={handleCustomChange} isInvalid={!!todosLosErrores.uc} />
                {todosLosErrores.uc && <div className="invalid-feedback d-block m-0 mt-1">{todosLosErrores.uc}</div>}
              </div>
            </div>
          </div>

          {/* Card 4: Reproducción (1 col) */}
          <div className={styles.cardSection}>
            <div className={styles.cardTitle}>
              <RiHeartPulseLine size={16} /> Reproducción
            </div>
            <div className={styles.cardInnerGrid1Col}>
              <div className={styles.formGroup}>
                <Form.Label>Estado Reprod.</Form.Label>
                <Form.Control as="select" name="estrep" value={estrep} onChange={handleCustomChange}>
                  <option value="vacia">Vacía</option>
                  <option value="preñada">Preñada</option>
                </Form.Control>
              </div>
              <div className={styles.formGroup}>
                <Form.Label>Último Parto</Form.Label>
                <Form.Control type="date" name="fparto" value={fparto} onChange={handleCustomChange} max={hoy} isInvalid={!!todosLosErrores.fparto} />
                {todosLosErrores.fparto && <div className="invalid-feedback d-block m-0 mt-1">{todosLosErrores.fparto}</div>}
              </div>
              <div className={styles.formGroup}>
                <Form.Label>Últ. Servicio</Form.Label>
                <Form.Control type="date" name="fservicio" value={fservicio} onChange={handleCustomChange} max={hoy} isInvalid={!!todosLosErrores.fservicio} />
                {todosLosErrores.fservicio && <div className="invalid-feedback d-block m-0 mt-1">{todosLosErrores.fservicio}</div>}
              </div>
            </div>
          </div>

          {/* Card 5: Identificación (2 cols) */}
          <div className={`${styles.cardSection} ${styles.colSpan2}`}>
            <div className={styles.cardTitle}>
              <RiInformationLine size={16} /> Identificación
            </div>
            <div className={styles.cardInnerGrid}>
              <div className={styles.formGroup}>
                <Form.Label>RP (caravana)</Form.Label>
                <Form.Control name="rp" value={rp} onChange={handleCustomChange} required isInvalid={!!todosLosErrores.rp} placeholder="Ej: 1540" />
                {todosLosErrores.rp && <div className="invalid-feedback d-block m-0">{todosLosErrores.rp}</div>}
              </div>
              <div className={styles.formGroup}>
                <Form.Label>eRP (botón)</Form.Label>
                <Form.Control name="erp" value={erp} onChange={handleCustomChange} isInvalid={!!todosLosErrores.erp} placeholder="Opcional" />
                {todosLosErrores.erp && <div className="invalid-feedback d-block m-0">{todosLosErrores.erp}</div>}
              </div>
            </div>
          </div>

          {/* Card 6: Alimentación (2 cols) */}
          <div className={`${styles.cardSection} ${styles.colSpan2}`}>
            <div className={styles.cardTitle}>
              <RiInformationLine size={16} /> Alimentación
            </div>
            <div className={styles.cardInnerGrid}>
              <div className={styles.formGroup}>
                <Form.Label>Grupo</Form.Label>
                <Form.Control type="number" name="grupo" value={grupo} onChange={handleCustomChange} min="0" step="1" required isInvalid={!!todosLosErrores.grupo} placeholder="Ej: 5" />
                {todosLosErrores.grupo ? (
                  <div className="invalid-feedback d-block m-0">{todosLosErrores.grupo}</div>
                ) : (
                  <span className={styles.helpText}>Número identificador del grupo alimenticio.</span>
                )}
              </div>
              <div className={styles.formGroup}>
                <Form.Label>Ración (Kgs)</Form.Label>
                <Form.Control type="number" step="any" name="racion" value={racion} onChange={handleCustomChange} min="0" />
              </div>
            </div>
          </div>

          {/* Card 7: Observaciones (4 cols) */}
          <div className={`${styles.cardSection} ${styles.colSpan4}`}>
            <div className={styles.cardTitle}>
              <RiChat1Line size={16} /> Observaciones
            </div>
            <div className={styles.formGroup}>
              <Form.Control as="textarea" rows={3} name="observaciones" value={observaciones} onChange={handleCustomChange} placeholder="Ingrese cualquier observación, condición física o nota relevante sobre el animal..." />
            </div>
          </div>

        </div>
      </Form>
      
      {/* FOOTER INTEGRADO */}
      <div className={styles.footer}>
        {onCancel && (
          <button type="button" className={styles.btnCancel} onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="button" className={styles.btnSave} onClick={handleSubmit} disabled={procesando || hayErrores}>
          {procesando && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />}
          {modo === 'alta' ? 'Guardar Animal' : 'Actualizar Animal'}
        </button>
      </div>

      {/* ✅ MODAL DE ÉXITO */}
      <Modal
        show={!!mensajeExito}
        onHide={() => setMensajeExito('')}
        centered
        backdrop="static"
        keyboard={false}
        className="modal-success"
      >
        <Modal.Header closeButton>
          <Modal.Title className="w-100 text-center fs-4 fw-bold">
            ✅ Éxito
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="fs-5 mb-3">{mensajeExito}</p>
          <p className="opacity-75">
            El animal fue registrado correctamente en la base de datos.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light"
            className="text-success fw-semibold px-4"
            onClick={() => {
              setMensajeExito('');
              if (onSuccess) onSuccess();
            }}
          >
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default FormularioAnimal;
