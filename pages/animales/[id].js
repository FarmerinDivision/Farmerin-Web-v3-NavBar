// src/components/animales.js
import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, Contenedor } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleAnimal from '../components/layout/detalleAnimal';
import SelectTambo from '../components/layout/selectTambo';
import { useDispatch } from 'react-redux';
import { addNotification } from '../redux/notificacionSlice';
import { Button, Form, Row, Col, Modal } from 'react-bootstrap';
import { RiAddBoxLine, RiSearchLine } from 'react-icons/ri';
import { GiCow } from 'react-icons/gi';
import Lottie from 'lottie-react';
import vacaAnimacion from '../public/animaciones/Animation - Vaca.json';
import styles from '../styles/Animales.module.scss';
import useValidacion from '../hook/useValidacion';
import validarCrearAnimal from '../validacion/validarCrearAnimal';
import { format } from 'date-fns';

const STATE_INICIAL = {
  ingreso: format(Date.now(), 'yyyy-MM-dd'),
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
  fracion: format(Date.now(), 'yyyy-MM-dd'),
  nservicio: 1,
  porcentaje: 1,
  uc: 0,
  fuc: format(Date.now(), 'yyyy-MM-dd'),
  ca: 0,
  anorm: '',
  fbaja: '',
  mbaja: '',
  rodeo: 0,
  sugerido: 0
};

