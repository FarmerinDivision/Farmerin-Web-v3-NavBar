import React, { useEffect, useContext, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import app from 'firebase/app';
import { FirebaseContext } from '../../../firebase2';
import useValidacion from '../../../hook/useValidacion';
import validarCrearAnimal from '../../../validacion/validarCrearAnimal';
import Layout from '../../../components/layout/layout';
import { Form, Alert, Spinner, Modal, Button } from 'react-bootstrap';
import { format } from 'date-fns';
import { RiInformationLine, RiPulseLine, RiHeartPulseLine, RiChat1Line, RiArrowLeftLine, RiSave3Line } from 'react-icons/ri';
import Lottie from 'lottie-react';
import vacaAnimacion from '../../../public/animaciones/Animation - Vaca.json';

// Use same styles from the Detail View for consistency
import detailStyles from '../../../styles/animalDetail.module.scss';
// Keep form specifics if needed, but we'll adapt to the detail grid
import formStyles from '../../../styles/formularioAnimal.module.scss';

const STATE_INICIAL = {
  ingreso: format(Date.now(), 'yyyy-MM-dd'),
  idtambo: '0',
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
  fracion: format(Date.now(), 'yyyy-MM-dd'),
  nservicio: 1,
  porcentaje: 1,
  uc: 0,
  fuc: format(Date.now(), 'yyyy-MM-dd'),
  ca: 0,
  anorm: '',
  fbaja: '',
  mbaja: '',
  grupo: '',
  rodeo: 0,
  sugerido: 0,
};

const EditarAnimal = () => {
  const router = useRouter();
  const { id } = router.query;
  const { usuario, firebase, tamboSel } = useContext(FirebaseContext);
  
  const [animal, setAnimal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [campoProtegido, setCampoProtegido] = useState(true); // Siempre true en edición
  const [exito, setExito] = useState(false);
  const [descExito, setDescExito] = useState('');
  const [error, setError] = useState(false);
  const [descError, setDescError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [tambos, setTambos] = useState([]);
  const [errorERP, setErrorERP] = useState('');

  const hoy = format(Date.now(), 'yyyy-MM-dd');

  const {
    valores, errores, handleSubmit, handleChange, handleBlur, guardarValores
  } = useValidacion(STATE_INICIAL, validarCrearAnimal, submitAnimal);

  const {
    idtambo, rp, erp, lactancia, ingreso, observaciones, estpro, estrep,
    fparto, fservicio, categoria, racion, fracion, nservicio, porcentaje,
    uc, fuc, ca, anorm, fbaja, mbaja, rodeo, sugerido, grupo
  } = valores;

  const requiereFechaServicio = valores.estrep === 'preñada' && !valores.fservicio;
  const requiereFechaParto = valores.estpro === 'En Ordeñe' && !valores.fparto;

  // 1. Cargar tambos
  useEffect(() => {
    const unsubscribe = firebase.db.collection('tambo').orderBy('nombre', 'desc').onSnapshot(snapshotTambo);
    return () => unsubscribe();
  }, [firebase]);

  function snapshotTambo(snapshot) {
    const tambosArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTambos(tambosArray);
  }

  // 2. Cargar datos del animal a editar
  useEffect(() => {
    if (!id) return;
    const fetchAnimal = async () => {
      try {
        const doc = await firebase.db.collection('animal').doc(id).get();
        if (doc.exists) {
            const data = { id: doc.id, ...doc.data() };
            setAnimal(data);
            
            // 🔥 convertir timestamps a string yyyy-MM-dd
            const convertirFecha = (valor) => {
              if (!valor) return '';
              if (typeof valor === 'string') return valor;
              if (valor.toDate) return format(valor.toDate(), 'yyyy-MM-dd');
              return '';
            };

            guardarValores({
              ...data,
              ingreso: convertirFecha(data.ingreso),
              fparto: convertirFecha(data.fparto),
              fservicio: convertirFecha(data.fservicio),
              fracion: convertirFecha(data.fracion),
              fuc: convertirFecha(data.fuc),
              fbaja: convertirFecha(data.fbaja),
            });
        } else {
            setError(true);
            setDescError('Animal no encontrado.');
        }
      } catch (err) {
          console.error(err);
          setError(true);
          setDescError('Hubo un error al cargar los datos del animal.');
      } finally {
          setCargando(false);
      }
    };
    fetchAnimal();
  }, [id, firebase]);

  async function submitAnimal() {
    setProcesando(true);
    setError(false);
    setExito(false);

    if (!usuario) {
        setProcesando(false);
        return;
    }
    
    // ⚠️ Validación: si está preñada debe ingresar fecha de último servicio
    if (valores.estrep === "preñada" && !valores.fservicio) {
      setDescError("Si el animal está preñada, debe ingresar la fecha de Último Servicio.");
      setError(true);
      setProcesando(false);
      return;
    }
    
    let existeRP = false;
    let existeERP = false;

    if (rp) {
      const snapshot = await firebase.db.collection('animal')
        .where('idtambo', '==', idtambo)
        .where('rp', '==', rp)
        .where('fbaja', '==', '')
        .get();
      snapshot.forEach(doc => {
        if (doc.id !== animal.id) existeRP = true;
      });
      if (existeRP) {
        setDescError('El RP ya está asociado a otro animal!');
        setError(true);
        setProcesando(false);
        return;
      }
    }

    if (erp) {
      const snapshot = await firebase.db.collection('animal')
        .where('idtambo', '==', idtambo)
        .where('erp', '==', erp)
        .where('fbaja', '==', '')
        .get();
      snapshot.forEach(doc => {
        if (doc.id !== animal.id) existeERP = true;
      });
      if (existeERP) {
        setDescError('El eRP ya está asociado a otro animal!');
        setError(true);
        setProcesando(false);
        return;
      }
    }

    try {
      // Detectar cambios en campos específicos para registrar eventos
      const eventosARegistrar = [];

      // Cambio eRP
      if (animal && 'erp' in animal) {
        const valorAnterior = animal.erp || '';
        const valorNuevo = erp || '';
        const ambosVacios = valorAnterior === '' && valorNuevo === '';
        if (!ambosVacios && valorAnterior !== valorNuevo) {
          eventosARegistrar.push({
            tipo: 'Cambio eRP',
            detalle: `eRP anterior: ${valorAnterior || 'Sin eRP'}`,
          });
        }
      }

      // Cambio RP
      if (animal && 'rp' in animal) {
        const valorAnterior = animal.rp || '';
        const valorNuevo = rp || '';
        const ambosVacios = valorAnterior === '' && valorNuevo === '';
        if (!ambosVacios && valorAnterior !== valorNuevo) {
          eventosARegistrar.push({
            tipo: 'Cambio RP',
            detalle: `RP anterior: ${valorAnterior || 'Sin RP'}`,
          });
        }
      }

      // Cambio Grupo
      if (animal && 'grupo' in animal) {
        const normalizarGrupo = (valor) => {
          if (valor === undefined || valor === null || valor === '') return '0';
          return String(valor);
        };

        const valorAnteriorNorm = normalizarGrupo(animal.grupo);
        const valorNuevoNorm = normalizarGrupo(grupo);

        if (valorAnteriorNorm !== valorNuevoNorm) {
          eventosARegistrar.push({
            tipo: 'Cambio Grupo',
            detalle: `Grupo anterior: Grupo ${valorAnteriorNorm}`,
          });
        }
      }

      // Aseguramos que los valores actuales (incluyendo erp actualizado) se persistan
      await firebase.db.collection('animal').doc(animal.id).update({
        ...valores,
        erp,
      });

      // Registrar eventos de cambios, si corresponde
      if (eventosARegistrar.length > 0) {
        const idTamboEvento = idtambo || (tamboSel && tamboSel.id) || '';
        const usuarioEvento = (usuario && usuario.displayName) || (usuario && usuario.email) || '';
        const refAnimal = firebase.db.collection('animal').doc(animal.id);

        const promesasEventos = eventosARegistrar.map((ev) =>
          refAnimal.collection('eventos').add({
            detalle: ev.detalle,
            fecha: app.firestore.FieldValue.serverTimestamp(),
            idtambo: idTamboEvento,
            tipo: ev.tipo,
            usuario: usuarioEvento,
          })
        );

        await Promise.all(promesasEventos);
      }

      setDescExito('Animal editado con éxito!');
      setExito(true);

      // Invalida el cache para forzar la recarga de la lista de animales
      const tamboId = idtambo || (tamboSel && tamboSel.id);
      if (tamboId) {
        sessionStorage.removeItem(`animales_data_cache_${tamboId}`);
      }

      // La redirección ahora se maneja al cerrar el modal de éxito.
    } catch (e) {
      setDescError(e.message);
      setError(true);
    }

    setProcesando(false);
  }

  if (cargando) {
      return (
          <Layout titulo="Cargando Animal...">
              <div className={detailStyles.loaderContainer}>
                  <div style={{ maxWidth: 300, textAlign: 'center' }}>
                      <Lottie animationData={vacaAnimacion} loop autoplay />
                      <p className={detailStyles.textoLoader}>CARGANDO DATOS PARA EDICIÓN...</p>
                  </div>
              </div>
          </Layout>
      );
  }

  if (!animal && error) {
      return (
          <Layout titulo="Error">
              <div className={detailStyles.pageContainer}>
                  <Alert variant="danger">{descError}</Alert>
                  <Link href="/animales">
                      <button className="btn btn-secondary mt-3">Volver a Animales</button>
                  </Link>
              </div>
          </Layout>
      );
  }

  return (
    <Layout titulo={`Editar Animal RP: ${rp || 'Sin RP'}`}>
      <div className={detailStyles.pageContainer}>
        
        {/* BACK LINK */}
        <div className={detailStyles.backLinkContainer}>
            <Link href="/animales" passHref>
                <a className={detailStyles.backLink}>
                    <RiArrowLeftLine size={20} />
                    Volver a Animales
                </a>
            </Link>
        </div>

        {/* HEADER CARD */}
        <div className={detailStyles.headerCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h2 className={detailStyles.mainTitle} style={{ marginBottom: '8px' }}>
                ✏️ Editar Animal RP: {animal?.rp}
            </h2>
            <p className={detailStyles.metaInfo} style={{ margin: 0 }}>
                Actualiza los datos del animal seleccionado
            </p>
        </div>

        {/* FORM CONTENT */}
        <div className={detailStyles.gridContainer}>
          {procesando && (
             <div className={detailStyles.colSpan4} style={{ textAlign: 'center', margin: '20px 0' }}>
               <Spinner animation="border" variant="primary" />
             </div>
          )}
          {error && (
            <div className={detailStyles.colSpan4}>
               <Alert variant="danger">{descError}</Alert>
            </div>
          )}

          <Form id="editarAnimalForm" onSubmit={handleSubmit} style={{ display: 'contents' }}>
            
            {/* Card 1: Información General (1 col) */}
            <div className={detailStyles.cardSection}>
              <div className={detailStyles.cardHeader}>
                <RiInformationLine /> <h4>Info. General</h4>
              </div>
              <div className={detailStyles.cardInnerGrid1Col}>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Tambo</Form.Label>
                  <Form.Control
                    type="text"
                    value={tambos.find(t => t.id === idtambo)?.nombre || tamboSel?.nombre || ''}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Ingreso</Form.Label>
                  <Form.Control type="date" name="ingreso" value={ingreso} onChange={handleChange} max={hoy} />
                  {errores.ingreso && <div className="text-danger small mt-1">{errores.ingreso}</div>}
                </div>
              </div>
            </div>

            {/* Card 2: Información Productiva (1 col) */}
            <div className={detailStyles.cardSection}>
              <div className={detailStyles.cardHeader}>
                <RiPulseLine /> <h4>Productiva</h4>
              </div>
              <div className={detailStyles.cardInnerGrid1Col}>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Categoría</Form.Label>
                  <Form.Control type="text" name="categoria" value={categoria} onChange={handleChange} disabled />
                </div>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Lactancia</Form.Label>
                  <Form.Control type="number" name="lactancia" value={lactancia} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Card 3: Estado (1 col) */}
            <div className={detailStyles.cardSection}>
              <div className={detailStyles.cardHeader}>
                <RiHeartPulseLine /> <h4>Estado</h4>
              </div>
              <div className={detailStyles.cardInnerGrid1Col}>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Estado Prod.</Form.Label>
                  <Form.Control as="select" name="estpro" value={estpro} onChange={handleChange}>
                    <option value="seca">Seca</option>
                    <option value="En Ordeñe">En Ordeñe</option>
                  </Form.Control>
                </div>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Últ. Control (Lts)</Form.Label>
                  <Form.Control type="number" name="uc" value={uc} onChange={handleChange} readOnly={campoProtegido} />
                </div>
              </div>
            </div>

            {/* Card 4: Reproducción (1 col) */}
            <div className={detailStyles.cardSection}>
              <div className={detailStyles.cardHeader}>
                <RiHeartPulseLine /> <h4>Reproducción</h4>
              </div>
              <div className={detailStyles.cardInnerGrid1Col}>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Estado Reprod.</Form.Label>
                  <Form.Control as="select" name="estrep" value={estrep} onChange={handleChange}>
                    <option value="vacia">Vacía</option>
                    <option value="preñada">Preñada</option>
                  </Form.Control>
                </div>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Último Parto</Form.Label>
                  <Form.Control
                    type="date"
                    name="fparto"
                    value={fparto || ""}
                    onChange={handleChange}
                    max={hoy}
                  />
                  {requiereFechaParto && (
                    <div className="text-warning small mt-1">
                      Si seleccionaste "En Ordeñe", ingresá la fecha de Último parto.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Últ. Servicio</Form.Label>
                  <Form.Control
                    type="date"
                    name="fservicio"
                    value={fservicio}
                    onChange={handleChange}
                    max={hoy}
                    required={estrep === 'preñada'}
                  />
                  {requiereFechaServicio && (
                    <div className="text-warning small mt-1">
                      Si seleccionaste “Preñada”, ingresá la fecha de Último Servicio.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 5: Identificación (2 cols) */}
            <div className={`${detailStyles.cardSection} ${detailStyles.colSpan2}`}>
              <div className={detailStyles.cardHeader}>
                <RiInformationLine /> <h4>Identificación</h4>
              </div>
              <div className={detailStyles.cardInnerGrid}>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>RP (caravana)</Form.Label>
                  <Form.Control type="text" name="rp" value={rp} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>eRP (botón)</Form.Label>
                  <Form.Control
                    type="text"
                    name="erp"
                    value={erp}
                    onChange={(e) => {
                      handleChange(e);
                      const val = e.target.value;
                      if (val && val.length < 15) {
                        setErrorERP(`Faltan ${15 - val.length} dígitos para completar el eRP`);
                      } else {
                        setErrorERP('');
                      }
                    }}
                  />
                  {errorERP && <div className="text-warning small mt-1">{errorERP}</div>}
                </div>
              </div>
            </div>

            {/* Card 6: Alimentación (2 cols) */}
            <div className={`${detailStyles.cardSection} ${detailStyles.colSpan2}`}>
              <div className={detailStyles.cardHeader}>
                <RiInformationLine /> <h4>Alimentación</h4>
              </div>
              <div className={detailStyles.cardInnerGrid}>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Grupo</Form.Label>
                  <Form.Control type="text" name="grupo" value={grupo} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <Form.Label className={detailStyles.dataLabel}>Ración (kg)</Form.Label>
                  <Form.Control type="number" name="racion" value={racion} onChange={handleChange} readOnly={campoProtegido} />
                </div>
              </div>
            </div>

            {/* Card 7: Observaciones (4 cols) */}
            <div className={`${detailStyles.cardSection} ${detailStyles.colSpan4}`}>
              <div className={detailStyles.cardHeader}>
                <RiChat1Line /> <h4>Observaciones</h4>
              </div>
              <div className="form-group">
                <Form.Control as="textarea" rows={3} name="observaciones" value={observaciones} onChange={handleChange} />
              </div>
            </div>
            
          </Form>
        </div>

        {/* Action Buttons */}
        <div className={`${detailStyles.cardSection} ${detailStyles.colSpan4}`} style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <Link href="/animales">
                <button type="button" className="btn btn-secondary px-4 py-2" style={{ borderRadius: '8px', fontWeight: 600 }}>
                    Cancelar
                </button>
            </Link>
            <button 
                type="submit" 
                form="editarAnimalForm"
                className="btn btn-primary px-4 py-2" 
                style={{ borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={requiereFechaServicio || requiereFechaParto || procesando}
            >
                <RiSave3Line size={20} />
                Actualizar Animal
            </button>
        </div>

        {/* Modal de Éxito */}
        <Modal show={exito} onHide={() => router.push('/animales')} centered backdrop="static">
          <Modal.Header closeButton style={{ borderBottom: 'none' }}>
          </Modal.Header>
          <Modal.Body style={{ textAlign: 'center', padding: '10px 20px 30px' }}>
             <div style={{ background: '#d1fae5', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <RiSave3Line size={40} color="#10b981" />
             </div>
             <h4 style={{ color: '#065f46', fontWeight: 600, marginBottom: '10px' }}>¡Operación Exitosa!</h4>
             <p style={{ color: '#059669', fontSize: '16px', margin: 0 }}>{descExito}</p>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: 'none', justifyContent: 'center', paddingBottom: '30px' }}>
            <Button variant="success" onClick={() => router.push('/animales')} style={{ padding: '10px 40px', fontWeight: 600, borderRadius: '8px', background: '#10b981', border: 'none', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}>
              Continuar
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
    </Layout>
  );
};

export default EditarAnimal;
