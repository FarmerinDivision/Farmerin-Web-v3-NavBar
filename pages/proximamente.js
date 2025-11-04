import React from 'react';
import styles from '../styles/Proximamente.module.scss';
import Layout from '../components/layout/layout';

export default function Proximamente() {
  return (
    <Layout titulo="Proximamente">
    <div className={styles.centerWrapper}>
      <div className={styles['service-card']}>

        <svg
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeWidth="2"
          stroke="#000000"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.icon}
        >
          <rect ry="2" rx="2" height="14" width="20" y="3" x="2"></rect>
          <line y2="21" x2="16" y1="21" x1="8"></line>
          <line y2="21" x2="12" y1="17" x1="12"></line>
        </svg>

        <p className={styles.title}>
          FARMERIN - PRÓXIMAMENTE NUEVA SECCIÓN
        </p>

        <p className={styles.description}>
          En esta sección vas a poder ver el reporte de todos los eventos que 
          realizaste en la sección DIRSA dentro de Farmerin.
        </p>

        <p className={styles.number}>01</p>

      </div>
    </div>
    </Layout>
  );
}
