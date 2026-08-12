import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { Modal } from 'react-bootstrap';
import {
    RiSearchLine,
    RiFileExcel2Fill,
    RiBarChartBoxLine,
    RiTableLine,
    RiEyeLine,
    RiEyeOffLine,
} from 'react-icons/ri';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
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
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import SelectTambo from '../components/layout/selectTambo';
import AnimalCurvaCompleto from './AnimalCurvaProduccion';

const Loader = () => (
    <div className={styles.loadingOverlay}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }} />
        <div className={styles.loadingText}>Procesando datos de productividad Dirsa...</div>
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
    const [showCurvaModal, setShowCurvaModal] = useState(false);
    const [animalSeleccionado, setAnimalSeleccionado] = useState(null);
    const [ordenLitros, setOrdenLitros] = useState(null);

    const MESES = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];

    const anioActual = new Date().getFullYear();
    const AÑOS = [];
    for (let y = 2025; y <= anioActual + 1; y++) AÑOS.push(y);

    const limpiarDatos = () => {
        setEventos([]);
        setDatosAnuales([]);
        setMensaje('Presione buscar para obtener la información del mes seleccionado.');
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
        setMostrarFiscalizadas(false);

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
                .map((doc) => {
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

                    const animalId = doc.ref.parent.parent.id;

                    return {
                        id: doc.id,
                        animalId,
                        fecha: format(ev.fecha.toDate(), 'dd/MM/yyyy'),
                        RP: ev.rp || '',
                        ERP: ev.erp || '',
                        detalle: detalleOriginal,
                        litros: detalleOriginal.match(/(\d+)/)
                            ? parseInt(detalleOriginal.match(/(\d+)/)[1], 10)
                            : null,
                        fiscalizada: detalleLower.includes('fiscalizada'),
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
        setMostrarFiscalizadas(false);
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

                const eventosMes = snap.docs
                    .map((doc) => {
                        const ev = doc.data();
                        const detalle = ev.detalle?.toLowerCase() || '';
                        if (
                            detalle.includes('no se actualizó') ||
                            detalle.includes('casilla estaba vacía')
                        ) return null;

                        const match = ev.detalle?.match(/(\d+)/);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter(Boolean);

                const total = eventosMes.reduce((acc, v) => acc + v, 0);
                const promedio = eventosMes.length > 0
                    ? parseFloat((total / eventosMes.length).toFixed(2))
                    : 0;

                datos.push({
                    mes: MESES[mes].toUpperCase(),
                    total,
                    promedio,
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

        const datosExcel = eventos.map((ev) => ({
            RP: ev.RP,
            eRP: ev.ERP,
            Fecha: ev.fecha,
            Detalle: ev.detalle,
            Estado: ev.fiscalizada
                ? 'Fiscalizada'
                : ev.detalle?.toLowerCase().includes('enferma')
                    ? 'Enferma'
                    : 'Normal',
        }));

        const ws = XLSX.utils.json_to_sheet(datosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Producción');

        const nombreArchivo = `ProduccionDirsa_${mesSeleccionado.toUpperCase()}.xlsx`;
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

        saveAs(blob, nombreArchivo);
    };

    const eventosValidos = eventos.filter((ev) => !ev.fiscalizada);
    const litrosPorEvento = eventosValidos.map((ev) => ev.litros || 0);
    const totalMensual = litrosPorEvento.reduce((a, b) => a + b, 0);
    const promedioIndividual = eventosValidos.length > 0
        ? (totalMensual / eventosValidos.length).toFixed(2)
        : 0;

    const eventosFiscalizados = eventos.filter(
        (ev) => ev.fiscalizada || ev.detalle?.toLowerCase().includes('enferma')
    );

    const datosAnualesScaled = (datosAnuales || []).map((d) => ({ ...d }));

    if (datosAnualesScaled.length > 0) {
        const maxTotal = Math.max(...datosAnualesScaled.map((d) => d.total || 0));
        const maxProm = Math.max(...datosAnualesScaled.map((d) => d.promedio || 0));
        const factor = maxProm > 0 ? maxTotal / maxProm : 1;

        datosAnualesScaled.forEach((d) => {
            d.promedioScaled = Number(((d.promedio || 0) * factor * 1.03).toFixed(2));
        });
    }

    const abrirCurva = (animalId) => {
        setAnimalSeleccionado(animalId);
        setShowCurvaModal(true);
    };

    const cerrarCurva = () => {
        setShowCurvaModal(false);
        setAnimalSeleccionado(null);
    };

    const handleSortLitros = () => {
        if (ordenLitros === 'asc') setOrdenLitros('desc');
        else if (ordenLitros === 'desc') setOrdenLitros(null);
        else setOrdenLitros('asc');
    };

    const eventosOrdenados = [...eventosValidos];

    if (ordenLitros === 'asc') {
        eventosOrdenados.sort((a, b) => (a.litros || 0) - (b.litros || 0));
    } else if (ordenLitros === 'desc') {
        eventosOrdenados.sort((a, b) => (b.litros || 0) - (a.litros || 0));
    }

    const SortIcon = ordenLitros === 'asc' ? FaSortUp : ordenLitros === 'desc' ? FaSortDown : FaSort;

    const tituloContenido = () => {
        if (mostrarGrafico) return `Evolución Anual ${anioSeleccionado}`;
        if (mostrarFiscalizadas) {
            return `Animales fiscalizados / enfermos (${mesSeleccionado.toUpperCase()} ${anioSeleccionado})`;
        }
        return `Detalle Mensual Dirsa (${mesSeleccionado.toUpperCase()} ${anioSeleccionado})`;
    };

    const toggleFiscalizadas = () => {
        setMostrarFiscalizadas((prev) => !prev);
        setMostrarGrafico(false);
    };

    if (!tamboSel) {
        return (
            <Layout titulo="Productividad Mensual Dirsa">
                <SelectTambo />
            </Layout>
        );
    }

    return (
        <Layout titulo="Productividad Mensual Dirsa" style={{ paddingTop: 0 }}>
            <div className={styles.reporteRoot}>
                <h1 className={styles.headerTitle}>Productividad Mensual Dirsa</h1>
                <p className={styles.headerSubtitle}>
                    Consulta la producción de leche individual cargada mediante planilla Dirsa y los consolidados mensuales.
                </p>

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
                                    <option key={i} value={m}>
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label>Año</label>
                            <select
                                value={anioSeleccionado}
                                onChange={(e) => {
                                    setAnioSeleccionado(parseInt(e.target.value, 10));
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

                {!procesando && !procesandoGrafico && mensaje && eventosValidos.length === 0 && (
                    <div className={styles.emptyState}>
                        <div className={styles.emoji}>🥛</div>
                        <h2>{mensaje}</h2>
                        <p>Ajuste el mes y el año para obtener nuevos resultados.</p>
                    </div>
                )}

                {!procesando && !procesandoGrafico && eventosValidos.length > 0 && (
                    <>
                        <div className={styles.kpiGrid}>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiIcon}>🐄</div>
                                <div className={styles.kpiContent}>
                                    <span className={styles.kpiLabel}>Cantidad de animales</span>
                                    <span className={styles.kpiValue}>{eventosValidos.length}</span>
                                </div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiIcon}>🥛</div>
                                <div className={styles.kpiContent}>
                                    <span className={styles.kpiLabel}>Producción del mes</span>
                                    <span className={styles.kpiValue}>
                                        {Number(totalMensual).toLocaleString('es-AR')} L
                                    </span>
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

                        <div className={styles.tableCard}>
                            <div className={styles.tableToolbar}>
                                <h3>{tituloContenido()}</h3>
                                <div className={styles.actionsArea}>
                                    <button type="button" className={styles.btnSecondary} onClick={cargarDatosAnuales}>
                                        {mostrarGrafico ? (
                                            <><RiTableLine /> Ver Tabla</>
                                        ) : (
                                            <><RiBarChartBoxLine /> Ver Gráfico</>
                                        )}
                                    </button>
                                    <button type="button" className={styles.btnSecondary} onClick={toggleFiscalizadas}>
                                        {mostrarFiscalizadas ? (
                                            <><RiEyeOffLine /> Ver Producción</>
                                        ) : (
                                            <><RiEyeLine /> Ver Fiscalizadas ({eventosFiscalizados.length})</>
                                        )}
                                    </button>
                                    <button type="button" className={styles.btnSecondary} onClick={exportarExcel}>
                                        <RiFileExcel2Fill /> Descargar Excel
                                    </button>
                                </div>
                            </div>

                            {mostrarGrafico ? (
                                <div style={{ width: '100%', height: 400, padding: '20px' }}>
                                    <ResponsiveContainer>
                                        <ComposedChart
                                            data={datosAnualesScaled}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                                            <YAxis
                                                yAxisId="left"
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v) => v.toLocaleString('es-AR')}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                                }}
                                                formatter={(value, name, props) => {
                                                    const data = props?.payload ?? {};
                                                    const realPromedio = data.promedio ?? null;
                                                    if (name === 'Total mensual') {
                                                        return `${Number(value).toLocaleString('es-AR')} L`;
                                                    }
                                                    if (name === 'Promedio individual') {
                                                        return realPromedio !== null
                                                            ? `${realPromedio} L/vaca`
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
                                                dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                                name="Promedio individual"
                                                isFront
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : mostrarFiscalizadas ? (
                                eventosFiscalizados.length > 0 ? (
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.modernTable}>
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
                                                        <td style={{ fontWeight: 600 }}>{ev.RP}</td>
                                                        <td style={{ color: '#6b7280' }}>{ev.ERP || '-'}</td>
                                                        <td>{ev.fecha}</td>
                                                        <td style={{ color: '#059669', fontWeight: 500 }}>{ev.detalle}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className={styles.emptyState} style={{ margin: 24, border: 'none', boxShadow: 'none' }}>
                                        <div className={styles.emoji}>📋</div>
                                        <h2>No se encontraron animales fiscalizados</h2>
                                        <p>No hay registros de enfermas o fiscalizadas para este mes.</p>
                                    </div>
                                )
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <table className={styles.modernTable}>
                                        <thead>
                                            <tr>
                                                <th>RP</th>
                                                <th>eRP</th>
                                                <th>Fecha</th>
                                                <th className={styles.sortableTh} onClick={handleSortLitros}>
                                                    <span className={styles.thContent}>
                                                        Litros
                                                        <SortIcon size={14} className={styles.sortIcon} />
                                                    </span>
                                                </th>
                                                <th>Rendimiento</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {eventosOrdenados.map((ev) => (
                                                <tr key={ev.id}>
                                                    <td style={{ fontWeight: 600 }}>{ev.RP}</td>
                                                    <td style={{ color: '#6b7280' }}>{ev.ERP || '-'}</td>
                                                    <td>{ev.fecha}</td>
                                                    <td>
                                                        {ev.litros !== null ? (
                                                            <span className={styles.litrosBadge}>
                                                                🥛 {ev.litros} L
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#9ca3af' }}>{ev.detalle}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className={styles.btnSecondary}
                                                            style={{ height: 32, padding: '0 12px', fontSize: '0.85rem' }}
                                                            onClick={() => abrirCurva(ev.animalId)}
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

            <Modal show={showCurvaModal} onHide={cerrarCurva} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Curva de Producción del Animal</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {animalSeleccionado && (
                        <AnimalCurvaCompleto animalId={animalSeleccionado} />
                    )}
                </Modal.Body>
            </Modal>
        </Layout>
    );
};

export default ProductividadMensualDirsa;
