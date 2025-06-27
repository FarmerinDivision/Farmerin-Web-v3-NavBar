import React from 'react';
import { FaPhone, FaWhatsapp, FaEnvelope, FaYoutube, FaInstagram, FaFacebook, FaGlobe } from 'react-icons/fa';
import Layout from '../components/layout/layout';
import styles from '../styles/Ayuda.module.scss';

const Ayuda = () => {
  return (
    <Layout titulo="Ayuda">
      <div className={styles.contactPage}>
        <div className={styles.socialSection}>
          <h2 className={styles.tituloAyuda}>Contacto</h2>
          <div className={styles.contactItem}>
          <a  target="_blank" rel="noopener noreferrer" className='A-textAtras' style={{ textDecoration: 'none' }}>

              <button className="llamadas-btn">
                <FaPhone style={{ color: '#fefeff' }}/>
                <span className="llamadas-text">2227623372</span>
              </button>
       </a>
          </div>
          <div className={styles.contactItem}>
            <a href="http://api.whatsapp.com/send?phone=5492227623372" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="llamadas-btn">
                <FaWhatsapp style={{ color: '#fefeff' }}/>
                <span className="llamadas-text">WhatsApp</span>
              </button>
            </a>
          </div>
          <div className={styles.contactItem}>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=farmerin.navarro@gmail.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="llamadas-btn">
                <FaEnvelope style={{ color: '#fefeff' }}/>
                <span className="llamadas-text">E-mail</span>
              </button>
            </a>
          </div>
        </div>
        <div className={styles.socialSection}>
          <h2 className={styles.tituloAyuda}>Redes</h2>
          <div className={styles.contactItem}>
            <a href="https://www.youtube.com/@farmerin8076/videos" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="llamadas-btn">
                <FaYoutube style={{ color: '#fefeff' }}/>
                <span className="llamadas-text">YouTube</span>
              </button>
            </a>
          </div>
          <div className={styles.contactItem}>
            <a href="https://www.instagram.com/farmerinar/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="llamadas-btn">
                <FaInstagram style={{ color: '#fefeff' }}/>
                <span className="llamadas-text">Instagram</span>
              </button>
            </a>
          </div>
          <div className={styles.contactItem}>
            <a href="https://www.facebook.com/farmerinarg" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="llamadas-btn">
                <FaFacebook style={{ color: '#fefeff' }}/>
                <span className="llamadas-text">Facebook</span>
              </button>
            </a>
          </div>
          <div className={styles.contactItem}>
            <a href="https://www.farmerin.com.ar/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="web-button">
                <img src="/logoFarmerinBSF.png" alt="Logo Farmerin" className="web-icon" />
                <span className="llamadas-text">Sitio Web</span>
              </button>
            </a>
          </div>
        </div>
      </div>
        <div className={styles.contactPage}>
        <div className={styles.mapSection}>
          <h2 className={styles.tituloAyudaUbi}>Ubicación</h2>
          <iframe src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d693.04266389245!2d-59.27377595010148!3d-35.00503665959691!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses-419!2sar!4v1718821634668!5m2!1ses-419!2sar" width="100%" height="450" loading="lazy"></iframe>
        </div>
      </div>
    </Layout>
  );
};

export default Ayuda;
