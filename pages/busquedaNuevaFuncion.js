import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { Form, Button, Table, Alert, Spinner, Container, Row, Col, Card } from 'react-bootstrap';
import { useRouter } from 'next/router';
import { RiSearchLine } from 'react-icons/ri';

const BusquedaNuevaFuncion = () => {
    const { firebase, usuario } = useContext(FirebaseContext);
    const [tambos, setTambos] = useState([]);
    const [idTamboSeleccionado, setIdTamboSeleccionado] = useState('');
    const [animales, setAnimales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const router = useRouter();

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
            <Container className="mt-4">
                <Card className="shadow-sm mb-4">
                    <Card.Body>
                        <h2 className="mb-4">Búsqueda de Animales por Fracción</h2>

                        <Form onSubmit={handleBuscar}>
                            <Row className="align-items-end">
                                <Col md={6}>
                                    <Form.Group controlId="selectTambo">
                                        <Form.Label>Selecciona un Tambo</Form.Label>
                                        <Form.Control
                                            as="select"
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
                                        </Form.Control>
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        block
                                        disabled={loading || !idTamboSeleccionado}
                                    >
                                        {loading ? <Spinner as="span" animation="border" size="sm" /> : <><RiSearchLine /> Buscar</>}
                                    </Button>
                                </Col>
                            </Row>
                        </Form>

                        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
                        {mensaje && <Alert variant="info" className="mt-3">{mensaje}</Alert>}
                    </Card.Body>
                </Card>

                {animales.length > 0 && (
                    <Card className="shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="mb-0">Resultados ({animales.length} animales)</h4>
                                <Button
                                    variant="warning"
                                    onClick={handleMigrarFechas}
                                    disabled={loading}
                                >
                                    Convertir Fracción a Timestamp
                                </Button>
                            </div>
                            <div className="table-responsive">
                                <Table striped hover bordered size="sm">
                                    <thead className="thead-dark">
                                        <tr>
                                            <th>RP</th>
                                            <th>Fracción</th>
                                            <th>eRP (RFID)</th>
                                            <th>Categoría</th>
                                            <th>Estado Prod.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {animales.map(animal => (
                                            <tr key={animal.id}>
                                                <td><strong>{animal.rp || '-'}</strong></td>
                                                <td className="text-primary font-weight-bold">{animal.fracion}</td>
                                                <td>{animal.erp || '-'}</td>
                                                <td>{animal.categoria || '-'}</td>
                                                <td>{animal.estpro || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                )}
            </Container>
        </Layout>
    );
};

export default BusquedaNuevaFuncion;
