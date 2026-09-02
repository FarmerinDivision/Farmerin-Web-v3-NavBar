import React from 'react';
import { FaRobot, FaComments, FaCompass, FaClock, FaStar, FaArrowRight, FaArrowLeft, FaNetworkWired, FaLightbulb, FaChartLine } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/layout/layout';
import styles from '../styles/FarmerinTio.module.scss';

const features = [
  {
    icon: <FaComments />,
    title: 'Consultá',
    desc: 'Hacé preguntas sobre tus datos, registros y procesos dentro de Farmerin.',
  },
  {
    icon: <FaCompass />,
    title: 'Orientate',
    desc: 'Recibí guías paso a paso para completar tareas y resolver situaciones.',
  },
  {
    icon: <FaClock />,
    title: 'Ahorrá tiempo',
    desc: 'Encontrá respuestas al instante sin buscar en manuales o menús.',
  },
  {
    icon: <FaStar />,
    title: 'Conocé Farmerin',
    desc: 'Descubrí funcionalidades que quizás todavía no estás aprovechando.',
  },
];

const FarmerinTio = () => {
  const router = useRouter();

  return (
    <Layout titulo="Farmerin T.I.O.">
      <div className={styles.pageContainer}>

        {/* Botón Volver */}
        <div className={styles.backBar}>
          <Link href="/ayuda">
            <a className={styles.backButton}>
              <FaArrowLeft /> Volver al Centro de Contacto
            </a>
          </Link>
        </div>

        {/* ——— Hero ——— */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroIconWrapper}>
              <img src="/TIIOfarmerin.png" alt="Farmerin T.I.O." />
            </div>
            <span className={styles.heroBadge}>Asistente inteligente</span>
            <h1 className={styles.heroTitle}>
              Conocé a Farmerin <span>T.I.O.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Tu nuevo asistente dentro de Farmerin
            </p>
            <p className={styles.heroText}>
              T.I.O. te ayuda a resolver dudas, encontrar información y aprovechar al máximo
              todas las herramientas de Farmerin, de forma rápida y sencilla.
            </p>
          </div>
        </section>

        {/* ——— ¿Qué es? ——— */}
        <section className={`${styles.section} ${styles.whatIsSection}`}>
          <div className={styles.whatIsContent}>
            <h2 className={styles.sectionTitle}>¿Qué es Farmerin T.I.O.?</h2>
            <p className={styles.whatIsText}>
              Farmerin T.I.O. es tu{' '}
              <span className={styles.whatIsHighlight}>asistente virtual integrado</span>{' '}
              dentro de la plataforma. Pensado para acompañarte en el día a día,
              T.I.O. entiende tus consultas y te orienta con respuestas claras y
              contextualizadas, sin que tengas que salir de lo que estás haciendo.
            </p>
          </div>
        </section>

        {/* ——— ¿Qué significa T.I.O.? ——— */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>¿Qué significa T.I.O.?</h2>
          <p className={styles.sectionDesc}>
            Tres conceptos que representan nuestra forma de transformar la tecnología en soluciones para el campo.
          </p>
          
          <div className={styles.tioGrid}>
            {/* T */}
            <div className={styles.tioCard}>
              <div className={styles.tioLetter}>T</div>
              <div className={styles.tioIcon}><FaNetworkWired /></div>
              <h3 className={styles.tioTitle}>Tecnología que conecta</h3>
              <p className={styles.tioDesc}>
                Utilizar la tecnología como herramienta para conectar información, personas y procesos dentro de la actividad agropecuaria.
                <br/><br/>
                La tecnología permite centralizar los datos y convertirlos en información útil para tomar mejores decisiones.
              </p>
            </div>

            {/* Connector */}
            <div className={styles.tioConnector}></div>

            {/* I */}
            <div className={styles.tioCard}>
              <div className={styles.tioLetter}>I</div>
              <div className={styles.tioIcon}><FaLightbulb /></div>
              <h3 className={styles.tioTitle}>Innovación que transforma</h3>
              <p className={styles.tioDesc}>
                Buscar nuevas formas de resolver los desafíos del sector, incorporando herramientas modernas y soluciones inteligentes que simplifican la gestión.
                <br/><br/>
                La innovación no es solamente crear algo nuevo, sino encontrar una mejor manera de hacer las cosas.
              </p>
            </div>

            {/* Connector */}
            <div className={styles.tioConnector}></div>

            {/* O */}
            <div className={styles.tioCard}>
              <div className={styles.tioLetter}>O</div>
              <div className={styles.tioIcon}><FaChartLine /></div>
              <h3 className={styles.tioTitle}>Optimización que genera resultados</h3>
              <p className={styles.tioDesc}>
                Transformar los datos y la información en procesos más eficientes, reduciendo tareas innecesarias y ayudando a aprovechar mejor los recursos.
                <br/><br/>
                El objetivo es hacer más simple, eficiente y productiva la gestión del establecimiento.
              </p>
            </div>
          </div>

          <div className={styles.tioFooter}>
            <p className={styles.tioFooterText}>Tecnología para innovar. Innovación para optimizar.</p>
            <p className={styles.tioFooterHighlight}>Eso es T.I.O.</p>
          </div>
        </section>

        {/* ——— ¿En qué puede ayudarte? ——— */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>¿En qué puede ayudarte?</h2>
          <p className={styles.sectionDesc}>
            T.I.O. está diseñado para facilitarte el trabajo en cada paso.
          </p>
          <div className={styles.featuresGrid}>
            {features.map((feat, idx) => (
              <div className={styles.featureCard} key={idx}>
                <div className={styles.featureIconWrapper}>{feat.icon}</div>
                <h3 className={styles.featureTitle}>{feat.title}</h3>
                <p className={styles.featureDesc}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ——— CTA ——— */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>
              ¿Necesitás ayuda en alguna sección de Farmerin?
            </h2>
            <p className={styles.ctaText}>
              T.I.O. está preparado para acompañarte. Dirigite a la sección donde tenés un problema y hablá con T.I.O. para que pueda ayudarte y darte información sobre dicha sección.
            </p>
            <button className={styles.ctaButton} onClick={() => router.push('/animales')}>
              Ir a Inicio <FaArrowRight />
            </button>
          </div>
        </section>

      </div>
    </Layout>
  );
};

export default FarmerinTio;
