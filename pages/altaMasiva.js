import React, { useState, useContext, useEffect } from 'react'
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, ContenedorSpinner } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import { Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { format } from 'date-fns'
//import addDays from 'date-fns/add-days'
import readXlsxFile from 'read-excel-file'
import Detalle from '../components/layout/detalle';
import { v4 as uuidv4 } from 'uuid';
import SelectTambo from '../components/layout/selectTambo';
import styles from '../styles/altaMasiva.module.scss';

const AltaMasiva = () => {

  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [file, guardarFile] = useState(null);
  const [errores, guardarErrores] = useState([]);
  const [actualizados, guardarActualizados] = useState([]);
  const [procesando, guardarProcesando] = useState(false);
  //const patron = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;




  const handleSubmit = e => {
    e.preventDefault();
    if (file) cargarControl();

  }

  async function cargarControl() {
    guardarProcesando(true);
    let fila = 0;
    guardarErrores([]);
    guardarActualizados([]);

    await readXlsxFile(file).then((rows) => {
      rows.forEach(r => {
        fila++;
        if (fila != 1) {

          const a = {
            erp: r[0],
            rp: r[1],
            ingreso: r[2],
            lactancia: r[3],
            categoria: r[4],
            estpro: r[5],
            fparto: r[6],
            racion: r[7],
            uc: r[8],
            anorm: r[9],
            estrep: r[10],
            fservicio: r[11],
            observaciones: r[12],
            fila: fila
          }


          cargarAnimal(a);

        }

      });

    })
    guardarFile(null);
    guardarProcesando(false);
  }

  async function cargarAnimal(a) {

    let errores = false;
    let e = '';
    let erp = '';
    let rp = '';
    let ingreso;
    let categoria;
    let estpro;
    let fparto = '';
    let estrep;
    let fservicio = '';
    let nservicio;


    //valida que el RP no exista
    if (a.rp && a.rp.length != 0) {

      //si es un numero lo convierto a String
      if (isNaN(a.rp)) {
        rp = a.rp;
      } else {
        rp = a.rp.toString()
      }

      let existeRP = false;
      try {
        await firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('rp', '==', rp).get().then(snapshot => {
          if (!snapshot.empty) {
            snapshot.forEach(doc => {

              existeRP = true;

            });

          }
        });
      } catch (error) {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Error al consultar RP: " + rp;
        guardarErrores(errores => [...errores, e]);
        errores = true;
      }

      if (existeRP) {

        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - El RP ya existe en el tambo";
        guardarErrores(errores => [...errores, e]);
        errores = true;
      }
    } else {
      e = "Fila N°: " + a.fila + " / Se debe ingresar un RP";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    }

    //valida que el eRP tenga 15 digitos y que no exista
    if (a.erp && a.erp.length != 0) {
      erp = a.erp.toString()
      if (isNaN(a.erp)) {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - El eRP debe ser numerico: " + a.erp;
        guardarErrores(errores => [...errores, e]);
        errores = true;
      } else {
        if (erp.length != 15) {
          e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - El eRP debe tener 15 dígitos: " + a.erp;
          guardarErrores(errores => [...errores, e]);
          errores = true;
        } else {

          let existeERP = false;
          try {

            await firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('erp', '==', a.erp).get().then(snapshot => {
              if (!snapshot.empty) {
                snapshot.forEach(doc => {

                  existeERP = true;

                });

              }
            });
          } catch (error) {
            e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Error al consultar el eRP: " + a.erp;
            guardarErrores(errores => [...errores, e]);
            errores = true;
          }

          if (existeERP) {
            e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - El eRP ya existe en el tambo: " + a.erp;
            guardarErrores(errores => [...errores, e]);
            errores = true;
          }
        }
      }
    }

    //valida que la fecha sea numerica (en excel son los dias transcurridos desde el 01/01/1900)
    if (isNaN(a.ingreso) || !a.ingreso) {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Formato incorrecto de fecha de ingreso ";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    } else {
      try {

        ingreso = new Date("1899-12-31");
        ingreso.setDate(ingreso.getDate() + a.ingreso);
        ingreso = format(ingreso, 'yyyy-MM-dd');
      } catch (error) {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Formato incorrecto de fecha de ingreso";
        guardarErrores(errores => [...errores, e]);
        errores = true;
      }
    }


    //valida que la lactancia contenga valores
    if (a.lactancia != 0) {
      if (!a.lactancia || isNaN(a.lactancia)) {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Debe ingresar el numero de lactancias ";
        guardarErrores(errores => [...errores, e]);
        errores = true;
      }
    }

    //Controla el valor de la categoria
    if (a.categoria) {
      categoria = a.categoria.trim().toLowerCase();
      if (categoria == 'vaca') {
        categoria = 'Vaca';
      } else if (categoria == 'vaquillona') {
        categoria = 'Vaquillona';
      } else {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Categoria Incorrecta ";
        guardarErrores(errores => [...errores, e]);
        errores = true;
      }
    } else {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Debe ingresar categoria ";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    }

    //Controla el estado productivo
    if (a.estpro) {
      estpro = a.estpro.trim().toLowerCase();
      if (estpro == 'seca') {
        estpro = 'seca';
      } else if (estpro == 'en ordeñe') {
        estpro = 'En Ordeñe';
      } else {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Estado productivo incorrecto ";
        guardarErrores(errores => [...errores, e]);
        errores = true;
      }
    } else {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Debe ingresar el estado productivo ";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    }

    //valida que la fecha de parto sea numerica (en excel son los dias transcurridos desde el 01/01/1900)
    if (isNaN(a.fparto) && (a.fparto)) {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Formato incorrecto de fecha de parto";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    } else {
      if (a.fparto) {
        try {
          fparto = new Date("1899-12-31");
          fparto.setDate(fparto.getDate() + a.fparto);
          fparto = format(fparto, 'yyyy-MM-dd');
        } catch (error) {
          e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Formato incorrecto de fecha de parto ";
          guardarErrores(errores => [...errores, e]);
          errores = true;
        }
      }
    }
    //valida que si los kg de racion sean numericos y mayor a cero
    if (isNaN(a.racion)) {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Los Kg. de racion debe ser un valor numerico";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    } else {
      if ((a.racion < 1) || (a.racion > 50)) {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Los Kg. de racio deben ser mayor a 0 y menor a 50";
        guardarErrores(errores => [...errores, e]);
        errores = true;
      }
    }

    //Controla el valor del estado reproductivo
    if (a.estrep) {
      estrep = a.estrep.trim().toLowerCase();
      if ((estrep != 'vacia') && (estrep != 'vacía') && (estrep != 'preñada')) {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Estado reproductivo incorrecto ";
        guardarErrores(errores => [...errores, e]);
        errores = true;
      } else {
        if (estrep == 'vacía') estrep = 'vacia';
      }
    } else {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Debe ingresar el estado reproductivo ";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    }

    //valida que la fecha de servicio sea numerica (en excel son los dias transcurridos desde el 01/01/1900)
    if (isNaN(a.fservicio) && (a.fservicio)) {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Formato incorrecto de fecha de servicio";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    } else {
      if (a.fservicio) {
        try {
          fservicio = new Date("1899-12-31");
          fservicio.setDate(fservicio.getDate() + a.fservicio);
          fservicio = format(fservicio, 'yyyy-MM-dd');
        } catch (error) {
          e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Formato incorrecto de fecha de servicio ";
          guardarErrores(errores => [...errores, e]);
          errores = true;
        }
      }
    }


    //valida que si el control lechero tiene valores, sea numerico
    if (isNaN(a.uc)) {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Los litros deben ser un valor numerico";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    }

    //valida que si tiene una lactancia tenga fecha de parto
    if ((estpro == 'En Ordeñe') && (!fparto)) {
      e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Debe ingresar la fecha del ultimo parto";
      guardarErrores(errores => [...errores, e]);
      errores = true;
    }
    //valida  si está preñada tenga fecha de servicio
    if (estrep == 'preñada') {
      nservicio = 1;
      if (!fservicio) {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " - Debe ingresar la fecha del ultimo servicio";
        guardarErrores(errores => [...errores, e]);
        errores = true;
      }
    } else {
      nservicio = 0;
    }


    //si no hay errores, procede al alta del animal
    if (!errores) {
      /*
      let act = "Fila N°: " + a.fila + " Log: "+ingreso ;
      guardarActualizados(actualizados => [...actualizados, act]);
      */
      //creo el objeto animal
      try {
        const animal = {

          idtambo: tamboSel.id,
          ingreso: ingreso,
          rp: rp,
          erp: a.erp,
          lactancia: a.lactancia,
          observaciones: a.observaciones,
          estpro: estpro,
          estrep: estrep,
          fparto: fparto,
          fservicio: fservicio,
          categoria: categoria,
          racion: a.racion,
          fracion: firebase.ayerTimeStamp(),
          nservicio: nservicio,
          uc: a.uc,
          fuc: firebase.nowTimeStamp(),
          ca: 0,
          anorm: a.anorm,
          fbaja: '',
          mbaja: '',
          rodeo: 0,
          sugerido: 0
        }

        //insertar en base de datos

        await firebase.db.collection('animal').add(animal);
        let act = "Fila N°: " + a.fila + " / RP: " + a.rp + " - eRP: " + a.erp + " - Lact.: " + a.lactancia + " - Cat.: " + categoria + "- Est. Prod.:" + estpro;
        guardarActualizados(actualizados => [...actualizados, act]);
      } catch (error) {
        e = "Fila N°: " + a.fila + " / RP: " + a.rp + " -Error al dar de alta el animal" + error;
        guardarErrores(errores => [...errores, e]);
        errores = true;
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

  const handleDragOver = (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto
  };

  const handleDrop = (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto
    const f = e.dataTransfer.files[0]; // Obtiene el archivo arrastrado
    if (f) {
      guardarFile(f); // Guarda el archivo
    }
  };

  return (
    <Layout titulo="Alta Masiva">
      {procesando ? (
        <ContenedorSpinner>
          <Spinner animation="border" variant="info" />
        </ContenedorSpinner>
      ) : (
        <>
          <Botonera>
            <Row className="justify-content-center mt-3">
              <Col xs={12} md={6}>
                <div className={styles.descargaWrapper}>
                  <h6 className={styles.descargaTitulo}>📥 Descargas útiles</h6>
                  <p className={styles.descargaSubtitulo}>
                    Estas planillas te ayudarán a cargar correctamente los datos. Elegí una según lo que necesites:
                  </p>
                  <div className={styles.botonGrupo}>
                    <div className={styles.tooltipWrapper}>
                      <a
                        href="/docs/planilla-modelo-altaMasiva.xlsx"
                        download
                        className={styles.btnDescarga}
                      >
                        📄 Modelo
                      </a>
                      <span className={styles.tooltipText}>Contiene un ejemplo completo para guiarte en la carga.</span>
                    </div>
                    <div className={styles.tooltipWrapper}>
                      <a
                        href="/docs/planilla-vacia-altaMasiva.xlsx"
                        download
                        className={styles.btnDescarga}
                      >
                        📄 Vacía
                      </a>
                      <span className={styles.tooltipText}>Plantilla en blanco lista para completar.</span>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Botonera>

          <Botonera>
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col>
                  <div
                    className="container-AltaMasiva"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div
                      className="header-AltaMasiva"
                      onClick={() => document.getElementById('file').click()}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 15.4806 20.1956 16.8084 19 17.5M7 10C4.79086 10 3 11.7909 3 14C3 15.4806 3.8044 16.8084 5 17.5M7 10C7.43285 10 7.84965 10.0688 8.24006 10.1959M12 12V21M12 12L15 15M12 12L9 15"
                          stroke="#000000"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p>Presiona aca y carga el alta masiva</p>
                    </div>

                    <label htmlFor="archivoExcel" className={styles.footerAltaMasiva}>
                      <svg
                        fill="#000000"
                        viewBox="0 0 32 32"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M15.331 6H8.5v20h15V14.154h-8.169z"></path>
                        <path d="M18.153 6h-.009v5.342H23.5v-.002z"></path>
                      </svg>
                      <p>{file ? file.name : 'Ningun archivo seleccionado'}</p>
                      {file && (
                        <Button
                          variant="danger"
                          onClick={clearFile}
                          style={{ marginLeft: '10px' }}
                        >
                          Borrar
                        </Button>
                      )}
                    </label>

                    <input id="file" type="file" style={{ display: 'none' }} onChange={onFileChange} />
                  </div>
                </Col>
              </Row>

              <Row className="justify-content-center" style={{ marginTop: '20px' }}>
                <Col xs={12} md={6}>
                  <button className={styles.buttonAltaMasiva} type="submit" block="true">
                    <span className={styles.spanAltaMasiva}>Cargar Alta Masiva</span>
                    <svg
                      className={styles.svgAltaMasiva}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 74 74"
                      height="34"
                      width="34"
                    >
                      <circle
                        className={styles.circleAltaMasiva}
                        strokeWidth="3"
                        stroke="white"
                        r="35.5"
                        cy="37"
                        cx="37"
                      ></circle>
                      <path
                        className={styles.pathAltaMasiva}
                        fill="white"
                        d="M25 35.5C24.1716 35.5 23.5 36.1716 23.5 37C23.5 37.8284 24.1716 38.5 25 38.5V35.5ZM49.0607 38.0607C49.6464 37.4749 49.6464 36.5251 49.0607 35.9393L39.5147 26.3934C38.9289 25.8076 37.9792 25.8076 37.3934 26.3934C36.8076 26.9792 36.8076 27.9289 37.3934 28.5147L45.8787 37L37.3934 45.4853C36.8076 46.0711 36.8076 47.0208 37.3934 47.6066C37.9792 48.1924 38.9289 48.1924 39.5147 47.6066L49.0607 38.0607ZM25 38.5L48 38.5V35.5L25 35.5V38.5Z"
                      ></path>
                    </svg>
                  </button>
                </Col>
              </Row>
            </Form>
          </Botonera>
        </>
      )}

      {tamboSel ? (
        <Mensaje>
          {(errores.length !== 0 || actualizados.length !== 0) && (
            <div className={styles.alertasWrapper}>
              {errores.length !== 0 && (
                <div className={`${styles.alertaBox} ${styles.errorBox}`}>
                  <div className={styles.alertaHeader}>❌ Errores encontrados</div>
                  <div className={styles.alertaContenido}>
                    {errores.map((a) => (
                      <Detalle key={uuidv4()} info={a} />
                    ))}
                  </div>
                </div>
              )}

              {actualizados.length !== 0 && (
                <div className={`${styles.alertaBox} ${styles.successBox}`}>
                  <div className={styles.alertaHeader}>✅ Actualizaciones realizadas</div>
                  <div className={styles.alertaContenido}>
                    {actualizados.map((a) => (
                      <Detalle key={uuidv4()} info={a} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Mensaje>
      ) : (
        <SelectTambo />
      )}
    </Layout>
  );

}

export default AltaMasiva