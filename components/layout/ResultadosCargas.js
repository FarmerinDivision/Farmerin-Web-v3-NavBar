import React from 'react';
import { Spinner } from 'react-bootstrap';
import styles from "../../styles/Dirsa.module.scss";

const ResultadosCargas = ({
  titulo,
  actualizados,
  errores,
  loading,
  total,
  procesados
}) => {

  let mensajeGlobal = "";
  let claseMensaje = "";

  const cantidadOK = actualizados.length;
  const cantidadErrores = errores.length;

  if (loading && total > 0) {
    mensajeGlobal = ` Cargando animales… Procesados ${procesados} de ${total}. No salga del apartado`;
    claseMensaje = styles.mensajeLoading;
  }
  else if (!loading && total > 0 && procesados === total && cantidadErrores === 0) {
    mensajeGlobal = ` Carga finalizada correctamente. Se cargaron ${cantidadOK} animales sin errores.`;
    claseMensaje = styles.mensajeExito;
  }
  else if (!loading && total > 0 && procesados === total && cantidadErrores > 0) {
    mensajeGlobal = ` Carga finalizada. ${cantidadOK} correctos y ${cantidadErrores} con errores.`;
    claseMensaje = styles.mensajeError;
  }

  return (
    <div className={styles.resultContainer}>

      {loading && (
        <div className={styles.loaderGlobal}>
          <p>Cargando... {procesados} de {total}. No salga del apartado</p>
          <Spinner animation="border" className={styles.spinner} />
        </div>
      )}

      <h2 className={styles.resultHeader}>{titulo}</h2>

      {mensajeGlobal && (
        <div className={`${styles.mensajeGlobal} ${claseMensaje}`}>
          {mensajeGlobal}
        </div>
      )}

      <div className={styles.resultRow}>

        {/* ÉXITOS */}
        <div className={`${styles.resultBox} ${styles.successBox}`}>
          <h3 className={styles.resultTitle}>Registros Actualizados</h3>

          {actualizados.length > 0 ? (
            <ul className={styles.resultList}>
              {actualizados.map((item, index) => (
                <li key={index} className={styles.resultItem}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.resultItem}>No hay registros actualizados.</p>
          )}
        </div>

        {/* ERRORES */}
        <div className={`${styles.resultBox} ${styles.errorBox}`}>
          <h3 className={styles.resultTitle}>Errores en la Carga</h3>

          {errores.length > 0 ? (
            <ul className={styles.resultList}>
              {errores.map((item, index) => (
                <li key={index} className={styles.resultItem}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.resultItem}>No se encontraron errores.</p>
          )}
        </div>

      </div>

    </div>
  );
};

export default ResultadosCargas;
