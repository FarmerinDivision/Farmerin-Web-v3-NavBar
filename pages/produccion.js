import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleProduccion from '../components/layout/detalleProduccion';
import SelectTambo from '../components/layout/selectTambo';
import { Button, Spinner } from 'react-bootstrap';
import { RiSearchLine, RiFileExcel2Line } from 'react-icons/ri';
import { format, subDays } from 'date-fns';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import GraficoProduccion from '../components/layout/GraficoProduccion';
import styles from '../styles/Produccion.module.scss';

// Tooltip 100% CSS — fondo negro, texto blanco, flecha abajo
const ThTooltip = ({ label, texto }) => (
  <span style={{ position: 'relative', display: 'inline-block' }} className="th-tooltip-wrapper">
    <span style={{ cursor: 'default', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>
      {label}
    </span>
    <span className="th-tooltip-box">
      {texto}
      <span className="th-tooltip-arrow" />
    </span>
  </span>
);

const Produccion = () => {
  const { firebase, tamboSel } = useContext(FirebaseContext);

  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [producciones, setProducciones] = useState([]);
  const [totales, setTotales] = useState({ produccion: 0, descarte: 0, guachera: 0, entregado: 0 });
  const [procesando, setProcesando] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [valores, setValores] = useState({
    fini: format(Date.now(), 'yyyy-MM-dd'),
    ffin: format(Date.now(), 'yyyy-MM-dd'),
    inicio: '',
    fin: '',
    tipoFecha: 'ud'
  });

  const realizarBusqueda = (tipo) => {
    let nuevosValores = { ...valores, tipoFecha: tipo };

    if (tipo === 'ud') {
      const inicioAux = format(subDays(Date.now(), 1), 'yyyy-MM-dd');
      nuevosValores = {
        ...nuevosValores,
        fini: inicioAux,
        ffin: format(Date.now(), 'yyyy-MM-dd'),
        inicio: firebase.fechaTimeStamp(inicioAux),
        fin: firebase.fechaTimeStamp(format(Date.now(), 'yyyy-MM-dd') + 'T23:59:59') // Fin del día
      };
    } else if (tipo === 'mv') {
      const primerDiaMes = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
      nuevosValores = {
        ...nuevosValores,
        fini: primerDiaMes,
        ffin: format(Date.now(), 'yyyy-MM-dd'),
        inicio: firebase.fechaTimeStamp(primerDiaMes),
        fin: firebase.fechaTimeStamp(format(Date.now(), 'yyyy-MM-dd') + 'T23:59:59') // Fin del día
      };
    } else if (tipo === 'ma') {
      const actual = new Date();
      const primerDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth(), 0);
      const inicioMa = format(primerDiaMesAnterior, 'yyyy-MM-dd');
      const finMa = format(ultimoDiaMesAnterior, 'yyyy-MM-dd');
      nuevosValores = {
        ...nuevosValores,
        fini: inicioMa,
        ffin: finMa,
        inicio: firebase.fechaTimeStamp(inicioMa),
        fin: firebase.fechaTimeStamp(finMa + 'T23:59:59') // Fin del día
      };
    } else if (tipo === 'ef') {
      const { fini, ffin } = valores;
      nuevosValores = {
        ...nuevosValores,
        inicio: firebase.fechaTimeStamp(fini),
        fin: firebase.fechaTimeStamp(ffin + 'T23:59:59') // Fin del día
      };
    }

    setValores(nuevosValores);
    handleSubmit(nuevosValores);
  };

  const handleSubmit = async (valoresActualizados = valores) => {
    setProducciones([]);
    setProcesando(true);

    const inicio = firebase.fechaTimeStamp(valoresActualizados.fini);
    const fin = firebase.fechaTimeStamp(valoresActualizados.ffin + 'T23:59:59'); // Fin del día

    console.log("📌 Inicio:", inicio.toDate ? inicio.toDate() : inicio);
    console.log("📌 Fin:", fin.toDate ? fin.toDate() : fin);


    if (tamboSel) {
      try {
        const snapshot = await firebase.db.collection('tambo')
          .doc(tamboSel.id)  // Asegurar que estamos accediendo al documento correcto
          .collection('produccion')
          .where('fecha', '>=', inicio)
          .where('fecha', '<=', fin)
          .get();

        console.log("📌 Documentos encontrados:", snapshot.docs.length);

        snapshotProduccion(snapshot);
      } catch (error) {
        setShowAlert(true);
      }
    }
  };

  const handleChange = (e) => {
    setValores({ ...valores, [e.target.name]: e.target.value });
  };

  const snapshotProduccion = (snapshot) => {
    let totProd = 0, totDesc = 0, totGua = 0, totAnimales = 0;


    const prod = snapshot.docs.map(doc => {
      const data = doc.data();
      const produccion = parseFloat(data.produccion) || 0;
      const descarte = parseFloat(data.descarte) || 0;
      const guachera = parseFloat(data.guachera) || 0;

      const animales = parseFloat(data.animalesEnOrd);
      const produccionNum = parseFloat(data.produccion);

      const prodIndv = !isNaN(animales) && animales !== 0 && !isNaN(produccionNum)
        ? parseFloat((produccionNum / animales).toFixed(1))
        : "-";

      totProd += produccion;
      totDesc += descarte;
      totGua += guachera;

      if (!isNaN(animales)) totAnimales += animales; // SUMA VACAS

      return { id: doc.id, ...data, produccion, descarte, guachera, prodIndv };
    });

    // ⚠️ Calculá el total promedio individual
    const totalPromIndv = totAnimales > 0 ? parseFloat((totProd / totAnimales).toFixed(1)) : "-";

    // GUARDAR EN ESTADO
    setTotales({
      produccion: totProd,
      descarte: totDesc,
      guachera: totGua,
      entregado: totProd - totDesc - totGua,
      promedioIndividual: totalPromIndv  // NUEVO
    });

    setProducciones(prod);
    setProcesando(false);
  };

  const formatMiles = (val) => {
    const n = Number(val);
    if (isNaN(n)) return '0';
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(n);
  };


  const exportToExcel = () => {
    if (!tamboSel || !tamboSel.nombre) {
      alert("No se puede generar el archivo porque no hay un tambo seleccionado.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    const numberStyleLeft = { alignment: { horizontal: "left" }, numFmt: "0" };
    const numberStyleRight = { alignment: { horizontal: "right" }, numFmt: "0.0" };
    const textStyle = { alignment: { horizontal: "left" } };

    let row = 0;

    const addRow = (values, styles = []) => {
      values.forEach((val, col) => {
        const cellRef = XLSX.utils.encode_cell({ c: col, r: row });
        const cell = {};
        const isNumber = typeof val === "number" && !isNaN(val);

        cell.v = val;
        cell.t = isNumber ? "n" : "s";
        if (styles[col]) {
          cell.s = styles[col];
        } else if (isNumber) {
          cell.s = numberStyleLeft;
        } else {
          cell.s = textStyle;
        }

        ws[cellRef] = cell;
      });
      row++;
    };

    // Encabezados
    addRow(["Tambo:", tamboSel.nombre]);
    addRow(["Total Producido:", totales.produccion], [textStyle, numberStyleLeft]);
    addRow(["Total Descarte:", totales.descarte], [textStyle, numberStyleLeft]);
    addRow(["Total Guachera:", totales.guachera], [textStyle, numberStyleLeft]);
    addRow(["Total Entregado:", totales.entregado], [textStyle, numberStyleLeft]);
    addRow(
      ["Total Promedio Individual:", totales.promedioIndividual],
      [textStyle, numberStyleRight]
    );
    row++; // Espacio

    // Cabecera de tabla
    const headers = [
      "Fecha", "Prod. M", "Prod. T", "Producción", "Desc. M", "Desc. T", "Descarte",
      "Guach. M", "Guach. T", "Guachera", "Entregados", "Animales en Orden",
      "Prod. Individual", "Fábrica"
    ];
    addRow(headers, Array(headers.length).fill(textStyle));

    // Datos
    producciones.forEach(p => {
      const prodIndvVal = typeof p.prodIndv === "number" ? p.prodIndv : null;

      const rowData = [
        p.fecha.toDate ? format(p.fecha.toDate(), 'yyyy-MM-dd') : p.fecha,
        Number(p.prodM) || 0,
        Number(p.prodT) || 0,
        Number(p.produccion) || 0,
        Number(p.desM) || 0,
        Number(p.desT) || 0,
        Number(p.descarte) || 0,
        Number(p.guaM) || 0,
        Number(p.guaT) || 0,
        Number(p.guachera) || 0,
        Number(p.entregados) || 0,
        Number(p.animalesEnOrd) || 0,
        typeof prodIndvVal === 'number' ? prodIndvVal : null,
        p.fabrica || ""
      ];

      const styles = rowData.map((_, idx) => {
        if (idx === 12) return numberStyleRight; // Prod. Individual
        if (idx === 0 || idx === 13) return textStyle; // Fecha y Fabrica
        return typeof rowData[idx] === "number" ? numberStyleLeft : textStyle;
      });

      addRow(rowData, styles);
    });

    // Definir rango
    ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: row - 1 } });

    // Crear y guardar
    XLSX.utils.book_append_sheet(wb, ws, "Producción");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Produccion_${fechaActual}_${tamboSel.nombre.replace(/\s+/g, "_")}.xlsx`;
    saveAs(data, nombreArchivo);
  };




  return (
    <Layout titulo="Producción" noStickyHeader={true}>

      {/* Header Sección */}
      <div className={styles.header}>
        <h1>Reporte de Producción</h1>
        <p>Visualice y exporte los datos de producción registrados según período.</p>
      </div>

      <div className={styles.filterCard}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(valores); }}>
          <div className={styles.filterRow}>

            {/* Fechas Rápidas */}
            <div className={styles.filterGroup} style={{ flex: '0 0 auto', width: '350px' }}>
              <label>Período Rápido</label>
              <div className={styles.segmentedControl}>
                <button
                  type="button"
                  className={valores.tipoFecha === 'ud' ? styles.active : ''}
                  onClick={() => realizarBusqueda('ud')}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className={valores.tipoFecha === 'mv' ? styles.active : ''}
                  onClick={() => realizarBusqueda('mv')}
                >
                  Mes Actual
                </button>
                <button
                  type="button"
                  className={valores.tipoFecha === 'ma' ? styles.active : ''}
                  onClick={() => realizarBusqueda('ma')}
                >
                  Mes Anterior
                </button>
                <button
                  type="button"
                  className={valores.tipoFecha === 'ef' ? styles.active : ''}
                  onClick={() => setValores({ ...valores, tipoFecha: 'ef' })}
                >
                  Rango
                </button>
              </div>
            </div>

            {/* Rango Personalizado */}
            {valores.tipoFecha === 'ef' && (
              <>
                <div className={styles.filterGroup}>
                  <label>Fecha Inicio</label>
                  <input type="date" name="fini" value={valores.fini} onChange={handleChange} required />
                </div>
                <div className={styles.filterGroup}>
                  <label>Fecha Fin</label>
                  <input type="date" name="ffin" value={valores.ffin} onChange={handleChange} required />
                </div>
              </>
            )}

            {/* Acciones */}
            <div className={styles.actionsArea}>
              <button type="button" className={styles.btnSecondary} onClick={exportToExcel}>
                <RiFileExcel2Line />
                Exportar Excel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                <RiSearchLine />
                Buscar Reporte
              </button>
            </div>

          </div>
        </form>
      </div>

      {procesando ? (
        <div className={styles.loadingOverlay}>
          <Spinner animation="border" variant="info" role="status" style={{ width: '3rem', height: '3rem', color: '#17A2B8' }} />
          <div className={styles.loadingText}>Procesando datos de producción...</div>
        </div>
      ) : tamboSel ? (
        producciones.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.illustration} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 13V13.01" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 7V10" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2>No se encontraron registros</h2>
            <p>Ajuste el período seleccionado o el rango de fechas para visualizar información.</p>
            <button className={styles.btnSecondary} onClick={() => realizarBusqueda('mv')} style={{ marginTop: '16px' }}>
              Restablecer filtros
            </button>
          </div>
        ) : (
          <>
            {/* Resumen de totales */}
            <div className={styles.filterCard} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#343A40', alignItems: 'center' }}>
                  <span><strong>Total Producido:</strong> {formatMiles(totales.produccion)}</span>
                  <span><strong>Total Descarte:</strong> {formatMiles(totales.descarte)}</span>
                  <span><strong>Total Guachera:</strong> {formatMiles(totales.guachera)}</span>
                  <span><strong>Total Entregado:</strong> {formatMiles(totales.entregado)}</span>
                  <span><strong>Total Prom. Individual:</strong> {typeof totales.promedioIndividual === 'number'
                    ? totales.promedioIndividual.toFixed(1)
                    : '-'}</span>
                  <span><strong>Datos de tambo:</strong> <strong><span style={{ fontSize: '20px', textDecoration: 'underline', textDecorationColor: '#28a745', textDecorationThickness: '5px' }}>{tamboSel?.nombre || '-'}</span></strong></span>
                </div>
                <div>
                  <Button
                    onClick={() => setMostrarGrafico(!mostrarGrafico)}
                    variant="dark"
                    style={{ fontSize: '13px', padding: '6px 12px' }}
                  >
                    {mostrarGrafico ? 'Ocultar gráfico' : 'Ver gráfico prod. individual'}
                  </Button>
                </div>
              </div>
              {mostrarGrafico && (
                <div style={{ marginTop: '12px' }}>
                  <GraficoProduccion
                    data={producciones}
                    promedioTotal={totales.promedioIndividual}
                  />
                </div>
              )}
            </div>

            {/* Tabla moderna */}
            <div className={styles.modernTableContainer}>
              <table className={styles.modernTable}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th><ThTooltip label="Prod. M" texto="Producción Mañana" /></th>
                    <th><ThTooltip label="Prod. T" texto="Producción Tarde" /></th>
                    <th>Producción</th>
                    <th><ThTooltip label="Desc. M" texto="Descarte Mañana" /></th>
                    <th><ThTooltip label="Desc. T" texto="Descarte Tarde" /></th>
                    <th>Descarte</th>
                    <th><ThTooltip label="Guach. M" texto="Guachera Mañana" /></th>
                    <th><ThTooltip label="Guach. T" texto="Guachera Tarde" /></th>
                    <th>Guachera</th>
                    <th>Entregados</th>
                    <th>Vacas en Ordeñe</th>
                    <th>Prod. Individual</th>
                    <th>Fábrica</th>
                    <th>Temperatura</th>
                    <th>Clima</th>
                  </tr>
                </thead>
                <tbody>
                  {producciones.map(p => (
                    <DetalleProduccion key={p.id} prod={p} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : (
        <SelectTambo />
      )}
    </Layout>
  );


}

export default Produccion