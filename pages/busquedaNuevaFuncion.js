import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { RiSearchLine } from 'react-icons/ri';
import AdminTamboSelector from '../components/utils/AdminTamboSelector';
import styles from '../styles/Administrador.module.scss';
import { Card } from 'react-bootstrap';

const BusquedaNuevaFuncion = () => {
    const { firebase, usuario } = useContext(FirebaseContext);
    const [tambos, setTambos] = useState([]);
    const [idTamboSeleccionado, setIdTamboSeleccionado] = useState('');
    const [animales, setAnimales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mensaje, setMensaje] = useState('');

    // 1. Cargar tambos del usuario al iniciar
    useEffect(() => {
        if (!usuario) return;

        const handleSnapshotTambos = (snapshot) => {
            const listaTambos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTambos(listaTambos);

            // Si solo tiene un tambo, pre-seleccionarlo
            if (listaTambos.length === 1) {
                setIdTamboSeleccionado(listaTambos[0].id);
            }
        };

        const handleErrorTambos = (err) => {
            console.error("Error en snapshot de tambos:", err);
            setError("No se pudieron cargar los tambos.");
        };

        const unsubscribe = firebase.db.collection('tambo')
            .where('usuarios', 'array-contains', usuario.uid)
            .orderBy('nombre', 'asc')
            .onSnapshot(handleSnapshotTambos, handleErrorTambos);

        return () => unsubscribe();
    }, [usuario, firebase]);

    // 2. Manejar selección del tambo
    const handleChangeTambo = (e) => {
        setIdTamboSeleccionado(e.target.value);
        setAnimales([]); // Limpiar resultados anteriores al cambiar tambo
        setMensaje('');
    };

    // 3. Buscar animales
    const handleBuscar = async (e) => {
        e.preventDefault();

        if (!idTamboSeleccionado) {
            setError("Por favor, selecciona un tambo.");
            return;
        }

        setLoading(true);
        setError(null);
        setMensaje('');
        setAnimales([]);

        try {
            // Consulta a Firestore
            // Filtramos por idtambo y fbaja (animales activos)
            const snapshot = await firebase.db.collection('animal')
                .where('idtambo', '==', idTamboSeleccionado)
                .where('fbaja', '==', '') // Buena práctica: traer solo activos
                .get();

            if (snapshot.empty) {
                setMensaje('No se encontraron animales activos en este tambo.');
                setLoading(false);
                return;
            }

            // Procesar y filtrar en cliente por 'fracion'
            // Esto evita crear un índice compuesto específico para (idtambo + fbaja + fracion)
            const resultados = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                // Validar que fracion esté definido, sea string y no esté vacío
                if (typeof data.fracion === 'string' && data.fracion.trim().length > 0) {
                    resultados.push({
                        id: doc.id,
                        ...data
                    });
                }
            });

            if (resultados.length === 0) {
                setMensaje('Se encontraron animales en el tambo, pero ninguno tiene el campo "fracion" definido.');
            } else {
                // Ordenar por RP para mejor visualización
                resultados.sort((a, b) => {
                    const rpA = a.rp ? String(a.rp) : '';
                    const rpB = b.rp ? String(b.rp) : '';
                    return rpA.localeCompare(rpB, undefined, { numeric: true });
                });
                setAnimales(resultados);
            }

        } catch (err) {
            console.error("Error al buscar animales:", err);
            setError("Ocurrió un error al consultar los animales.");
        } finally {
            setLoading(false);
        }
    };

    // 4. Migrar fechas de string a Timestamp
    const handleMigrarFechas = async () => {
        // Filtrar candidatos:
        // - Deben estar "En Ordeñe"
        // - "fracion" debe ser string (doble chequeo, aunque la búsqueda ya lo filtró)
        const candidatos = animales.filter(a =>
            a.estpro === 'En Ordeñe' && typeof a.fracion === 'string'
        );

        if (candidatos.length === 0) {
            alert("No hay animales en esta lista que cumplan los requisitos para migrar (En Ordeñe y con fracción tipo string).");
            return;
        }

        const confirmacion = window.confirm(`¿Estás seguro de que deseas convertir la fecha de fracción a Timestamp para ${candidatos.length} animales?\nEsta acción modificará la base de datos.`);

        if (!confirmacion) return;

        setLoading(true);
        setError(null);
        let actualizados = 0;
        let errores = 0;

        try {
            const promesas = candidatos.map(async (animal) => {
                const fechaStr = animal.fracion.trim();
                console.log(`Fecha animal FB ${animal.id} (RP: ${animal.rp}) con fecha: ${fechaStr}`);
                let fechaDate = null;

                // Intentar parsear "YYYY-MM-DD"
                if (fechaStr.includes('-')) {
                    const partes = fechaStr.split('-'); // asume YYYY-MM-DD
                    if (partes.length === 3) {
                        // Mes en Date es 0-indexado
                        fechaDate = new Date(partes[0], partes[1] - 1, partes[2]);
                    }
                }
                // Intentar parsear "DD/MM/YYYY"
                else if (fechaStr.includes('/')) {
                    const partes = fechaStr.split('/');
                    if (partes.length === 3) {
                        // new Date(año, mes-1, dia)
                        fechaDate = new Date(partes[2], partes[1] - 1, partes[0]);
                    }
                }
                // Validar fecha válida
                if (fechaDate && !isNaN(fechaDate.getTime())) {
                    try {
                        const timestamp = firebase.fechaDesdeYYYYMMDD(fechaStr);
                        console.log(`Timestamp antes de actualizar para ${animal.id} (RP: ${animal.rp}): ${timestamp}`);
                        await firebase.db.collection('animal').doc(animal.id).update({
                            fracion: timestamp
                        });
                        console.log(`Animal ${animal.id} (RP: ${animal.rp}) actualizado con fecha: ${timestamp}`);
                        actualizados++;
                    } catch (e) {
                        console.error(`Error actualizando animal ${animal.id} (RP: ${animal.rp}):`, e);
                        errores++;
                    }
                } else {
                    console.log(`Formato de fecha no reconocido para animal ${animal.id} (RP: ${animal.rp}): ${fechaStr}`);
                    errores++;
                }
                console.log(`Procesado animal ACTUALIZADO ${animal.id} (RP: ${animal.rp}) con fecha: ${fechaStr}`);
                console.log(`Procesado animal NO ACTUALIZADO ${animal.id} (RP: ${animal.rp}) con fecha: ${fechaDate}`);
            });

            await Promise.all(promesas);

            let msg = `Proceso finalizado.\nAnimales actualizados: ${actualizados}`;
            if (errores > 0) msg += `\nErrores/No procesados: ${errores}`;

            alert(msg);
            setMensaje(msg);

            // Refrescar búsqueda automáticamente para reflejar cambios (los migrados desaparecerán de la lista por el filtro de tipo string)
            // Disparamos el evento submit sintéticamente o llamamos a handleBuscar si extraemos la lógica, 
            // pero lo más simple es limpiar la lista para obligar a buscar de nuevo y ver qué quedó.
            setAnimales([]);

        } catch (error) {
            console.error("Error general en migración:", error);
            setError("Ocurrió un error crítico durante la migración.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout titulo="Búsqueda por Tambo">
            <div className={styles.busquedaContainer}>

                <div className={styles.header}>
                    <h1 className={styles.title}>Búsqueda y Corrección de Fechas</h1>
                    <p className={styles.subtitle}>Herramienta para estandarizar fechas de fracción.</p>
                </div>

                <div className={styles.cardInfo}>
                    <ul>
                        <p><strong>¿Qué podés hacer acá?</strong></p>
                        <p>En esta pantalla podés buscar animales por tambo que tengan el campo “fracción” cargado como texto y corregir ese dato si es necesario.</p>
                        <p><strong>La herramienta permite:</strong></p>
                        <li>Seleccionar un tambo asociado a tu usuario.</li>
                        <li>Buscar animales activos que tengan el campo fracción definido como texto.</li>
                        <p><strong>Además, si los animales cumplen las condiciones necesarias, podés convertir la fracción a formato de fecha (Timestamp) para normalizar la información en la base de datos.</strong></p>
                        <p><strong>⚠️ La conversión modifica los datos y solo se aplica a animales En Ordeñe. Se recomienda revisar la lista antes de ejecutar el proceso.</strong></p>
                    </ul>
                </div>

                <AdminTamboSelector />

                <div className={styles.card}>
                    <h2 className={styles.title} style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Búsqueda de Animales por Fracción</h2>

                    <form onSubmit={handleBuscar} className={styles.formGroup}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <label htmlFor="selectTambo">Selecciona un Tambo</label>
                                <select
                                    id="selectTambo"
                                    value={idTamboSeleccionado}
                                    onChange={handleChangeTambo}
                                    disabled={loading}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {tambos.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <button
                                    className={styles.btnPrimary}
                                    type="submit"
                                    disabled={loading || !idTamboSeleccionado}
                                >
                                    {loading ? "Buscando..." : <><RiSearchLine style={{ marginRight: '5px' }} /> Buscar</>}
                                </button>
                            </div>
                        </div>
                    </form>

                    {error && <div className={styles.errorMessage}>{error}</div>}
                    {mensaje && <div className={styles.successMessage}>{mensaje}</div>}
                </div>

                {animales.length > 0 && (
                    <div className={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h4 className={styles.title} style={{ fontSize: '1.25rem', margin: 0 }}>Resultados ({animales.length} animales)</h4>
                            <button
                                className={styles.btnWarning}
                                onClick={handleMigrarFechas}
                                disabled={loading}
                            >
                                Convertir Fracción a Timestamp
                            </button>
                        </div>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>RP</th>
                                        <th>Fracción Actual</th>
                                        <th>eRP (RFID)</th>
                                        <th>Categoría</th>
                                        <th>Estado Prod.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {animales.map(animal => (
                                        <tr key={animal.id}>
                                            <td><strong>{animal.rp || '-'}</strong></td>
                                            <td style={{ color: '#4f46e5', fontWeight: 'bold' }}>{animal.fracion}</td>
                                            <td>{animal.erp || '-'}</td>
                                            <td>{animal.categoria || '-'}</td>
                                            <td>{animal.estpro || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default BusquedaNuevaFuncion;
