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
    <Layout titulo="Centro de Actualizaciones Masivas">
      <div className={styles.pageContainer}>
        <div className={styles.contentWrapper}>
          
          <header className={styles.header}>
            <h1>Actualización Masiva</h1>
            <p>
              Actualizá la información de tus animales y grupos mediante archivos Excel. 
              Descargá una plantilla, completala y luego cargala nuevamente para procesar los cambios.
            </p>
          </header>

          {procesando ? (
            <div className={styles.contenedorSpinner}>
              <Spinner animation="border" style={{ color: '#4db150' }} />
              <div className={styles.mensajeCargando}>Procesando actualización...</div>
            </div>
          ) : (
            <>
              {!tamboSel ? (
                <Alert variant="info" className="text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
                  Seleccioná un tambo en el menú superior antes de cargar planillas.
                </Alert>
              ) : (
                <div className={styles.gridContainer}>
                  
                  {/* ======== Módulo Izquierdo: Actualizar Animales ======== */}
                  <div className={styles.updateCard}>
                    <h2 className={styles.cardTitle}>
                      🐄 Actualizar Animales
                    </h2>

                    {/* Paso 1: Descargar */}
                    <div className={styles.stepWrapper}>
                      <div className={styles.stepHeader}>
                        <div className={styles.stepNumber}>1</div>
                        <h3 className={styles.stepTitle}>Descargar plantilla</h3>
                      </div>
                      <div className={styles.buttonGroup}>
                        <a href="/docs/planilla-modelo-actualizacionMasiva.xlsx" download className={styles.btnSecondary}>
                          📘 Modelo
                        </a>
                        <a href="/docs/planilla-vacia-actualizacionMasiva.xlsx" download className={styles.btnSecondary}>
                          📄 Vacía
                        </a>
                      </div>
                    </div>

                    {/* Paso 2: Seleccionar */}
                    <div className={styles.stepWrapper}>
                      <div className={styles.stepHeader}>
                        <div className={styles.stepNumber}>2</div>
                        <h3 className={styles.stepTitle}>Seleccionar archivo</h3>
                      </div>
                      
                      <Form onSubmit={handleSubmitAnimales}>
                        <input
                          id="fileAnimales"
                          ref={inputRefAnimales}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={onFileChangeAnimales}
                          accept=".xlsx,.xls"
                        />
                        <div
                          className={styles.dragDropZone}
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
                          <div className={styles.fileIcon}>📄</div>
                          <p className={styles.dragDropText}>
                            Arrastrá tu archivo aquí<br />
                            o <strong>hacé clic</strong> para seleccionarlo
                          </p>
                          {fileAnimales && (
                            <>
                              <div className={styles.fileName}>{fileNameAnimales}</div>
                              <button type="button" className={styles.btnDanger} onClick={(e) => { e.stopPropagation(); clearFileAnimales(); }}>
                                Borrar archivo
                              </button>
                            </>
                          )}
                        </div>

                        {mensajeAnimales && <Alert variant="warning" className="mt-3 mb-0 text-center">{mensajeAnimales}</Alert>}

                        {/* Paso 3: Procesar */}
                        <div className={styles.stepWrapper} style={{ marginTop: '32px' }}>
                          <div className={styles.stepHeader}>
                            <div className={styles.stepNumber}>3</div>
                            <h3 className={styles.stepTitle}>Procesar actualización</h3>
                          </div>
                          <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={!fileAnimales || procesandoAnimales}
                          >
                            Actualizar Animales
                          </button>
                        </div>
                      </Form>
                    </div>

                    {/* Resultados Animales */}
                    {(erroresAnimales.length > 0 || actualizadosAnimales.length > 0) && (
                      <div className={styles.alertasWrapper}>
                        {erroresAnimales.length > 0 && (
                          <div className={`${styles.alertaBox} ${styles.errorBox}`}>
                            <div className={styles.alertaHeader}>❌ Errores encontrados</div>
                            {erroresAnimales
                              .slice(0, mostrarMasErroresAnimales ? erroresAnimales.length : 5)
                              .map((e) => (
                                <Detalle key={uuidv4()} info={e} />
                              ))}
                            {erroresAnimales.length > 5 && (
                              <button type="button" className={styles.btnVerMas} onClick={() => setMostrarMasErroresAnimales(!mostrarMasErroresAnimales)}>
                                {mostrarMasErroresAnimales ? 'Ver menos errores' : `Ver ${erroresAnimales.length - 5} más`}
                              </button>
                            )}
                          </div>
                        )}

                        {actualizadosAnimales.length > 0 && (
                          <div className={`${styles.alertaBox} ${styles.successBox}`}>
                            <div className={styles.alertaHeader}>✅ Actualizaciones realizadas</div>
                            {actualizadosAnimales
                              .slice(0, mostrarMasActualizadosAnimales ? actualizadosAnimales.length : 5)
                              .map((a) => (
                                <Detalle key={uuidv4()} info={a} />
                              ))}
                            {actualizadosAnimales.length > 5 && (
                              <button type="button" className={styles.btnVerMas} onClick={() => setMostrarMasActualizadosAnimales(!mostrarMasActualizadosAnimales)}>
                                {mostrarMasActualizadosAnimales ? 'Ver menos' : `Ver ${actualizadosAnimales.length - 5} más`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* ======== Módulo Derecho: Actualizar ERP / Grupo ======== */}
                  <div className={styles.updateCard}>
                    <h2 className={styles.cardTitle}>
                      🔢 Actualizar ERP / Grupo
                    </h2>

                    {/* Paso 1: Descargar */}
                    <div className={styles.stepWrapper}>
                      <div className={styles.stepHeader}>
                        <div className={styles.stepNumber}>1</div>
                        <h3 className={styles.stepTitle}>Descargar plantilla</h3>
                      </div>
                      <div className={styles.buttonGroup}>
                        <a href="/docs/planilla-modelo-actualizacionMasivaErpGrupo.xlsx" download className={styles.btnSecondary}>
                          📘 Modelo
                        </a>
                        <a href="/docs/planilla-vacia-actualizacionMasivaErpGrupo.xlsx" download className={styles.btnSecondary}>
                          📄 Vacía
                        </a>
                      </div>
                    </div>

                    {/* Paso 2: Seleccionar */}
                    <div className={styles.stepWrapper}>
                      <div className={styles.stepHeader}>
                        <div className={styles.stepNumber}>2</div>
                        <h3 className={styles.stepTitle}>Seleccionar archivo</h3>
                      </div>
                      
                      <Form onSubmit={handleSubmitERP}>
                        <input
                          id="fileERP"
                          ref={inputRefERP}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={onFileChangeERP}
                          accept=".xlsx,.xls"
                        />
                        <div
                          className={styles.dragDropZone}
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
                          <div className={styles.fileIcon}>📄</div>
                          <p className={styles.dragDropText}>
                            Arrastrá tu archivo aquí<br />
                            o <strong>hacé clic</strong> para seleccionarlo
                          </p>
                          {fileERP && (
                            <>
                              <div className={styles.fileName}>{fileNameERP}</div>
                              <button type="button" className={styles.btnDanger} onClick={(e) => { e.stopPropagation(); clearFileERP(); }}>
                                Borrar archivo
                              </button>
                            </>
                          )}
                        </div>

                        {mensajeERP && <Alert variant="warning" className="mt-3 mb-0 text-center">{mensajeERP}</Alert>}

                        {/* Paso 3: Procesar */}
                        <div className={styles.stepWrapper} style={{ marginTop: '32px' }}>
                          <div className={styles.stepHeader}>
                            <div className={styles.stepNumber}>3</div>
                            <h3 className={styles.stepTitle}>Procesar actualización</h3>
                          </div>
                          <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={!fileERP || procesandoERP}
                          >
                            Actualizar ERP / Grupo
                          </button>
                        </div>
                      </Form>
                    </div>

                    {/* Resultados ERP */}
                    {(erroresERP.length > 0 || actualizadosERP.length > 0) && (
                      <div className={styles.alertasWrapper}>
                        {erroresERP.length > 0 && (
                          <div className={`${styles.alertaBox} ${styles.errorBox}`}>
                            <div className={styles.alertaHeader}>❌ Errores encontrados</div>
                            {erroresERP
                              .slice(0, mostrarMasErroresERP ? erroresERP.length : 5)
                              .map((e) => (
                                <Detalle key={uuidv4()} info={e} />
                              ))}
                            {erroresERP.length > 5 && (
                              <button type="button" className={styles.btnVerMas} onClick={() => setMostrarMasErroresERP(!mostrarMasErroresERP)}>
                                {mostrarMasErroresERP ? 'Ver menos errores' : `Ver ${erroresERP.length - 5} más`}
                              </button>
                            )}
                          </div>
                        )}

                        {actualizadosERP.length > 0 && (
                          <div className={`${styles.alertaBox} ${styles.successBox}`}>
                            <div className={styles.alertaHeader}>✅ Actualizaciones realizadas</div>
                            {actualizadosERP
                              .slice(0, mostrarMasActualizadosERP ? actualizadosERP.length : 5)
                              .map((a) => (
                                <Detalle key={uuidv4()} info={a} />
                              ))}
                            {actualizadosERP.length > 5 && (
                              <button type="button" className={styles.btnVerMas} onClick={() => setMostrarMasActualizadosERP(!mostrarMasActualizadosERP)}>
                                {mostrarMasActualizadosERP ? 'Ver menos' : `Ver ${actualizadosERP.length - 5} más`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default Actualizacion;
