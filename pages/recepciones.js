import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleRecepciones from '../components/layout/detalleRecepciones';
import SelectTambo from '../components/layout/selectTambo';
import { Spinner } from 'react-bootstrap';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import styles from '../styles/GestionRemitos.module.scss';
import { RiSearchLine, RiFileExcel2Line } from 'react-icons/ri';
const Recepciones = () => {
  const [recepciones, guardarRecepciones] = useState([]);
  const [valores, guardarValores] = useState({
    fini: format(Date.now(), 'yyyy-MM-dd'),
    ffin: format(Date.now(), 'yyyy-MM-dd'),
    inicio: '',
    fin: '',
    visto: 'todos',
    tipo: 'todos',
    tipoFecha: 'ud'
  });

  const [procesando, guardarProcesando] = useState(false);
  const { fini, ffin, inicio, fin, visto, tipo, tipoFecha } = valores;
  const { firebase, tamboSel } = useContext(FirebaseContext);

  const handleSubmit = (e, overrideTipoFecha = null) => {
    guardarProcesando(true);
    if (e) e.preventDefault();
    let inicio, fin;
    let inicioAux;
    let finAux = format(Date.now(), 'yyyy-MM-dd');
    finAux = finAux + 'T21:59:00';
    let ff = valores.ffin + 'T21:59:00';

    const activeTipoFecha = overrideTipoFecha || tipoFecha;

    if (activeTipoFecha == "ef") {
      inicio = firebase.fechaTimeStamp(valores.fini);
      fin = firebase.fechaTimeStamp(ff);
    }

    if (activeTipoFecha == "ud") {
      inicioAux = subDays(Date.now(), 1);
      inicioAux = format(inicioAux, 'yyyy-MM-dd');
      inicio = firebase.fechaTimeStamp(inicioAux);
      fin = firebase.fechaTimeStamp(finAux);
    }

    if (activeTipoFecha == "us") {
      inicioAux = subDays(Date.now(), 7);
      inicioAux = format(inicioAux, 'yyyy-MM-dd');
      inicio = firebase.fechaTimeStamp(inicioAux);
      fin = firebase.fechaTimeStamp(finAux);
    }
    if (activeTipoFecha == "mv") {
      const fechaActual = new Date();
      const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1); // primerDiaMes, calcula el primer día del mes actual.
      const hoy = format(fechaActual, 'yyyy-MM-dd') + 'T21:59:00'; // hoy, toma la fecha de hoy hasta el final del día.
      // Convierte ambas fechas al formato de Firebase para buscar los eventos.
      inicio = firebase.fechaTimeStamp(format(primerDiaMes, 'yyyy-MM-dd'));
      fin = firebase.fechaTimeStamp(hoy);
    }

    if (activeTipoFecha == "ma") {
      const actual = new Date();
      const primerDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth(), 0);
      inicio = firebase.fechaTimeStamp(format(primerDiaMesAnterior, 'yyyy-MM-dd'));
      fin = firebase.fechaTimeStamp(format(ultimoDiaMesAnterior, 'yyyy-MM-dd') + 'T21:59:00');
    }

    guardarValores({
      fini: fini,
      ffin: ffin,
      inicio: inicio,
      fin: fin,
      visto: visto,
      tipo: tipo,
      tipoFecha: activeTipoFecha
    });

    if (tamboSel) {
      try {
        let query = firebase.db.collection('tambo').doc(tamboSel.id).collection('recepcion')
          .where('fecha', '>=', inicio)
          .where('fecha', '<=', fin);

        query.get().then(snapshot => {
          const recep = [];
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Filtro en memoria para 'visto'
            if (visto !== 'todos') {
              const isVisto = data.visto === true;
              if (visto === 'true' && !isVisto) return;
              if (visto === 'false' && isVisto) return;
            }
            
            // Filtro en memoria para 'tipo'
            if (tipo !== 'todos') {
              if (data.tipo !== tipo) return;
            }
            
            recep.push({ id: doc.id, ...data });
          });
          
          guardarRecepciones(recep);
          guardarProcesando(false);
        }).catch(error => {
          console.error("Error fetching recepciones:", error);
          guardarProcesando(false);
        });
      } catch (error) {
        console.log(error.message);
        guardarProcesando(false);
      }
    }
  }

  const handleChange = (e) => {
    const newValores = {
      ...valores,
      [e.target.name]: e.target.value,
    };

    guardarValores(newValores);

    // Si el usuario selecciona "ULTIMO DÍA" o "MES EN CURSO", o "MES ANTERIOR", ejecuta la búsqueda automáticamente
    if (e.target.value === "ud" || e.target.value === "mv" || e.target.value === "ma") {
      setTimeout(() => handleSubmit(null, e.target.value), 0);
    }
  };

  const exportToExcel = () => {
    const wsData = [
      ["Fecha", "Tipo", "Remito", "Observacion", "Usuario"]
    ];

    recepciones.forEach(r => {
      const fechaFormateada = r.fecha.toDate ? format(r.fecha.toDate(), 'yyyy-MM-dd') : r.fecha;
      const remitoConFecha = `${fechaFormateada} - ${r.remito}`;

      wsData.push([
        fechaFormateada,
        r.tipo,
        remitoConFecha,
        r.obs,
        r.usuario
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recepciones");
    XLSX.writeFile(wb, "recepciones.xlsx");
  }


  return (
    <Layout titulo="Recepciones">
      <>
        {/* Header Sección */}
        <div className={styles.header}>
          <h1>Reporte de Recepciones</h1>
          <p>Visualice y exporte los registros de recepciones según período, estado y tipo.</p>
        </div>

        <div className={styles.filterCard}>
          <form onSubmit={handleSubmit}>
            {/* Fila 1: Fechas y Botones rápidos */}
            <div className={styles.filterRow}>
              <div className={styles.filterGroup} style={{ flex: '0 0 auto', width: '350px' }}>
                <label>Período Rápido</label>
                <div className={styles.segmentedControl}>
                  <button
                    type="button"
                    name="tipoFecha"
                    value="ud"
                    className={valores.tipoFecha === 'ud' ? styles.active : ''}
                    onClick={(e) => {
                      const fakeEvent = { target: { name: 'tipoFecha', value: 'ud' }, preventDefault: () => { } };
                      handleChange(fakeEvent);
                    }}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    name="tipoFecha"
                    value="mv"
                    className={valores.tipoFecha === 'mv' ? styles.active : ''}
                    onClick={(e) => {
                      const fakeEvent = { target: { name: 'tipoFecha', value: 'mv' }, preventDefault: () => { } };
                      handleChange(fakeEvent);
                    }}
                  >
                    Mes Actual
                  </button>
                  <button
                    type="button"
                    name="tipoFecha"
                    value="ma"
                    className={valores.tipoFecha === 'ma' ? styles.active : ''}
                    onClick={(e) => {
                      const fakeEvent = { target: { name: 'tipoFecha', value: 'ma' }, preventDefault: () => { } };
                      handleChange(fakeEvent);
                    }}
                  >
                    Mes Anterior
                  </button>
                  <button
                    type="button"
                    name="tipoFecha"
                    value="ef"
                    className={valores.tipoFecha === 'ef' ? styles.active : ''}
                    onClick={(e) => {
                      const fakeEvent = { target: { name: 'tipoFecha', value: 'ef' }, preventDefault: () => { } };
                      handleChange(fakeEvent);
                    }}
                  >
                    Rango
                  </button>
                </div>
              </div>

              {valores.tipoFecha === 'ef' && (
                <>
                  <div className={styles.filterGroup}>
                    <label>Fecha Inicio</label>
                    <input type="date" id="fini" name="fini" value={fini} onChange={handleChange} required />
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Fecha Fin</label>
                    <input type="date" id="ffin" name="ffin" value={ffin} onChange={handleChange} required />
                  </div>
                </>
              )}
            </div>

            {/* Fila 2: Filtros de Estado/Tipo y Acciones */}
            <div className={styles.filterRow} style={{ marginTop: '12px' }}>
              <div className={styles.filterGroup}>
                <label>Estado</label>
                <select id="visto" name="visto" value={visto} onChange={handleChange} required>
                  <option value="todos">Todos</option>
                  <option value="false">Pendientes</option>
                  <option value="true">Vistos</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Tipo</label>
                <select id="tipo" name="tipo" value={tipo} onChange={handleChange} required>
                  <option value="todos">Todos</option>
                  <option value="Racion">Racion</option>
                  <option value="Art. Limpieza">Art. Limpieza</option>
                  <option value="Art. Veterinaria">Art. Veterinaria</option>
                  <option value="Semen">Semen</option>
                </select>
              </div>

              <div className={styles.actionsArea}>
                <button type="button" className={styles.btnSecondary} onClick={exportToExcel}>
                  <RiFileExcel2Line />
                  Descargar Excel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  <RiSearchLine />
                  Buscar
                </button>
              </div>
            </div>
          </form>
        </div>

        {procesando ? (
          <div className={styles.loadingOverlay}>
            <Spinner animation="border" variant="info" role="status" style={{ width: '3rem', height: '3rem', color: '#17A2B8' }} />
            <div className={styles.loadingText}>Procesando datos de recepciones...</div>
          </div>
        ) : tamboSel ? (
          recepciones.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.illustration} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 13V13.01" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 7V10" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h2>No se encontraron registros</h2>
              <p>Ajuste el período seleccionado o el rango de fechas para visualizar información.</p>
              <button className={styles.btnSecondary} onClick={() => {
                const fakeEvent = { target: { name: 'tipoFecha', value: 'mv' }, preventDefault: () => { } };
                handleChange(fakeEvent);
              }} style={{marginTop: '16px'}}>
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Remito</th>
                      <th>Observacion</th>
                      <th>Foto</th>
                      <th>Usuario</th>
                      <th>Visto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recepciones.map(r => (
                      <DetalleRecepciones
                        key={r.id}
                        recepcion={r}

                      />
                    )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <SelectTambo />
        )}
      </>
    </Layout>
  );
}
export default Recepciones