const Animales = () => {
  const dispatch = useDispatch();
  const [elim, guardarElim] = useState(false);
  const [animales, guardarAnimales] = useState([]);
  const [animalesBase, guardarAnimalesBase] = useState([]);
  const [valoresFiltro, guardarValoresFiltro] = useState({ rp: '' });
  const [procesando, guardarProcesando] = useState(false);
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [showAltaModal, setShowAltaModal] = useState(false);

  const handleAbrirAlta = () => setShowAltaModal(true);
  const handleCerrarAlta = () => setShowAltaModal(false);

  const {
    valores,
    errores,
    handleSubmit: handleSubmitAlta,
    handleChange: handleChangeAlta,
    handleBlur: handleBlurAlta,
    guardarValores
  } = useValidacion(STATE_INICIAL, validarCrearAnimal, altaAnimal);

  const {
    rp, erp, lactancia, estpro, estrep, observaciones
  } = valores;

  useEffect(() => {
    if (tamboSel) {
      guardarProcesando(true);
      buscarAnimales();
      setTimeout(() => guardarProcesando(false), 800);
    }
  }, [tamboSel, elim]);

  const buscarAnimales = () => {
    firebase.db.collection('animal')
      .where('idtambo', '==', tamboSel.id)
      .where('fbaja', '==', '')
      .orderBy('rp')
      .get()
      .then(snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        guardarAnimalesBase(data);
        guardarAnimales(data);
      });
  };

  const aplicarFiltro = () => {
    const cond = valoresFiltro.rp.toLowerCase();
    const filtrado = animalesBase.filter(a =>
      (a.rp?.toString().toLowerCase().includes(cond) ||
        a.erp?.toString().toLowerCase().includes(cond))
    );
    guardarAnimales(filtrado);
  };

  const handleSubmit = e => {
    e.preventDefault();
    aplicarFiltro();
  };

  async function altaAnimal() {
    try {
      const existe = await firebase.db.collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .where('rp', '==', valores.rp)
        .where('fbaja', '==', '')
        .get();

      if (!existe.empty) {
        alert("Ya existe un animal con ese RP");
        return;
      }

      await firebase.db.collection('animal').add({ ...valores, idtambo: tamboSel.id });
      setShowAltaModal(false);
      guardarElim(true);
    } catch (e) {
      console.error("Error al dar de alta:", e);
      alert("Error al guardar el animal");
    }
  }

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
        <h2 className={styles.title}><GiCow /> Listado de animales de <strong>{tamboSel?.nombre}</strong>: <strong>{animales.length}</strong></h2>

        <div className={styles.actionsContainer}>
          <input
            type="text"
            name="rp"
            placeholder="RP / eRP"
            value={valoresFiltro.rp}
            onChange={e => guardarValoresFiltro({ rp: e.target.value })}
            className={styles.inputRp}
          />
          <button onClick={handleSubmit} className={`${styles.customBtn} ${styles.searchBtn}`}><RiSearchLine /> Buscar</button>
          <button onClick={handleAbrirAlta} className={`${styles.customBtn} ${styles.addBtn}`}><RiAddBoxLine /> Alta Animal</button>
        </div>

        <Contenedor>
          {animales.map(a => (
            <div key={a.id} className={styles.animalCard}>
              <div>{a.rp}</div>
              <div>{a.estpro}</div>
              <div>{a.estrep}</div>
              <div>{a.erp}</div>
              <DetalleAnimal animal={a} guardarElim={guardarElim} />
            </div>
          ))}
        </Contenedor>

     {/* Modal Alta Animal */}
      <Modal show={showAltaModal} onHide={handleCerrarAlta} size="lg">
        <Modal.Header closeButton><Modal.Title>Alta de Animal</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitAlta}>
            <Row>
              <Col lg={6}>
                <Form.Group><Form.Label>Tambo</Form.Label>
                  <Form.Control type="text" value={tamboSel?.nombre} readOnly />
                </Form.Group>
              </Col>
              <Col lg={6}>
                <Form.Group><Form.Label>Ingreso</Form.Label>
                  <Form.Control type="date" name="ingreso" value={ingreso} onChange={handleChangeAlta} max={hoy} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col lg={6}>
                <Form.Group><Form.Label>RP</Form.Label>
                  <Form.Control name="rp" value={rp} onChange={handleChangeAlta} required isInvalid={!!errores.rp} />
                  <Form.Control.Feedback type="invalid">{errores.rp}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col lg={6}>
                <Form.Group><Form.Label>eRP</Form.Label>
                  <Form.Control name="erp" value={erp} onChange={handleChangeAlta} isInvalid={!!errores.erp} />
                  <Form.Control.Feedback type="invalid">{errores.erp}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col lg={6}>
                <Form.Group><Form.Label>Lactancia</Form.Label>
                  <Form.Control type="number" name="lactancia" value={lactancia} onChange={handleChangeAlta} />
                </Form.Group>
              </Col>
              <Col lg={6}>
                <Form.Group><Form.Label>Categoría</Form.Label>
                  <Form.Control name="categoria" value={categoria} readOnly disabled />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col lg={6}>
                <Form.Group><Form.Label>Estado Productivo</Form.Label>
                  <Form.Control as="select" name="estpro" value={estpro} onChange={handleChangeAlta}>
                    <option value="seca">Seca</option>
                    <option value="En Ordeñe">En Ordeñe</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col lg={6}>
                <Form.Group><Form.Label>Estado Reproductivo</Form.Label>
                  <Form.Control as="select" name="estrep" value={estrep} onChange={handleChangeAlta}>
                    <option value="vacia">Vacía</option>
                    <option value="preñada">Preñada</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col lg={6}>
                <Form.Group><Form.Label>Último Servicio</Form.Label>
                  <Form.Control type="date" name="fservicio" value={fservicio} onChange={handleChangeAlta} max={hoy} />
                </Form.Group>
              </Col>
              <Col lg={6}>
                <Form.Group><Form.Label>Último Parto</Form.Label>
                  <Form.Control type="date" name="fparto" value={fparto} onChange={handleChangeAlta} max={hoy} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col lg={6}>
                <Form.Group><Form.Label>Último Control (Lts)</Form.Label>
                  <Form.Control type="number" step="any" name="uc" value={uc} onChange={handleChangeAlta} />
                </Form.Group>
              </Col>
              <Col lg={6}>
                <Form.Group><Form.Label>Ración (Kgs)</Form.Label>
                  <Form.Control type="number" step="any" name="racion" value={racion} onChange={handleChangeAlta} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col>
                <Form.Group><Form.Label>Observaciones</Form.Label>
                  <Form.Control as="textarea" rows={2} name="observaciones" value={observaciones} onChange={handleChangeAlta} />
                </Form.Group>
              </Col>
            </Row>

            <div className="text-end mt-3">
              <Button variant="secondary" onClick={handleCerrarAlta} className="me-2">Cancelar</Button>
              <Button type="submit" variant="success">Guardar</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      </div>
    </Layout>
  );
};

export default Animales;
