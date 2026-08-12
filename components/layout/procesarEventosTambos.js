import registrarParto from "./registrarParto";

export async function procesarEventosTambo(data, tamboSel, setErrores, setActualizados, setExito, firebase, usuario, categoria) {
    console.log("📌 Iniciando procesamiento de eventos...");
    console.log("👤 Usuario actual:", usuario);

    if (!usuario || !usuario.displayName) {
        console.error("❌ ERROR: El usuario es undefined o no tiene displayName.");
        setErrores(prev => [...prev, "Error: Usuario no autenticado"]);
        return;
    }

    const limpiarTexto = (valor) => (valor && typeof valor === 'string') ? valor.trim() : "";

    for (const item of data) {
        const rp = item["RP"] ? limpiarTexto(String(item["RP"])).toUpperCase() : null;
        const codigoEventoRaw = item["CODIGO DE EVENTO (*)"] || item["D.Ev"];

        // Convertir SIEMPRE a string
        let codigoEvento = codigoEventoRaw !== undefined && codigoEventoRaw !== null
            ? limpiarTexto(String(codigoEventoRaw)).toUpperCase()
            : null;


        // Normalizar evento: soporta texto o número
        if (codigoEvento) {
            const valor = codigoEvento.toUpperCase();

            if (valor.includes("TACTO")) codigoEvento = "P1";
            else if (valor.includes("CELO")) codigoEvento = "CE";
            else if (valor.includes("SECADO") || valor === "3") codigoEvento = "3";
            else if (valor.includes("SERVICIO") || valor === "SE") codigoEvento = "SE";
            else if (valor.includes("ABORTO") || valor === "AB") codigoEvento = "AB";
            else if (valor.includes("ANULA") || valor === "7") codigoEvento = "7";
            else if (valor.includes("VACIA") || valor === "13") codigoEvento = "13";
            else if (valor.includes("MUERTE") || valor === "12") codigoEvento = "12";
            else if (valor.includes("TRANSFERENCIA") || valor === "11") codigoEvento = "11";
            else if (valor.includes("VENTA") || valor === "10") codigoEvento = "10";
            else if (valor.includes("RECHAZO") || (!isNaN(valor) && parseInt(valor) >= 41 && parseInt(valor) <= 48)) {
                codigoEvento = parseInt(valor).toString() || "41";
            }
            else if (valor.includes("TRATAMIENTO") || valor === "995") codigoEvento = "995";
            else if (valor.includes("COMENTARIO") || valor === "999") codigoEvento = "999";
        }


        const codigoNumerico = parseInt(codigoEvento, 10);
        if (!isNaN(codigoNumerico) && codigoNumerico >= 41 && codigoNumerico <= 48) {
            codigoEvento = codigoNumerico.toString();
        }

        const fechaEventoStrRaw = item["FECHA DE EVENTO (xx/xx/xxxx)"] || item["Fecha"];
        const fechaEventoStr = fechaEventoStrRaw ? limpiarTexto(fechaEventoStrRaw) : null;
        const observacion = item["OBSERV."] ? limpiarTexto(item["OBSERV."]) : "";

        if (!rp || !fechaEventoStr) {
            setErrores(prev => [...prev, `Datos inválidos en RP: ${rp}`]);
            continue;
        }

        if (!codigoEvento || codigoEvento.trim() === "") {
            continue;
        }

        let fechaEventoCadena = "";
        let fechaEventoTimeStamp = null;

        try {
            // Convertir fecha en string tipo "dd/mm/yyyy" a Timestamp
            const timestamp = firebase.fechaDesdeDDMMYYYY(fechaEventoStr);
            if (!timestamp) throw new Error("Fecha inválida");

            const [d, m, y] = fechaEventoStr.split(/[\/\-]/).map(p => parseInt(p, 10));
            fechaEventoCadena = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            fechaEventoTimeStamp = timestamp;
        } catch (error) {
            setErrores(prev => [...prev, `Error en fecha de RP ${rp}: ${fechaEventoStr}, ${error}`]);
            continue;
        }

        try {
            const snapshot = await firebase.db.collection('animal')
                .where('idtambo', '==', tamboSel.id)
                .where('rp', '==', rp)
                .get();

            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    let updateData = {};
                    let eventoTipo = codigoEvento;
                    let eventoDetalle = `Evento registrado el ${fechaEventoCadena}`;
                    const data = doc.data();

                    // VALIDACIÓN IDTAMBO: segunda verificación de seguridad antes de modificar el animal
                    if (String(data?.idtambo) !== String(tamboSel.id)) {
                        console.warn(`🚫 SEGURIDAD: RP '${rp}' pertenece al tambo '${data?.idtambo}', no al tambo '${tamboSel.id}'. Operación bloqueada.`);
                        setErrores(prev => [...prev, `⛔ RP ${rp} pertenece a otro tambo (${data?.idtambo}). No se registró el evento.`]);
                        continue; // NUEVO: no actualizar animal ni registrar evento, pasar al siguiente
                    }

                    const codNum = parseInt(codigoEvento, 10);

                    switch (codigoEvento) {
                        case "995":
                            eventoTipo = "Tratamiento";
                            eventoDetalle = observacion || "Sin observación";
                            updateData = { ultimaModificacion: fechaEventoCadena };
                            break;
                        case "999":
                            eventoTipo = "Comentario";
                            eventoDetalle = observacion;
                            updateData = { ultimaModificacion: fechaEventoCadena };
                            break;
                        case "TE":
                            eventoTipo = "Receptora";
                            eventoDetalle = "Evento de transferencia embrionaria";
                            updateData = { ultimaModificacion: fechaEventoCadena };
                            break;
                        case "P1":
                            updateData.estrep = "preñada";
                            eventoTipo = "Tacto";
                            eventoDetalle = "Se confirmó preñez desde planilla Dirsa";
                            break;
                        case "CE":
                            updateData.celo = true;
                            eventoTipo = "Celo";
                            eventoDetalle = "Registro de celo mediante Dirsa";
                            break;
                        case "13":
                            updateData.estrep = "vacia";
                            eventoTipo = "Vacia";
                            eventoDetalle = "Pase a vacía mediante Dirsa";
                            break;
                        case "7":
                            updateData.estrep = "vacia";
                            eventoTipo = "Anula Preñez";
                            eventoDetalle = "Se anuló preñez mediante planilla Dirsa";
                            break;
                        case "10":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Venta" };
                            eventoTipo = "Baja";
                            eventoDetalle = "Dado de baja (Venta) mediante planilla Dirsa";
                            break;
                        case "11":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Transferencia" };
                            eventoTipo = "Baja";
                            eventoDetalle = "Animal dado de baja (Transferencia) mediante planilla Dirsa";
                            break;
                        case "12":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Muerte" };
                            eventoTipo = "Baja";
                            eventoDetalle = "Animal dado de baja (Muerte) mediante planilla Dirsa";
                            break;
                        case "3":
                            updateData.estpro = "seca";
                            eventoTipo = "Secado";
                            eventoDetalle = "Se secó animal mediante planilla Dirsa";
                            break;
                        case "SE":
                            const isPregnant = data.estrep === "preñada";
                            const estadoRepro = isPregnant ? "preñada" : "vacia";
                            const nserviciosActualizado = (data.nservicio || 0) + 1;

                            updateData = {
                                nservicio: nserviciosActualizado,
                                celo: false,
                                estrep: estadoRepro,
                                fservicio: fechaEventoCadena
                            };

                            const hbaToro = item["HBA TORO"] ? item["HBA TORO"].trim() : "Desconocido";
                            const razaToro = item["RAZA TORO"] ? item["RAZA TORO"].trim() : "Desconocido";
                            const servicio = item["SERVICIO*****"] ? item["SERVICIO*****"].trim() : "Desconocido";

                            eventoTipo = "Servicio";
                            eventoDetalle = `${hbaToro} / ${razaToro} / ${servicio} - Realizado con planilla Dirsa`;
                            break;
                        case "6":
                            const nuevaLactancia = (data.lactancia || 0) + 1;
                            const nuevaCategoria = nuevaLactancia <= 1 ? "Vaca" : "Vaquillona";

                            updateData = {
                                lactancia: nuevaLactancia,
                                estpro: "En Ordeñe",
                                estrep: "vacia",
                                fparto: fechaEventoCadena,
                                fservicio: "",
                                categoria: nuevaCategoria,
                                nservicio: 0
                            };
                            eventoTipo = "Aborto Inicio Lactancia";
                            eventoDetalle = "Registro de aborto e inicio de lactancia mediante Dirsa";
                            break;
                        case "AB":
                            updateData = {
                                fparto: fechaEventoCadena,
                                fservicio: "",
                                estrep: "vacia",
                                nservicio: 0
                            };
                            eventoTipo = "Aborto";
                            eventoDetalle = "Registro de aborto mediante Dirsa";
                            break;
                        default:
                            if (!isNaN(codNum) && codNum >= 41 && codNum <= 48) {
                                eventoTipo = "Rechazo";
                                eventoDetalle = "Se realizó Rechazo mediante planilla Dirsa";
                                updateData = { ultimaModificacion: fechaEventoCadena };
                            } else {
                                setErrores(prev => [...prev, `⚠️ Código de evento desconocido: ${codigoEvento} para RP: ${rp}`]);
                                continue;
                            }
                            break;
                    }

                    if (Object.keys(updateData).length > 0) {
                        try {
                            await firebase.db.collection("animal").doc(doc.id).update(updateData);
                            setActualizados(prev => [...prev, `RP ${rp} actualizado.`]);
                        } catch (error) {
                            setErrores(prev => [...prev, `Error al actualizar RP ${rp}: ${error.message}`]);
                        }
                    }

                    try {
                        const nombreUsuario = usuario?.displayName || "Anónimo";
                        const eventoData = {
                            fecha: fechaEventoTimeStamp,
                            tipo: eventoTipo || "Sin tipo" - observacion || "Sin observacion",
                            detalle: eventoDetalle || "Sin detalle",
                            tambo: tamboSel.id,
                            usuario: `${nombreUsuario} - Dirsa`
                        };

                        const eventoRef = firebase.db
                            .collection("animal")
                            .doc(doc.id)
                            .collection("eventos")
                            .doc();

                        await eventoRef.set(eventoData);
                    } catch (error) {
                        setErrores(prev => [...prev, `Error al agregar evento en subcolección para RP ${rp}: ${error.message}`]);
                    }
                }
            } else {
                setErrores(prev => [...prev, `❌ No se encontró RP '${rp}' en la base de datos.`]);
            }
        } catch (error) {
            setErrores(prev => [...prev, `Error en RP ${rp}: ${error.message}`]);
        }
    }

    console.log("✅ Finalizado el procesamiento de eventos.");
}
