import React from "react";
import styles from "../../styles/Parametro.module.scss";

const ResumenNutricionalDetallado = ({
  animales,
  grupos,
  resumen
}) => {
  if (!resumen) return null;

  const {
    animalesFiltrados,
    conteoPorGrupo,
    conteoPorRodeo,
    conteoPorCategoria,
    sumaTotalRodeos,
    totalAnimales,
    calculoFinal,
    promediosPorGrupo,
    porcentajeAnimal
  } = resumen;

  return (
    <div className={styles.resumenNutricionalWrapper}>
      
      {/* TITULO PRINCIPAL */}
      <h2 className={styles.resumenTitulo}>📊 Resumen Nutricional Completo</h2>

      {/* GRID PRINCIPAL */}
      <div className={styles.resumenGrid}>

        {/* BLOQUE 1 – Cantidades */}
        <div className={styles.resumenCard}>
          <h3 className={styles.cardTitulo}>Totales</h3>
          <p><b>Animales filtrados:</b> {animalesFiltrados?.length}</p>
          <p><b>Total en ordeñe:</b> {totalAnimales}</p>
          <p><b>Vacas:</b> {conteoPorCategoria.Vaca}</p>
          <p><b>Vaquillonas:</b> {conteoPorCategoria.Vaquillona}</p>
        </div>

        {/* BLOQUE 2 – Grupos */}
        {promediosPorGrupo && Object.keys(promediosPorGrupo).length > 0 && (
          <div className={styles.resumenCard}>
            <h3 className={styles.cardTitulo}>Promedio por Grupo</h3>
            {Object.entries(promediosPorGrupo)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([grupo, promedio]) => (
                <p key={grupo}>
                  <b>Grupo {grupo}:</b> {promedio} kg
                </p>
              ))}
            {porcentajeAnimal !== undefined && (
              <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                <b>Porcentaje aplicado:</b> {porcentajeAnimal}
              </p>
            )}
          </div>
        )}

        {/* BLOQUE 3 – Cálculo de Raciones */}
        <div className={styles.resumenCard}>
          <h3 className={styles.cardTitulo}>Cálculo de Raciones</h3>
          <p><b>Total raciones aplicadas:</b> {sumaTotalRodeos} kg</p>
          <p><b>Promedio global:</b> {calculoFinal} kg</p>
        </div>

      </div>
    </div>
  );
};

export default ResumenNutricionalDetallado;
