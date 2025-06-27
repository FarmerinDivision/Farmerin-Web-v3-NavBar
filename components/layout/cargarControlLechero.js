export async function subirControlLechero(data, tamboSel, setErrores, setActualizados, setExito, firebase, usuarios) {
    console.log("📌 Iniciando carga de Control Lechero...");
    console.log("👤 Usuario actual:", usuarios);

    if (!usuarios) {
        console.error("❌ ERROR: El objeto usuario es undefined o null.");
        setErrores(prev => [...prev, "Error: Usuario no autenticado"]);
        return;
    }

    if (!usuarios.displayName) {
        console.error("❌ ERROR: El usuario no tiene displayName. Datos del usuario:", usuarios);
        setErrores(prev => [...prev, "Error: Usuario no autenticado"]);
        return;
    }

    const datosLimpios = data.slice(1); // Ignora encabezado

    for (const item of datosLimpios) {
        console.log(`🛠️ Datos crudos recibidos → RP: "${item["RP"]}", Le.UC: "${item["Le.UC"]}"`);

        const rp = item["RP"] ? item["RP"].toString().replace(/\s+/g, "").trim().normalize("NFKC") : null;

        const litrosStrOriginal = item["Le.UC"];
        let litrosStr = litrosStrOriginal ? litrosStrOriginal.toString().trim() : "";

        // ⚙️ Conversión robusta coma → punto o fallback a división si vino sin coma
        let litros = null;
        const valoresEspeciales = ["enferma", "fiscalizada"];
        const esValorEspecial = valoresEspeciales.includes(litrosStr.toLowerCase());

        if (!esValorEspecial) {
            if (litrosStr.includes(",") && !litrosStr.includes(".")) {
                // Ej: "37,4" → "37.4"
                litros = parseFloat(litrosStr.replace(",", "."));
            } else if (!isNaN(Number(litrosStr))) {
                // Ej: vino como 374 en vez de 37.4
                litros = parseFloat(litrosStr) / 10;
            }
        }

        if (isNaN(litros) && !esValorEspecial) {
            litros = null;
        }

        // Log detallado para verificar
        console.log(`🔍 Conversión → Original: "${litrosStrOriginal}", Normalizado: "${litrosStr}", Convertido: ${litros}`);

        // Detalle
        let detalleEvento = "";
        if (!litrosStr) {
            detalleEvento = "No se actualizó el control, la casilla estaba vacía";
        } else if (esValorEspecial) {
            detalleEvento = litrosStr.toLowerCase(); // "enferma" o "fiscalizada"
        } else {
            detalleEvento = `${litros.toFixed(1)} lts.`; // valor convertido con 1 decimal
        }

        console.log(`📊 Datos procesados → RP: "${rp}", Le.UC convertido: ${litros}, Detalle: "${detalleEvento}"`);

        if (!rp) {
            console.warn(`❌ Datos inválidos en RP: ${item["RP"]}`);
            setErrores(prev => [...prev, `Datos inválidos en RP: ${item["RP"]}`]);
            continue;
        }

        const valoresInvalidos = ["0", "0.0", "0,0", "0,00"];
        if ((litros === 0 || valoresInvalidos.includes(litrosStr)) && !esValorEspecial) {
            console.log(`⏭️ RP '${rp}' no se actualiza porque el valor es inválido: "${litrosStr}"`);
            continue;
        }

        try {
            console.log(`🔍 Buscando el RP: '${rp}' en el tambo ID: '${tamboSel.nombre}'`);

            const snapshot = await firebase.db.collection('animal')
                .where('idtambo', '==', tamboSel.id)
                .where('rp', '==', rp)
                .get();

            if (!snapshot.empty) {
                console.log(`✅ RP '${rp}' encontrado (${snapshot.size} coincidencias).`);

                snapshot.forEach(async (doc) => {
                    await firebase.db.collection('animal').doc(doc.id).collection('eventos').add({
                        fecha: item["fecha"]
                            ? firebase.firestore.Timestamp.fromDate(new Date(item["fecha"]))
                            : firebase.nowTimeStamp(),
                        tipo: 'Control Lechero mediante planilla Dirsa',
                        detalle: detalleEvento,
                        usuario: `${usuarios.displayName} - Dirsa`
                    });

                    console.log(`✅ Evento registrado para RP '${rp}' con detalle: ${detalleEvento}`);

                    if (litros !== null && !esValorEspecial) {
                        console.log(`🔄 Actualizando 'uc' con: ${litros}`);
                        await firebase.db.collection('animal').doc(doc.id).update({ uc: litros });
                    } else {
                        console.log(`⚠️ No se actualizó 'uc' para RP '${rp}' porque el valor es especial o inválido (Texto: '${litrosStr}')`);
                    }

                    setActualizados(prev => [...prev, `RP ${rp} - ${detalleEvento}`]);
                    setExito(true);
                });
            } else {
                console.warn(`⚠️ RP '${rp}' no registrado.`);
                setErrores(prev => [...prev, `RP ${rp} no registrado.`]);
            }
        } catch (error) {
            console.error(`🛑 Error al procesar RP '${rp}':`, error);
            setErrores(prev => [...prev, `Error en RP ${rp}: ${error.message}`]);
        }
    }

    console.log("✅ Finalizado el proceso de Control Lechero.");
}
