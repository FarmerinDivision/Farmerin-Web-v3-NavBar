import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { Form, Row, Col, Modal } from 'react-bootstrap';
import { RiSearchLine, RiFileExcel2Fill, RiBarChartBoxLine, RiTableLine } from 'react-icons/ri';
import ControlLecheroCurva from './ControlLecheroCurva';
import { LuWheat } from 'react-icons/lu';
import { format } from 'date-fns';
import styles from '../styles/ReportesModernos.module.scss';
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
import SelectTambo from '../components/layout/selectTambo';

const Loader = () => (
    <div className={styles.loadingOverlay}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
        <div className={styles.loadingText}>Procesando datos del control lechero...</div>
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
    const [modalCurva, setModalCurva] = useState({ show: false, animalId: null });

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

            const strStart = format(startDate, 'yyyy-MM-dd');
            const strEnd = format(endDate, 'yyyy-MM-dd');

            const timestampStart = firebase.fechaTimeStamp(strStart);
            const timestampEnd = firebase.fechaTimeStamp(strEnd);

            // Única consulta a Firestore utilizando solo idtambo.
            // Esto requiere que hagas clic en el enlace de la consola para crear el índice.
            const snap = await firebase.db.collectionGroup('eventos')
                .where('idtambo', '==', tamboSel.id)
                .where('tipo', '==', 'Control Lechero')
                .where('fecha', '>=', timestampStart)
                .where('fecha', '<', timestampEnd)
                .get();

            // 1. Primero extraemos los eventos válidos y la referencia al animal padre
            const resultadosParciales = snap.docs
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
                        animalRef: doc.ref.parent.parent,
                        animalId: doc.ref.parent.parent.id,
                        fecha: format(ev.fecha.toDate(), 'dd/MM/yyyy'),
                        detalle: detalleOriginal,
                        litros: detalleOriginal.match(/(\d+)/)
                            ? parseInt(detalleOriginal.match(/(\d+)/)[1])
                            : null,
                        fiscalizada: detalleLower.includes('fiscalizada')
                    };
                })
                .filter(Boolean);

            if (resultadosParciales.length === 0) {
                setMensaje('No se encontraron controles válidos para el mes seleccionado.');
                setEventos([]);
                setProcesando(false);
                return;
            }

            // 2. Client-side Join: Buscamos la info del animal (RP, eRP)
            // Utilizamos un Map para cachear y no leer dos veces el mismo animal si tuviera más de 1 control
            const animalesMap = new Map();
            const promesasAnimales = [];

            for (const item of resultadosParciales) {
                if (!animalesMap.has(item.animalId)) {
                    animalesMap.set(item.animalId, null); // Placeholder para saber que ya lo estamos buscando
                    promesasAnimales.push(
                        item.animalRef.get().then(docAnim => {
                            if (docAnim.exists) {
                                animalesMap.set(item.animalId, docAnim.data());
                            }
                        })
                    );
                }
            }

            // Ejecutamos todas las lecturas de animales en paralelo para máxima velocidad
            await Promise.all(promesasAnimales);

            // 3. Unimos los datos
            const resultadosFinales = resultadosParciales.map(item => {
                const dataAnimal = animalesMap.get(item.animalId) || {};
                return {
                    ...item,
                    RP: dataAnimal.rp || dataAnimal.RP || '-',
                    ERP: dataAnimal.erp || dataAnimal.eRP || dataAnimal.ERP || '-'
                };
            });

            setEventos(resultadosFinales);
        } catch (e) {
            console.error('[ControlLechero] Error handleSubmit:', e);
            setMensaje(`Error al cargar los datos: ${e?.message || e}`);
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

        try {
            const inicioAnio = new Date(anio, 0, 1);
            const finAnio = new Date(anio + 1, 0, 1);

            const timestampInicio = firebase.fechaTimeStamp(format(inicioAnio, 'yyyy-MM-dd'));
            const timestampFin = firebase.fechaTimeStamp(format(finAnio, 'yyyy-MM-dd'));

            // Eliminación del N+1. Buscamos todo el año de una sola vez en lugar de hacer 24 consultas en bucle.
            const snap = await firebase.db.collectionGroup('eventos')
                .where('idtambo', '==', tamboSel.id)
                .where('tipo', '==', 'Control Lechero')
                .where('fecha', '>=', timestampInicio)
                .where('fecha', '<', timestampFin)
                .get();

            // Inicializar array base de 12 meses en memoria
            const mesesData = Array.from({ length: 12 }, (_, i) => ({
                mes: MESES[i].toUpperCase(),
                total: 0,
                cantidad: 0
            }));

            // Agrupación y totalización en memoria
            snap.docs.forEach(doc => {
                const ev = doc.data();
                if (!ev.fecha) return;
                
                const detalle = ev.detalle?.toLowerCase() || "";
                if (detalle.includes("no se actualizó") || detalle.includes("casilla estaba vacía")) return;

                const match = ev.detalle?.match(/(\d+)/);
                const litros = match ? parseInt(match[1]) : 0;

                const fechaDoc = ev.fecha.toDate();
                const mesDoc = fechaDoc.getMonth(); // 0 a 11

                mesesData[mesDoc].total += litros;
                mesesData[mesDoc].cantidad += 1;
            });

            const datos = mesesData.map(d => {
                const promedio = d.cantidad > 0 ? parseFloat((d.total / d.cantidad).toFixed(2)) : 0;
                return { mes: d.mes, total: d.total, promedio };
            });

            setDatosAnuales(datos);
            setMostrarGrafico(true);

        } catch (e) {
            console.error('[ControlLechero] Error cargarDatosAnuales:', e);
            setMensaje(`Error al cargar datos anuales: ${e?.message || e}`);
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

    // Cacheamos los eventos válidos para no filtrar el array completo repetidas veces en el JSX.
    const eventosNoFiscalizados = eventos.filter(ev => !ev.fiscalizada);
    
    const litrosPorEvento = eventosNoFiscalizados.map(ev => ev.litros || 0);
    const totalMensual = litrosPorEvento.reduce((a, b) => a + b, 0);
    const promedioIndividual = eventosNoFiscalizados.length > 0
        ? (totalMensual / eventosNoFiscalizados.length).toFixed(2)
        : 0;

    const datosAnualesScaled = (datosAnuales || []).map(d => ({ ...d }));

    if (datosAnualesScaled.length > 0) {
        const maxTotal = Math.max(...datosAnualesScaled.map(d => d.total || 0));
        const maxProm = Math.max(...datosAnualesScaled.map(d => d.promedio || 0));
        const factor = (maxProm > 0) ? (maxTotal / maxProm) : 1;

        datosAnualesScaled.forEach(d => {
            d.promedioScaled = Number(((d.promedio || 0) * factor * 1.03).toFixed(2));
        });
    }

    if (!tamboSel) {
        return (
            <Layout titulo="Control Lechero Mensual">
                <SelectTambo />
            </Layout>
        );
    }

    return (
        <Layout titulo="Control Lechero Mensual" style={{ paddingTop: 0 }}>
            <div className={styles.reporteRoot}>
                
                {/* ENCABEZADO */}
                <h1 className={styles.headerTitle}>Control Lechero Mensual</h1>
                <p className={styles.headerSubtitle}>Consulta la producción de leche individual y los consolidados mensuales.</p>

                {/* TOOLBAR HORIZONTAL */}
                <div className={styles.toolbarCard}>
                    <form onSubmit={handleSubmit} className={styles.toolbarRow}>
                        <div className={styles.filterGroup}>
                            <label>Mes</label>
                            <select
                                value={mesSeleccionado}
                                onChange={(e) => {
                                    setMesSeleccionado(e.target.value);
                                    limpiarDatos();
                                }}
                            >
                                <option value="">-- Seleccioná un mes --</option>
                                {MESES.map((m, i) => (
                                    <option key={i} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label>Año</label>
                            <select
                                value={anioSeleccionado}
                                onChange={(e) => {
                                    setAnioSeleccionado(parseInt(e.target.value));
                                    limpiarDatos();
                                }}
                            >
                                {AÑOS.map((a, i) => (
                                    <option key={i} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className={styles.btnPrimary}>
                            <RiSearchLine size={18} />
                            Buscar
                        </button>
                    </form>
                </div>

                {(procesando || procesandoGrafico) && <Loader />}

                {!procesando && !procesandoGrafico && mensaje && eventos.length === 0 && (
                    <div className={styles.emptyState}>
                        <div className={styles.emoji}>🥛</div>
                        <h2>{mensaje}</h2>
                        <p>Ajuste el mes y el año para obtener nuevos resultados.</p>
                    </div>
                )}

                {/* RESULTADOS */}
                {!procesando && !procesandoGrafico && eventosNoFiscalizados.length > 0 && (
                    <>
                        {/* KPI GRID */}
                        <div className={styles.kpiGrid}>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiIcon}>🐄</div>
                                <div className={styles.kpiContent}>
                                    <span className={styles.kpiLabel}>Cantidad de animales</span>
                                    <span className={styles.kpiValue}>{eventosNoFiscalizados.length}</span>
                                </div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiIcon}>🥛</div>
                                <div className={styles.kpiContent}>
                                    <span className={styles.kpiLabel}>Producción del mes</span>
                                    <span className={styles.kpiValue}>{Number(totalMensual).toLocaleString('es-AR')} L</span>
                                </div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiIcon}>📈</div>
                                <div className={styles.kpiContent}>
                                    <span className={styles.kpiLabel}>Promedio individual</span>
                                    <span className={styles.kpiValue}>{promedioIndividual} L</span>
                                </div>
                            </div>
                        </div>

                        {/* ACCIONES Y CONTENIDO (TABLA / GRÁFICO) */}
                        <div className={styles.tableCard}>
                            <div className={styles.tableToolbar}>
                                <h3>
                                    {mostrarGrafico 
                                        ? `Evolución Anual ${anioSeleccionado}` 
                                        : `Detalle Mensual (${mesSeleccionado.toUpperCase()} ${anioSeleccionado})`
                                    }
                                </h3>
                                <div className={styles.actionsArea}>
                                    <button type="button" className={styles.btnSecondary} onClick={cargarDatosAnuales}>
                                        {mostrarGrafico ? <><RiTableLine /> Ver Tabla</> : <><RiBarChartBoxLine /> Ver Gráfico</>}
                                    </button>
                                    <button type="button" className={styles.btnSecondary} onClick={exportarExcel}>
                                        <RiFileExcel2Fill /> Descargar Excel
                                    </button>
                                </div>
                            </div>

                            {mostrarGrafico ? (
                                /* GRÁFICO */
                                <div style={{ width: "100%", height: 400, padding: "20px" }}>
                                    <ResponsiveContainer>
                                        <ComposedChart
                                            data={datosAnualesScaled}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                                            
                                            <YAxis
                                                yAxisId="left"
                                                axisLine={false} 
                                                tickLine={false}
                                                tickFormatter={(v) => v.toLocaleString("es-AR")}
                                            />

                                            <Tooltip
                                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}
                                                formatter={(value, name, props) => {
                                                    const data = props?.payload ?? {};
                                                    const realPromedio = data.promedio ?? null;
                                                    if (name === "Total mensual") return `${Number(value).toLocaleString("es-AR")} L`;
                                                    if (name === "Promedio individual") return realPromedio !== null ? `${realPromedio} L/vaca` : value;
                                                    return value;
                                                }}
                                            />

                                            <Legend verticalAlign="top" height={36} />

                                            <Bar
                                                dataKey="total"
                                                yAxisId="left"
                                                barSize={30}
                                                fill="#3b82f6"
                                                radius={[4, 4, 0, 0]}
                                                name="Total mensual"
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="promedioScaled"
                                                yAxisId="left"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                                                name="Promedio individual"
                                                isFront={true}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                /* TABLA */
                                <div className={styles.tableWrapper}>
                                    <table className={styles.modernTable}>
                                        <thead>
                                            <tr>
                                                <th>RP</th>
                                                <th>eRP</th>
                                                <th>Fecha</th>
                                                <th>Litros</th>
                                                <th>Curva</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {eventosNoFiscalizados.map((ev) => (
                                                <tr key={ev.id}>
                                                    <td style={{fontWeight: 600}}>{ev.RP}</td>
                                                    <td style={{color: '#6b7280'}}>{ev.ERP || '-'}</td>
                                                    <td>{ev.fecha}</td>
                                                    <td>
                                                        {ev.litros !== null ? (
                                                            <span className={styles.litrosBadge}>
                                                                🥛 {ev.litros} L
                                                            </span>
                                                        ) : (
                                                            <span style={{color: '#9ca3af'}}>{ev.detalle}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className={styles.btnSecondary}
                                                            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                                                            onClick={() => setModalCurva({ show: true, animalId: ev.animalId })}
                                                        >
                                                            Ver curva
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Modal Curva de Producción Individual */}
            <Modal
                show={modalCurva.show}
                onHide={() => setModalCurva({ show: false, animalId: null })}
                className="custom-modal-consumos"
                dialogClassName="modal-90w"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Curva de Producción — Control Lechero</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ minHeight: '500px' }}>
                    {modalCurva.animalId && (
                        <ControlLecheroCurva animalId={modalCurva.animalId} />
                    )}
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default ControlLecheroMensual;
