import React from 'react';
import styles from '../../styles/footer.module.scss';
import { GiPear } from "react-icons/gi";
import { FaLongArrowAltUp } from "react-icons/fa";
import { TbCircleLetterF } from "react-icons/tb";
const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <a
          href="https://farmerin.com.ar/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Farmerin División S.A. © 2020
        </a>
        <span className={styles.separator}>|</span>
        <a
          href="https://ultraidi.com.ar/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Ultra I+D
        </a>
        <span className={styles.separator}>&</span>
        <a className={`${styles.link} ${styles.devSignature}`}>
          Facundo Peralta and Farmerin Developer.
        </a>

      </div>
    </footer>
  );
};

export default Footer;
