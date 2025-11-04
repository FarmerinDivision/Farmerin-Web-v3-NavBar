import React, { useState, useRef, useContext } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/layout';
import { Button, Row, Col, Image, Spinner, Container, Card, Alert } from 'react-bootstrap';
import { procesarEventosTambo } from '../components/layout/procesarEventosTambos';
import { FirebaseContext } from '../firebase2';
import ResultadosCargas from '../components/layout/ResultadosCargas';
import procesarParto from '../components/layout/registrarParto';
import { subirControlLechero } from '../components/layout/cargarControlLechero';
import Papa from 'papaparse';
import styles from '../styles/Dirsa.module.scss'

const Dirsa = () => {
    const { firebase, usuario, tamboSel } = useContext(FirebaseContext);

    const [archivoEvento, setArchivoEvento] = useState(null);
    const [archivoLechero, setArchivoLechero] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [datosPreview, setDatosPreview] = useState([]);
    const [actualizados, setActualizados] = useState([]);
    const [errores, setErrores] = useState([]);

    const inputFileRefEvento = useRef(null);
    const inputFileRefLechero = useRef(null);

    const [total, setTotal] = useState(0);
    const [procesados, setProcesados] = useState(0);

    const limpiarRP = (rp) => rp?.toString().trim().toUpperCase() || "";


    // ✔️ Versión simplificada y segura para CSVs
    const convertirFechaCSV = (valor) => {
        if (!valor || typeof valor !== 'string') return null;
        const partes = valor.trim().split(/[\/\-]/);
        if (partes.length !== 3) return null;

        let [d, m, y] = partes.map(p => parseInt(p, 10));
        if (y < 100) y += 2000;

        if (d > 31 || m > 12 || d < 1 || m < 1) return null;

        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    };


    ///// EVENTOS 
    const convertirFechaSoloDDMMYYYY = (valor) => {
        if (!valor) {
            console.warn("⛔ Fecha vacía o indefinida");
            return null;
        }

        // ✅ Si es tipo Date
        if (Object.prototype.toString.call(valor) === "[object Date]") {
            const dia = valor.getDate();
            const mes = valor.getMonth() + 1;
            const año = valor.getFullYear();
            const resultado = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${año}`;
            console.log(`📅 [Date] Original: ${valor.toString()} → ${resultado}`);
            return resultado;
        }

        // ✅ Si es número (serial de Excel)
        if (typeof valor === "number") {
            const fechaBase = new Date(1899, 11, 30);
            const fecha = new Date(fechaBase.getTime() + valor * 86400000);
            const dia = fecha.getDate();
            const mes = fecha.getMonth() + 1;
            const año = fecha.getFullYear();
            const resultado = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${año}`;
            console.log(`🔢 [Serial Excel] Original: ${valor} → ${resultado}`);
            return resultado;
        }

        // ✅ Si es string tipo D/M/YYYY
        if (typeof valor === "string") {
            const partes = valor.trim().split(/[\/\-]/);
            if (partes.length === 3) {
                let [d, m, y] = partes.map(p => parseInt(p, 10));
                if (y < 100) y += 2000;

                if (d > 31 || m > 12 || d < 1 || m < 1) {
                    console.warn(`⚠️ Fecha inválida por rango: ${valor}`);
                    return null;
                }

                const fecha = new Date(y, m - 1, d);
                if (
                    fecha.getFullYear() !== y ||
                    fecha.getMonth() !== m - 1 ||
                    fecha.getDate() !== d
                ) {
                    console.warn(`⚠️ Fecha inválida al validar existencia real: ${valor}`);
                    return null;
                }

                const resultado = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                console.log(`📝 [String] Original: ${valor} → ${resultado}`);
                return resultado;
            }
        }

        console.warn(`❌ Tipo de fecha no reconocido: ${valor}`);
        return null;
    };


    const handleFileChangeEventos = (event) => {
        const file = event.target.files[0];
        if (file) setArchivoEvento(file);
    };

    const handleFileChangeLechero = (event) => {
        const file = event.target.files[0];
        if (file) setArchivoLechero(file);
    };

    const handleUploadEventos = async () => {
        if (!archivoEvento) return;

        setIsLoading(true);
        setActualizados([]);
        setErrores([]);
        setProcesados(0);
        setTotal(0);

        const extension = archivoEvento.name.split('.').pop().toLowerCase();

        if (extension === 'csv') {
            // 📥 Procesar CSV con PapaParse
            Papa.parse(archivoEvento, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    try {
                        // Mapear y limpiar filas
                        const data = results.data
                            .map(row => {
                                const obj = {};
                                for (const key in row) {
                                    const valor = row[key];
                                    if (key.toUpperCase().includes("FECHA")) {
                                        obj[key] = convertirFechaCSV(valor); // función que parsea fechas en formato esperado
                                    } else {
                                        obj[key] = typeof valor === 'string' ? valor.trim() : valor;
                                    }
                                }
                                if (obj["RP"]) obj["RP"] = limpiarRP(obj["RP"]); // limpieza de RP
                                return obj;
                            })
                            // Filtrar solo registros válidos
                            .filter(item => item.RP && (item["CODIGO DE EVENTO (*)"] || item["D.Ev"]));

                        if (data.length === 0) {
                            setErrores(["No hay datos válidos en la planilla."]);
                            setIsLoading(false);
                            return;
                        }

                        setDatosPreview(data.slice(0, 5));
                        setTotal(data.length);

                        if (!tamboSel || !tamboSel.id) {
                            setErrores(["Debes seleccionar un tambo antes de cargar los datos."]);
                            setIsLoading(false);
                            return;
                        }

                        // Separar partos y otros eventos
                        const eventosParto = data.filter(evento => {
                            const cod = (evento["CODIGO DE EVENTO (*)"] || evento["D.Ev"] || "").toString().toUpperCase().trim();
                            return cod === "PA" || cod === "PARTO";
                        });

                        const otrosEventos = data.filter(evento => {
                            const cod = (evento["CODIGO DE EVENTO (*)"] || evento["D.Ev"] || "").toString().toUpperCase().trim();
                            return cod !== "PA" && cod !== "PARTO";
                        });

                        // Procesar partos en paralelo con Promise.allSettled
                        const resultadosPartos = await Promise.allSettled(
                            eventosParto.map(evento =>
                                procesarParto(evento, tamboSel, firebase, usuario, setErrores)
                                    .then(() => setActualizados(prev => [...prev, `✅ Parto registrado para RP ${evento.RP}`]))
                                    .catch(error => setErrores(prev => [...prev, `❌ Error registrando parto para RP ${evento.RP}: ${error.message}`]))
                                    .finally(() => setProcesados(prev => prev + 1))
                            )
                        );

                        // Procesar otros eventos en paralelo
                        const resultadosOtros = await Promise.allSettled(
                            otrosEventos.map(evento =>
                                procesarEventosTambo([evento], tamboSel, setErrores, setActualizados, () => { }, firebase, usuario)
                                    .then(() => setActualizados(prev => [...prev, `✅ RP ${evento.RP} actualizado`]))
                                    .catch(error => setErrores(prev => [...prev, `❌ Error en RP ${evento.RP}: ${error.message}`]))
                                    .finally(() => setProcesados(prev => prev + 1))
                            )
                        );

                    } catch (error) {
                        console.error(error);
                        setErrores(["❌ Error al procesar el archivo CSV."]);
                    } finally {
                        setIsLoading(false);
                    }
                }
            });

            return; // No seguir al bloque XLSX si es CSV
        }

        // 📄 Si NO es CSV, sigue el flujo para XLSX con FileReader
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });

                // Suponiendo que querés la primera hoja
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // Procesar jsonData igual que CSV
                const dataProcesada = jsonData
                    .map(row => {
                        const obj = {};
                        for (const key in row) {
                            const valor = row[key];
                            if (key.toUpperCase().includes("FECHA")) {
                                obj[key] = convertirFechaSoloDDMMYYYY(valor);
                            } else {
                                obj[key] = typeof valor === 'string' ? valor.trim() : valor;
                            }
                        }
                        if (obj["RP"]) obj["RP"] = limpiarRP(obj["RP"]);
                        return obj;
                    })
                    .filter(item => item.RP && (item["CODIGO DE EVENTO (*)"] || item["D.Ev"]));

                if (dataProcesada.length === 0) {
                    setErrores(["No hay datos válidos en la planilla."]);
                    setIsLoading(false);
                    return;
                }

                setDatosPreview(dataProcesada.slice(0, 5));
                setTotal(dataProcesada.length);

                if (!tamboSel || !tamboSel.id) {
                    setErrores(["Debes seleccionar un tambo antes de cargar los datos."]);
                    setIsLoading(false);
                    return;
                }

                const eventosParto = dataProcesada.filter(evento => {
                    const cod = (evento["CODIGO DE EVENTO (*)"] || evento["D.Ev"] || "").toString().toUpperCase().trim();
                    return cod === "PA" || cod === "PARTO";
                });

                const otrosEventos = dataProcesada.filter(evento => {
                    const cod = (evento["CODIGO DE EVENTO (*)"] || evento["D.Ev"] || "").toString().toUpperCase().trim();
                    return cod !== "PA" && cod !== "PARTO";
                });

                // Procesar eventos igual que CSV
                await Promise.allSettled(
                    eventosParto.map(evento =>
                        procesarParto(evento, tamboSel, firebase, usuario, setErrores)
                            .then(() => setActualizados(prev => [...prev, `✅ Parto registrado para RP ${evento.RP}`]))
                            .catch(error => setErrores(prev => [...prev, `❌ Error registrando parto para RP ${evento.RP}: ${error.message}`]))
                            .finally(() => setProcesados(prev => prev + 1))
                    )
                );

                await Promise.allSettled(
                    otrosEventos.map(evento =>
                        procesarEventosTambo([evento], tamboSel, setErrores, setActualizados, () => { }, firebase, usuario)
                            .then(() => setActualizados(prev => [...prev, `✅ RP ${evento.RP} actualizado`]))
                            .catch(error => setErrores(prev => [...prev, `❌ Error en RP ${evento.RP}: ${error.message}`]))
                            .finally(() => setProcesados(prev => prev + 1))
                    )
                );

            } catch (error) {
                setErrores(["Error al procesar el archivo XLSX."]);
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsArrayBuffer(archivoEvento);
    };



    const handleUploadLechero = async () => {
        if (!archivoLechero) return;
        setIsLoading(true);
        setActualizados([]);
        setErrores([]);
        setProcesados(0);
        setTotal(0);

        const extension = archivoLechero.name.split('.').pop().toLowerCase();

        // 🧩 === ARCHIVOS CSV ===
        if (extension === 'csv') {
            Papa.parse(archivoLechero, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    try {
                        const encabezadoMap = {
                            "rp": "RP",
                            "animal": "RP",
                            "le.uc": "Le.UC",
                            "leche uc": "Le.UC",
                            "uc": "Le.UC",
                            "producción": "Le.UC"
                        };

                        const data = results.data.map(row => {
                            const obj = {};
                            for (const key in row) {
                                const normalizedKey = encabezadoMap[key.trim().toLowerCase()] || key.trim();
                                obj[normalizedKey] = row[key];
                            }
                            if (obj["RP"]) obj["RP"] = obj["RP"].toString().trim().toUpperCase();
                            return obj;
                        }).filter(item => item["RP"]);

                        if (data.length === 0) throw new Error("No hay datos válidos en el CSV.");
                        if (!tamboSel?.id) throw new Error("Debes seleccionar un tambo antes de actualizar el control lechero.");

                        setTotal(data.length);
                        await subirControlLechero(
                            data, tamboSel, setErrores, setActualizados,
                            () => setProcesados(prev => prev + 1),
                            firebase, usuario
                        );
                    } catch (error) {
                        console.error("Error procesando CSV:", error);
                        setErrores([error.message]);
                    } finally {
                        setIsLoading(false);
                    }
                }
            });
            return;
        }

        // 🧩 === ARCHIVOS EXCEL (.xlsx, .xls, .xlsm) ===
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);

                // 🧱 Verificar encabezado ZIP (PK)
                const isZip = data[0] === 0x50 && data[1] === 0x4B;
                let workbook;

                try {
                    if (isZip) {
                        // XLSX moderno
                        workbook = XLSX.read(data, { type: 'array' });
                    } else {
                        // XLS antiguo o binario
                        console.warn("⚠️ El archivo no parece ZIP, intentando leer como formato XLS (binario)...");
                        const binaryStr = new TextDecoder("latin1").decode(data);
                        workbook = XLSX.read(binaryStr, { type: 'binary' });
                    }
                } catch (err) {
                    console.error("❌ Error leyendo archivo Excel:", err);
                    throw new Error("El archivo Excel no es válido o está dañado.");
                }

                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const fullData = XLSX.utils.sheet_to_json(sheet, {
                    header: 1,
                    raw: false,
                    defval: ""
                });

                if (fullData.length < 2) throw new Error("El archivo no contiene suficientes filas para procesar.");

                // 🔑 Map de encabezados posibles
                const encabezadoMap = {
                    "rp": "RP",
                    "animal": "RP",
                    "le.uc": "Le.UC",
                    "leche uc": "Le.UC",
                    "uc": "Le.UC",
                    "producción": "Le.UC",
                    "produccion": "Le.UC",
                };

                // 📋 Detectar encabezados reales
                const encabezadosRaw = fullData[0].some(h => h?.toString().toLowerCase().includes("animal"))
                    ? fullData[0]
                    : fullData.find(row => row.some(celda => celda?.toString().toLowerCase().includes("rp"))) || fullData[0];

                const encabezados = encabezadosRaw.map(h => {
                    const key = h?.toString().trim().toLowerCase();
                    return encabezadoMap[key] || h?.toString().trim();
                });

                // 🧠 Parsear filas
                const datos = fullData.slice(1).map(row => {
                    const obj = {};
                    encabezados.forEach((encabezado, idx) => {
                        let val = row[idx];
                        if (encabezado === "Le.UC" && typeof val === "string") {
                            val = val.replace(".", ",");
                        }
                        obj[encabezado] = val;
                    });
                    return obj;
                });

                // 🚿 Limpiar y filtrar
                const datosLimpios = datos
                    .map(item => {
                        const nuevo = { ...item };
                        if (nuevo["RP"]) nuevo["RP"] = nuevo["RP"].toString().trim().replace(/\s+/g, "").toUpperCase();
                        return nuevo;
                    })
                    .filter(item => item["RP"]);

                if (datosLimpios.length === 0)
                    throw new Error("No hay datos válidos en el archivo de control lechero.");

                if (!tamboSel?.id)
                    throw new Error("Debes seleccionar un tambo antes de actualizar el control lechero.");

                setTotal(datosLimpios.length);
                await subirControlLechero(
                    datosLimpios, tamboSel, setErrores, setActualizados,
                    () => setProcesados(prev => prev + 1),
                    firebase, usuario
                );

            } catch (error) {
                console.error("Error procesando archivo Excel:", error);
                setErrores([`Error: ${error.message}`]);
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsArrayBuffer(archivoLechero);
    };


    return (
        <Layout titulo="Dirsa">
            <Container className={styles.sectionContainer}>
                <Row className="align-items-center text-center mb-4">

                    {/* 📥 Cargar Eventos */}
                    <Col md={4} className="mb-3 mb-md-0">
                        <div className={styles.cardWrapper}>
                            <h5 className={styles.sectionTitle}>📥 Cargar Eventos</h5>

                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                ref={inputFileRefEvento}
                                style={{ display: 'none' }}
                                onChange={handleFileChangeEventos}
                            />

                            <Button
                                variant="outline-primary"
                                onClick={() => {
                                    if (inputFileRefEvento.current) inputFileRefEvento.current.value = null;
                                    inputFileRefEvento.current?.click();
                                }}
                                className="mb-2 w-100"
                            >
                                Seleccionar archivo
                            </Button>

                            {archivoEvento && (
                                <div className={styles.fileInfo}>
                                    <span className={styles.fileName} title={archivoEvento.name}>📄 {archivoEvento.name}</span>
                                    <Button variant="outline-danger" size="sm" onClick={() => setArchivoEvento(null)}>✖</Button>
                                </div>
                            )}

                            <Button
                                variant="success"
                                onClick={handleUploadEventos}
                                disabled={!archivoEvento}
                                className="w-100"
                            >
                                Actualizar Eventos
                            </Button>
                        </div>
                    </Col>

                    {/* 🧀 Logo */}
                    <Col md={4} className={styles.logoContainer}>
                        <Image src="/dirsaNEW.png" width={350} className={styles.logoImage} />
                    </Col>

                    {/* 🥛 Cargar Control Lechero */}
                    <Col md={4} className="mb-3 mb-md-0">
                        <div className={styles.cardWrapper}>
                            <h5 className={styles.sectionTitle}>🥛 Cargar Control Lechero</h5>

                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                ref={inputFileRefLechero}
                                style={{ display: 'none' }}
                                onChange={handleFileChangeLechero}
                            />

                            <Button
                                variant="outline-primary"
                                onClick={() => {
                                    if (inputFileRefLechero.current) inputFileRefLechero.current.value = null;
                                    inputFileRefLechero.current?.click();
                                }}
                                className="mb-2 w-100"
                            >
                                Seleccionar archivo
                            </Button>

                            {archivoLechero && (
                                <div className={styles.fileInfo}>
                                    <span className={styles.fileName} title={archivoLechero.name}>📄 {archivoLechero.name}</span>
                                    <Button variant="outline-danger" size="sm" onClick={() => setArchivoLechero(null)}>✖</Button>
                                </div>
                            )}

                            <Button
                                variant="success"
                                onClick={handleUploadLechero}
                                disabled={!archivoLechero}
                                className="w-100"
                            >
                                Actualizar Control Lechero
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Resultados de Carga */}
                <ResultadosCargas
                    titulo="📝 Resultados de la Carga"
                    actualizados={actualizados}
                    errores={errores}
                    loading={isLoading}
                    total={total}
                    procesados={procesados}
                />
            </Container>
        </Layout>
    );

};

export default Dirsa;
