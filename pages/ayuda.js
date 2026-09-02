import React from 'react';
import { FaPhone, FaWhatsapp, FaEnvelope, FaYoutube, FaInstagram, FaFacebook, FaGlobe, FaMapMarkerAlt, FaLocationArrow, FaRobot, FaArrowRight } from 'react-icons/fa';
import Link from 'next/link';
import Layout from '../components/layout/layout';
import styles from '../styles/Ayuda.module.scss';

const Ayuda = () => {
  return (
    <Layout titulo="Centro de Contacto">
      <div className={styles.pageContainer}>
        <div className={styles.contentWrapper}>

          {/* Encabezado Principal */}
          <header className={styles.header}>
            <h1>Centro de Contacto</h1>
            <p>Estamos para ayudarte. Elegí el canal que prefieras para comunicarte con nosotros o visitanos en nuestras oficinas.</p>
          </header>

          {/* Dos Columnas: Contacto y Redes Sociales */}
          <div className={styles.gridContainer}>

            {/* Columna Izquierda: Contacto Directo */}
            <section className={styles.section}>
              <h2><FaPhone style={{ color: '#0f172a' }} /> Contacto</h2>
              <div className={styles.cardsStack}>

                <a href="tel:2227623372" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.iconWrapper}><FaPhone /></div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardTitle}>Teléfono</span>
                    <p className={styles.cardDesc}>Llamanos</p>
                  </div>
                </a>

                <a href="http://api.whatsapp.com/send?phone=5492227623372" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.iconWrapper}><FaWhatsapp /></div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardTitle}>WhatsApp</span>
                    <p className={styles.cardDesc}>Escribinos directamente</p>
                  </div>
                </a>

                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=farmerin.navarro@gmail.com" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.iconWrapper}><FaEnvelope /></div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardTitle}>Correo electrónico</span>
                    <p className={styles.cardDesc}>Enviá un email</p>
                  </div>
                </a>

              </div>
            </section>

            {/* Columna Derecha: Redes Sociales */}
            <section className={styles.section}>
              <h2><FaGlobe style={{ color: '#0f172a' }} /> Redes Sociales</h2>
              <div className={styles.cardsGrid}>

                <a href="https://youtube.com/@farmerindivision?si=foTWbbjvTPuQniY4" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.iconWrapper}><FaYoutube /></div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardTitle}>YouTube</span>
                    <p className={styles.cardDesc}>Mirá nuestros videos</p>
                  </div>
                </a>

                <a href="https://www.instagram.com/farmerinar/" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.iconWrapper}><FaInstagram /></div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardTitle}>Instagram</span>
                    <p className={styles.cardDesc}>Seguinos</p>
                  </div>
                </a>

                <a href="https://www.facebook.com/farmerinarg" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.iconWrapper}><FaFacebook /></div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardTitle}>Facebook</span>
                    <p className={styles.cardDesc}>Comunidad Farmerin</p>
                  </div>
                </a>

                <a href="https://www.farmerin.com.ar/" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.iconWrapper}>
                    <img src="/AyudaFarmerinLogo2.png" alt="Logo Farmerin" />
                  </div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardTitle}>Sitio Web</span>
                    <p className={styles.cardDesc}>Conocé más</p>
                  </div>
                </a>

              </div>

              {/* Tarjeta Farmerin T.I.O. — ancho completo debajo de la grilla */}
              <Link href="/farmerin-tio" >
                <a className={`${styles.contactCard} ${styles.fullWidthCard}`}>
                  <div className={styles.iconWrapper}>
                    <img src="/t.i.o_icono_ayuda_2.png" alt="Farmerin T.I.O." />
                  </div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardTitle}>Farmerin T.I.O.</span>
                    <p className={styles.cardDesc}>Conocé a tu asistente</p>
                  </div>
                  <FaArrowRight className={styles.cardArrow} />
                </a>
              </Link>
            </section>
          </div>

          {/* Sección de Mapa y Ubicación (Full width) */}
          <div className={styles.mapContainerWrapper}>
            <section className={styles.mapSection}>
              <h2>Nuestra ubicación</h2>
              <p className={styles.mapDesc}>Visitanos en nuestras oficinas. Estamos listos para recibirte.</p>

              <div className={styles.mapBox}>
                <div className={styles.mapOverlay}>
                  <div className={styles.overlayTitle}>
                    <FaMapMarkerAlt style={{ color: '#4db150' }} />
                    Navarro, Buenos Aires
                  </div>
                  <p className={styles.overlayText}>
                    Nuestras oficinas centrales. Te esperamos de lunes a viernes en horario comercial.
                  </p>
                  <a href="https://maps.app.goo.gl/K1vurdSAhWLQjjLg9" target="_blank" rel="noopener noreferrer" className={styles.overlayBtn}>
                    <FaLocationArrow /> Cómo llegar
                  </a>
                </div>

                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3268.057913481831!2d-59.27660378871286!3d-35.00525537269953!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bc512f78b873fd%3A0x22e53ff66c945d9!2sFarmerin!5e0!3m2!1ses-419!2sar!4v1784302595930!5m2!1ses-419!2sar"
                  title="Ubicación de Farmerin"
                ></iframe>
              </div>
            </section>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default Ayuda;
