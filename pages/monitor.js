import React, { useEffect, useState, useContext } from 'react';
import Layout from '../components/layout/layout';
import { FirebaseContext } from '../firebase2';
import styles from '../styles/Monitor.module.scss'
const Monitor = () => {
  const { tamboSel } = useContext(FirebaseContext);
  const [iframeUrl, setIframeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkValido, setLinkValido] = useState(true);

  useEffect(() => {
    if (!tamboSel?.id) {
      console.warn("⚠️ No hay tambo seleccionado.");
      return;
    }

    console.log("📌 Tambo seleccionado:", tamboSel.id);

    // Construir la URL del proxy (la Cloud Function)
    const cloudFunctionUrl = `https://us-central1-farmerin-navarro.cloudfunctions.net/proxyMonitor?id=${tamboSel.id}`;
    console.log("🔗 URL generada para iframe:", cloudFunctionUrl);

    setIframeUrl(cloudFunctionUrl);
    setLoading(true); // por si se vuelve a montar
    setLinkValido(true);
  }, [tamboSel]);

  const handleIframeLoad = () => {
    console.log("✅ Iframe cargado correctamente.");
    setLoading(false);
    setLinkValido(true);
  };

  const handleIframeError = () => {
    console.error("❌ Error al cargar el iframe.");
    setLoading(false);
    setLinkValido(false);
  };

  const Loader = () => (
    <div className={styles.spinnerContainerMonitor}>
      <div className={styles.spinnerMonitor}></div>
      <div className={styles.loaderMonitor}>
        <p>Cargando</p>
        <div className={styles.wordsMonitor}>
          <span className={styles.wordMonitor}>Datos del tambo</span>
          <span className={styles.wordMonitor}>Cantidad de tolvas</span>
          <span className={styles.wordMonitor}>Estado de barrera</span>
          <span className={styles.wordMonitor}>Activando modo lectura</span>
          <span className={styles.wordMonitor}>Datos del tambo</span>
        </div>
      </div>
    </div>
  );

  const ErrorMessage = () => (
    <div className={styles.tvContainer}>
      <div className={styles.tvScreen}>
        <div className={styles.static}></div>
        <div className={styles.errorText}>AVISO: Error al obtener datos de monitor</div>
      </div>
      <div className={styles.tvStand}></div>
    </div>
  );

  return (
    <Layout titulo="Monitor de ingreso">
      <div>
        {loading ? (
          <Loader />
        ) : linkValido ? (
          <iframe
            src={iframeUrl}
            title="Monitor"
            style={{
              width: '100%',
              height: '1000px',
              border: '1px solid #fff',
              borderRadius: '10px',
            }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        ) : (
          <ErrorMessage />
        )}
      </div>
    </Layout>
  );
};

export default Monitor;
