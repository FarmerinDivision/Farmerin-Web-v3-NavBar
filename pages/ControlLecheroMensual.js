import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { Botonera, Mensaje, Contenedor } from '../components/ui/Elementos';
import { Form, Row, Col, Table } from 'react-bootstrap';
import { RiSearchLine } from 'react-icons/ri';
import { format } from 'date-fns';
import styles from '../styles/Dirsa.module.scss';
import {
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
        <span className={styles.wordGraficoD}>Datos de producción</span>
        <span className={styles.wordGraficoD}>Cantidad de animales</span>
        <span className={styles.wordGraficoD}>Cantidad de litros</span>
        <span className={styles.wordGraficoD}>Producción del mes</span>
        <span className={styles.wordGraficoD}>Datos del tambo</span>
      </div>
    </div>
  </div>
);

const ControlLecheroMensual = () => {

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

  const limpiarDatos = () => {
    setEventos([]);
    setDatosAnuales([]);
    setMensaje("Presione buscar para obtener la información del mes seleccionado.");
    setMostrarGrafico(false);
    setMostrarFiscalizadas(false);
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
        .where('tipo', '==', 'Control Lechero')
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
    } catch (e) {
      console.log(e);
      setMensaje('Ocurrió un error al cargar los datos.');
    }

    setProcesando(false);
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
          .where('tipo', '==', 'Control Lechero')
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
    XLSX.utils.book_append_sheet(wb, ws, "Control Lechero");

    const nombreArchivo = `ControlLechero_${mesSeleccionado.toUpperCase()}.xlsx`;

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

    saveAs(blob, nombreArchivo);
  };

  const litrosPorEvento = eventos
    .filter(ev => !ev.fiscalizada)
    .map(ev => ev.litros || 0);

  const totalMensual = litrosPorEvento.reduce((a, b) => a + b, 0);
  const promedioIndividual = eventos.filter(ev => !ev.fiscalizada).length > 0
    ? (totalMensual / eventos.filter(ev => !ev.fiscalizada).length).toFixed(2)
    : 0;

  const eventosFiscalizados = eventos.filter(ev =>
    ev.fiscalizada ||
    ev.detalle?.toLowerCase().includes("enferma")
  );

  const datosAnualesScaled = (datosAnuales || []).map(d => ({ ...d }));

  if (datosAnualesScaled.length > 0) {
    const maxTotal = Math.max(...datosAnualesScaled.map(d => d.total || 0));
    const maxProm = Math.max(...datosAnualesScaled.map(d => d.promedio || 0));
    const factor = (maxProm > 0) ? (maxTotal / maxProm) : 1;

    datosAnualesScaled.forEach(d => {
      d.promedioScaled = Number(((d.promedio || 0) * factor * 1.03).toFixed(2));
    });
  }

  return (
    <Layout titulo="Control Lechero Mensual">
      <div className={styles.dirsaRoot}>
        <Botonera>
          <h2 className={styles.tituloDirsa}>
            Control Lechero <u>Mensual</u>
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
                    limpiarDatos();
                  }}
                >
                  <option value="">-- Seleccioná un mes --</option>
                  {MESES.map((m, i) => (
                    <option key={i} value={m}>{m}</option>
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
                    limpiarDatos();
                  }}
                >
                  {AÑOS.map((a, i) => (
                    <option key={i} value={a}>{a}</option>
                  ))}
                </Form.Control>
              </Col>

              <Col md={4} className={styles.acciones}>
                <div className={styles.botonBuscarWrapper}>
                  <span className={styles.tooltipDP}>Buscar controles del mes</span>
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

        {!procesando && !procesandoGrafico &&
          eventos.filter(ev => !ev.fiscalizada).length > 0 && (
            <div className={styles.headerDirsa}>
              <div className={styles.headerTotales}>
                <div>
                  <strong>Cantidad de animales:</strong>
                  <span>{eventos.filter(ev => !ev.fiscalizada).length}</span>
                </div>
                <div>
                  <strong>Total producido:</strong>
                  <span>{totalMensual} litros</span>
                </div>
                <div>
                  <strong>Promedio individual:</strong>
                  <span>{promedioIndividual} lts</span>
                </div>
              </div>

              <div className={styles.headerBotones}>
                <div className={styles.BotonesPD} onClick={cargarDatosAnuales}>
                  <span>{mostrarGrafico ? "Ir a lista" : "Ver gráfico anual"}</span>
                </div>

                <div
                  className={styles.BotonesPD}
                  onClick={() => setMostrarFiscalizadas(!mostrarFiscalizadas)}
                >
                  <span>{mostrarFiscalizadas ? "Ocultar fiscalizadas" : `Ver fiscalizadas (${eventosFiscalizados.length})`}</span>
                </div>

                <div className={styles.BotonesPD} onClick={exportarExcel}>
                  <span>Descargar Excel</span>
                </div>
              </div>
            </div>
          )}

        {!procesando && !procesandoGrafico &&
          mostrarFiscalizadas && eventosFiscalizados.length > 0 && (
            <Contenedor>
              <h4 style={{ textAlign: "center", margin: "1rem 0", color: "#2774a8" }}>
                Controles Fiscalizados / Observados
              </h4>

              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>RP</th>
                    <th>eRP</th>
                    <th>Fecha</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {eventosFiscalizados.map(ev => (
                    <tr key={ev.id}>
                      <td>{ev.RP}</td>
                      <td>{ev.ERP}</td>
                      <td>{ev.fecha}</td>
                      <td style={{ fontWeight: "bold", color: "#4cb050" }}>
                        {ev.detalle}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Contenedor>
          )}

        {/* Tabla principal */}
        {!procesando && !procesandoGrafico &&
          eventos.filter(ev => !ev.fiscalizada).length > 0 &&
          !mostrarGrafico && (
            <Contenedor>
              <h3 style={{
                textAlign: "center",
                margin: "1rem 0",
                fontWeight: "bold",
                color: "#2774a8"
              }}>
                Listado Mensual — Control Lechero<br />
                <u style={{ textDecorationColor: "#4cb050" }}>
                  {mesSeleccionado.toUpperCase()} {anioSeleccionado}
                </u>
              </h3>

              <Table striped bordered hover>
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
                            value={ev.litros !== null ? `${ev.litros}` : ev.detalle}
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

        {/* Gráfico anual */}
        {!procesando && !procesandoGrafico &&
          datosAnuales.length > 0 && mostrarGrafico && (
            <Contenedor>
              <h3 style={{
                textAlign: "center",
                margin: "1rem 0",
                fontWeight: "bold",
                color: "#2774a8"
              }}>
                Gráfico Anual — Control Lechero
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
                      label={{
                        value: "Total mensual (lts)",
                        angle: -90,
                        position: "insideLeft"
                      }}
                    />

                    <Tooltip
                      formatter={(value, name, props) => {
                        const data = props?.payload ?? {};
                        const realPromedio = data.promedio ?? null;

                        if (name === "Total mensual") {
                          return `${Number(value).toLocaleString("es-AR")} lts`;
                        }

                        if (name === "Promedio individual") {
                          return realPromedio !== null
                            ? `${realPromedio} lts/vaca`
                            : value;
                        }

                        return value;
                      }}
                    />

                    <Legend verticalAlign="top" height={36} />

                    <Bar
                      dataKey="total"
                      yAxisId="left"
                      barSize={30}
                      fill="#28a745"
                      name="Total mensual"
                    />

                    <Line
                      type="linear"
                      dataKey="promedioScaled"
                      yAxisId="left"
                      stroke="#287fb8"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#287fb8", stroke: "#fff", strokeWidth: 2 }}
                      name="Promedio individual"
                      isFront={true}
                    >
                      <LabelList
                        dataKey="promedio"
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

export default ControlLecheroMensual;
