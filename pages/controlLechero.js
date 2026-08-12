import React, { useState, useContext, useEffect } from 'react'
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, ContenedorSpinner } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import { Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { format } from 'date-fns'
import readXlsxFile from 'read-excel-file'
import Detalle from '../components/layout/detalle';
import { v4 as uuidv4 } from 'uuid';
import SelectTambo from '../components/layout/selectTambo';
import styles from '../styles/UploadLayout.module.scss';

const ControlLechero = () => {

  const { firebase, tamboSel, usuario } = useContext(FirebaseContext);
  const [fecha, guardarFecha] = useState(null);
  const [file, guardarFile] = useState(null);
  const [errores, guardarErrores] = useState([]);
  const [actualizados, guardarActualizados] = useState([]);
  const [procesando, guardarProcesando] = useState(false);
  const [animales, guardarAnimales] = useState([]);


  useEffect(() => {
    const f = format(Date.now(), 'yyyy-MM-dd');
    guardarFecha(f);

  }, [])


  const handleChange = e => {
    guardarFecha(e.target.value);

  }

  const handleSubmit = e => {
    e.preventDefault();
    if (file) {

      //console.log(file.name.indexOf('.'));
      cargarControl();

    }

  }

  async function cargarControl() {
    guardarProcesando(true);
    let fila = 0;
    guardarErrores([]);
    guardarActualizados([]);
    guardarAnimales([]);

    await readXlsxFile(file).then((rows) => {
      rows.forEach(r => {
        fila++;
        if (fila != 1) {

          const a = {
            erp: r[0],
            lts: r[1],
            anorm: "",
            fila: fila
          }
          cargarAnimal(a);

        }

      });

    })
    guardarFile(null);
    //console.log(animales);
    // animales.forEach(a => {

    // });
    guardarProcesando(false);
  }

  async function cargarAnimal(a) {
    let litros;
    let e = '';
    let erp;
    try {
      litros = a.lts.toString();
      if (litros.includes(",")) {
        litros = litros.replace(',', '.');
      }
    } catch (error) {
      e = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - Error de formato en Lts.";
      guardarErrores(errores => [...errores, e]);
    }
    try {
      erp = a.erp.toString();
    } catch (error) {
      e = "Fila N°: " + a.fila + " - Error en eRP.";
      guardarErrores(errores => [...errores, e]);
    }

    let valores;
    if (isNaN(litros) || (!litros)) {
      e = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - Los litros deben ser un valor numérico";
      guardarErrores(errores => [...errores, e]);
    } else {
      if (e == '') {

        await firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('erp', 'in', [erp, a.erp]).get().then(snapshot => {
          if (!snapshot.empty) {
            snapshot.forEach(doc => {
              valores = {
                uc: parseFloat(litros),
                fuc: firebase.fechaTimeStamp(fecha),
                ca: doc.data().uc,
                anorm: a.anorm,
              }
              try {
                let detalle = litros + " lts."
                if (a.anorm) {
                  detalle = detalle + " - Anorm: " + a.anorm
                }
                firebase.db.collection('animal').doc(doc.id).update(valores);
                firebase.db.collection('animal').doc(doc.id).collection('eventos').add({
                  fecha: valores.fuc,
                  tipo: 'Control Lechero',
                  detalle: detalle,
                  usuario: usuario.displayName,
                  idtambo: tamboSel.id,
                })
                let act = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - Lts: " + litros;
                guardarActualizados(actualizados => [...actualizados, act]);
              } catch (error) {

                e = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - Error al actualizar los datos ";
                guardarErrores(errores => [...errores, e]);
              }
            });


          } else {
            e = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - El eRP no existe";
            guardarErrores(errores => [...errores, e]);
          }

        });
      }
    }

  }


  const onFileChange = e => {
    const f = e.target.files[0];
    guardarErrores([]);
    guardarActualizados([]);
    guardarFile(f);

  }

  const clearFile = () => {
    guardarFile(null);
  }

  const handleDragOver = e => {
    e.preventDefault();
  }

  const handleDrop = e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      guardarFile(f);
    }
  }


  return (
    <Layout titulo="Control Lechero">
      {tamboSel ? (
        <div className={styles.mainContainer}>
          {/* Panel Izquierdo: Acciones */}
          <div className={styles.leftPanel}>
            <div className={styles.actionCard}>
              <h1 className={styles.pageTitle}>Control Lechero</h1>
              <p className={styles.pageSubtitle}>Importe los litros desde una planilla Excel.</p>

              <div className={styles.actionCardTitle}>Plantillas</div>
              <div className={styles.downloadCardsContainer}>
                <a href="/docs/planilla-modelo-controlLec.xlsx" download className={styles.downloadCard}>
                  <div className={styles.downloadIcon}>📄</div>
                  <div className={styles.downloadText}>Modelo</div>
                  <div className={styles.downloadSubtext}>Descargar ejemplo</div>
                </a>
                <a href="/docs/planilla-vacia-controlLec.xlsx" download className={styles.downloadCard}>
                  <div className={styles.downloadIcon}>📄</div>
                  <div className={styles.downloadText}>Vacía</div>
                  <div className={styles.downloadSubtext}>Descargar plantilla</div>
                </a>
              </div>
            </div>

            <div className={styles.actionCard}>
              <div className={styles.actionCardTitle}>Fecha del Control</div>
              <div className={styles.dateInputContainer}>
                <Form.Control
                  type="date"
                  id="fecha"
                  name="fecha"
                  value={fecha}
                  onChange={handleChange}
                  required
                  className={styles.dateInput}
                />
              </div>
            </div>

            <div className={styles.actionCard}>
              <div className={styles.actionCardTitle}>Cargar Archivo</div>
              <Form onSubmit={handleSubmit}>
                <div
                  className={styles.dropzone}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !file && document.getElementById('archivoExcel').click()}
                >
                  {!file ? (
                    <>
                      <div className={styles.dropzoneIcon}>☁️</div>
                      <p className={styles.dropzoneText}>Arrastre aquí su archivo Excel</p>
                      <p className={styles.dropzoneSubtext}>o haga click para seleccionarlo</p>
                    </>
                  ) : (
                    <div className={styles.fileSelectedContainer}>
                      <div className={styles.fileName}>
                        <span>✔️</span> {file.name}
                      </div>
                      <button type="button" className={styles.removeFileBtn} onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                        Eliminar archivo
                      </button>
                    </div>
                  )}
                  <input
                    id="archivoExcel"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={onFileChange}
                    accept=".xlsx, .xls"
                  />
                </div>

                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={!file || procesando}
                  style={{ marginTop: '15px' }}
                >
                  🚀 Cargar Control Lechero
                </button>
              </Form>
            </div>

            {/* Overlay de procesamiento */}
            {procesando && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinnerContainer}>
                  <Spinner animation="border" variant="primary" />
                  <div className={styles.loadingTitle}>Procesando archivo...</div>
                  <div className={styles.loadingSubtitle}>No cierre esta ventana.</div>
                </div>
              </div>
            )}
          </div>

          {/* Panel Derecho: Resultados */}
          <div className={styles.rightPanel}>
            <h2 className={styles.resultsTitle}>Resultado de la carga</h2>
            <div className={styles.resultsHeader}></div>

            {errores.length === 0 && actualizados.length === 0 && !procesando ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>📄</div>
                <div className={styles.emptyStateText}>Todavía no se realizaron cargas. Los resultados aparecerán aquí.</div>
              </div>
            ) : (
              <>
                <div className={styles.summaryCards}>
                  <div className={`${styles.summaryCard} ${styles.error}`}>
                    <div className={styles.summaryLabel}>Errores</div>
                    <div className={styles.summaryValue}>{errores.length}</div>
                  </div>
                  <div className={`${styles.summaryCard} ${styles.success}`}>
                    <div className={styles.summaryLabel}>Correctos</div>
                    <div className={styles.summaryValue}>{actualizados.length}</div>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Total</div>
                    <div className={styles.summaryValue}>{errores.length + actualizados.length}</div>
                  </div>
                </div>

                <div className={styles.resultsListsContainer}>
                  {errores.length > 0 && (
                    <div className={styles.resultListPanel}>
                      <div className={`${styles.resultListHeader} ${styles.error}`}>Errores ({errores.length})</div>
                      <div className={styles.resultListContent}>
                        {errores.map((e) => (
                          <div key={uuidv4()} className={`${styles.resultItem} ${styles.error}`}>
                            <Detalle info={e} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {actualizados.length > 0 && (
                    <div className={styles.resultListPanel}>
                      <div className={`${styles.resultListHeader} ${styles.success}`}>Actualizaciones ({actualizados.length})</div>
                      <div className={styles.resultListContent}>
                        {actualizados.map((a) => (
                          <div key={uuidv4()} className={`${styles.resultItem} ${styles.success}`}>
                            <Detalle info={a} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <SelectTambo />
      )}
    </Layout>
  );

}

export default ControlLechero