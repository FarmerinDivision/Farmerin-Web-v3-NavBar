import React, { useEffect, useState, useContext } from "react";
import { FirebaseContext } from "../firebase2";
import { Form } from "react-bootstrap";
import styles from "../styles/Dirsa.module.scss";
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

const AnimalCurvaCompleto = ({ animalId }) => {

    const { firebase } = useContext(FirebaseContext);

    const anioActual = new Date().getFullYear();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual);
    const [aniosDisponibles, setAniosDisponibles] = useState([]);

    // Extrae litros desde "16.2 lts."
    const extraerLitros = (detalle) => {
        if (!detalle) return null;
        const match = detalle.match(/\d+(\.\d+)?/);
        return match ? parseFloat(match[0]) : null;
    };

    useEffect(() => {

        const obtenerEventos = async () => {

            if (!animalId) return;

            setLoading(true);

            try {

                const eventosRef = firebase.db
                    .collection("animal")
                    .doc(animalId)
                    .collection("eventos");

                const snapshot = await eventosRef.get();

                let eventos = [];
                let anios = new Set();

                snapshot.forEach(doc => {

                    const ev = doc.data();
                    if (!ev) return;

                    if (ev.tipo !== "Control Lechero mediante planilla Dirsa") return;

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
                console.error("Error cargando curva:", error);
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

            {/* Selector de año */}
            {aniosDisponibles.length > 0 && (
                <Form.Select
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
                </Form.Select>
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

export default AnimalCurvaCompleto;