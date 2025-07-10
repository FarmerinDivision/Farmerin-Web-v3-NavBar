import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from 'react-bootstrap';
import { RiAddBoxLine } from 'react-icons/ri';

import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { Botonera, Contenedor, Mensaje } from '../components/ui/Elementos';
import DetalleTambos from '../components/layout/detalleTambo';
import styles from '../styles/Tambos.module.scss';

import Lottie from 'lottie-react';
import vacaAnimacion from '../public/animaciones/Animation - Vaca.json';
import CrearTamboModal from '../pages/tambos/CrearTamboModal';

const Home = () => {
  const [error, guardarError] = useState(false);
  const { firebase, usuario, tambos, guardarTambos } = useContext(FirebaseContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true); // loader inicial
  const [showCrearModal, setShowCrearModal] = useState(false);

  useEffect(() => {
    const redirectLogin = async () => {
      await router.push('/login');
    };

    if (!usuario) {
      redirectLogin();
    } else {
      const obtenerTambos = async () => {
        await firebase.db
          .collection('tambo')
          .where('usuarios', 'array-contains', usuario.uid)
          .orderBy('nombre', 'desc')
          .onSnapshot(snapshot => {
            manejarSnapshot(snapshot);
            setLoading(false);
          });
      };
      obtenerTambos();
    }
  }, []);

  function manejarSnapshot(snapshot) {
    const tambos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    guardarTambos(tambos);
  }

  // 🐄 Loader animado mientras se buscan los tambos
  if (loading) {
    return (
      <Layout titulo="Cargando...">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
          <div className="text-center" style={{ maxWidth: 300 }}>
            <Lottie animationData={vacaAnimacion} loop autoplay />
            <p className={styles.textoLoader}>BUSCANDO TAMBOS ASOCIADOS...</p>

          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="Tambos">
      {tambos && tambos.length > 0 ? (
        <>
          <section className={styles.encabezado}>
            <div className={styles.titulo}>
              <h3>📋 Listado de Tambos</h3>
              <p>Gestioná tus tambos fácilmente</p>
            </div>
            <div>
              <Button className={styles.btnNuevoTambo} onClick={() => setShowCrearModal(true)}>
                <RiAddBoxLine size={20} />
                &nbsp; Crear nuevo tambo
              </Button>

            </div>
          </section>

          <Contenedor className={styles.cardStack}>
            {tambos.map(t => (
              <DetalleTambos key={t.id} tambo={t} />
            ))}
          </Contenedor>

          <div className={styles.divider}><span>- O -</span></div>

          <section className={styles.benefitsGrid}>
            <div className={`${styles.benefitText} ${styles.reportes}`}>
              <h5>REPORTES</h5>
              <p>
                En la sección Reportes vas a poder consultar información clave sobre el funcionamiento del tambo. Incluye datos productivos, partes diarios y estadísticas generales que te brindan una visión completa para analizar el rendimiento y tomar decisiones informadas.

              </p>
            </div>

            <img src="Alimento.jpg" className={styles.benefitImage} alt="Soluciones a medida" />

            <div className={`${styles.benefitText} ${styles.control}`}>
              <h5>HERRAMIENTAS</h5>
              <p>
                En la sección Herramientas vas a encontrar utilidades prácticas que te ayudan en la gestión diaria del tambo, como el monitoreo de ingresos de animales, el control de turnos y otras funciones clave para mantener la operación organizada.

              </p>
            </div>

            <img src="TamboPasillo.jpg" className={styles.benefitImage} alt="Almacenamiento" />

            <div className={`${styles.benefitText} ${styles.nutricion}`}>
              <h5>NUTRICION</h5>
              <p>
                La sección Nutrición te permite llevar un seguimiento integral de la alimentación del rodeo. Desde acá podés configurar parámetros, registrar controles y acceder a indicadores que ayudan a optimizar la eficiencia alimenticia y la producción lechera.
              </p>
            </div>

            <img src="VacaBlack.jpg" className={styles.benefitImage} alt="Alertas" />
          </section>
        </>
      ) : (
        <>
          <Mensaje className="text-center py-5">
            <h4 className={styles.tituloEmpty}>
              <span className="emoji">🚜</span>
              Todavía no tenés un tambo cargado
            </h4>

            <Link href="/tambos/[id]" as="/tambos/0">
              <Button variant="primary" size="lg" className={styles.btnCrear}>
                <RiAddBoxLine size={24} /> &nbsp; Crear mi primer tambo
              </Button>
            </Link>
          </Mensaje>

          <div className={styles.divider}><span>- O -</span></div>

          <section className={styles.benefitsGrid}>
            <div className={`${styles.benefitText} ${styles.reportes}`}>
              <h5>REPORTES</h5>
              <p>
                En la sección Reportes vas a poder consultar información clave sobre el funcionamiento del tambo. Incluye datos productivos, partes diarios y estadísticas generales que te brindan una visión completa para analizar el rendimiento y tomar decisiones informadas.
              </p>
            </div>

            <img src="Alimento.jpg" className={styles.benefitImage} alt="Soluciones a medida" />

            <div className={`${styles.benefitText} ${styles.control}`}>
              <h5>HERRAMIENTAS</h5>
              <p>
                En la sección Herramientas vas a encontrar utilidades prácticas que te ayudan en la gestión diaria del tambo, como el monitoreo de ingresos de animales, el control de turnos y otras funciones clave para mantener la operación organizada.
              </p>
            </div>

            <img src="TamboPasillo.jpg" className={styles.benefitImage} alt="Almacenamiento" />

            <div className={`${styles.benefitText} ${styles.nutricion}`}>
              <h5>NUTRICION</h5>
              <p>
                La sección Nutrición te permite llevar un seguimiento integral de la alimentación del rodeo. Desde acá podés configurar parámetros, registrar controles y acceder a indicadores que ayudan a optimizar la eficiencia alimenticia y la producción lechera.
              </p>
            </div>

            <img src="VacaBlack.jpg" className={styles.benefitImage} alt="Alertas" />
          </section>
        </>
      )}
      <CrearTamboModal
        show={showCrearModal}
        onHide={() => setShowCrearModal(false)}
        onSuccess={() => setShowCrearModal(false)}
      />

    </Layout>
  );
};

export default Home;
