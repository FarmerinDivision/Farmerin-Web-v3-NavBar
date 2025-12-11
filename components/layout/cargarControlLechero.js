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

                // 🧪 Si tiene coma → normalizar
                if (litrosStr.includes(",")) {
                    litros = parseFloat(litrosStr.replace(",", "."));
                }

                // 🧪 Si tiene punto → normalizar directamente
                else if (litrosStr.includes(".")) {
                    litros = parseFloat(litrosStr);
                }

                // 🧪 Si es número entero de 3 dígitos → insertar coma antes del último dígito
                else if (/^\d{3}$/.test(litrosStr)) {
                    const convertido = litrosStr.slice(0, 2) + "." + litrosStr.slice(2);
                    litros = parseFloat(convertido);
                }

                // 🧪 Si es número entero de 2 dígitos → queda igual
                else if (/^\d{2}$/.test(litrosStr)) {
                    litros = parseFloat(litrosStr);
                }

                // 🧪 Si es un solo dígito → queda igual
                else if (/^\d$/.test(litrosStr)) {
                    litros = parseFloat(litrosStr);
                }

                // 🧪 Cualquier otro caso → intentar parsear normal
                else {
                    litros = parseFloat(litrosStr);
                }
            }

        }

        if (isNaN(litros) && !esValorEspecial) {
            litros = null;
        }

        // Log detallado para verificar
        console.log(`🔍 Conversión → Original: "${litrosStrOriginal}", Normalizado: "${litrosStr}", Convertido: ${litros}`);

        // Detalle
        // ✅ Detalle seguro
        let detalleEvento = "";

        if (!litrosStr || litrosStr.trim() === "") {
            detalleEvento = "No se actualizó el control, la casilla estaba vacía";
        }
        else if (esValorEspecial) {
            detalleEvento = litrosStr.toLowerCase(); // "enferma" o "fiscalizada"
        }
        else if (typeof litros === "number" && !isNaN(litros)) {
            detalleEvento = `${litros.toFixed(1)} lts.`;
        }
        else {
            detalleEvento = "Valor no numérico o inválido en la planilla";
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

            // 🧩 Normalizar RP antes de buscar
            let rpNormalizado = rp
                ? rp.toString().trim().replace(/\s+/g, "").toUpperCase()
                : null;

            if (!rpNormalizado) {
                console.warn(`⚠️ RP inválido o vacío: ${rp}`);
                setErrores(prev => [...prev, `RP inválido o vacío: ${rp}`]);
                return;
            }

            // 🔤 Detectar si contiene letras (E0013, A25, etc.)
            const contieneLetras = /[A-Z]/i.test(rpNormalizado);

            let snapshot;

            // 🧠 Si el RP contiene letras, buscar solo como string
            if (contieneLetras) {
                snapshot = await firebase.db.collection('animal')
                    .where('idtambo', '==', tamboSel.id)
                    .where('rp', '==', rpNormalizado)
                    .get();
            } else {
                // 🔢 Si es puramente numérico, probar varias variantes
                const rpNumero = parseInt(rpNormalizado, 10);
                const variantes = [rpNormalizado, rpNumero.toString(), rpNumero];

                // Intentar búsqueda con 'in'
                snapshot = await firebase.db.collection('animal')
                    .where('idtambo', '==', tamboSel.id)
                    .where('rp', 'in', variantes)
                    .get();

                // Si no encuentra y empieza con ceros, probar sin ellos
                if (snapshot.empty && rpNormalizado.startsWith("0")) {
                    const rpSinCeros = rpNormalizado.replace(/^0+/, "");
                    const rpNumSinCeros = parseInt(rpSinCeros, 10);
                    const variantesSinCero = [rpSinCeros, rpNumSinCeros.toString(), rpNumSinCeros];
                    snapshot = await firebase.db.collection('animal')
                        .where('idtambo', '==', tamboSel.id)
                        .where('rp', 'in', variantesSinCero)
                        .get();
                }
            }


            if (!snapshot.empty) {
                console.log(`✅ RP '${rp}' encontrado (${snapshot.size} coincidencias).`);

                snapshot.forEach(async (doc) => {
                    const fechaEvento = firebase.nowTimeStamp();  // 👈 fecha del momento de carga
                    // 🧩 Obtener datos del animal (para incluir ERP)
                    const animalData = doc.data();
                    const erp = animalData?.erp || null;

                    await firebase.db.collection('animal').doc(doc.id).collection('eventos').add({
                        fecha: fechaEvento,
                        tipo: 'Control Lechero mediante planilla Dirsa',
                        detalle: detalleEvento,
                        usuario: `${usuarios.displayName} - Dirsa`,
                        idtambo: tamboSel.id,
                        rp: rpNormalizado,
                        erp: erp
                    });


                    console.log(`✅ Evento registrado para RP '${rp}' con detalle: ${detalleEvento}`);

                    if (litros !== null && !esValorEspecial) {
                        console.log(`🔄 Actualizando 'uc' con: ${litros} y 'fuc' con la fecha del evento`);
                        await firebase.db.collection('animal').doc(doc.id).update({
                            uc: litros,
                            fuc: fechaEvento   // 👈 misma fecha que se usó en el evento
                        });
                    }

                    else {
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
