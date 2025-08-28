// ✅ Ahora acepta números y siempre devuelve string
const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return valor.toString().trim();
};

// Utilidad para acceder a campos de la planilla ignorando mayúsculas y espacios
const getValor = (obj, clave) => {
  const claves = Object.keys(obj);
  const claveEncontrada = claves.find(k => k.trim().toLowerCase() === clave.trim().toLowerCase());
  if (!claveEncontrada) {
    console.warn(`⚠️ Campo "${clave}" no encontrado en evento:`, obj);
  }
  return claveEncontrada ? obj[claveEncontrada] : null;
};

// Nueva utilidad: probar múltiples nombres de clave
const getValorMultiple = (obj, posiblesClaves) => {
  for (const clave of posiblesClaves) {
    const valor = getValor(obj, clave);
    if (valor !== null && valor !== undefined && valor !== "") {
      return valor;
    }
  }
  return null;
};

const procesarParto = async (evento, tamboSel, firebase, usuario) => {
  console.log("📥 Evento recibido:", evento);

  const rpMadre = limpiarTexto(getValorMultiple(evento, ["RP", "Rp"])).replace(/\s/g, "");
  if (!rpMadre) throw new Error("RP madre no encontrado o vacío");

  const fechaEventoStrRaw = getValorMultiple(evento, [
    "FECHA DE EVENTO (xx/xx/xxxx)",
    "Fecha",
    "FECHA"
  ]);
  const fechaEventoStr = limpiarTexto((fechaEventoStrRaw || "").toString().trim());

  if (!fechaEventoStr) throw new Error("Fecha de evento no encontrada");

  // ✅ Convertir a Timestamp como lo hacés en procesarEventosTambo.js
  const fechaEventoTimestamp = firebase.fechaDesdeDDMMYYYY(fechaEventoStr);
  if (!fechaEventoTimestamp) throw new Error(`Fecha inválida o mal formada: ${fechaEventoStr}`);

  const tipoParto = getValorMultiple(evento, ["TIPO DE PARTO", "Tipo de parto"]);
  const observ = getValorMultiple(evento, ["OBSERV.", "Observ"]);

  // 🔍 Buscar columnas de crías con más variantes
  const sexoCria = getValorMultiple(evento, [
    "SEXO CRIA", "Sexo Cria", "Seco Cria", "Sexo", "Sexo de Cría"
  ]);
  const rpCria = limpiarTexto(getValorMultiple(evento, [
    "RP CRIA", "Rp Cria", "RP_Cria", "RP CRIA (*)", "RP de Cria", "Cría RP"
  ]));
  const rpCria2 = limpiarTexto(getValorMultiple(evento, [
    "INSCRIBIR CRIA**", "RP CRIA 2", "Rp Cria 2", "RP_Cria2", "RP de Cria 2", "Cría RP 2"
  ]));

  const crias = [];

  try {
    console.log("🔍 Buscando madre con RP:", rpMadre);

    const madreQuery = await firebase.db.collection("animal")
      .where("idtambo", "==", tamboSel.id)
      .where("rp", "==", rpMadre)
      .get();

    if (madreQuery.empty) throw new Error(`Animal con RP ${rpMadre} no encontrado.`);

    const madreDoc = madreQuery.docs[0];
    const madreRef = firebase.db.collection("animal").doc(madreDoc.id);
    const madreData = madreDoc.data();

    console.log("👩‍🍼 Madre encontrada:", madreData);

    // ✅ Actualizar madre
    await madreRef.update({
      estpro: "En Ordeñe",
      estrep: "vacia",
      fparto: fechaEventoStr, // ⬅️ como string dd/mm/yyyy
      nservicios: 0,
      lactancia: (madreData.lactancia || 0) + 1,
      fservicio: ""
    });

    const registrarCria = async (rp, sexo) => {
      let rpLimpio = limpiarTexto(rp).replace(/\s/g, "");
      const sexoNorm = (sexo || "").toString().trim().toLowerCase();

      const esMuerta = sexoNorm.includes("muert");
      const esMacho = sexoNorm.includes("macho");

      // 👀 Si es macho y no tiene RP → asignar "sin rp"
      if (!rpLimpio && esMacho) {
        rpLimpio = "sin rp";
        console.warn("⚠️ Cría macho sin RP → asignado 'sin rp'");
      }

      // 🚫 Si sigue sin RP (y no es macho), no registrar
      if (!rpLimpio) {
        console.warn("⚠️ Cría sin RP y no es macho → no se registra");
        return;
      }

      const coleccion = esMacho ? "macho" : "animal";

      // 🔍 Buscamos si la cría ya existe
      const existeCria = await firebase.db.collection(coleccion)
        .where("idtambo", "==", tamboSel.id)
        .where("rp", "==", rpLimpio)
        .where("fbaja", "==", "")
        .get();

      if (existeCria.empty) {
        const nuevaCria = {
          ingreso: fechaEventoStr,
          idtambo: tamboSel.id,
          rp: rpLimpio,
          erp: "",
          lactancia: 0,
          observaciones: "",
          estpro: "cria",
          estrep: "vacia",
          fparto: "",
          fservicio: "",
          categoria: esMacho ? "Macho" : "Vaquillona",
          racion: 8,
          porcentaje: 1,
          fracion: firebase.ayerTimeStamp(),
          nservicio: 1,
          uc: 0,
          fuc: firebase.nowTimeStamp(),
          ca: 0,
          anorm: "",
          fbaja: esMuerta ? fechaEventoStr : "",
          mbaja: esMuerta ? "muerte" : "",
          rodeo: 0,
          sugerido: 0,
        };

        const res = await firebase.db.collection(coleccion).add(nuevaCria);
        console.log(`✅ Cría ${sexoNorm} con RP ${rpLimpio} registrada en ${coleccion} con ID: ${res.id}`);
      } else {
        console.warn(`⚠️ Cría con RP ${rpLimpio} ya existe en ${coleccion}. No se vuelve a dar de alta.`);
      }

      // 🔥 SIEMPRE registrar en el array de evento
      crias.push({
        rp: rpLimpio,
        sexo: sexo || "",
        muerta: esMuerta
      });
    };


    // 🔍 DEBUG antes de registrar
    console.log("🐄 Evento de parto detectado:", {
      rpMadre,
      fechaEventoStr,
      tipoParto,
      rpCria,
      sexoCria,
      rpCria2
    });

    // Primera cría
    await registrarCria(rpCria, sexoCria);

    // Mellizos
    if (tipoParto && tipoParto.toLowerCase().includes("mellizo")) {
      const sexoCria2 = getValorMultiple(evento, ["Sexo Cria 2", "USAR RAZA MADRE***"]);
      console.log("🐄 Mellizos detectados:", { rpCria2, sexoCria2 });
      await registrarCria(rpCria2, sexoCria2);
    }

    // Registrar evento en madre
    const refEventos = madreRef.collection("eventos");
    const eventoObj = {
      crias,
      rp: rpMadre,
      tipo: "Parto",
      fecha: fechaEventoTimestamp, // ⬅️ como Timestamp
      tambo: tamboSel.id,
      detalle: `${observ || ""} - ${tipoParto || ""}`,
      usuario: `${usuario.displayName} - Dirsa`,
    };

    await refEventos.add(eventoObj);
    console.log(`✅ Evento de parto registrado para RP ${rpMadre}`);
  } catch (error) {
    console.error(`❌ Error general registrando parto para RP ${rpMadre}:`, error.message);
  }
};

export default procesarParto;
