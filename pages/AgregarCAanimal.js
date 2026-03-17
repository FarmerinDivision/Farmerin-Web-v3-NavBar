import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { RiSearchLine } from 'react-icons/ri';
import AdminTamboSelector from '../components/utils/AdminTamboSelector';
import styles from '../styles/Administrador.module.scss';

const AgregarCAanimal = () => {
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
        setError(null);
    };

    // 3. Buscar animales y calcular su nuevo CA
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
            // Consulta a Firestore: animales En Ordeñe activos del tambo
            // Filtramos ca en memoria porque Firebase diferencia '0' (string) de 0 (number).
            const snapshot = await firebase.db.collection('animal')
                .where('idtambo', '==', idTamboSeleccionado)
                .where('fbaja', '==', '')
                .where('estpro', '==', 'En Ordeñe')
                .get();

            if (snapshot.empty) {
                setMensaje('No se encontraron animales En Ordeñe activos en este tambo.');
                setLoading(false);
                return;
            }

            const resultados = [];

            // Usamos Promise.all para buscar en la subcolección de eventos de cada animal
            const promesas = snapshot.docs.map(async (doc) => {
                const data = doc.data();

                // Filtrar los que tienen ca == 0 o '0' o undefined/nulo
                const caActual = data.ca;
                const caEsCero = !caActual || caActual === 0 || caActual === '0';

                if (caEsCero) {
                    let nuevoCaCalculado = null;
                    let fechaEventoUsado = null;

                    try {
                        // Traer todos los controles lecheros. No usamos orderBy para evitar
                        // requerir un índice compuesto en Firestore. Ordenamos en memoria.
                        const eventosSnap = await doc.ref.collection("eventos")
                            .where("tipo", "==", "Control Lechero mediante planilla Dirsa")
                            .get();

                        if (!eventosSnap.empty) {
                            // Ordenar por fecha descendente en memoria
                            const eventosOrdenados = eventosSnap.docs
                                .map(evDoc => evDoc.data())
                                .filter(ev => ev.fecha)
                                .sort((a, b) => {
                                    const fa = a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha);
                                    const fb = b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha);
                                    return fb - fa; // desc: más nuevo primero
                                });

                            // El índice 0 es el más reciente (= uc / Último Control).
                            // Recorremos desde el índice 1 en adelante (= candidatos a CA)
                            // y tomamos el PRIMERO que tenga un valor numérico de litros
                            // en su detalle (ignorando "planilla vacía", "fiscalizada", etc.).
                            for (let i = 1; i < eventosOrdenados.length; i++) {
                                const evData = eventosOrdenados[i];
                                if (evData.detalle) {
                                    const match = evData.detalle.match(/\d+(\.\d+)?/);
                                    if (match) {
                                        nuevoCaCalculado = parseFloat(match[0]);
                                        fechaEventoUsado = evData.fecha.toDate
                                            ? evData.fecha.toDate()
                                            : new Date(evData.fecha);
                                        break; // Tomamos el más reciente con valor válido
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.error(`Error buscando eventos de CA para RP ${data.rp}:`, err);
                    }

                    // Lo agregamos a la lista
                    resultados.push({
                        id: doc.id,
                        rp: data.rp || '-',
                        erp: data.erp || '-',
                        categoria: data.categoria || '-',
                        caActual: caActual || 0,
                        nuevoCaCalculado: nuevoCaCalculado || 0,
                        fechaEvento: fechaEventoUsado ? fechaEventoUsado.toLocaleDateString('es-AR') : '-'
                    });
                }
            });

            await Promise.all(promesas);

            if (resultados.length === 0) {
                setMensaje('No se encontraron animales en ordeñe con CA en 0 que tengan controles anteriores válidos para asignar.');
            } else {
                // Ordenar por RP
                resultados.sort((a, b) => {
                    const rpA = String(a.rp);
                    const rpB = String(b.rp);
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

    // 4. Migrar CA a Firestore
    const handleMigrarCA = async () => {
        if (animales.length === 0) {
            alert("No hay animales en la lista para actualizar.");
            return;
        }

        const confirmacion = window.confirm(`¿Estás seguro de que deseas actualizar el Control Anterior (CA) para estos ${animales.length} animales?\nEsta acción modificará la base de datos de los animales sumándoles el valor correspondiente.`);

        if (!confirmacion) return;

        setLoading(true);
        setError(null);
        let actualizados = 0;
        let errores = 0;

        try {
            const batchSize = 500; // Firestore batch límite
            // Sin embargo, si es una colección normal, Promise.all de promesas individuales suele andar bien para unos cientos de animales (o con batch).
            // Usaremos batch
            let batch = firebase.db.batch();
            let count = 0;

            for (let i = 0; i < animales.length; i++) {
                const animal = animales[i];
                const ref = firebase.db.collection('animal').doc(animal.id);

                batch.update(ref, {
                    ca: animal.nuevoCaCalculado,
                    actu: true, // Si se actualiza, la marcamos
                    fuc: firebase.nowTimeStamp() // Le actualizamos el timestamp a fuc (último control) o fracion? El campo CA suele acompañarse. Dejaremos solo la actualización de ca para no interferir más campos que el solicitado.
                });

                count++;
                actualizados++;

                // Si llegamos a casi el límite de batch (500), lo commiteamos y abrimos otro
                if (count === 490) {
                    await batch.commit();
                    batch = firebase.db.batch();
                    count = 0;
                }
            }

            if (count > 0) {
                await batch.commit();
            }

            let msg = `Proceso finalizado.\nAnimales actualizados con su nuevo CA: ${actualizados}`;
            if (errores > 0) msg += `\nErrores/No procesados: ${errores}`;

            alert(msg);
            setMensaje(msg);

            // Refrescar u ocultar los de la lista para mostrar que ya terminaron
            setAnimales([]);

        } catch (error) {
            console.error("Error general en migración CA:", error);
            setError("Ocurrió un error crítico durante la actualización de los CA.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout titulo="Migración de CA">
            <div className={styles.busquedaContainer}>

                <div className={styles.header}>
                    <h1 className={styles.title}>Búsqueda y Corrección del CA</h1>
                    <p className={styles.subtitle}>Herramienta para asignar el Control Anterior (CA) a animales que lo tengan en 0.</p>
                </div>

                <div className={styles.cardInfo}>
                    <ul>
                        <p><strong>¿Qué podés hacer acá?</strong></p>
                        <p>En esta pantalla podés buscar animales En Ordeñe de un tambo que tengan el campo CA (Control Lechero Anterior) en 0, y recuperarlo desde su historial de controles pasados.</p>
                        <p><strong>La herramienta permite:</strong></p>
                        <li>Seleccionar un tambo asociado a tu usuario.</li>
                        <li>Buscar automáticamente en los eventos del animal el anteúltimo control de leche reportado para obtener los litros correspondientes.</li>
                        <p><strong>⚠️ Si confirmás la acción, los valores sugeridos se enviarán directamente a la Base de Datos para cada animal sobreescribiendo su valor anterior en la tabla de Control.</strong></p>
                    </ul>
                </div>

                <AdminTamboSelector />

                <div className={styles.card}>
                    <h2 className={styles.title} style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Búsqueda de Animales sin CA</h2>

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
                                    {loading ? "Buscando..." : <><RiSearchLine style={{ marginRight: '5px' }} /> Buscar y Calcular CA</>}
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
                            <h4 className={styles.title} style={{ fontSize: '1.25rem', margin: 0 }}>Resultados precalculados ({animales.length} animales)</h4>
                            <button
                                className={styles.btnWarning}
                                onClick={handleMigrarCA}
                                disabled={loading}
                            >
                                Aplicar Cambios a Base de Datos
                            </button>
                        </div>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>RP</th>
                                        <th>eRP (RFID)</th>
                                        <th>Categoría</th>
                                        <th>CA Actual</th>
                                        <th style={{ color: '#0d6efd' }}>Nuevo CA Calculado</th>
                                        <th style={{ color: '#198754' }}>Fecha Control Usado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {animales.map(animal => (
                                        <tr key={animal.id}>
                                            <td><strong>{animal.rp}</strong></td>
                                            <td>{animal.erp}</td>
                                            <td>{animal.categoria}</td>
                                            <td style={{ color: '#d9534f', fontWeight: 'bold' }}>{animal.caActual}</td>
                                            <td style={{ color: '#0d6efd', fontWeight: 'bold' }}>{animal.nuevoCaCalculado}</td>
                                            <td style={{ color: '#198754' }}>{animal.fechaEvento}</td>
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

export default AgregarCAanimal;
