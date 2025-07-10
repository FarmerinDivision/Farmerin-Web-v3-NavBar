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
import FormularioAnimal from '../components/layout/FormularioAnimal'; // ajustá la ruta si es distinta

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
  const [showAltaAnimal, setShowAltaAnimal] = useState(false);

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

  function filtrarAnimales(animales, filtro) {
    if (!filtro) return animales;
    const cond = filtro.toLowerCase();
    return animales.filter(animal =>
    (animal.rp?.toString().toLowerCase().includes(cond) ||
      animal.erp?.toString().toLowerCase().includes(cond))
    );
  }



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
    guardarOrderRp(orden);

    const sorted = [...animalesBase].sort((a, b) => {
      const rpA = a.rp?.toString().toLowerCase() || '';
      const rpB = b.rp?.toString().toLowerCase() || '';
      return orden === 'asc' ? rpA.localeCompare(rpB) : rpB.localeCompare(rpA);
    });

    guardarAnimalesBase(sorted);
    guardarAnimales(filtrarAnimales(sorted, valores.rp));
  };



  const handleClickER = () => {
    const orden = orderEr === 'asc' ? 'desc' : 'asc';
    guardarOrderEr(orden);

    const sorted = [...animalesBase].sort((a, b) => {
      const erA = a.estrep?.toString().toLowerCase() || '';
      const erB = b.estrep?.toString().toLowerCase() || '';
      return orden === 'asc' ? erA.localeCompare(erB) : erB.localeCompare(erA);
    });

    guardarAnimalesBase(sorted);
    guardarAnimales(filtrarAnimales(sorted, valores.rp));
  };



  const handleClickEP = () => {
    const orden = orderEp === 'asc' ? 'desc' : 'asc';
    guardarOrderEp(orden);

    const sorted = [...animalesBase].sort((a, b) => {
      const epA = a.estpro?.toString().toLowerCase() || '';
      const epB = b.estpro?.toString().toLowerCase() || '';
      return orden === 'asc' ? epA.localeCompare(epB) : epB.localeCompare(epA);
    });

    guardarAnimalesBase(sorted);
    guardarAnimales(filtrarAnimales(sorted, valores.rp));
  };



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
            <GiCow /> Listado de animales de <strong className={styles.nombreTambo}>{tamboSel?.nombre}</strong>: <strong>{animales.length}</strong>
          </h2>

          {/* 🔍 Formulario de búsqueda y botón de alta */}
          <Form onSubmit={handleSubmit} className={styles.actionsContainer}>
            <input
              type="text"
              id="rp"
              placeholder="RP / eRP"
              name="rp"
              value={rp}
              onChange={handleChange}
              className={styles.inputRp}
            />

            <button
              type="submit"
              className={`${styles.customBtn} ${styles.searchBtn}`}
            >
              <RiSearchLine size={20} className={styles.btnIcon} />
              Buscar
            </button>

            <button
              type="button"
              onClick={() => setShowAltaAnimal(true)}
              className={`${styles.customBtn} ${styles.addBtn}`}
            >
              <RiAddBoxLine size={20} className={styles.btnIcon} />
              Alta Animal
            </button>
          </Form>

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

          {/* Modal de alta de animal */}
          <Modal show={showAltaAnimal} onHide={() => setShowAltaAnimal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Alta de Animal</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <FormularioAnimal
                modo="alta"
                onCancel={() => setShowAltaAnimal(false)}
                onSuccess={() => {
                  setShowAltaAnimal(false);
                  guardarElim(true); // refresca la lista
                }}
              />
            </Modal.Body>
          </Modal>

          {/* Modal de notificación si lo tenés */}
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
