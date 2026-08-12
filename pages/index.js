import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleTambos from '../components/layout/detalleTambo';
import styles from '../styles/Tambos.module.scss';
import CrearTamboModal from '../pages/tambos/CrearTamboModal';
import { RiAddBoxLine } from 'react-icons/ri';
import { HiOutlineChartBar, HiOutlineWrenchScrewdriver } from 'react-icons/hi2';
import { LuWheat } from 'react-icons/lu';
import Lottie from 'lottie-react';
// import vacaAnimacion from '../public/vaca-animacion.json'; // TODO: archivo faltante, no se usa

const Home = () => {
  const { firebase, usuario, tambos, guardarTambos } = useContext(FirebaseContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    guardarTambos(data);
  }

  if (loading) {
    return (
      <Layout titulo="Cargando...">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
          <div className="text-center">
            <div style={{
              width: 56, height: 56, margin: '0 auto 16px',
              border: '4px solid #e5e7eb', borderTopColor: '#299fff',
              borderRadius: '50%', animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h3 style={{ color: '#ccc', animation: 'pulse 1.5s infinite' }}>Cargando Panel...</h3>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="Mis Tambos">
      <div className={styles.dashboardContainer}>

        {/* ENCABEZADO */}
        <div className={styles.headerSection}>
          <div className={styles.titleBlock}>
            <h2>Tus Tambos</h2>
            <p>Administrá todos tus establecimientos agropecuarios</p>
          </div>
          <button className={styles.btnPrimary} onClick={() => setShowCrearModal(true)}>
            <RiAddBoxLine size={20} /> Crear nuevo tambo
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {tambos && tambos.length > 0 ? (
          <>
            {/* GRID DE TAMBOS */}
            <div className={styles.tamboGrid}>
              {tambos.map(t => (
                <DetalleTambos key={t.id} tambo={t} />
              ))}
            </div>

            {/* SECCIÓN INFERIOR DE MÓDULOS */}
            <div className={styles.modulesSection}>
              <h4>Módulos y Herramientas</h4>
              <div className={styles.modulesGrid}>

                <div className={styles.moduleCard}>
                  <div className={styles.iconWrap} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                    <HiOutlineChartBar size={24} />
                  </div>
                  <div>
                    <h5>Reportes</h5>
                    <p>Acceda a reportes detallados para analizar la evolución de las principales métricas del tambo. Consulte información histórica, indicadores de desempeño y partes diarios que facilitan el seguimiento de la actividad y la toma de decisiones.</p>
                  </div>
                </div>

                <div className={styles.moduleCard}>
                  <div className={styles.iconWrap} style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}>
                    <HiOutlineWrenchScrewdriver size={24} />
                  </div>
                  <div>
                    <h5>Herramientas</h5>
                    <p>Gestione las principales operaciones del tambo desde un único lugar. Configure los turnos de trabajo, controle el ingreso de los animales a la sala de ordeñe y supervise su comportamiento durante las distintas etapas del proceso.</p>
                  </div>
                </div>

                <div className={styles.moduleCard}>
                  <div className={styles.iconWrap} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                    <LuWheat size={24} />
                  </div>
                  <div>
                    <h5>Nutrición</h5>
                    <p>Optimice la dosificación de las raciones y evalúe la eficiencia de la alimentación de los animales. Mediante la configuración de los parámetros nutricionales, el sistema contribuye a mejorar el rendimiento productivo y el bienestar del rodeo.</p>
                  </div>
                </div>

              </div>
            </div>
          </>
        ) : (
          /* EMPTY STATE */
          <div className={styles.emptyState}>
            <div className={styles.emoji}>🚜</div>
            <h3>Todavía no tenés un tambo cargado</h3>
            <p>Comienza a gestionar tu establecimiento agropecuario creando tu primer tambo ahora mismo.</p>
            <button className={styles.btnPrimary} onClick={() => setShowCrearModal(true)}>
              <RiAddBoxLine size={20} /> Crear mi primer tambo
            </button>
          </div>
        )}

      </div>

      <CrearTamboModal
        show={showCrearModal}
        onHide={() => setShowCrearModal(false)}
        onSuccess={() => setShowCrearModal(false)}
      />
    </Layout>
  );
};

export default Home;
