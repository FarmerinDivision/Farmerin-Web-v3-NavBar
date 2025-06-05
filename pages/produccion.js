import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, ContenedorSpinner, Contenedor } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleProduccion from '../components/layout/detalleProduccion';
import SelectTambo from '../components/layout/selectTambo';
import StickyTable from 'react-sticky-table-thead';
import { Button, Form, Row, Col, Alert, Spinner, Table, ButtonGroup } from 'react-bootstrap';
import { RiSearchLine } from 'react-icons/ri';
import { format, subDays } from 'date-fns';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import GraficoProduccion from '../components/layout/GraficoProduccion';
import styles from '../styles/Produccion.module.scss';

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
    <Layout titulo="Producción">
      <Botonera>
        <Form onSubmit={(e) => { e.preventDefault(); handleSubmit(valores); }}>
          <Row className={styles.RepoProduFiltros}>
            <Col lg>
              <Form.Label>Desde</Form.Label>
              <ButtonGroup className={styles.RepoProduBotonera}>
                <div className={styles.RepoProduTooltip}>
                  <Button className={`${valores.tipoFecha === 'ud' ? 'activo' : ''}`} variant="info" onClick={() => realizarBusqueda('ud')}>1 DÍA</Button>
                  <span className={styles.RepoProduTooltipText}>Último día</span>
                </div>
                <div className={styles.RepoProduTooltip}>
                  <Button className={`${valores.tipoFecha === 'mv' ? 'activo' : ''}`} variant="info" onClick={() => realizarBusqueda('mv')}>MES EN CURSO</Button>
                  <span className={styles.RepoProduTooltipText}>Mes actual</span>
                </div>
                <div className={styles.RepoProduTooltip}>
                  <Button
                    className={`${valores.tipoFecha === 'ef' ? 'activo' : ''}`}
                    variant="info"
                    onClick={() => setValores({ ...valores, tipoFecha: 'ef' })}
                  >
                    POR FECHA
                  </Button>
                  <span className={styles.RepoProduTooltipText}>Selecciona un rango</span>
                </div>
              </ButtonGroup>
            </Col>

            {valores.tipoFecha === 'ef' && (
              <>
                <Col lg>
                  <Form.Label>Inicio</Form.Label>
                  <Form.Control type="date" name="fini" value={valores.fini} onChange={handleChange} required />
                </Col>
                <Col lg>
                  <Form.Label>Fin</Form.Label>
                  <Form.Control type="date" name="ffin" value={valores.ffin} onChange={handleChange} required />
                </Col>
              </>
            )}

            <Col lg className={styles.RepoProduAcciones}>
              <Button variant="info" type="submit" block>
                <RiSearchLine size={22} /> Buscar
              </Button>
              <Button variant="success" block onClick={exportToExcel}>
                Descargar Excel
              </Button>
            </Col>
          </Row>
        </Form>
      </Botonera>

      {procesando ? (
        <ContenedorSpinner>
          <Spinner animation="border" variant="info" />
        </ContenedorSpinner>
      ) : tamboSel ? (
        producciones.length === 0 ? (
          <Mensaje>
            <div className={styles.mensajeCaja}>
              <h2 className={styles.tituloSinResultados}>Sin resultados</h2>
              <p className={styles.textoSecundario}>
                Presione el rango de fecha que quiere mostrar para ver los resultados
              </p>
            </div>
          </Mensaje>
        ) : (
          <Contenedor className={styles.RepoProduWrapper}>
            {/* Encabezado fijo */}
            <div className={styles.RepoProduEncabezado}>
              <div className={styles.RepoProduTopbar}>
                <div className={styles.RepoProduResumen}>
                  <span><strong>Total Producido:</strong> {formatMiles(totales.produccion)}</span>
                  <span><strong>Total Descarte:</strong> {formatMiles(totales.descarte)}</span>
                  <span><strong>Total Guachera:</strong> {formatMiles(totales.guachera)}</span>
                  <span><strong>Total Entregado:</strong> {formatMiles(totales.entregado)}</span>
                  <span><strong>Total Prom. Individual:</strong> {typeof totales.promedioIndividual === 'number'
                    ? totales.promedioIndividual.toFixed(1)
                    : '-'}</span>
                </div>

                <div className={styles.RepoProduTopbarRight}>
                  <Button
                    className={styles.RepoProduGrafico}
                    onClick={() => setMostrarGrafico(!mostrarGrafico)}
                    variant="dark"
                  >
                    {mostrarGrafico ? 'Ocultar gráfico' : 'Ver gráfico prod. individual'}
                  </Button>
                </div>
              </div>

              {mostrarGrafico && (
                <GraficoProduccion
                  data={producciones}
                  promedioTotal={totales.promedioIndividual}
                />
              )}
            </div>

            {/* Tabla con scroll */}
            <div className={styles.RepoProduTablaWrapper}>
              <Table bordered hover className={styles.RepoProduTabla}>

                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Prod. M</th>
                    <th>Prod. T</th>
                    <th>Producción</th>
                    <th>Desc. M</th>
                    <th>Desc. T</th>
                    <th>Descarte</th>
                    <th>Guach. M</th>
                    <th>Guach. T</th>
                    <th>Guachera</th>
                    <th>Entregados</th>
                    <th>Vacas en Ordeñe</th>
                    <th>Prod. Individual</th>
                    <th>Fábrica</th>
                  </tr>
                </thead>
                <tbody>
                  {producciones.map(p => (
                    <DetalleProduccion key={p.id} prod={p} />
                  ))}
                </tbody>
              </Table>
            </div>
          </Contenedor>
        )
      ) : (
        <SelectTambo />
      )}
    </Layout>
  );


}

export default Produccion