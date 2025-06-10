import React, { useEffect, useState, useContext } from 'react';
import Layout from '../components/layout/layout';
import { FirebaseContext } from '../firebase2';

const Monitor = () => {
  const { tamboSel } = useContext(FirebaseContext);
  const [iframeUrl, setIframeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkValido, setLinkValido] = useState(true);

  useEffect(() => {
    if (tamboSel?.id) {
      const cloudFunctionUrl = `https://us-central1-farmerin-navarro.cloudfunctions.net/proxyMonitor?id=${tamboSel.id}`;
      setIframeUrl(cloudFunctionUrl);
    }
  }, [tamboSel]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setLinkValido(false);
  };

  const Loader = () => (
    <div className="spinnerContainer-Monitor">
      <div className="spinner-Monitor"></div>
      <div className="loader-Monitor">
        <p>Cargando</p>
        <div className="words-Monitor">
          <span className="word-Monitor">Datos del tambo</span>
          <span className="word-Monitor">Cantidad de tolvas</span>
          <span className="word-Monitor">Estado de barrera</span>
          <span className="word-Monitor">Activando modo lectura</span>
          <span className="word-Monitor">Datos del tambo</span>
        </div>
      </div>
    </div>
  );

  const ErrorMessage = () => (
    <div className="divRaciones">
      <h1 className="tituloRacionesAviso">Aviso</h1>
      <h2 className="tituloRacionesAviso">No se pudo conectar con el Monitor de Ingreso</h2>
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
