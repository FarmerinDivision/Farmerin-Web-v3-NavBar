import React, { useEffect, useContext, useState } from 'react';
import app from 'firebase/app';
import { FirebaseContext } from '../../firebase2';
import useValidacion from '../../hook/useValidacion';
import validarCrearAnimal from '../../validacion/validarCrearAnimal';
import { Form, Button, Alert, Spinner, Row, Col, Modal } from 'react-bootstrap';
import { format } from 'date-fns';
import styles from '../../styles/Animales.module.scss';

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

const ModalAnimalForm = ({ animal, show, onHide, guardarElim }) => {
  const { usuario, firebase, tamboSel } = useContext(FirebaseContext);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [campoProtegido, setCampoProtegido] = useState(false);
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

  useEffect(() => {
    firebase.db.collection('tambo').orderBy('nombre', 'desc').onSnapshot(snapshotTambo);

    if (animal?.id) {
      setModoEdicion(true);
      setCampoProtegido(true);

      // 🔥 convertir timestamps a string yyyy-MM-dd
      const convertirFecha = (valor) => {
        if (!valor) return '';
        if (typeof valor === 'string') return valor; // ya está ok
        if (valor.toDate) return format(valor.toDate(), 'yyyy-MM-dd'); // timestamp firebase
        return '';
      };

      guardarValores({
        ...animal,
        ingreso: convertirFecha(animal.ingreso),
        fparto: convertirFecha(animal.fparto),
        fservicio: convertirFecha(animal.fservicio),
        fracion: convertirFecha(animal.fracion),
        fuc: convertirFecha(animal.fuc),
        fbaja: convertirFecha(animal.fbaja),
      });
    } else {
      guardarValores({
        ...STATE_INICIAL,
        idtambo: tamboSel.id,
        fracion: firebase.ayerTimeStamp(),
        fuc: firebase.nowTimeStamp(),
      });
    }
  }, [animal]);


  function snapshotTambo(snapshot) {
    const tambosArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTambos(tambosArray);
  }

  async function submitAnimal() {
    setProcesando(true);
    setError(false);
    setExito(false);

    if (!usuario) return;
    // ⚠️ Nueva validación: si está preñada debe ingresar fecha de último servicio
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
        if (!modoEdicion || doc.id !== animal.id) existeRP = true;
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
        if (!modoEdicion || doc.id !== animal.id) existeERP = true;
      });
      if (existeERP) {
        setDescError('El eRP ya está asociado a otro animal!');
        setError(true);
        setProcesando(false);
        return;
      }
    }

    try {
      if (modoEdicion) {
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
      } else {
        await firebase.db.collection('animal').add(valores);
        setDescExito('Animal dado de alta con éxito!');
        guardarElim(true);
      }
      setExito(true);
      setTimeout(() => onHide(), 1000);
    } catch (e) {
      setDescError(e.message);
      setError(true);
    }

    setProcesando(false);
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className={styles.modalAnimal}>
      <Modal.Header closeButton>
        <Modal.Title>{modoEdicion ? 'Editar Animal' : 'Nuevo Animal'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {procesando && <Spinner animation="border" variant="info" className="mb-3" />}
        {exito && <Alert variant="success">{descExito}</Alert>}
        {error && <Alert variant="danger">{descError}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Form.Group>
              <Form.Label>Tambo</Form.Label>
              <Form.Control
                type="text"
                value={
                  tambos.find(t => t.id === idtambo)?.nombre || tamboSel?.nombre || ''
                }
                readOnly
              />
            </Form.Group>

            <Col>
              <Form.Group>
                <Form.Label>Ingreso</Form.Label>
                <Form.Control type="date" name="ingreso" value={ingreso} onChange={handleChange} max={hoy} />
                {errores.ingreso && <Alert variant="danger">{errores.ingreso}</Alert>}
              </Form.Group>
            </Col>
          </Row>

          <Row className="mt-2">
            <Col><Form.Group><Form.Label>RP</Form.Label>
              <Form.Control type="text" name="rp" value={rp} onChange={handleChange} required />
            </Form.Group></Col>
            <Col>
              <Form.Group>
                <Form.Label>eRP</Form.Label>
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
                {errorERP && <Alert variant="warning" className="mt-1">{errorERP}</Alert>}
              </Form.Group>
            </Col>


          </Row>
          <Row>
            <Col><Form.Group><Form.Label>Lactancia</Form.Label>
              <Form.Control type="number" name="lactancia" value={lactancia} onChange={handleChange} />
            </Form.Group></Col>
            <Col>
              <Form.Group>
                <Form.Label>Grupo</Form.Label>
                <Form.Control
                  type="text"
                  name="grupo"
                  value={grupo}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

          </Row>
          <Row className="mt-2">
            <Col><Form.Group><Form.Label>Estado Productivo</Form.Label>
              <Form.Control as="select" name="estpro" value={estpro} onChange={handleChange}>
                <option value="seca">Seca</option>
                <option value="En Ordeñe">En Ordeñe</option>
              </Form.Control>
            </Form.Group></Col>
            <Col><Form.Group><Form.Label>Estado Reproductivo</Form.Label>
              <Form.Control as="select" name="estrep" value={estrep} onChange={handleChange}>
                <option value="vacia">Vacía</option>
                <option value="preñada">Preñada</option>
              </Form.Control>
            </Form.Group></Col>
          </Row>

          <Row className="mt-2">
            <Col>
              <Form.Group>
                <Form.Label>Último Parto</Form.Label>
                {fparto ? (
                  <Form.Control
                    type="date"
                    name="fparto"
                    value={fparto}
                    onChange={handleChange}
                    max={hoy}
                  />
                ) : (
                  <Form.Control
                    type="date"
                    name="fparto"
                    value=""
                    onChange={handleChange}
                    max={hoy}
                  />
                )}
                {requiereFechaParto && (
                  <Alert variant="warning" className="mt-1">
                    Si seleccionaste "En Ordeñe", ingresá la fecha de Último parto.
                  </Alert>
                )}
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Último Servicio</Form.Label>
                <Form.Control
                  type="date"
                  name="fservicio"
                  value={fservicio}
                  onChange={handleChange}
                  max={hoy}
                  required={estrep === 'preñada'} // requerido si está preñada
                />
                {requiereFechaServicio && (
                  <Alert variant="warning" className="mt-1">
                    Si seleccionaste “Preñada”, ingresá la fecha de Último Servicio.
                  </Alert>
                )}
              </Form.Group>
            </Col>
            <Col><Form.Group><Form.Label>Categoría</Form.Label>
              <Form.Control type="text" name="categoria" value={categoria} onChange={handleChange} disabled />
            </Form.Group></Col>
          </Row>

          <Row className="mt-2">
            <Col><Form.Group><Form.Label>UC (lts)</Form.Label>
              <Form.Control type="number" name="uc" value={uc} onChange={handleChange} readOnly={campoProtegido} />
            </Form.Group></Col>
            <Col><Form.Group><Form.Label>Ración (kg)</Form.Label>
              <Form.Control type="number" name="racion" value={racion} onChange={handleChange} readOnly={campoProtegido} />
            </Form.Group></Col>
          </Row>

          <Form.Group className="mt-3"><Form.Label>Observaciones</Form.Label>
            <Form.Control as="textarea" rows={2} name="observaciones" value={observaciones} onChange={handleChange} />
          </Form.Group>

          <div className="d-flex justify-content-end mt-4">
            <Button variant="secondary" onClick={onHide} className="me-2">Cancelar</Button>
            <Button variant="success" type="submit" disabled={requiereFechaServicio || requiereFechaParto}>
              Guardar
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ModalAnimalForm;
