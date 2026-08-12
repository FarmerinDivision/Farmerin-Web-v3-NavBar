import React, { useState, useEffect } from 'react';
import LayoutLogin from '../components/layout/layoutLogin';
import Router from 'next/router';
import CrearCuenta from './crear-cuenta';
import styles from '../styles/Login.module.scss';
import { GiPear } from "react-icons/gi";
import { FaLongArrowAltUp } from "react-icons/fa";
import { TbCircleLetterF } from "react-icons/tb";

//formato del formulario
import { Contenedor, ContenedorPoliticas, ContenedorLogin, ContenedorSpinner, ContenedorPass } from '../components/ui/Elementos';
import { Form, Button, Alert, Spinner, Row, Container, Col, Image, Modal } from 'react-bootstrap';
import firebase from '../firebase2'
import { IoMdEyeOff, IoMdEye } from 'react-icons/io';

//hook de validacion de formualarios
import useValidacion from '../hook/useValidacion';
//importo las reglas de validacion para crear cuenta
import validarIniciarSesion from '../validacion/validarIniciarSesion';

//State inicial para el hook de validacion (inicializo vacío)
const STATE_INICIAL = {
  email: '',
  password: ''
}

const Login = () => {
  const [procesando, guardarProcesando] = useState(false);
  const [error, guardarError] = useState(false);

  const { valores, errores, handleSubmit, handleChange, handleBlur } = useValidacion(STATE_INICIAL, validarIniciarSesion, iniciarSesion);

  const { email, password } = valores;

  const [showPass, setShowPass] = useState(false);
  const [show, setShow] = useState(false);
  const [showPoliticas, setShowPoliticas] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [emailToReset, setEmailToReset] = useState("");
  const [alert, setAlert] = useState({ show: false, title: '', message: '', color: '#DD6B55' });
  const [showAlert, setShowAlert] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleClosePoliticas = () => setShowPoliticas(false);
  const handleShowPoliticas = () => setShowPoliticas(true);

  const handleCloseForgotPassword = () => setShowForgotPassword(false);
  const handleShowForgotPassword = () => setShowForgotPassword(true);

  const handleChangeEmail = (e) => {
    setEmailToReset(e.target.value);
  };

  async function iniciarSesion() {
    guardarProcesando(true);
    setShowLoader(true);
    try {
      await firebase.login(email, password);
      await Router.push('/');
    } catch (error) {
      console.error('Hubo un error:', error.message);
      guardarError('Correo o contraseña incorrectos. Inténtalo nuevamente.');
    } finally {
      guardarProcesando(false);
      setShowLoader(false);
    }
  }

  // Mostrar el mensaje de error en el formulario
  { error && <Alert variant="danger">{error}</Alert> }


  const forgotPassword = async () => {
    guardarProcesando(true);
    try {
      await firebase.auth.sendPasswordResetEmail(emailToReset);
      setAlert({
        show: true,
        title: '¡ATENCIÓN!',
        message: "TE HEMOS ENVIADO UN MAIL PARA RESTABLECER TU CONTRASEÑA, SI NO LO HAS RECIBIDO REVISA EN SPAM",
        color: '#399dad'
      });
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      setAlert({
        show: true,
        title: '¡ATENCIÓN!',
        message: "EL CORREO INGRESADO NO SE ENCUENTRA REGISTRADO EN FARMERIN",
        color: 'red'
      });
    } finally {
      guardarProcesando(false);
    }
    setShowAlert(true);
  };

  useEffect(() => {
    const handleRouteChangeComplete = () => {
      setShowLoader(false);
    };

    Router.events.on('routeChangeComplete', handleRouteChangeComplete);
    return () => {
      Router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, []);


  return (
    <div className={styles.loginContainer}>
      {/* 🔄 Overlay loader moderno */}
      {procesando && (
        <div className={styles.loaderOverlay}>
          <div className={styles.loaderContent}>
            <div className={styles.loaderSpinner}></div>
            <span>Iniciando sesión...</span>
          </div>
        </div>
      )}

      {/* 📱 Mockup estilo Instagram */}
      <div className={styles.loginImageSection}>
        <div className={styles.phoneMockup}>
          <span className={styles.notch}></span>
          <span className={styles.sideButtonTop}></span>
          <span className={styles.sideButtonBottom}></span>
          {/* TODO: Terminado el Mundial, restaurar la versión original de la imagen:
          <img
            src="/FondoLoginN.jpg"
            alt="App Preview"
            className={styles.phoneScreen}
          />
          */}
         {/* <video
            className={styles.phoneScreen}
            style={{ backgroundColor: '#ffffff' }}
            autoPlay
            muted
            loop
            playsInline
            controls={false}
          >
            <img src="FondoLoginN.jpg" alt="App Preview" className={styles.phoneScreen} />
          </video>
          */}
          <img
            src="/FondoLoginN.jpg"
            alt="App Preview"
            className={styles.phoneScreen}
          />
        </div>
      </div>

      {/* 🧾 Sección del formulario */}
      <div className={styles.loginFormSection}>
        <div className={styles.loginCard}>
          <img src="/logoLetras.png" alt="Logo" className={styles.loginLogo} />

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={handleChange}
              className={styles.loginInput}
              required
            />
            {errores.email && <p className={styles.errorText}>{errores.email}</p>}

            <div className={styles.inputWithIconPass}>
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="Contraseña"
                value={password}
                onChange={handleChange}
                className={styles.passwordInput}
                required
              />
              <span onClick={() => setShowPass(!showPass)} className={styles.icon}>
                {showPass ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
              </span>
            </div>
            {errores.password && <p className={styles.errorText}>{errores.password}</p>}
            {error && <p className={styles.errorText}>{error}</p>}

            <button type="submit" className={styles.loginButton} disabled={procesando}>
              {procesando ? 'Espere...' : 'Iniciar sesión'}
            </button>

            <div className={styles.divider}><span>O</span></div>

            <div className={styles.loginRegisterCard}>
              ¿Olvidaste tu contraseña?
              <button type="button" onClick={() => setShowForgotPassword(true)} className={styles.forgotLink}>
                Recuperar o Cambiar
              </button>
            </div>

          </form>
        </div>

        <div className={styles.loginRegisterCard}>
          ¿No tienes una cuenta?{' '}
          <button onClick={() => setShow(true)} className={styles.registerLink}>
            Regístrate en Farmerin
          </button>
        </div>
        <div className={styles.footerContainer}>
          <div className={styles.divider}><span>O</span></div>
          <div className={styles.footerLinks}>
            <a href="https://farmerin.com.ar/" target="_blank" rel="noopener noreferrer" className={styles.link}> Farmerin Division S.A. </a>
            <span className={styles.separator}>|</span>
            <a href="https://ultraidi.com.ar/" target="_blank" rel="noopener noreferrer" className={styles.link}>Ultra I+D+I</a>
            <span className={styles.separator}>&</span>
            <a href="https://studio--studio-2931549742-72d7c.us-central1.hosted.app" target="_blank" rel="noopener noreferrer" className={styles.link}>Faltra Studio</a>
            <span className={styles.devText}>and Farmerin Dev.</span>
          </div>
        </div>
      </div>

      {/* 📦 Modal: Registro */}
      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Registrarse</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CrearCuenta />
        </Modal.Body>
      </Modal>

      {/* 📦 Modal: Recuperar contraseña */}
      <Modal show={showForgotPassword} onHide={() => setShowForgotPassword(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Recuperar Contraseña</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Ingresa tu correo electrónico</Form.Label>
              <Form.Control
                type="email"
                placeholder="Correo Electrónico"
                value={emailToReset}
                onChange={(e) => setEmailToReset(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="info" onClick={forgotPassword} disabled={procesando} style={{ width: '100%' }}>
              {procesando ? "Procesando..." : "Enviar Mail de Recuperación"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* 📦 Modal: Alerta */}
      <Modal show={showAlert} onHide={() => setShowAlert(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{alert.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{alert.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAlert(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );



}

export default Login;