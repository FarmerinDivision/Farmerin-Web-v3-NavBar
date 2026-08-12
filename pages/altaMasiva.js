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
import styles from '../styles/UploadLayout.module.scss';

const AltaMasiva = () => {

  const { firebase, tamboSel, usuario } = useContext(FirebaseContext);
  const [file, guardarFile] = useState(null);
  const [errores, guardarErrores] = useState([]);
  const [actualizados, guardarActualizados] = useState([]);
  const [procesando, guardarProcesando] = useState(false);
  //const patron = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;




  const handleSubmit = e => {
    e.preventDefault();
    if (file) cargarControl();

  }

  // Helper de parseo de fechas robusto
  const parseFecha = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (val instanceof Date && !isNaN(val.getTime())) {
      return format(val, 'yyyy-MM-dd');
    }
    if (!isNaN(val) && typeof val === 'number') {
      const d = new Date("1899-12-31");
      d.setDate(d.getDate() + val);
      if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
    }
    if (typeof val === 'string') {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
    }
    return null;
  };

  async function cargarControl() {
    guardarProcesando(true);
    guardarErrores([]);
    guardarActualizados([]);

    try {
      const rows = await readXlsxFile(file);
      if (rows.length < 2) {
        guardarErrores(["El archivo está vacío o no contiene suficientes datos."]);
        guardarProcesando(false);
        return;
      }

      // Procesar encabezados
      const headers = rows[0].map(h => h ? h.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim() : "");
      
      const colMap = {
        erp: headers.findIndex(h => h.includes('erp') || h.includes('e-rp') || h.includes('electronico')),
        rp: headers.findIndex(h => (h.includes('rp') && !h.includes('erp')) || h.includes('caravana') || h === 'id'),
        ingreso: headers.findIndex(h => h.includes('ingreso') && !h.includes('peso')),
        lactancia: headers.findIndex(h => h.includes('lactancia')),
        categoria: headers.findIndex(h => h.includes('categoria')),
        estpro: headers.findIndex(h => h.includes('estado pro') || h.includes('estpro') || h.includes('est pro') || h.includes('productivo')),
        fparto: headers.findIndex(h => h.includes('parto')),
        racion: headers.findIndex(h => h.includes('racion')),
        uc: headers.findIndex(h => h === 'uc' || h.includes('control') || h.includes('litro')),
        anorm: headers.findIndex(h => h.includes('anorm')),
        estrep: headers.findIndex(h => h.includes('estado rep') || h.includes('estrep') || h.includes('est rep') || h.includes('reproductivo')),
        fservicio: headers.findIndex(h => h.includes('servicio')),
        observaciones: headers.findIndex(h => h.includes('observacion') || h === 'obs'),
        grupo: headers.findIndex(h => h === 'grupo' || h === 'lote')
      };

      // Validar requeridos
      const missingColumns = [];
      if (colMap.rp === -1) missingColumns.push("RP/Caravana");
      if (colMap.ingreso === -1) missingColumns.push("Fecha de Ingreso");
      if (colMap.categoria === -1) missingColumns.push("Categoría");
      if (colMap.estpro === -1) missingColumns.push("Estado Productivo");
      if (colMap.estrep === -1) missingColumns.push("Estado Reproductivo");

      if (missingColumns.length > 0) {
         guardarErrores([`Faltan columnas requeridas en el archivo: ${missingColumns.join(", ")}.`]);
         guardarProcesando(false);
         return;
      }

      let fila = 1;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        fila++;
        
        // Saltamos filas completamente vacías
        if (r.every(val => val === null || val === undefined || val === '')) continue;

        const getValue = (index) => index !== -1 ? r[index] : null;

        const a = {
          erp: getValue(colMap.erp),
          rp: getValue(colMap.rp),
          ingreso: getValue(colMap.ingreso),
          lactancia: getValue(colMap.lactancia),
          categoria: getValue(colMap.categoria),
          estpro: getValue(colMap.estpro),
          fparto: getValue(colMap.fparto),
          racion: getValue(colMap.racion),
          uc: getValue(colMap.uc),
          anorm: getValue(colMap.anorm),
          estrep: getValue(colMap.estrep),
          fservicio: getValue(colMap.fservicio),
          observaciones: getValue(colMap.observaciones),
          grupo: getValue(colMap.grupo),
          fila: fila
        };

        await cargarAnimal(a);
      }
    } catch (error) {
       guardarErrores(err => [...err, "Error al procesar el archivo: " + error.message]);
    }

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

    // --- Validación grupo ---
    let grupo = 0;
    if (a.grupo === undefined || a.grupo === null || a.grupo === '') {
      grupo = 0;
    } else {
      grupo = Number(a.grupo);
      if (isNaN(grupo)) {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - El grupo/lote debe ser numérico.`;
        guardarErrores(err => [...err, e]);
        errores = true;
        grupo = 0;
      }
    }

    //valida que el RP no exista
    if (a.rp !== null && a.rp !== undefined && a.rp.toString().trim() !== '') {
      rp = a.rp.toString().trim();

      let existeRP = false;
      try {
        const snapshot = await firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('rp', '==', rp).get();
        if (!snapshot.empty) existeRP = true;
      } catch (error) {
        e = `Fila N°: ${a.fila} / RP: ${rp} - Error al consultar RP en la base de datos.`;
        guardarErrores(err => [...err, e]);
        errores = true;
      }

      if (existeRP) {
        e = `Fila N°: ${a.fila} / RP: ${rp} - El RP ya existe en el tambo.`;
        guardarErrores(err => [...err, e]);
        errores = true;
      }
    } else {
      e = `Fila N°: ${a.fila} - Se debe ingresar un RP (caravana).`;
      guardarErrores(err => [...err, e]);
      errores = true;
    }

    //valida que el eRP tenga 15 digitos y que no exista
    if (a.erp !== null && a.erp !== undefined && a.erp.toString().trim() !== '') {
      erp = a.erp.toString().trim();
      if (isNaN(erp)) {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - El eRP debe ser numérico: ${erp}`;
        guardarErrores(err => [...err, e]);
        errores = true;
      } else if (erp.length !== 15) {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - El eRP debe tener 15 dígitos: ${erp}`;
        guardarErrores(err => [...err, e]);
        errores = true;
      } else {
        let existeERP = false;
        try {
          const snapshot = await firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('erp', '==', erp).get();
          if (!snapshot.empty) existeERP = true;
        } catch (error) {
          e = `Fila N°: ${a.fila} / RP: ${a.rp} - Error al consultar el eRP: ${erp}`;
          guardarErrores(err => [...err, e]);
          errores = true;
        }

        if (existeERP) {
          e = `Fila N°: ${a.fila} / RP: ${a.rp} - El eRP ya existe en el tambo: ${erp}`;
          guardarErrores(err => [...err, e]);
          errores = true;
        }
      }
    }

    //valida ingreso
    ingreso = parseFecha(a.ingreso);
    if (!ingreso) {
      e = `Fila N°: ${a.fila} / RP: ${a.rp} - Formato incorrecto o falta la fecha de ingreso.`;
      guardarErrores(err => [...err, e]);
      errores = true;
    }

    //valida que la lactancia contenga valores numericos si existe
    let lactancia = 0;
    if (a.lactancia !== null && a.lactancia !== undefined && a.lactancia !== '') {
      if (isNaN(a.lactancia)) {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - La lactancia debe ser un número.`;
        guardarErrores(err => [...err, e]);
        errores = true;
      } else {
        lactancia = Number(a.lactancia);
      }
    }

    //Controla el valor de la categoria
    if (a.categoria !== null && a.categoria !== undefined && a.categoria.toString().trim() !== '') {
      const catNorm = a.categoria.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (catNorm === 'vaca') {
        categoria = 'Vaca';
      } else if (catNorm === 'vaquillona') {
        categoria = 'Vaquillona';
      } else {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - Categoría incorrecta: ${a.categoria}. Debe ser Vaca o Vaquillona.`;
        guardarErrores(err => [...err, e]);
        errores = true;
      }
    } else {
      e = `Fila N°: ${a.fila} / RP: ${a.rp} - Debe ingresar categoría.`;
      guardarErrores(err => [...err, e]);
      errores = true;
    }

    //Controla el estado productivo
    if (a.estpro !== null && a.estpro !== undefined && a.estpro.toString().trim() !== '') {
      const proNorm = a.estpro.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (proNorm === 'seca') {
        estpro = 'seca';
      } else if (proNorm === 'en ordene' || proNorm === 'en ordeñe') {
        estpro = 'En Ordeñe';
      } else {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - Estado productivo incorrecto: ${a.estpro}`;
        guardarErrores(err => [...err, e]);
        errores = true;
      }
    } else {
      e = `Fila N°: ${a.fila} / RP: ${a.rp} - Debe ingresar el estado productivo.`;
      guardarErrores(err => [...err, e]);
      errores = true;
    }

    //valida fecha parto
    if (a.fparto !== null && a.fparto !== undefined && a.fparto !== '') {
       fparto = parseFecha(a.fparto);
       if (!fparto) {
          e = `Fila N°: ${a.fila} / RP: ${a.rp} - Formato incorrecto de fecha de parto.`;
          guardarErrores(err => [...err, e]);
          errores = true;
       }
    }

    //valida que si los kg de racion sean numericos
    let racion = 0;
    if (a.racion !== null && a.racion !== undefined && a.racion !== '') {
      if (isNaN(a.racion)) {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - Los Kg. de ración deben ser un valor numérico.`;
        guardarErrores(err => [...err, e]);
        errores = true;
      } else {
        racion = Number(a.racion);
        if (racion < 1 || racion > 50) {
          e = `Fila N°: ${a.fila} / RP: ${a.rp} - Los Kg. de ración deben ser mayores a 0 y menores a 50.`;
          guardarErrores(err => [...err, e]);
          errores = true;
        }
      }
    }

    //Controla el valor del estado reproductivo
    if (a.estrep !== null && a.estrep !== undefined && a.estrep.toString().trim() !== '') {
      const repNorm = a.estrep.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (repNorm === 'vacia' || repNorm === 'vacia') {
         estrep = 'vacia';
      } else if (repNorm === 'prenada' || repNorm === 'preñada') {
         estrep = 'preñada';
      } else {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - Estado reproductivo incorrecto: ${a.estrep}`;
        guardarErrores(err => [...err, e]);
        errores = true;
      }
    } else {
      e = `Fila N°: ${a.fila} / RP: ${a.rp} - Debe ingresar el estado reproductivo.`;
      guardarErrores(err => [...err, e]);
      errores = true;
    }

    //valida fecha servicio
    if (a.fservicio !== null && a.fservicio !== undefined && a.fservicio !== '') {
       fservicio = parseFecha(a.fservicio);
       if (!fservicio) {
          e = `Fila N°: ${a.fila} / RP: ${a.rp} - Formato incorrecto de fecha de servicio.`;
          guardarErrores(err => [...err, e]);
          errores = true;
       }
    }

    //valida que si el control lechero tiene valores, sea numerico
    let uc = 0;
    if (a.uc !== null && a.uc !== undefined && a.uc !== '') {
      if (isNaN(a.uc)) {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - Los litros (último control) deben ser un valor numérico.`;
        guardarErrores(err => [...err, e]);
        errores = true;
      } else {
        uc = Number(a.uc);
      }
    }

    //valida condicionales lógicos
    if (estpro === 'En Ordeñe' && !fparto) {
      e = `Fila N°: ${a.fila} / RP: ${a.rp} - Al estar En Ordeñe, debe ingresar la fecha de parto.`;
      guardarErrores(err => [...err, e]);
      errores = true;
    }
    
    if (estrep === 'preñada') {
      nservicio = 1;
      if (!fservicio) {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - Al estar Preñada, debe ingresar la fecha del último servicio.`;
        guardarErrores(err => [...err, e]);
        errores = true;
      }
    } else {
      nservicio = 0;
    }

    //si no hay errores, procede al alta del animal
    if (!errores) {
      try {
        const animal = {
          idtambo: tamboSel.id,
          ingreso: ingreso,
          rp: rp,
          erp: erp,
          lactancia: lactancia,
          observaciones: a.observaciones || '',
          estpro: estpro,
          estrep: estrep,
          fparto: fparto,
          fservicio: fservicio,
          categoria: categoria,
          racion: racion,
          fracion: firebase.ayerTimeStamp(),
          nservicio: nservicio,
          uc: uc,
          fuc: firebase.nowTimeStamp(),
          ca: 0,
          anorm: a.anorm || '',
          fbaja: '',
          mbaja: '',
          rodeo: 0,
          sugerido: 0,
          porcentaje: 1,
          grupo: grupo
        };

        //insertar en base de datos
        const docRef = await firebase.db.collection('animal').add(animal);

        let eventDetalle = "RP: " + rp + (erp ? " - eRP: " + erp : "");
        await firebase.db.collection('animal').doc(docRef.id).collection('eventos').add({
          fecha: firebase.fechaTimeStamp(ingreso),
          tipo: 'Alta',
          detalle: eventDetalle,
          usuario: usuario ? usuario.displayName : 'Sistema',
          tambo: tamboSel.id,
        });

        let act = `Fila N°: ${a.fila} / RP: ${rp} - Categoría: ${categoria} - Est. Prod.: ${estpro} - Grupo: ${grupo}`;
        guardarActualizados(actList => [...actList, act]);
      } catch (error) {
        e = `Fila N°: ${a.fila} / RP: ${a.rp} - Error al guardar en base de datos: ${error.message}`;
        guardarErrores(err => [...err, e]);
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
      {tamboSel ? (
        <div className={styles.mainContainer}>
          {/* Panel Izquierdo: Acciones */}
          <div className={styles.leftPanel}>
            <div className={styles.actionCard}>
              <h1 className={styles.pageTitle}>Alta Masiva</h1>
              <p className={styles.pageSubtitle}>Importe animales desde una planilla Excel.</p>
              
              <div className={styles.actionCardTitle}>Plantillas</div>
              <div className={styles.downloadCardsContainer}>
                <a href="/docs/planilla-modelo-altaMasiva.xlsx" download className={styles.downloadCard}>
                  <div className={styles.downloadIcon}>📄</div>
                  <div className={styles.downloadText}>Modelo</div>
                  <div className={styles.downloadSubtext}>Descargar ejemplo</div>
                </a>
                <a href="/docs/planilla-vacia-altaMasiva.xlsx" download className={styles.downloadCard}>
                  <div className={styles.downloadIcon}>📄</div>
                  <div className={styles.downloadText}>Vacía</div>
                  <div className={styles.downloadSubtext}>Descargar plantilla</div>
                </a>
              </div>
            </div>

            <div className={styles.actionCard}>
              <div className={styles.actionCardTitle}>Cargar Archivo</div>
              <Form onSubmit={handleSubmit}>
                <div 
                  className={styles.dropzone}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !file && document.getElementById('file').click()}
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
                  <input id="file" type="file" style={{ display: 'none' }} onChange={onFileChange} accept=".xlsx, .xls" />
                </div>

                <button 
                  className={styles.primaryButton} 
                  type="submit" 
                  disabled={!file || procesando}
                  style={{ marginTop: '15px' }}
                >
                  🚀 Cargar Alta Masiva
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

export default AltaMasiva