import React, { useState, useEffect, useContext } from "react";
import { FirebaseContext } from "../firebase2";
import Layout from "../components/layout/layout";
import styles from "../styles/Administrador.module.scss";

const ClimaProduccion = () => {

    const { firebase, usuario } = useContext(FirebaseContext);

    const [tambos, setTambos] = useState([]);
    const [idTamboSeleccionado, setIdTamboSeleccionado] = useState("");
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState("");

    // Cargar tambos del usuario
    useEffect(() => {

        if (!usuario) return;

        const unsubscribe = firebase.db
            .collection("tambo")
            .where("usuarios", "array-contains", usuario.uid)
            .orderBy("nombre", "asc")
            .onSnapshot(snapshot => {

                const lista = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setTambos(lista);

                if (lista.length === 1) {
                    setIdTamboSeleccionado(lista[0].id);
                }

            });

        return () => unsubscribe();

    }, [usuario, firebase]);



    // FUNCIÓN PRINCIPAL
    const completarClimaProduccion = async () => {

        if (!idTamboSeleccionado) {
            alert("Selecciona un tambo");
            return;
        }

        setLoading(true);
        setMensaje("");

        try {

            // Obtener tambo
            const tamboDoc = await firebase.db
                .collection("tambo")
                .doc(idTamboSeleccionado)
                .get();

            const tamboData = tamboDoc.data();

            const lat = tamboData.lat;
            const lng = tamboData.lng;

            if (!lat || !lng) {
                alert("El tambo no tiene latitud o longitud");
                return;
            }

            // Obtener producciones
            const produccionRef = firebase.db
                .collection("tambo")
                .doc(idTamboSeleccionado)
                .collection("produccion");

            const snapshot = await produccionRef.get();

            let actualizados = 0;
            let revisados = 0;

            for (const doc of snapshot.docs) {

                const data = doc.data();

                revisados++;

                // Saltar si ya tiene clima
                if (data.tempMax && data.tempMin && data.estadoDelClima) {
                    continue;
                }

                if (!data.fecha) continue;

                const fecha = data.fecha.toDate();
                const fechaISO = fecha.toISOString().split("T")[0];

                const url =
                    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${fechaISO}&end_date=${fechaISO}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&current_weather=true&timezone=America%2FArgentina%2FBuenos_Aires`;

                const response = await fetch(url);
                const clima = await response.json();

                if (!clima.daily) continue;

                const tempMax = clima.daily.temperature_2m_max[0];
                const tempMin = clima.daily.temperature_2m_min[0];
                const precipitacion = clima.daily.precipitation_sum[0];

                const tempActual = clima.current_weather
                    ? clima.current_weather.temperature
                    : null;

                let estado = "Despejado";

                if (precipitacion > 0) estado = "Lluvia";

                await doc.ref.update({

                    tempMax,
                    tempMin,
                    tempActual,

                    estadoDelClima: estado,

                    clima: {
                        fuente: "open-meteo",
                        precipitacionMM: precipitacion,
                        temperaturaActual: tempActual,
                        temperaturaMax: tempMax,
                        temperaturaMin: tempMin,
                        procesadoEn: new Date()
                    }

                });

                actualizados++;

            }

            setMensaje(`Eventos revisados: ${revisados} | Eventos actualizados: ${actualizados}`);

        } catch (error) {

            console.error("Error actualizando clima:", error);
            alert("Error procesando clima");

        } finally {

            setLoading(false);

        }

    };


    return (
        <Layout titulo="Clima en Producciones">

            <div className={styles.busquedaContainer}>

                <div className={styles.card}>
                    <h2 className={styles.title}>Completar clima en producciones</h2>

                    <label>Seleccionar tambo</label>

                    <select
                        value={idTamboSeleccionado}
                        onChange={(e) => setIdTamboSeleccionado(e.target.value)}
                    >

                        <option value="">-- Seleccionar --</option>

                        {tambos.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.nombre}
                            </option>
                        ))}

                    </select>

                    <button
                        className={styles.btnPrimary}
                        onClick={completarClimaProduccion}
                        disabled={loading}
                        style={{ marginTop: "20px" }}
                    >

                        {loading
                            ? "Procesando clima..."
                            : "Completar clima en producciones"}

                    </button>

                    {mensaje && (
                        <div className={styles.successMessage}>
                            {mensaje}
                        </div>
                    )}

                </div>

            </div>

        </Layout>
    );

};

export default ClimaProduccion;