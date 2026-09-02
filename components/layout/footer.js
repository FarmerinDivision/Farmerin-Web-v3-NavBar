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
          Ultra I+D+I
        </a>
        <span className={styles.separator}>&</span>
        <a
          href="https://studio--studio-2931549742-72d7c.us-central1.hosted.app"
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.link} ${styles.devSignature}`}>
          FALTRA STUDIO
        </a>
        <span>and Farmerin Developer.</span>

      </div>
    </footer>
  );
};

export default Footer;
