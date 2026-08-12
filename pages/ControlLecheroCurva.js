import React, { useEffect, useState, useContext } from "react";
import { FirebaseContext } from "../firebase2";
import { Form } from "react-bootstrap";
import styles from "../styles/Dirsa.module.scss";
import { Button } from "react-bootstrap";
import differenceInDays from "date-fns/differenceInDays";
import FichaAnimal from "../components/layout/fichaAnimal";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer
} from "recharts";

// 🔥 FIX IMPORT RECHARTS
import * as Recharts from "recharts";

const ControlLecheroCurva = ({ animalId }) => {

    const { firebase } = useContext(FirebaseContext);

    const anioActual = new Date().getFullYear();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual);
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [animalGeneralData, setAnimalGeneralData] = useState(null);
    const [showFicha, setShowFicha] = useState(false);

    // Misma lógica que usa ControlLecheroMensual.js para extraer litros desde ev.detalle
    const extraerLitros = (detalle) => {
        if (!detalle) return null;
        const detalleLower = detalle.toLowerCase();
        if (
            detalleLower.includes('no se actualizó') ||
            detalleLower.includes('casilla estaba vacía')
        ) {
            return null;
        }
        const match = detalle.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
    };

    useEffect(() => {

        const obtenerEventos = async () => {

            if (!animalId) return;

            setLoading(true);

            try {
                // Cargar datos generales del animal (igual que AnimalCurvaProduccion.js)
                const animalDoc = await firebase.db.collection("animal").doc(animalId).get();
                if (animalDoc.exists) {
                    const animalData = animalDoc.data();
                    let diasLact = 0;
                    try {
                        const fparto = animalData.fparto;
                        if (fparto) {
                            const dateParto = fparto.toDate ? fparto.toDate() : new Date(fparto);
                            diasLact = differenceInDays(Date.now(), dateParto);
                        }
                    } catch (e) {
                        diasLact = 0;
                    }

                    setAnimalGeneralData({
                        id: animalDoc.id,
                        diasLact,
                        ...animalData
                    });
                }

                // Consultar eventos tipo "Control Lechero" — misma fuente que ControlLecheroMensual.js
                const eventosRef = firebase.db
                    .collection("animal")
                    .doc(animalId)
                    .collection("eventos");

                const snapshot = await eventosRef
                    .where('tipo', '==', 'Control Lechero')
                    .get();

                let eventos = [];
                let anios = new Set();

                snapshot.forEach(doc => {

                    const ev = doc.data();
                    if (!ev) return;

                    // Usar exactamente la misma lógica de extracción de litros que ControlLecheroMensual.js
                    const litros = extraerLitros(ev.detalle);
                    if (litros === null) return;

                    if (!ev.fecha) return;

                    const fechaEvento = ev.fecha?.toDate
                        ? ev.fecha.toDate()
                        : new Date(ev.fecha);

                    if (isNaN(fechaEvento)) return;

                    const anioEvento = fechaEvento.getFullYear();

                    anios.add(anioEvento);

                    eventos.push({
                        fecha: fechaEvento,
                        anio: anioEvento,
                        litros
                    });

                });

                const listaAnios = Array.from(anios).sort((a, b) => b - a);
                setAniosDisponibles(listaAnios);

                const eventosAnio = eventos
                    .filter(ev => ev.anio === anioSeleccionado)
                    .sort((a, b) => a.fecha - b.fecha);

                const dataGrafico = eventosAnio.map(ev => ({
                    fecha: ev.fecha.toLocaleDateString(),
                    litros: ev.litros
                }));

                setData(dataGrafico);

            } catch (error) {
                console.error("Error cargando curva de control lechero:", error);
            } finally {
                setLoading(false);
            }

        };

        obtenerEventos();

    }, [animalId, firebase, anioSeleccionado]);

    if (loading) {
        return (
            <div className={styles["produccionmj-sinDatos"]}>
                Cargando curva de producción...
            </div>
        );
    }

    return (
        <div>
            {animalGeneralData && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                    <div>
                        <strong style={{ fontSize: '1.1rem', color: '#2774a8' }}>RP: {animalGeneralData.rp}</strong> | <strong style={{ color: '#555' }}>eRP: {animalGeneralData.erp}</strong> | <strong>Días Lact.: {animalGeneralData.diasLact}</strong>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        style={{ backgroundColor: '#2a4cb8', borderColor: '#2a4cb8', fontWeight: 'bold' }}
                        onClick={() => setShowFicha(true)}
                    >
                        Ver Ficha
                    </Button>
                </div>
            )}

            {/* Modal Ficha Animal */}
            {animalGeneralData && (
                <FichaAnimal
                    animal={animalGeneralData}
                    show={showFicha}
                    setShow={setShowFicha}
                />
            )}

            {/* Selector de año */}
            {aniosDisponibles.length > 0 && (
                <Form.Control
                    as="select"
                    className={styles["produccionmj-selectorAnio"]}
                    value={anioSeleccionado}
                    onChange={(e) =>
                        setAnioSeleccionado(parseInt(e.target.value))
                    }
                >
                    {aniosDisponibles.map(anio => (
                        <option key={anio} value={anio}>
                            {anio}
                        </option>
                    ))}
                </Form.Control>
            )}

            {/* Sin datos */}
            {data.length === 0 ? (
                <div className={styles["produccionmj-sinDatos"]}>
                    No hay controles lecheros en este año.
                </div>
            ) : (

                // 🔥 FIX ALTURA + RECHARTS
                <div style={{ width: "100%", height: 350 }}>

                    <ResponsiveContainer width="100%" height="100%">

                        <LineChart
                            data={data}
                            margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
                        >

                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                                dataKey="fecha"
                                label={{
                                    value: "Fecha del Control",
                                    position: "insideBottom",
                                    offset: -5
                                }}
                            />

                            <YAxis
                                label={{
                                    value: "Litros",
                                    angle: -90,
                                    position: "insideLeft"
                                }}
                            />

                            <Tooltip
                                formatter={(value) => `${value} litros`}
                            />

                            <Line
                                type="monotone"
                                dataKey="litros"
                                stroke="#4caf50"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                            />

                        </LineChart>

                    </ResponsiveContainer>

                </div>
            )}
        </div>
    );
};

export default ControlLecheroCurva;
