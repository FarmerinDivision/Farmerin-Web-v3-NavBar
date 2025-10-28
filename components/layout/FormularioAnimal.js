import React, { useContext, useEffect, useState } from 'react';
import { FirebaseContext } from '../../firebase2';
import useValidacion from '../../hook/useValidacion';
import validarCrearAnimal from '../../validacion/validarCrearAnimal';
import { Form, Button, Row, Col, Spinner, Card, Modal } from 'react-bootstrap';
import { format } from 'date-fns';

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
  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const {
    valores,
    errores,
    handleSubmit,
    handleChange,
    guardarValores
  } = useValidacion(STATE_INICIAL, validarCrearAnimal, modo === 'alta' ? altaAnimal : editarAnimal);

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
        setMensajeError("El animal no existe.");
      }
    } catch (e) {
      setMensajeError("Error al cargar el animal.");
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
    setMensajeError('');
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

        if (!erpSnap.empty) throw new Error("El eRP ya está asociado a otro animal.");
      }

      // 👉 Crear el animal en Firebase
      await firebase.db.collection('animal').add(valores);

      // ✅ Mostrar el modal de éxito inmediatamente
      setMensajeExito("✅ Animal dado de alta con éxito.");

    } catch (e) {
      setMensajeError(e.message);
    } finally {
      setProcesando(false);
    }
  }


  async function editarAnimal() {
    setProcesando(true);
    setMensajeError('');
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

        if (!erpSnap.empty) {
          const duplicado = erpSnap.docs.find(doc => doc.id !== animalId);
          if (duplicado) throw new Error("El eRP ya está asociado a otro animal.");
        }
      }

      await firebase.db.collection('animal').doc(animalId).update(valores);
      setMensajeExito("✅ Animal editado con éxito.");
      if (onSuccess) onSuccess();
    } catch (e) {
      setMensajeError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  const {
    ingreso, rp, erp, lactancia, estpro, estrep, categoria,
    fservicio, fparto, uc, racion, observaciones, fracion,
    grupo
  } = valores;

  return (
    <Form onSubmit={handleSubmit}>

      {procesando && <Spinner animation="border" className="mb-3" />}

      <Row>
        <Col md={6}>
          <Form.Group><Form.Label>Tambo</Form.Label>
            <Form.Control type="text" value={tamboSel?.nombre || ''} readOnly />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group><Form.Label>Ingreso</Form.Label>
            <Form.Control type="date" name="ingreso" value={ingreso} onChange={handleChange} max={hoy} />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group><Form.Label>RP (caravana)</Form.Label>
            <Form.Control name="rp" value={rp} onChange={handleChange} required isInvalid={!!errores.rp} />
            <Form.Control.Feedback type="invalid">{errores.rp}</Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group><Form.Label>eRP (botón electrónico)</Form.Label>
            <Form.Control name="erp" value={erp} onChange={handleChange} isInvalid={!!errores.erp} />
            <Form.Control.Feedback type="invalid">{errores.erp}</Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group><Form.Label>Lactancia</Form.Label>
            <Form.Control type="number" name="lactancia" value={lactancia} onChange={handleChange} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group><Form.Label>Categoría</Form.Label>
            <Form.Control name="categoria" value={categoria} readOnly />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group><Form.Label>Estado Productivo</Form.Label>
            <Form.Control as="select" name="estpro" value={estpro} onChange={handleChange}>
              <option value="seca">Seca</option>
              <option value="En Ordeñe">En Ordeñe</option>
            </Form.Control>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group><Form.Label>Estado Reproductivo</Form.Label>
            <Form.Control as="select" name="estrep" value={estrep} onChange={handleChange}>
              <option value="vacia">Vacía</option>
              <option value="preñada">Preñada</option>
            </Form.Control>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group><Form.Label>Último Servicio</Form.Label>
            <Form.Control type="date" name="fservicio" value={fservicio} onChange={handleChange} max={hoy} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group><Form.Label>Último Parto</Form.Label>
            <Form.Control type="date" name="fparto" value={fparto} onChange={handleChange} max={hoy} />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group><Form.Label>Último Control (Lts)</Form.Label>
            <Form.Control type="number" step="any" name="uc" value={uc} onChange={handleChange} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group><Form.Label>Ración (Kgs)</Form.Label>
            <Form.Control type="number" step="any" name="racion" value={racion} onChange={handleChange} />
          </Form.Group>
        </Col>
      </Row>

      {/* ✅ Grupo obligatorio y numérico */}
      <Row>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Grupo</Form.Label>
            <Form.Control
              type="number"
              name="grupo"
              value={grupo}
              onChange={handleChange}
              min="0"
              step="1"
              required
              placeholder="Ej: 5"
            />
            <Form.Text className="text-muted">
              Número de grupo (solo valores numéricos).
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Form.Group>
        <Form.Label>Observaciones</Form.Label>
        <Form.Control as="textarea" rows={2} name="observaciones" value={observaciones} onChange={handleChange} />
      </Form.Group>

      <div className="text-end mt-4">
        {onCancel && (
          <Button variant="secondary" className="me-2" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="success" disabled={procesando}>
          {modo === 'alta' ? 'Guardar' : 'Actualizar'}
        </Button>
      </div>
      {/* ✅ MODAL DE ÉXITO */}
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

      {/* ⚠️ MODAL DE ERROR */}
      <Modal
        show={!!mensajeError}
        onHide={() => setMensajeError('')}
        centered
        backdrop="static"
        keyboard={false}
        className="modal-error"
      >
        <Modal.Header closeButton>
          <Modal.Title className="w-100 text-center fs-4 fw-bold">
            ⚠️ Error
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="fs-5 mb-3">{mensajeError}</p>
          <p className="opacity-75">
            Verificá los datos ingresados o intentá nuevamente.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light"
            className="text-danger fw-semibold px-4"
            onClick={() => setMensajeError('')}
          >
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>


    </Form>
  );
};

export default FormularioAnimal;
