import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { Botonera, Mensaje, Contenedor } from '../components/ui/Elementos';
import { Form, Row, Col, Table } from 'react-bootstrap';
import { RiSearchLine } from 'react-icons/ri';
import { format } from 'date-fns';
import styles from '../styles/Dirsa.module.scss';
import {
  BarChart,
  ComposedChart,
  Bar,
  XAxis,
  Line,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Loader = () => (
  <div className={styles.loaderContainerGraficoD}>
    <div className={styles.spinnerGraficoD}></div>
    <div className={styles.loaderGraficoD}>
      <p>Cargando</p>
      <div className={styles.wordsGraficoD}>
        <span className={styles.wordGraficoD}>Datos de produccion</span>
        <span className={styles.wordGraficoD}>Cantidad de animales</span>
        <span className={styles.wordGraficoD}>Cantidad de litros</span>
        <span className={styles.wordGraficoD}>Produccion del mes</span>
        <span className={styles.wordGraficoD}>Datos del tambo</span>
      </div>
    </div>
  </div>
);

const ProductividadMensualDirsa = () => {
  const { firebase, tamboSel } = useContext(FirebaseContext);

  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [procesando, setProcesando] = useState(false);
  const [procesandoGrafico, setProcesandoGrafico] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [datosAnuales, setDatosAnuales] = useState([]);
  const [mostrarFiscalizadas, setMostrarFiscalizadas] = useState(false);

  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const anioActual = new Date().getFullYear();
  const AÑOS = [];
  for (let y = 2025; y <= anioActual + 1; y++) AÑOS.push(y);


  // ✅ Cuando cambia el mes o el año, se limpian los datos
  const limpiarDatos = () => {
    setEventos([]);
    setDatosAnuales([]);
    setMensaje('');
    setMostrarGrafico(false);
    setMostrarFiscalizadas(false);

    // ✅ Nuevo mensaje al cambiar el mes/año
    setMensaje("Presione buscar para obtener la información del mes seleccionado.");
  };




  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tamboSel) {
      setMensaje('Seleccioná un tambo para continuar.');
      return;
    }
    if (!mesSeleccionado) {
      setMensaje('Seleccioná un mes.');
      return;
    }

    setProcesando(true);
    setEventos([]);
    setMensaje('');
    setMostrarGrafico(false);

    try {
      const mesIndexSel = MESES.indexOf(mesSeleccionado);
      const startDate = new Date(anioSeleccionado, mesIndexSel, 1);
      const endDate = new Date(anioSeleccionado, mesIndexSel + 1, 1);

      const eventosSnap = await firebase.db
        .collectionGroup('eventos')
        .where('idtambo', '==', tamboSel.id)
        .where('tipo', '==', 'Control Lechero mediante planilla Dirsa')
        .where('fecha', '>=', startDate)
        .where('fecha', '<', endDate)
        .get();

      const resultados = eventosSnap.docs
        .map(doc => {
          const ev = doc.data();
          if (!ev.fecha) return null;

          const detalleOriginal = ev.detalle || '';
          const detalleLower = detalleOriginal.toLowerCase();

          if (
            detalleLower.includes('no se actualizó') ||
            detalleLower.includes('casilla estaba vacía')
          ) {
            return null;
          }

          return {
            id: doc.id,
            fecha: format(ev.fecha.toDate(), 'dd/MM/yyyy'),
            RP: ev.rp || '',
            ERP: ev.erp || '',
            detalle: detalleOriginal,
            litros: detalleOriginal.match(/(\d+)/)
              ? parseInt(detalleOriginal.match(/(\d+)/)[1])
              : null,
            fiscalizada: detalleLower.includes('fiscalizada')
          };
        })
        .filter(Boolean);

      if (resultados.length === 0) {
        setMensaje('No se encontraron controles válidos para el mes seleccionado.');
      }

      setEventos(resultados);
    } catch (error) {
      console.error('Error al obtener los eventos:', error);
      setMensaje('Ocurrió un error al cargar los datos.');
    } finally {
      setProcesando(false);
    }
  };

  const cargarDatosAnuales = async () => {
    if (mostrarGrafico) {
      setMostrarGrafico(false);
      return;
    }

    setProcesandoGrafico(true);
    const anio = anioSeleccionado;
    const datos = [];

    try {
      for (let mes = 0; mes < 12; mes++) {
        const inicio = new Date(anio, mes, 1);
        const fin = new Date(anio, mes + 1, 1);

        const snap = await firebase.db
          .collectionGroup('eventos')
          .where('idtambo', '==', tamboSel.id)
          .where('tipo', '==', 'Control Lechero mediante planilla Dirsa')
          .where('fecha', '>=', inicio)
          .where('fecha', '<', fin)
          .get();

        let eventosMes = snap.docs
          .map(doc => {
            const ev = doc.data();
            const detalle = ev.detalle?.toLowerCase() || "";
            if (
              detalle.includes("no se actualizó") ||
              detalle.includes("casilla estaba vacía")
            ) return null;

            const match = ev.detalle?.match(/(\d+)/);
            const litros = match ? parseInt(match[1]) : 0;

            return litros;
          })
          .filter(Boolean);

        const total = eventosMes.reduce((acc, v) => acc + v, 0);
        const promedio = eventosMes.length > 0
          ? parseFloat((total / eventosMes.length).toFixed(2))
          : 0;


        datos.push({
          mes: MESES[mes].toUpperCase(),
          total,
          promedio
        });
      }

      setDatosAnuales(datos);
      setMostrarGrafico(true);
    } finally {
      setProcesandoGrafico(false);
    }
  };

  const exportarExcel = () => {
    if (eventos.length === 0) return;

    const datosExcel = eventos.map(ev => ({
      RP: ev.RP,
      eRP: ev.ERP,
      Fecha: ev.fecha,
      Detalle: ev.detalle,
      Estado: ev.fiscalizada
        ? "Fiscalizada"
        : ev.detalle?.toLowerCase().includes("enferma")
          ? "Enferma"
          : "Normal"
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Producción");

    const nombreArchivo = `ProduccionDirsa_${mesSeleccionado.toUpperCase()}.xlsx`;

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

    saveAs(blob, nombreArchivo);
  };


  const litrosPorEvento = eventos
    .filter(ev => !ev.fiscalizada)
    .map(ev => ev.litros || 0);

  const totalMensual = litrosPorEvento.reduce((acc, v) => acc + v, 0);
  const promedioIndividual = eventos.filter(ev => !ev.fiscalizada).length > 0
    ? (totalMensual / eventos.filter(ev => !ev.fiscalizada).length).toFixed(2)
    : 0;

  const eventosFiscalizados = eventos.filter(ev =>
    ev.fiscalizada ||
    ev.detalle?.toLowerCase().includes("enferma")
  );


  // --- Pre-procesamiento: generar datos escalados para que la línea se dibuje sobre las barras
  const datosAnualesScaled = (datosAnuales || []).map(d => ({ ...d })); // copia

  if (datosAnualesScaled.length > 0) {
    const maxTotal = Math.max(...datosAnualesScaled.map(d => d.total || 0));
    const maxProm = Math.max(...datosAnualesScaled.map(d => d.promedio || 0));
    const factor = (maxProm > 0) ? (maxTotal / maxProm) : 1;

    // Multiplicamos por un 1.03 para posicionar el punto ligeramente POR ENCIMA de la barra
    datosAnualesScaled.forEach(d => {
      d.promedioScaled = Number(((d.promedio || 0) * factor * 1.03).toFixed(2));
      // dejamos d.promedio intacto (valor real), y agregamos promedioScaled para plotear
    });
  }


  return (
    <Layout titulo="Productividad Mensual Dirsa">
      <div className={styles.dirsaRoot}>
        <Botonera>
          <h2 className={styles.tituloDirsa}>
            Producción Mensual <u>Dirsa</u>
          </h2>

          <Form onSubmit={handleSubmit} className={styles.form}>
            <Row>
              <Col md={4}>
                <Form.Label>Mes</Form.Label>
                <Form.Control
                  as="select"
                  value={mesSeleccionado}
                  onChange={(e) => {
                    setMesSeleccionado(e.target.value);
                    limpiarDatos();   // 👈 limpia datos automáticamente
                  }}
                  className={styles.select}
                >

                  <option value="">-- Seleccioná un mes --</option>
                  {MESES.map((m, i) => (
                    <option key={i} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </Form.Control>
              </Col>

              <Col md={4}>
                <Form.Label>Año</Form.Label>
                <Form.Control
                  as="select"
                  value={anioSeleccionado}
                  onChange={(e) => {
                    setAnioSeleccionado(parseInt(e.target.value));
                    limpiarDatos();   // 👈 limpia datos automáticamente
                  }}
                  className={styles.select}
                >

                  {AÑOS.map((a, i) => (
                    <option key={i} value={a}>{a}</option>
                  ))}
                </Form.Control>
              </Col>

              <Col md={4} className={styles.acciones}>
                <div className={styles.botonBuscarWrapper}>
                  <span className={styles.tooltipDP}>Buscar producción mensual</span>
                  <button type="submit" className={styles.botonBuscar}>
                    <RiSearchLine size={20} style={{ marginRight: "8px" }} />
                    Buscar
                  </button>
                </div>
              </Col>
            </Row>
          </Form>
        </Botonera>

        {(procesando || procesandoGrafico) && <Loader />}

        {!procesando && !procesandoGrafico && mensaje && (
          <Mensaje>
            <div className={styles.mensajeCaja}>{mensaje}</div>
          </Mensaje>
        )}

        {!procesando && !procesandoGrafico && eventos.filter(ev => !ev.fiscalizada).length > 0 && (
          <div className={styles.headerDirsa}>
            <div className={styles.headerTotales}>
              <div>
                <strong>Cantidad de animales (<u style={{ textDecorationColor: "#4cb050" }}>{mesSeleccionado.charAt(0).toUpperCase() + mesSeleccionado.slice(1)} {anioSeleccionado}</u>):</strong>
                <span>{eventos.filter(ev => !ev.fiscalizada).length}</span>
              </div>
              <div>
                <strong>Total producido (<u style={{ textDecorationColor: "#4cb050" }}>{mesSeleccionado.charAt(0).toUpperCase() + mesSeleccionado.slice(1)} {anioSeleccionado}</u>):</strong>
                <span>{totalMensual.toLocaleString('es-AR')} litros</span>
              </div>
              <div>
                <strong>Promedio individual (<u style={{ textDecorationColor: "#4cb050" }}>{mesSeleccionado.charAt(0).toUpperCase() + mesSeleccionado.slice(1)} {anioSeleccionado}</u>):</strong>
                <span>{promedioIndividual} litros</span>
              </div>
            </div>

            <div className={styles.headerBotones}>
              <div className={styles.BotonesPD} onClick={cargarDatosAnuales}>
                <span className={styles.tooltipDP}>{mostrarGrafico ? "Ir a lista de mes seleccionado" : "Ver gráfico anual"}</span>
                <span>{mostrarGrafico ? "Ir a la lista" : "Ir a gráfico"}</span>
              </div>

              <div
                className={styles.BotonesPD}
                onClick={() => setMostrarFiscalizadas(!mostrarFiscalizadas)}
                title="Ver enfermas/fiscalizadas"
              >
                <span className={styles.tooltipDP}>Ver fiscalizadas</span>
                <span>{mostrarFiscalizadas ? `Ocultar enfermas/fiscalizadas` : `Ver enfermas/fiscalizadas (${eventosFiscalizados.length})`}</span>
              </div>

              <div className={styles.BotonesPD} onClick={exportarExcel}>
                <span className={styles.tooltipDP}>Descargar Excel</span>
                <span>Descargar</span>
              </div>
            </div>
          </div>
        )}

        {/* TABLA DE FISCALIZADAS — se muestra SOLO si el usuario clickeó */}
        {!procesando && !procesandoGrafico && mostrarFiscalizadas && eventosFiscalizados.length > 0 && (
          <Contenedor>
            <h4 style={{ textAlign: "center", margin: "1rem 0", color: "#2774a8" }}>
              Animales con control <u style={{ textDecorationColor: "#4cb050" }}>fiscalizado</u>
            </h4>

            <Table striped bordered hover className={styles.tabla}>
              <thead>
                <tr>
                  <th>RP</th>
                  <th>eRP</th>
                  <th>Fecha</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {eventosFiscalizados.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.RP}</td>
                    <td>{ev.ERP}</td>
                    <td>{ev.fecha}</td>
                    <td
                      style={{
                        color: ev.detalle?.toLowerCase().includes("enferma") ? "#4cb050" : "#4cb050",
                        fontWeight: "bold"
                      }}
                    >
                      {ev.detalle}
                    </td>

                  </tr>
                ))}
              </tbody>
            </Table>
          </Contenedor>
        )}

        {!procesando && !procesandoGrafico && mostrarFiscalizadas && eventosFiscalizados.length === 0 && (
          <Mensaje>
            <div className={styles.mensajeCaja}>
              No se encontraron animales con controles fiscalizados en este mes.
            </div>
          </Mensaje>
        )}

        {/* TABLA PRINCIPAL — SOLO controles con litros (excluye fiscalizadas) */}
        {!procesando && !procesandoGrafico && eventos.filter(ev => !ev.fiscalizada).length > 0 && !mostrarGrafico && (
          <Contenedor>
            <h3 style={{
              textAlign: "center",
              margin: "1rem 0",
              fontWeight: "bold",
              color: "#2774a8"
            }}>
              Listado Mensual de Control Lechero Dirsa —
              <u style={{ textDecorationColor: "#4cb050", textDecorationThickness: "3px" }}>
                {mesSeleccionado.charAt(0).toUpperCase() + mesSeleccionado.slice(1)} {anioSeleccionado}
              </u>
            </h3>
            <Table striped bordered hover className={styles.tabla}>
              <thead>
                <tr>
                  <th>RP</th>
                  <th>eRP</th>
                  <th>Fecha</th>
                  <th>Litros</th>
                </tr>
              </thead>
              <tbody>
                {eventos
                  .filter(ev => !ev.fiscalizada)
                  .map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.RP}</td>
                      <td>{ev.ERP}</td>
                      <td>{ev.fecha}</td>
                      <td>
                        <Form.Control
                          type="text"
                          value={ev.litros !== null ? `${ev.litros} ` : ev.detalle}
                          disabled
                          readOnly
                          style={{ background: "#eee", cursor: "not-allowed" }}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Contenedor>
        )}

        {/* GRÁFICO ANUAL */}
        {!procesando && !procesandoGrafico && datosAnuales.length > 0 && mostrarGrafico && (
          <Contenedor>
            <h3 style={{
              textAlign: "center",
              margin: "1rem 0",
              fontWeight: "bold",
              color: "#2774a8"
            }}>
              Gráfico  <u style={{ textDecorationColor: "#4cb050", textDecorationThickness: "3px" }}>Anual </u> de Control Lechero mediante Dirsa
            </h3>

            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={datosAnualesScaled}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />

                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => v.toLocaleString("es-AR")}
                    label={{ value: "Total mensual (lts)", angle: -90, position: "insideLeft" }}
                  />

                  {/* Tooltip que muestra total y promedio real */}
                  <Tooltip
                    formatter={(value, name, props) => {
                      const data = props?.payload ?? {};

                      const realPromedio = data.promedio !== undefined ? data.promedio : null;

                      if (name === "Total mensual") {
                        return `${Number(value).toLocaleString("es-AR")} lts`;
                      }

                      if (name === "Promedio individual") {
                        return realPromedio !== null
                          ? `${Number(realPromedio).toFixed(2)} lts/vaca`
                          : `${Number(value).toFixed(2)} lts/vaca`;
                      }

                      return value;
                    }}
                    contentStyle={{ borderRadius: 6 }}
                  />


                  <Legend verticalAlign="top" height={36} />

                  {/* BARRAS: total */}
                  <Bar
                    dataKey="total"
                    yAxisId="left"
                    barSize={30}
                    fill="#28a745"
                    name="Total mensual"
                  />

                  {/* LINE: graficamos promedioScaled en la misma escala Y que las barras */}
                  <Line
                    type="linear"
                    dataKey="promedioScaled"
                    yAxisId="left"                  // misma escala que las barras
                    stroke="#287fb8"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#287fb8", stroke: "#fff", strokeWidth: 2 }}
                    name="Promedio individual"
                    isFront={true}
                  >
                    {/* La etiqueta mostrará el promedio real (sin escalar) */}
                    <LabelList
                      dataKey="promedio"            // muestra el valor real (no escalado)
                      position="top"
                      formatter={(v) => Number(v).toFixed(2)}
                      style={{ fill: "#287fb8", fontSize: 12, fontWeight: "bold" }}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Contenedor>

        )}
      </div>
    </Layout>
  );
};

export default ProductividadMensualDirsa;
