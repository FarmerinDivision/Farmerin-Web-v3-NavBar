import React from 'react';
import styles from '../../styles/ControlLecheroFarmerin.module.scss';

const Detalle = ({ info }) => {
  return (
    <div className={styles.alertaItem}>
      {info}
    </div>
  );
};

export default Detalle;
