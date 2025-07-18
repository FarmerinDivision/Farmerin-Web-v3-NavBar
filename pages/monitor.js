import React, { useContext, useEffect, useState } from 'react';
import Layout from '../components/layout/layout';
import { FirebaseContext } from '../firebase2';
import styles from '../styles/Monitor.module.scss';

const PROXY_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:4000'
    : 'https://proxy-monitor.onrender.com';

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

const ErrorMonitor = () => (
  <div className={styles.mainWrapper}>
    <div className={styles.main}>
      <div className={styles.antenna}>
        <div className={styles.antennaShadow}></div>
        <div className={styles.a1}></div>
        <div className={styles.a1d}></div>
        <div className={styles.a2}></div>
        <div className={styles.a2d}></div>
        <div className={styles.aBase}></div>
      </div>
      <div className={styles.tv}>
        <div className={styles.cruve}>
          <svg viewBox="0 0 189.929 189.929" className={styles.curveSvg}>
            <path d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13
                    C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z" />
          </svg>
        </div>
        <div className={styles.displayDiv}>
          <div className={styles.screenOut}>
            <div className={styles.screenOut1}>
              <div className={styles.screen}>
                <span className={styles.notfoundText}>NO SE PUEDE ACCEDER AL MONITOR</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.lines}>
          <div className={styles.line1}></div>
          <div className={styles.line2}></div>
          <div className={styles.line3}></div>
        </div>
        <div className={styles.buttonsDiv}>
          <div className={styles.b1}><div></div></div>
          <div className={styles.b2}></div>
          <div className={styles.speakers}>
            <div className={styles.g1}>
              <div className={styles.g11}></div>
              <div className={styles.g12}></div>
              <div className={styles.g13}></div>
            </div>
            <div className={styles.g}></div>
            <div className={styles.g}></div>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={styles.base1}></div>
        <div className={styles.base2}></div>
        <div className={styles.base3}></div>
      </div>
    </div>
  </div>
);

const Monitor = () => {
  const { tamboSel } = useContext(FirebaseContext);
  const [htmlContent, setHtmlContent] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tamboSel?.id) return;

    const fetchMonitorHtml = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const res = await fetch(`${PROXY_URL}/verMonitor?tamboId=${tamboSel.id}`);
        const text = await res.text();

        if (res.ok && text.includes('<iframe')) {
          setHtmlContent(text);
        } else {
          setHasError(true);
        }
      } catch (err) {
        console.error('❌ Error cargando el monitor:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonitorHtml();
  }, [tamboSel]);

  if (!tamboSel?.id) {
    return (
      <Layout titulo="Monitor de Ingreso">
        <p>Seleccione un tambo para ver su monitor.</p>
      </Layout>
    );
  }

  return (
    <Layout titulo="Monitor de Ingreso">
      {isLoading && <Loader />}
      {!isLoading && hasError && <ErrorMonitor />}
      {!isLoading && !hasError && (
        <div
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          style={{ width: '100%', height: '1000px' }}
        />
      )}
    </Layout>
  );
};

export default Monitor;
