// pages/actualizacion.js
import React, { useState, useContext, useRef } from 'react';
import Layout from '../components/layout/layout';
import { Botonera, Mensaje, ContenedorSpinner } from '../components/ui/Elementos';
import { FirebaseContext } from '../firebase2';
import { Row, Col, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { v4 as uuidv4 } from 'uuid';
import Detalle from '../components/layout/detalle';
import SelectTambo from '../components/layout/selectTambo';
import { useActualizarAnimales } from '../components/layout/useActualizarAnimales';
import { useActualizarErpGrupo } from '../components/layout/useActualizarERPGrupo';
import styles from '../styles/actualizacionMasiva.module.scss';

const Actualizacion = () => {
  const { tamboSel } = useContext(FirebaseContext);

  // ---- useActualizarAnimales ----
  const [fileAnimales, setFileAnimales] = useState(null);
  const [fileNameAnimales, setFileNameAnimales] = useState('Ningún archivo seleccionado');
  const [mensajeAnimales, setMensajeAnimales] = useState(null);
  const inputRefAnimales = useRef(null);

  const {
    cargarExcel: cargarAnimales,
    errores: erroresAnimales,
    actualizados: actualizadosAnimales,
    procesando: procesandoAnimales,
  } = useActualizarAnimales(tamboSel);

  // ---- useActualizarERPGrupo ----
  const [fileERP, setFileERP] = useState(null);
  const [fileNameERP, setFileNameERP] = useState('Ningún archivo seleccionado');
  const [mensajeERP, setMensajeERP] = useState(null);
  const inputRefERP = useRef(null);

  // 👇 Agregá estos estados arriba en el componente
  const [mostrarMasErroresAnimales, setMostrarMasErroresAnimales] = useState(false);
  const [mostrarMasActualizadosAnimales, setMostrarMasActualizadosAnimales] = useState(false);

  // Si querés también para ERP:
  const [mostrarMasErroresERP, setMostrarMasErroresERP] = useState(false);
  const [mostrarMasActualizadosERP, setMostrarMasActualizadosERP] = useState(false);



  const {
    cargarExcel: cargarERP,
    errores: erroresERP,
    actualizados: actualizadosERP,
    procesando: procesandoERP,
  } = useActualizarErpGrupo(tamboSel);

  // ----- Handlers Animales -----
  const onFileChangeAnimales = (e) => {
    const f = e.target.files[0];
    console.log('onFileChangeAnimales -> file:', f);
    if (f) {
      setFileAnimales(f);
      setFileNameAnimales(f.name);
      setMensajeAnimales(null);
    }
  };

  const clearFileAnimales = () => {
    setFileAnimales(null);
    setFileNameAnimales('Ningún archivo seleccionado');
    setMensajeAnimales(null);
  };

  const handleSubmitAnimales = (e) => {
    e.preventDefault();
    console.log('handleSubmitAnimales -> fileAnimales:', fileAnimales, 'cargarAnimales:', cargarAnimales);
    if (!fileAnimales) {
      setMensajeAnimales('No seleccionaste ningún archivo.');
      return;
    }
    if (typeof cargarAnimales !== 'function') {
      setMensajeAnimales('Función de carga no disponible. Revisá el hook useActualizarAnimales.');
      console.error('cargarAnimales no es una función:', cargarAnimales);
      return;
    }
    cargarAnimales(fileAnimales);
  };

  // ----- Handlers ERP -----
  const onFileChangeERP = (e) => {
    const f = e.target.files[0];
    console.log('onFileChangeERP -> file:', f);
    if (f) {
      setFileERP(f);
      setFileNameERP(f.name);
      setMensajeERP(null);
    }
  };

  const clearFileERP = () => {
    setFileERP(null);
    setFileNameERP('Ningún archivo seleccionado');
    setMensajeERP(null);
  };

  const handleSubmitERP = (e) => {
    e.preventDefault();
    console.log('handleSubmitERP -> fileERP:', fileERP, 'cargarERP:', cargarERP);
    if (!fileERP) {
      setMensajeERP('No seleccionaste ningún archivo.');
      return;
    }
    if (typeof cargarERP !== 'function') {
      setMensajeERP('Función de carga no disponible. Revisá el hook useActualizarERPGrupo.');
      console.error('cargarERP no es una función:', cargarERP);
      return;
    }
    cargarERP(fileERP);
  };

  const procesando = procesandoAnimales || procesandoERP;

  return (
    <Layout titulo="Actualización Masiva">
      {procesando ? (
        <ContenedorSpinner>
          <div className={styles.contenedorSpinner}>
            <Spinner animation="border" variant="info" />
            <div className={styles.mensajeCargando}>Procesando actualización...</div>
          </div>
        </ContenedorSpinner>
      ) : (
        <>
          {!tamboSel ? (
            <div className="container mt-4">
              <Alert variant="info">Seleccioná un tambo antes de cargar planillas.</Alert>
              <SelectTambo />
            </div>
          ) : (
            <div className="container mt-4">
              <Row>
                {/* ======== IZQUIERDA: Actualizar Animales ======== */}
                <Col md={6}>
                  <div className={styles.sectionBox}>
                    <h5 className="text-center mb-3">🐄 Actualizar Animales</h5>

                    {/* 📥 Planillas ejemplo */}
                    <Botonera>
                      <div className={styles.descargaWrapper}>
                        <h6 className={styles.descargaTitulo}>📄 Planillas para animales</h6>
                        <p className={styles.descargaSubtitulo}>
                          Descargá un modelo o una plantilla vacía:
                        </p>
                        <div className={styles.botonGrupo}>
                          <a
                            href="/docs/planilla-modelo-actualizacionMasiva.xlsx"
                            download
                            className={styles.btnDescarga}
                          >
                            📘 Modelo
                          </a>
                          <a
                            href="/docs/planilla-vacia-actualizacionMasiva.xlsx"
                            download
                            className={styles.btnDescarga}
                          >
                            📄 Vacía
                          </a>
                        </div>
                      </div>
                    </Botonera>

                    {/* 📤 Cargar archivo */}
                    {/* 📤 Cargar archivo Animales con Drag & Drop */}
                    <Botonera>
                      <Form onSubmit={handleSubmitAnimales} className="text-center">
                        {mensajeAnimales && <Alert variant="warning">{mensajeAnimales}</Alert>}

                        <input
                          id="fileAnimales"
                          ref={inputRefAnimales}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={onFileChangeAnimales}
                          accept=".xlsx,.xls"
                        />

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '2px dashed #ccc',
                            padding: '1rem',
                            borderRadius: '8px',
                            backgroundColor: '#f9f9f9',
                            cursor: 'pointer',
                          }}
                          onClick={() => inputRefAnimales.current && inputRefAnimales.current.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer.files[0];
                            if (f) {
                              setFileAnimales(f);
                              setFileNameAnimales(f.name);
                              setMensajeAnimales(null);
                            }
                          }}
                        >
                          <Button
                            className={styles.btnSeleccionArchivo}
                            type="button"
                          >
                            📎 Seleccionar o arrastrar archivo
                          </Button>

                          <div className={styles.nombreArchivo}>{fileNameAnimales}</div>

                          {fileAnimales && (
                            <Button variant="danger" onClick={(e) => { e.stopPropagation(); clearFileAnimales(); }}>
                              Borrar
                            </Button>
                          )}
                        </div>

                        <div className="mt-3">
                          <button
                            className="button-ActMasiva"
                            type="submit"
                            disabled={!fileAnimales || procesandoAnimales}
                          >
                            <span className="span-ActMasiva">Cargar Planilla Animales</span>
                          </button>
                        </div>
                      </Form>
                    </Botonera>


                    {/* 🧾 Resultados */}
                    <Mensaje>
                      {/* ====== Errores Animales ====== */}
                      {erroresAnimales.length > 0 && (
                        <div className={`${styles.alertaBox} ${styles.errorBox}`}>
                          <div className={styles.alertaHeader}>❌ Errores encontrados</div>

                          {erroresAnimales
                            .slice(0, mostrarMasErroresAnimales ? erroresAnimales.length : 5)
                            .map((e) => (
                              <Detalle key={uuidv4()} info={e} />
                            ))}

                          {erroresAnimales.length > 5 && (
                            <button
                              type="button"
                              className={styles.btnVerMas}
                              onClick={() => setMostrarMasErroresAnimales(!mostrarMasErroresAnimales)}
                            >
                              {mostrarMasErroresAnimales ? 'Ver menos' : 'Ver más'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* ====== Actualizados Animales ====== */}
                      {actualizadosAnimales.length > 0 && (
                        <div className={`${styles.alertaBox} ${styles.successBox}`}>
                          <div className={styles.alertaHeader}>✅ Actualizaciones realizadas</div>

                          {actualizadosAnimales
                            .slice(0, mostrarMasActualizadosAnimales ? actualizadosAnimales.length : 5)
                            .map((a) => (
                              <Detalle key={uuidv4()} info={a} />
                            ))}

                          {actualizadosAnimales.length > 5 && (
                            <button
                              type="button"
                              className={styles.btnVerMas}
                              onClick={() => setMostrarMasActualizadosAnimales(!mostrarMasActualizadosAnimales)}
                            >
                              {mostrarMasActualizadosAnimales ? 'Ver menos' : 'Ver más'}
                            </button>
                          )}
                        </div>
                      )}

                    </Mensaje>
                  </div>
                </Col>

                {/* ======== DERECHA: Actualizar ERP/Grupo ======== */}
                <Col md={6}>
                  <div className={styles.sectionBox}>
                    <h5 className="text-center mb-3">🔢 Actualizar ERP / Grupo</h5>

                    {/* 📥 Planillas ejemplo */}
                    <Botonera>
                      <div className={styles.descargaWrapper}>
                        <h6 className={styles.descargaTitulo}>📄 Planillas ERP/Grupo</h6>
                        <p className={styles.descargaSubtitulo}>
                          Descargá un modelo o una plantilla vacía:
                        </p>
                        <div className={styles.botonGrupo}>
                          <a
                            href="/docs/planilla-modelo-actualizacionMasivaErpGrupo.xlsx"
                            download
                            className={styles.btnDescarga}
                          >
                            📘 Modelo
                          </a>
                          <a
                            href="/docs/planilla-vacia-actualizacionMasivaErpGrupo.xlsx"
                            download
                            className={styles.btnDescarga}
                          >
                            📄 Vacía
                          </a>
                        </div>
                      </div>
                    </Botonera>

                    {/* 📤 Cargar archivo */}
                    {/* 📤 Cargar archivo ERP con Drag & Drop */}
                    <Botonera>
                      <Form onSubmit={handleSubmitERP} className="text-center">
                        {mensajeERP && <Alert variant="warning">{mensajeERP}</Alert>}

                        <input
                          id="fileERP"
                          ref={inputRefERP}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={onFileChangeERP}
                          accept=".xlsx,.xls"
                        />

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '2px dashed #ccc',
                            padding: '1rem',
                            borderRadius: '8px',
                            backgroundColor: '#f9f9f9',
                            cursor: 'pointer',
                          }}
                          onClick={() => inputRefERP.current && inputRefERP.current.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer.files[0];
                            if (f) {
                              setFileERP(f);
                              setFileNameERP(f.name);
                              setMensajeERP(null);
                            }
                          }}
                        >
                          <Button className={styles.btnSeleccionArchivo} variant="outline-primary">
                            📎 Seleccionar o arrastrar archivo
                          </Button>

                          <div className={styles.nombreArchivo}>{fileNameERP}</div>

                          {fileERP && (
                            <Button variant="danger" onClick={(e) => { e.stopPropagation(); clearFileERP(); }}>
                              Borrar
                            </Button>
                          )}
                        </div>

                        <div className="mt-3">
                          <button
                            className="button-ActMasiva"
                            type="submit"
                            disabled={!fileERP || procesandoERP}
                          >
                            <span className="span-ActMasiva">Cargar Planilla ERP/Grupo</span>
                          </button>
                        </div>
                      </Form>
                    </Botonera>

                    {/* 🧾 Resultados */}
                    <Mensaje>
                      {(erroresERP.length > 0 || actualizadosERP.length > 0) && (
                        <div className={styles.alertasWrapper}>

                          {/* ====== Errores ERP ====== */}
                          {erroresERP.length > 0 && (
                            <div className={`${styles.alertaBox} ${styles.errorBox}`}>
                              <div className={styles.alertaHeader}>❌ Errores encontrados</div>

                              {erroresERP
                                .slice(0, mostrarMasErroresERP ? erroresERP.length : 5)
                                .map((e) => (
                                  <Detalle key={uuidv4()} info={e} />
                                ))}

                              {erroresERP.length > 5 && (
                                <button
                                  type="button"
                                  className={styles.btnVerMas}
                                  onClick={() => setMostrarMasErroresERP(!mostrarMasErroresERP)}
                                >
                                  {mostrarMasErroresERP ? 'Ver menos' : 'Ver más'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* ====== Actualizados ERP ====== */}
                          {actualizadosERP.length > 0 && (
                            <div className={`${styles.alertaBox} ${styles.successBox}`}>
                              <div className={styles.alertaHeader}>✅ Actualizaciones realizadas</div>

                              {actualizadosERP
                                .slice(0, mostrarMasActualizadosERP ? actualizadosERP.length : 5)
                                .map((a) => (
                                  <Detalle key={uuidv4()} info={a} />
                                ))}

                              {actualizadosERP.length > 5 && (
                                <button
                                  type="button"
                                  className={styles.btnVerMas}
                                  onClick={() => setMostrarMasActualizadosERP(!mostrarMasActualizadosERP)}
                                >
                                  {mostrarMasActualizadosERP ? 'Ver menos' : 'Ver más'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </Mensaje>

                  </div>
                </Col>
              </Row>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default Actualizacion;
