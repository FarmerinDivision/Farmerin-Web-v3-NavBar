import React, { useState, useEffect, useContext } from 'react'
import Link from 'next/link';
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, Contenedor, ContenedorSpinner } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleAnimal from '../components/layout/detalleAnimal';
import SelectTambo from '../components/layout/selectTambo';
import StickyTable from "react-sticky-table-thead"
import { useDispatch } from 'react-redux';
import { addNotification } from '../redux/notificacionSlice';
import { Button, Form, Row, Col, Alert, Table, Modal } from 'react-bootstrap';
import { RiAddBoxLine, RiSearchLine, RiFileList2Line } from 'react-icons/ri';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { GiCow } from 'react-icons/gi';
import Lottie from 'lottie-react';
import vacaAnimacion from '../public/animaciones/Animation - Vaca.json';
import styles from '../styles/Animales.module.scss';

const Animales = () => {
  const dispatch = useDispatch();
  const [elim, guardarElim] = useState(false);
  const [error, guardarError] = useState();
  const [animales, guardarAnimales] = useState([]);
  const [animalesBase, guardarAnimalesBase] = useState([]);
  const [valores, guardarValores] = useState({ rp: '' });
  const [procesando, guardarProcesando] = useState(false);
  const { rp } = valores;
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [orderRp, guardarOrderRp] = useState('asc');
  const [orderEr, guardarOrderEr] = useState('asc');
  const [orderEp, guardarOrderEp] = useState('asc');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [esSticky, setEsSticky] = useState(false);

  useEffect(() => {
    guardarElim(false);
    if (tamboSel) {
      guardarProcesando(true);
      buscarAnimales();
      aplicarFiltro();
      mostrarMensajeModal();
      setTimeout(() => guardarProcesando(false), 800);
    }
  }, [tamboSel, elim])

  function buscarAnimales() {
    if (tamboSel) {
      try {
        firebase.db.collection('animal')
          .where('idtambo', '==', tamboSel.id)
          .where('fbaja', '==', '')
          .orderBy('rp')
          .get()
          .then(snapshotAnimal);
      } catch (error) {
        guardarError(error);
        console.log(error);
      }
    }
  }

  function snapshotAnimal(snapshot) {
    const animales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    guardarAnimalesBase(animales);
  }

  const aplicarFiltro = () => {
    if (rp !== "") {
      const cond = rp.toLowerCase();
      const filtro = animalesBase.filter(animal =>
      (animal.rp?.toString().toLowerCase().includes(cond) ||
        animal.erp?.toString().toLowerCase().includes(cond))
      );
      guardarAnimales(filtro);
    } else {
      guardarAnimales(animalesBase);
    }
  }

  const handleSubmit = e => {
    e.preventDefault();
    guardarProcesando(true);
    setTimeout(() => {
      aplicarFiltro();
      guardarProcesando(false);
    }, 600);
  }

  const handleChange = e => {
    guardarValores({ ...valores, [e.target.name]: e.target.value })
  }

  const handleClickRP = () => {
    const orden = orderRp === 'asc' ? 'desc' : 'asc';
    const sorted = [...animalesBase].sort((a, b) => orden === 'asc' ? a.rp - b.rp : b.rp - a.rp);
    guardarOrderRp(orden);
    guardarAnimalesBase(sorted);
    aplicarFiltro();
  }

  const handleClickER = () => {
    const orden = orderEr === 'asc' ? 'desc' : 'asc';
    const sorted = [...animalesBase].sort((a, b) => orden === 'asc' ? a.estrep - b.estrep : b.estrep - a.estrep);
    guardarOrderEr(orden);
    guardarAnimalesBase(sorted);
    aplicarFiltro();
  }

  const handleClickEP = () => {
    const orden = orderEp === 'asc' ? 'desc' : 'asc';
    const sorted = [...animalesBase].sort((a, b) => orden === 'asc' ? a.estpro - b.estpro : b.estpro - a.estpro);
    guardarOrderEp(orden);
    guardarAnimalesBase(sorted);
    aplicarFiltro();
  }

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
    } catch (error) {
      console.error("Error fetching porcentaje:", error);
    }
  }

  useEffect(() => {
    const manejarScroll = () => {
      const scrollTop = window.scrollY;
      setEsSticky(scrollTop > 140); // activa cuando baja un poco
    };

    window.addEventListener("scroll", manejarScroll);
    return () => window.removeEventListener("scroll", manejarScroll);
  }, []);

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
      <>
        <div className={styles.container}>
          <h2 className={styles.title}>
            <GiCow /> Listado de animales de <strong className={styles.nombreTambo}>{tamboSel?.nombre}</strong>:<strong>{animales.length}</strong>
          </h2>

          <div className={styles.actionsContainer}>
            <input
              type="string"
              id="rp"
              placeholder="RP / eRP"
              name="rp"
              value={rp}
              onChange={handleChange}
              className={styles.inputRp}
            />

            <button onClick={handleSubmit} variant="info" block
              type="submit" className={`${styles.customBtn} ${styles.searchBtn}`}>
              <RiSearchLine size={20} className={styles.btnIcon} />
              Buscar
            </button>

            <button href="/animales/[id]" as="/animales/0" className={`${styles.customBtn} ${styles.addBtn}`}>
              <RiAddBoxLine size={20} className={styles.btnIcon} />
              Alta Animal
            </button>
          </div>

          {tamboSel ? (
            animales.length === 0 ? (
              <Mensaje className={styles.mensajeSinResultados}>
                <div className={styles.mensajeCaja}>
                  <h2 className={styles.tituloSinResultados}>Sin resultados</h2>
                  <p className={styles.textoSecundario}>
                    Presiona <strong>Buscar</strong> para obtener los animales
                  </p>
                </div>
              </Mensaje>
            ) : (
              <Contenedor>
                {/* Encabezado Sticky */}
                <div className={styles.encabezadoLista}>
                  <div className={styles.colEncabezadoRp} onClick={handleClickRP}>
                    RP
                    <span className={styles.iconoOrden}>
                      <FaSort size={20} />
                    </span>
                  </div>
                  <div className={styles.colEncabezado} onClick={handleClickEP}>
                    Est. Prod.
                    <span className={styles.iconoOrden}>
                      <FaSort size={20} />
                    </span>
                  </div>
                  <div className={styles.colEncabezado} onClick={handleClickER}>
                    Est. Rep.
                    <span className={styles.iconoOrden}>
                      <FaSort size={20} />
                    </span>
                  </div>
                  <div className={styles.colEncabezadoErp}>eRP</div>
                  <div className={styles.colEncabezadoAcciones}>Acciones</div>
                </div>

                {/* Lista de tarjetas */}
                <div className={styles.listaAnimales}>
                  {animales.map((a) => (
                    <div key={a.id} className={styles.animalCard}>
                      <div className={styles.columna}>
                        <span className={styles.valor}>{a.rp || '-'}</span>
                      </div>
                      <div className={styles.columna}>
                        <span className={styles.valor}>{a.estpro ?? '-'}</span>
                      </div>
                      <div className={styles.columna}>
                        <span className={styles.valor}>{a.estrep ?? '-'}</span>
                      </div>
                      <div className={styles.columna}>
                        <span className={styles.valor}>{a.erp || '-'}</span>
                      </div>
                      <div className={styles.columnaAcciones}>
                        <DetalleAnimal animal={a} guardarElim={guardarElim} />
                      </div>
                    </div>
                  ))}
                </div>
              </Contenedor>
            )
          ) : (
            <SelectTambo />
          )}

          {/* Modal de notificación */}
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
      </>
    </Layout>
  );
}

export default Animales;
