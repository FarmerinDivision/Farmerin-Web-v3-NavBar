// src/components/Parametros.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleParametro from '../components/layout/detalleParametro';
import SelectTambo from '../components/layout/selectTambo';
import { Button, DropdownButton, Dropdown, Row, Col, Modal } from 'react-bootstrap';
import { RiAddLine, RiEditBoxLine, RiDeleteBin2Line, RiArrowUpLine, RiArrowDownLine, RiRefreshLine } from 'react-icons/ri';
import { format } from 'date-fns';
import { addNotification } from '../redux/notificacionSlice';
import styles from '../styles/Parametro.module.scss';
import { Mensaje } from '../components/ui/Elementos';

const Parametros = () => {
  const [valor, setValor] = useState(0);
  const { firebase, setPorc, tamboSel } = useContext(FirebaseContext);
  const [selectedChange, setSelectedChange] = useState(null);
  const [isIncrease, setIsIncrease] = useState(true);
  const [grupos, setGrupos] = useState([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [showNuevoGrupo, setShowNuevoGrupo] = useState(false);
  const [nuevoGrupoId, setNuevoGrupoId] = useState(null);
  const [editGroup, setEditGroup] = useState({ id: null, value: '', subtitle: '' });
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [showSuccessGroup, setShowSuccessGroup] = useState(false);
  const [successMsgGroup, setSuccessMsgGroup] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [animales, setAnimales] = useState([]);
  const [promediosGrupo, setPromediosGrupo] = useState({});
  const [calculandoGrupo, setCalculandoGrupo] = useState(null);
  const [cantidadAnimalesPorGrupo, setCantidadAnimalesPorGrupo] = useState({});
  const [promedioTotalGrupos, setPromedioTotalGrupos] = useState(null);
  const [promediosIndividuales, setPromediosIndividuales] = useState({});
  const [showInfo, setShowInfo] = useState(false);
  const [parametrosModificados, setParametrosModificados] = useState(false);
  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState({ nroGrupo: '' });
  const pendingPorcentajeRef = useRef(null);

  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : false
    }));
  };

  const dispatch = useDispatch();

  useEffect(() => {
    if (tamboSel) {
      obtenerPorcentaje();
      cargarGrupos();
      cargarAnimales();
    }
  }, [tamboSel]);

  useEffect(() => {
    if (grupos.length > 0 && animales.length > 0) {

      const calcularInicial = async () => {
        for (const g of grupos) {
          await calcularPromedioIndividual(g.grupo, grupos);
        }

        if (grupos.length > 1) {
          await calcularPromedioGlobal(grupos);
        }
      };

      calcularInicial();
    }
  }, [grupos, animales]);


  useEffect(() => {
    if (grupos.length <= 1) return;
    if (animales.length === 0) return;

    // Verifica si falta algún promedio individual
    const faltan = grupos.some(g => !promediosIndividuales[g.grupo]);

    if (faltan) return;

    // Cuando TODOS los grupos tienen promedio → calcular el global
    calcularPromedioGlobal(grupos);

  }, [promediosIndividuales, grupos, animales]);

  const obtenerPorcentaje = async () => {
    try {
      const snapshot = await firebase.db.collection('tambo').doc(tamboSel.id).get();
      snapshotParametros(snapshot);
    } catch (error) {
      console.log(error);
    }
  };

  const abrirEditarGrupo = (g) => {
    setEditGroup({ id: g.id, value: String(g.grupo ?? ''), subtitle: g.subtitulo || '' });
  };

  const cargarAnimales = async () => {
    if (!tamboSel) return;
    try {
      const snap = await firebase.db
        .collection("animal")
        .where("idtambo", "==", tamboSel.id)
        .where("estpro", "==", "En Ordeñe")
        .where("fbaja", "==", "")
        .get();

      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAnimales(lista);
      console.log("Animales cargados para promedio:", lista);
    } catch (e) {
      console.error("Error cargando animales", e);
    }
  };


  const guardarEdicionGrupo = async () => {
    if (!editGroup.id) return;
    try {
      const num = Number(editGroup.value);
      if (!Number.isFinite(num)) return;
      const update = { grupo: num, subtitulo: (editGroup.subtitle || '').trim() };
      await firebase.db.collection('parametro').doc(editGroup.id).update(update);
      setEditGroup({ id: null, value: '', subtitle: '' });
      await cargarGrupos();
      setSuccessMsgGroup('Grupo actualizado correctamente.');
      setShowSuccessGroup(true);
    } catch (e) {
      console.error('Error renombrando grupo', e);
    }
  };

  const confirmarEliminarGrupo = (id) => setDeleteGroupId(id);

  const eliminarGrupo = async () => {
    if (!deleteGroupId || deletingGroup) return;
    const idAEliminar = deleteGroupId;
    setDeletingGroup(true);
    // Optimista: cerrar modal, mostrar éxito y actualizar UI al instante
    const gruposPrevios = grupos;
    setDeleteGroupId(null);
    setGrupos(prev => prev.filter(g => g.id !== idAEliminar));
    setSuccessMsgGroup('Grupo eliminado correctamente.');
    setShowSuccessGroup(true);

    try {
      await firebase.db.collection('parametro').doc(idAEliminar).delete();
      // Refrescar en background para asegurar consistencia
      cargarGrupos();
    } catch (e) {
      console.error('Error eliminando grupo', e);
      // Revertir cambios optimistas
      setGrupos(gruposPrevios);
      setSuccessMsgGroup('No se pudo eliminar el grupo. Intente nuevamente.');
      setShowSuccessGroup(true);
    } finally {
      setDeletingGroup(false);
    }
  };

  function snapshotParametros(snapshot) {
    const porcentajeRemoto = Number(snapshot.data()?.porcentaje ?? 0);

    // Evita que una lectura tardía pise el último valor elegido por el usuario.
    if (
      pendingPorcentajeRef.current !== null &&
      porcentajeRemoto !== pendingPorcentajeRef.current
    ) {
      return;
    }

    setValor(porcentajeRemoto);
    setPorc(porcentajeRemoto);

    if (pendingPorcentajeRef.current === porcentajeRemoto) {
      pendingPorcentajeRef.current = null;
    }
  }

  const cargarGrupos = async (silent = false) => {
    if (!tamboSel) return;
    if (!silent) setCargandoGrupos(true);
    try {
      let snap;
      try {
        snap = await firebase.db
          .collection('parametro')
          .where('idtambo', '==', tamboSel.id)
          .orderBy('grupo')
          .get();
      } catch (errOrder) {
        // fallback sin orderBy por si falta índice o hay tipos mixtos
        console.warn('Fallo orderBy("grupo"), usando fallback sin orden.', errOrder);
        snap = await firebase.db
          .collection('parametro')
          .where('idtambo', '==', tamboSel.id)
          .get();
      }
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        // Solo documentos de grupo (tienen el campo 'parametros' como array)
        .filter(d => Array.isArray(d.parametros))
        .sort((a, b) => Number(a.grupo ?? 0) - Number(b.grupo ?? 0));
      setGrupos(data);
    } catch (error) {
      console.error('Error cargando grupos', error);
    } finally {
      if (!silent) setCargandoGrupos(false);
    }
  };

  const handleParametroChange = () => {
    setParametrosModificados(true);
    cargarGrupos(true);
  };

  const crearNuevoGrupo = async () => {
    if (!tamboSel || creatingGroup) return;
    setCreatingGroup(true);
    try {
      // calcular próximo número de grupo en memoria
      const maxGrupo = grupos.reduce((acc, g) => Math.max(acc, Number(g.grupo ?? 0)), -1);
      const nuevoGrupoNumero = isFinite(maxGrupo) && maxGrupo >= 0 ? maxGrupo + 1 : 0;
      const base = {
        idtambo: tamboSel.id,
        grupo: nuevoGrupoNumero,
        parametros: [
          { categoria: 'Vaca', rodeos: [] },
          { categoria: 'Vaquillona', rodeos: [] }
        ]
      };

      // crear ref primero para obtener ID inmediatamente y abrir el modal sin esperar red
      const ref = firebase.db.collection('parametro').doc();
      setNuevoGrupoId(ref.id);
      
      const optimisticGroup = { id: ref.id, ...base };
      setGrupos(prev => [...prev, optimisticGroup].sort((a, b) => Number(a.grupo ?? 0) - Number(b.grupo ?? 0)));
      
      setShowNuevoGrupo(true); // abrir modal ya

      // escribir en background (sin bloquear UI)
      ref.set(base)
        .then(() => {
          // refrescar lista silenciosamente
          cargarGrupos(true);
        })
        .catch((error) => {
          console.error('Error creando grupo', error);
          setShowNuevoGrupo(false);
          setSuccessMsgGroup('No se pudo crear el grupo. Intente nuevamente.');
          setShowSuccessGroup(true);
          setGrupos(prev => prev.filter(g => g.id !== ref.id));
        })
        .finally(() => setCreatingGroup(false));
    } catch (error) {
      console.error('Error creando grupo', error);
      setCreatingGroup(false);
    }
  };

  const obtenerFactorPorcentajeAnimal = (valorPorcentaje) => {
    const factores = {
      10: 1.1,
      20: 1.2,
      30: 1.3,
      40: 1.4,
      50: 1.5,
      60: 1.6,
      70: 1.7,
      80: 1.8,
      90: 1.9,
      100: 2,
      '-10': 0.9,
      '-20': 0.8,
      '-30': 0.7,
      '-40': 0.6,
      '-50': 0.5,
    };

    return factores[valorPorcentaje] ?? 1;
  };

  const actualizarPorcentajeAnimalesEnFirebase = async (nuevoFactorPorcentaje) => {
    if (!tamboSel) return;

    const endpoint = 'https://us-central1-farmerin-navarro.cloudfunctions.net/actualizarPorcentajeAnimales';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idtambo: tamboSel.id,
          porcentaje: nuevoFactorPorcentaje,
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloud Function status ${response.status}`);
      }
      return;
    } catch (fnError) {
      console.warn('Fallo Cloud Function, usando fallback local:', fnError);
    }

    // Fallback local: mantiene la lógica actual de batches en paralelo.
    const animalesObjetivo = animales.filter((a) => !a.fbaja && !a.mbaja);
    if (animalesObjetivo.length > 0) {
      const chunkSize = 450;
      const commits = [];
      let batch = firebase.db.batch();
      let opsInBatch = 0;

      animalesObjetivo.forEach((a) => {
        const ref = firebase.db.collection('animal').doc(a.id);
        batch.update(ref, { porcentaje: nuevoFactorPorcentaje });
        opsInBatch += 1;

        if (opsInBatch >= chunkSize) {
          commits.push(batch.commit());
          batch = firebase.db.batch();
          opsInBatch = 0;
        }
      });

      if (opsInBatch > 0) {
        commits.push(batch.commit());
      }

      await Promise.all(commits);
      return;
    }

    if (animalesObjetivo.length === 0) {
      const snapshot = await firebase.db
        .collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .where('estpro', '==', 'En Ordeñe')
        .get();

      const chunkSize = 450;
      const commits = [];
      let batch = firebase.db.batch();
      let opsInBatch = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.fbaja || data.mbaja) return;

        batch.update(doc.ref, { porcentaje: nuevoFactorPorcentaje });
        opsInBatch += 1;

        if (opsInBatch >= chunkSize) {
          commits.push(batch.commit());
          batch = firebase.db.batch();
          opsInBatch = 0;
        }
      });

      if (opsInBatch > 0) {
        commits.push(batch.commit());
      }

      if (commits.length === 0) return;
      await Promise.all(commits);
    }
  };

  const handleApplyChange = async () => {
    if (selectedChange === null || !tamboSel) return;
    setShowSyncInfo(true);

    let nuevoPorcentaje = selectedChange;
    if (nuevoPorcentaje > 100) nuevoPorcentaje = 100;
    if (nuevoPorcentaje < -50) nuevoPorcentaje = -50;

    const porcentajeAnimal = { porcentaje: obtenerFactorPorcentajeAnimal(nuevoPorcentaje) };
    const p = { porcentaje: nuevoPorcentaje };

    // ✅ Cambio instantáneo en pantalla
    pendingPorcentajeRef.current = nuevoPorcentaje;
    setValor(nuevoPorcentaje);
    setPorc(nuevoPorcentaje);
    setSelectedChange(null);
    setAnimales(prev =>
      prev.map((animal) => {
        if (animal.fbaja || animal.mbaja) return animal;
        return { ...animal, porcentaje: porcentajeAnimal.porcentaje };
      })
    );

    try {
      // ✅ Actualiza el porcentaje general en el tambo
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);
      await actualizarPorcentajeAnimalesEnFirebase(porcentajeAnimal.porcentaje);

      // ✅ Notificación
      const noti = {
        mensaje: isIncrease
          ? `AUMENTO DEL ${nuevoPorcentaje} %`
          : `REDUCCIÓN DEL ${nuevoPorcentaje} %`,
        fecha: firebase.nowTimeStamp(),
      };

      await firebase.db
        .collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .add(noti);

      dispatch(addNotification({
        ...noti,
        id: Date.now(),
      }));

    } catch (error) {
      pendingPorcentajeRef.current = null;
      await obtenerPorcentaje();
      await cargarAnimales();
      console.error("Error al aplicar cambio:", error);
    }
  };


  const restablecer = async () => {
    if (!tamboSel) return;
    setShowSyncInfo(true);

    const p = { porcentaje: 0 };
    const pAnimal = { porcentaje: 1 };

    // ✅ Cambio instantáneo en pantalla
    pendingPorcentajeRef.current = 0;
    setValor(0);
    setPorc(0);
    setSelectedChange(null);
    setIsIncrease(true);
    setAnimales(prev =>
      prev.map((animal) => {
        if (animal.fbaja || animal.mbaja) return animal;
        return { ...animal, porcentaje: pAnimal.porcentaje };
      })
    );

    try {
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);
      await actualizarPorcentajeAnimalesEnFirebase(pAnimal.porcentaje);

      const noti = {
        mensaje: 'SE VOLVIÓ AL VALOR ORIGINAL DE LA RACIÓN.',
        fecha: firebase.nowTimeStamp(),
      };

      await firebase.db
        .collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .add(noti);

      dispatch(addNotification({
        ...noti,
        id: Date.now(),
      }));

    } catch (error) {
      pendingPorcentajeRef.current = null;
      await obtenerPorcentaje();
      await cargarAnimales();
      console.error("Error al restablecer:", error);
    }
  };



  let porcentaje;
  if (valor >= -50 && valor <= 100 && valor % 10 === 0) {
    porcentaje = 1 + valor / 100;
  }



  /***********************************************
 * 🔵 FUNCIONES PARA REDONDEO INDIVIDUAL
 ***********************************************/

  // 🔹 Animales filtrados por grupo
  const obtenerAnimalesDelGrupo = (nroGrupo) => {
    return animales.filter(a => Number(a.grupo) === Number(nroGrupo));
  };

  // 🔹 Redondeo individual EXACTO igual a control.js
  const calcularRedondeoIndividual = (animalesDelGrupo) => {
    return animalesDelGrupo.map(a => {
      const racionMod = Math.round(a.racion * a.porcentaje);
      return {
        rp: a.rp,
        racion: a.racion,
        porcentaje: a.porcentaje,
        racionModificada: racionMod
      };
    });
  };

  // 🔹 Mostrar redondeos en consola
  const mostrarRedondeoIndividual = (nroGrupo) => {
    const animalesDelGrupo = obtenerAnimalesDelGrupo(nroGrupo);
    const datos = calcularRedondeoIndividual(animalesDelGrupo);

    console.log("===========================================");
    console.log("🔵 REDONDEO INDIVIDUAL DEL GRUPO", nroGrupo);
    console.log("===========================================");

    datos.forEach(d => {
      console.log(
        `RP: ${d.rp} | Ración: ${d.racion} | %: ${d.porcentaje} | Modificada: ${d.racionModificada}`
      );
    });

    console.log("Redondeos individuales listos en la consola.");
  };


  /***********************************************
  * 🔥 PROMEDIO INDIVIDUAL (FLUJO IGUAL A CONTROL)
  * Usando ración del PARÁMETRO según rodeo
  ***********************************************/
  const calcularPromedioIndividual = (nroGrupo, gruposData = grupos, isManualCalculation = false) => {
    console.log("===============================================");
    console.log("🔥 CALCULANDO PROMEDIO INDIVIDUAL (MODO CONTROL)");
    console.log("Grupo:", nroGrupo);
    console.log("===============================================");

    // 1️⃣ Conseguir parámetros del grupo correcto
    const grupoEncontrado = gruposData.find(g => g.grupo === nroGrupo);
    if (!grupoEncontrado) {
      return;
    }

    const tieneParametros = grupoEncontrado.parametros && grupoEncontrado.parametros.some(p => p.rodeos && p.rodeos.length > 0);

    if (isManualCalculation && !tieneParametros) {
        setWarningMessage({ nroGrupo });
        setShowWarningModal(true);
        return;
    }

    // 2️⃣ Filtrar animales que realmente pertenecen al grupo
    const animalesDelGrupo = animales.filter(a => Number(a.grupo) === Number(nroGrupo));

    if (animalesDelGrupo.length === 0) {
      return;
    }

    // Crear estructura de ración por categoria/rodeo
    const racionesPorCategoria = { Vaca: {}, Vaquillona: {} };

    grupoEncontrado.parametros.forEach(param => {
      const categoria = param.categoria;

      param.rodeos.forEach(rod => {
        const rodeoKey = String(rod.orden);
        const base = Number(rod.racion);

        racionesPorCategoria[categoria][rodeoKey] = base;
      });
    });

    // 3️⃣ Calcular ración modificada por animal (igual que control)
    let total = 0;
    let usados = 0;

    animalesDelGrupo.forEach(a => {
      const categoria = a.categoria;
      const rodeoKey = String(a.rodeo);

      // Si rodeo no existe en parámetros → descartar
      if (!(categoria in racionesPorCategoria) ||
        !(rodeoKey in racionesPorCategoria[categoria])) {
        console.log(`⚠️ Animal RP ${a.rp} ignorado — Rodeo ${rodeoKey} no existe en parámetros`);
        return;
      }

      const racionBase = racionesPorCategoria[categoria][rodeoKey];

      // 🔥 MATCH EXACTO DEL CONTROL:
      // 1) multiplicar
      let calculo = racionBase * porcentaje;

      // 2) redondear por animal
      let racionModificada = Math.round(calculo);

      total += racionModificada;
      usados++;

      console.log(
        `RP ${a.rp} | Cat ${categoria} | Rodeo ${rodeoKey} | Base ${racionBase} | % ${porcentaje} |` +
        ` calc=${calculo} | redondeado=${racionModificada}`
      );
    });

    if (usados === 0) {
      return;
    }

    // 4️⃣ Promedio final (redondeo solo acá)
    const promedio = (total / usados).toFixed(2);

    console.log("🔥 PROMEDIO INDIVIDUAL FINAL (MODO CONTROL) =", promedio);

    // 5️⃣ Guardarlo en pantalla
    setPromediosIndividuales(prev => ({
      ...prev,
      [nroGrupo]: promedio
    }));

  };





  // ======================================
  // AGRUPACIÓN EXACTA A LA DE CONTROL.JS
  /*
  const agruparAnimalesPorGrupo = () => {
    const estructura = {};
  
    animales.forEach(a => {
      const grupo = a.grupo ?? "Sin grupo";
      const categoria = a.categoria;
      const rodeo = a.rodeo ?? "Sin rodeo";
  
      if (!estructura[grupo]) {
        estructura[grupo] = { Vaca: {}, Vaquillona: {} };
      }
      if (!estructura[grupo][categoria][rodeo]) {
        estructura[grupo][categoria][rodeo] = 0;
      }
  
      estructura[grupo][categoria][rodeo]++;
    });
  
    return estructura;
  };
  */

  /****************************************************
   *   🔹 1) CALCULAR RACIÓN PROMEDIO (Σ(N×R) / ΣN)
   ****************************************************/
  const calcularRacionPromedio = (estructuraAgrupada, parametros) => {
    console.log("=========== CALCULO RACIÓN PROMEDIO ===========");
    console.log("Estructura agrupada (N de animales por categoría y rodeo):", estructuraAgrupada);
    console.log("Parámetros de ración (R por categoría y rodeo):", parametros);

    let totalKg = 0;        // Σ(N×R)
    let totalAnimales = 0;  // ΣN

    Object.keys(estructuraAgrupada).forEach(categoria => {
      console.log(`\n>>> Categoría: ${categoria}`);

      Object.keys(estructuraAgrupada[categoria]).forEach(rodeo => {
        const N = Number(estructuraAgrupada[categoria][rodeo] || 0);
        const R = Number(parametros[categoria]?.[rodeo] ?? 0);

        console.log(`   Rodeo ${rodeo}:`);
        console.log(`      N (animales): ${N}`);
        console.log(`      R (ración): ${R} kg/animal`);
        console.log(`      N × R = ${N * R}`);

        totalKg += N * R;
        totalAnimales += N;
      });
    });

    console.log("\n---------------------------------------------");
    console.log("Σ(N × R) totalKg =", totalKg);
    console.log("ΣN totalAnimales =", totalAnimales);

    if (totalAnimales === 0) {
      console.log("⚠ No hay animales. Resultado = 0.");
      return 0;
    }

    const promedio = totalKg / totalAnimales;

    console.log("RACIÓN PROMEDIO FINAL =", promedio, "kg/animal");
    console.log("===============================================\n");

    return promedio;
  };


  /************************************************************
  *   CALCULAR PROMEDIO DE RACIÓN POR GRUPO  (COMPLETO)
  ************************************************************/
  const calcularPromedioPorGrupo = async (nroGrupo) => {
    try {
      console.log("===============================================");
      console.log(`🟦 CALCULANDO PROMEDIO PARA EL GRUPO: ${nroGrupo}`);
      console.log("===============================================");

      /********************************************************
       * 1) Buscar grupo en Firebase
       ********************************************************/
      const grupoEncontrado = grupos.find(g => g.grupo === nroGrupo);
      if (!grupoEncontrado) {
        console.log(`❌ No se encontró el grupo ${nroGrupo}`);
        return 0;
      }

      console.log("✔ Grupo encontrado:", grupoEncontrado);

      /********************************************************
       * 2) Agrupar animales por categoría y rodeo
       ********************************************************/
      const estructuraAgrupada = { Vaca: {}, Vaquillona: {} };
      let contadorAnimalesValidos = 0;
      let contadorAnimalesInvalidos = 0;

      animales.forEach(a => {
        if (Number(a.grupo) !== Number(nroGrupo)) return;

        const categoria = a.categoria ?? "Vaca";
        const rodeoRaw = a.rodeo;

        const rodeoInvalido =
          rodeoRaw === null ||
          rodeoRaw === undefined ||
          rodeoRaw === "" ||
          rodeoRaw === "null" ||
          rodeoRaw === "undefined" ||
          Number.isNaN(Number(rodeoRaw));

        if (rodeoInvalido) {
          console.log(`⚠️ ANIMAL DESCARTADO (rodeos inválidos) → ID: ${a.id}, Rodeo: ${rodeoRaw}`);
          contadorAnimalesInvalidos++;
          return;
        }

        const rodeo = String(rodeoRaw);

        console.log(`✔️ Animal válido → ID: ${a.id}, Categoria: ${categoria}, Rodeo: ${rodeo}`);
        contadorAnimalesValidos++;

        if (!estructuraAgrupada[categoria][rodeo]) {
          estructuraAgrupada[categoria][rodeo] = 0;
        }

        estructuraAgrupada[categoria][rodeo]++;
      });

      console.log("📌 Animales válidos:", contadorAnimalesValidos);
      console.log("📌 Animales descartados:", contadorAnimalesInvalidos);
      console.log("📌 Estructura agrupada final:", estructuraAgrupada);

      /********************************************************
       * 3) Obtener raciones por categoría/rodeo desde parámetros
       ********************************************************/
      const racionesPorCategoria = { Vaca: {}, Vaquillona: {} };

      grupoEncontrado.parametros.forEach(param => {
        const categoria = param.categoria;
        param.rodeos.forEach(rod => {
          const key = String(rod.orden);
          racionesPorCategoria[categoria][key] = Number(rod.racion);
        });
      });

      console.log("📌 Parámetros de ración por categoría:", racionesPorCategoria);

      /********************************************************
       * 4) Calcular total con RACIÓN MODIFICADA (igual que Control.js)
       ********************************************************/
      let totalKg = 0;
      let totalAnimales = 0;

      ["Vaca", "Vaquillona"].forEach(cat => {
        Object.entries(estructuraAgrupada[cat]).forEach(([rodeo, cantidad]) => {
          const racion = racionesPorCategoria[cat][rodeo] ?? 0;

          console.log(
            `➡️ ${cat} | Rodeo ${rodeo} | Cant: ${cantidad} | Ración base: ${racion}`
          );

          /*********************************************
           * 🔥 APLICAR LA MISMA LÓGICA QUE CONTROL.JS
           * racionModificada = Math.round(racion * porcentaje)
           *********************************************/
          const racionModificada = Math.round(racion * porcentaje);

          console.log(`      Ración modificada: ${racionModificada}`);

          totalKg += cantidad * racionModificada;
          totalAnimales += cantidad;
        });
      });

      console.log("📦 TOTAL KG calculados:", totalKg);
      console.log("👥 TOTAL animales usados:", totalAnimales);

      if (totalAnimales === 0) return 0;

      /********************************************************
       * 5) Promedio final con ración modificada
       ********************************************************/
      const promedioFinal = (totalKg / totalAnimales).toFixed(2);

      console.log("🎯 Promedio FINAL con porcentaje:", promedioFinal);

      /********************************************************
       * 6) Guardar promedio para la UI
       ********************************************************/
      setPromediosGrupo(prev => ({
        ...prev,
        [nroGrupo]: promedioFinal
      }));

      return promedioFinal;

    } catch (error) {
      console.log("❌ Error calculando promedio del grupo:", error);
      return 0;
    }
  };


  /************************************************************
   *   🔹 3) USEEFFECT DE LOG (NO CALCULAR AUTOMÁTICO SIN GRUPO)
   ************************************************************/
  useEffect(() => {
    console.log("Animales y grupos cargados. Listo para calcular.");
  }, [animales, grupos]);

  /************************************************************
  *   🔹 CALCULAR PROMEDIO TOTAL SI HAY 2 GRUPOS 
  ************************************************************/

  const calcularPromedioGlobal = async (gruposData) => {
    try {
      console.log("===============================================");
      console.log("🔥 CALCULANDO PROMEDIO GLOBAL (Nueva fórmula)");
      console.log("===============================================");

      let sumaPonderada = 0;
      let totalAnimales = 0;

      for (const g of gruposData) {
        const nroGrupo = g.grupo;

        const cantidadGrupo = animales.filter(
          a => Number(a.grupo) === Number(nroGrupo)
        ).length;

        const promedioGrupo = Number(promediosIndividuales[nroGrupo] || 0);

        console.log(
          `Grupo ${nroGrupo} → promedio ${promedioGrupo} × ${cantidadGrupo} animales`
        );

        sumaPonderada += promedioGrupo * cantidadGrupo;
        totalAnimales += cantidadGrupo;
      }

      if (totalAnimales === 0) {
        console.log("❌ No hay animales para global.");
        return 0;
      }

      // 🟦 Promedio ponderado
      let promedio = sumaPonderada / totalAnimales;

      // 🟧 Aplicar porcentaje general (porcentaje ya existe en tu código)
      const promedioConPorcentaje = (promedio * porcentaje).toFixed(2);

      console.log("🔥 Promedio GLOBAL final =", promedioConPorcentaje);

      setPromedioTotalGrupos(promedioConPorcentaje);

      return promedioConPorcentaje;

    } catch (error) {
      console.error("❌ Error en calcularPromedioGlobal:", error);
      return 0;
    }
  };

  useEffect(() => {
    const conteo = {};

    animales.forEach(a => {
      const g = a.grupo ?? "Sin grupo";
      if (!conteo[g]) conteo[g] = 0;
      conteo[g]++;
    });

    setCantidadAnimalesPorGrupo(conteo);
  }, [animales]);





  const recalcularTodosLosPromedios = async () => {

    const gruposActualizados = await leerGruposDesdeFirebase();

    setGrupos(gruposActualizados);

    // individual
    for (const g of gruposActualizados) {
      await calcularPromedioIndividual(g.grupo, gruposActualizados);
    }

    // global
    if (gruposActualizados.length > 1) {
      calcularPromedioGlobal(gruposActualizados);
    }

    setParametrosModificados(false);
  }





  return (
    <Layout titulo="Parámetros Nutricionales">
      <div className={styles.dashboardContainer}>
        {/* PANEL IZQUIERDO - SIDEBAR STICKY */}
        <aside className={styles.sidebarPanel}>
          <h1 className={styles.titulo}>Parámetros de Alimentación</h1>

          <div className={styles.estadoActual}>
            <span className={styles.estadoLabel}>Estado actual:</span>
            <span className={styles.estadoValor}>
              {valor === 0
                ? "Por defecto"
                : valor < 0
                  ? `Reducción del ${valor}%`
                  : `Aumento del ${valor}%`}
            </span>
          </div>

          {/* Spacer superior para centrar los botones verticalmente */}
          <div style={{ flexGrow: 1, minHeight: '24px' }}></div>

          <div className={styles.bloqueBotonesSidebar}>
            <DropdownButton
              id="dropdown-aumentar-button"
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <RiArrowUpLine size={18} />
                  <span>
                    {isIncrease && selectedChange !== null
                      ? `Aumento: ${selectedChange}%`
                      : "Aumento"}
                  </span>
                </div>
              }
              className={`${styles.dropdownAumentarButton} ${styles.dropdownEstilo}`}
              variant=""
              onSelect={(e) => {
                setSelectedChange(parseInt(e));
                setIsIncrease(true);
              }}
            >
              {["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"].map(
                (p) => (
                  <Dropdown.Item key={p} eventKey={p}>
                    {p}%
                  </Dropdown.Item>
                )
              )}
            </DropdownButton>

            <DropdownButton
              id="dropdown-reducir-button"
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <RiArrowDownLine size={18} />
                  <span>
                    {!isIncrease && selectedChange !== null
                      ? `Reducción: ${selectedChange}%`
                      : "Reducción"}
                  </span>
                </div>
              }
              className={`${styles.dropdownReducirButton} ${styles.dropdownEstilo}`}
              variant=""
              onSelect={(e) => {
                setSelectedChange(parseInt(e));
                setIsIncrease(false);
              }}
            >
              {["-10", "-20", "-30", "-40", "-50"].map((p) => (
                <Dropdown.Item key={p} eventKey={p}>
                  {p}%
                </Dropdown.Item>
              ))}
            </DropdownButton>

            <Button className={styles.botonRestablecer} onClick={restablecer}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RiRefreshLine size={18} />
                <span>Restablecer</span>
              </div>
            </Button>

            <Button className={styles.nuevoGrupoBtn} onClick={crearNuevoGrupo} disabled={creatingGroup}>
              <RiAddLine size={18} />
              {creatingGroup ? 'Creando…' : 'Nuevo grupo'}
            </Button>
          </div>

          {selectedChange !== null && (
            <div className={styles.botonAplicarWrapper}>
              <Button className={styles.botonAplicar} onClick={handleApplyChange}>
                Aplicar cambio
              </Button>
            </div>
          )}

          {/* Spacer explícito para forzar el Resumen al fondo del panel */}
          <div style={{ flexGrow: 1, minHeight: '32px' }}></div>

          <div className={styles.resumenCompacto}>
            <div className={styles.resumenHeaderTop}>
              <h3 className={styles.resumenTituloSidebar}>Resumen</h3>
              <div className={styles.infoWrapper}>
                <button className={styles.infoButton} onClick={() => setShowInfo(true)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12" y2="8"></line>
                  </svg>
                  <span className={styles.tooltip}>Información importante</span>
                </button>
              </div>
            </div>
            <p className={styles.resumenText}>
              Utilice este panel para configurar el porcentaje de ración a nivel general en todo el tambo.
              A la derecha verá la cantidad de animales, promedios y sus grupos.
            </p>
          </div>
        </aside>

        {/* PANEL DERECHO - MAIN CONTENT */}
        <main className={styles.mainPanel}>
          {tamboSel && (
            <div className={styles.kpiContainer}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Total Animales</span>
                <span className={styles.kpiValue}>{animales.length}</span>
              </div>

              {Object.keys(cantidadAnimalesPorGrupo).map(g => (
                <div className={styles.kpiCard} key={g}>
                  <span className={styles.kpiLabel}>Grupo {g}</span>
                  <span className={styles.kpiValue}>{cantidadAnimalesPorGrupo[g]}</span>
                </div>
              ))}

              {grupos.length > 1 && (
                <div className={`${styles.kpiCard} ${styles.kpiGlobalCard}`}>
                  <div className={styles.kpiGlobalHeader}>
                    <span className={styles.kpiLabel}>Promedio Global</span>
                    <div className={styles.tooltipWrapper}>
                      <button
                        className={styles.kpiGlobalBtn}
                        onClick={async () => {
                          const snap = await firebase.db
                            .collection("parametro")
                            .where("idtambo", "==", tamboSel.id)
                            .orderBy("grupo")
                            .get();
                          const gruposActualizados = snap.docs
                            .map(d => ({ id: d.id, ...d.data() }))
                            .filter(d => Array.isArray(d.parametros));
                          for (const g of gruposActualizados) {
                            await calcularPromedioIndividual(g.grupo, gruposActualizados);
                          }
                          await calcularPromedioGlobal(gruposActualizados);
                          setGrupos(gruposActualizados);
                          setParametrosModificados(false);
                        }}
                      >
                        <span>
                          {parametrosModificados ? "Recalcular" : "Calcular"}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </button>
                      <span className={styles.tooltipText}>Presione para calcular promedio global</span>
                    </div>
                  </div>
                  {promedioTotalGrupos ? (
                    <span className={styles.kpiValueHighlight}>{promedioTotalGrupos} kg</span>
                  ) : (
                    <span className={styles.kpiValueEmpty}>--</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={styles.gruposContainer}>
            {tamboSel ? (
              cargandoGrupos ? (
                <div className={styles.spinnerContainerParametros}>
                  <div className={styles.spinnerParametros}></div>
                  <div className={styles.loaderParametros}>
                    <p>Cargando</p>
                    <div className={styles.wordsParametros}>
                      <span className={styles.wordParametro}>Grupos configurados</span>
                      <span className={styles.wordParametro}>Paratros de Vacas</span>
                      <span className={styles.wordParametro}>Parametros de Vaquillonas</span>
                      <span className={styles.wordParametro}>Unidades de medida</span>
                      <span className={styles.wordParametro}>Rodeo y Orden</span>
                    </div>
                  </div>
                </div>
              ) : grupos.length === 0 ? (
                <Mensaje>
                  <div className={styles.sinGrupos}>No hay grupos configurados. Cree uno nuevo.</div>
                </Mensaje>
              ) : (
                grupos.map((g) => {
                  const isExpanded = expandedGroups[g.id] !== undefined ? expandedGroups[g.id] : true;
                  return (
                    <div key={g.id} className={styles.cardGrupo}>
                      <div className={styles.headerGrupo}>
                        <div className={styles.headerGrupoTitleContainer} onClick={() => toggleGroup(g.id)} style={{ cursor: 'pointer' }}>
                          <h2 className={styles.tituloGrupo}>
                            <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                            Grupo {g.grupo}{g.subtitulo ? ` - ${g.subtitulo}` : ''}
                          </h2>
                        </div>

                        <div className={styles.headerGrupoRight}>
                          <div className={styles.promedioWrapper}>
                            <span className={styles.promedioValor}>
                              Promedio: <strong>{promediosIndividuales[g.grupo] ?? "0.00"} kg</strong>
                            </span>

                            <div className={styles.tooltipWrapper}>
                              <button
                                className={styles.modernCalcBtn}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const snap = await firebase.db
                                    .collection("parametro")
                                    .where("idtambo", "==", tamboSel.id)
                                    .orderBy("grupo")
                                    .get();
                                  const gruposActualizados = snap.docs
                                    .map(d => ({ id: d.id, ...d.data() }))
                                    .filter(d => Array.isArray(d.parametros));
                                  await calcularPromedioIndividual(g.grupo, gruposActualizados, true);
                                  setParametrosModificados(false);
                                }}
                              >
                                <span className={styles.modernCalcBtnText}>
                                  {parametrosModificados ? "Recalcular" : "Calcular"}
                                </span>
                              </button>
                              <span className={styles.tooltipText}>Presione para calcular</span>
                            </div>
                          </div>

                          <div className={styles.accionesGrupo}>
                            <div className={styles.tooltipWrapper}>
                              <button className={styles.iconBtnMinimal} onClick={(e) => { e.stopPropagation(); abrirEditarGrupo(g); }}>
                                <RiEditBoxLine size={18} />
                              </button>
                              <span className={styles.tooltipText}>Editar grupo</span>
                            </div>
                            <div className={styles.tooltipWrapper}>
                              <button className={styles.iconBtnMinimalDanger} onClick={(e) => { e.stopPropagation(); confirmarEliminarGrupo(g.id); }}>
                                <RiDeleteBin2Line size={18} />
                              </button>
                              <span className={styles.tooltipText}>Eliminar grupo</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={`${styles.grupoContentWrapper} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                        <div className={styles.tablasGrupoGrid}>
                          {(g.parametros || []).map((cat) => (
                            <div className={styles.tablaCategoriaCol} key={cat.categoria}>
                              <DetalleParametro
                                idTambo={tamboSel.id}
                                groupId={g.id}
                                categoria={cat.categoria}
                                porcentaje={porcentaje}
                                onParametroChange={handleParametroChange}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })
              )
            ) : (
              <SelectTambo />
            )}
          </div>
        </main>
      </div>
      {/* PARAMETRO DE NUEVO TAMBO SIN VALORES */}
      {showNuevoGrupo && (
        <div className={styles.overlayCard}>
          <div className={styles.paramCardContainer}>
            <div className={styles.paramCardHeader}>
              <h4 className={styles.paramCardTitle}>
                Nuevo Grupo creado • Añadir parámetros iniciales
              </h4>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setShowNuevoGrupo(false)}
              >
                ✕
              </Button>
            </div>

            <div className={styles.paramCardBody}>
              <Row className="gx-4 gy-4">
                <Col md={6} className={styles.modalParamCol}>
                  <h5 className={styles.modalParamColTitulo}>Parametros para Vaca</h5>
                  <div className="mt-3">
                    <DetalleParametro
                      idTambo={tamboSel?.id}
                      groupId={nuevoGrupoId}
                      categoria="Vaca"
                      porcentaje={porcentaje}
                      onParametroChange={handleParametroChange}
                    />
                  </div>
                </Col>
                <Col md={6} className={styles.modalParamCol}>
                  <h5 className={styles.modalParamColTitulo}>Parametros para Vaquillona</h5>
                  <div className="mt-3">
                    <DetalleParametro
                      idTambo={tamboSel?.id}
                      groupId={nuevoGrupoId}
                      categoria="Vaquillona"
                      porcentaje={porcentaje}
                      onParametroChange={handleParametroChange}
                    />
                  </div>
                </Col>
              </Row>
            </div>

            <div className={styles.paramCardFooter}>
              <Button variant="primary" onClick={() => setShowNuevoGrupo(false)}>
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Modal éxito acciones sobre grupo */}
      <Modal show={showSuccessGroup} onHide={() => setShowSuccessGroup(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>✅ Acción completada</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{successMsgGroup}</p>
          <p className="text-muted">(Si no ve el cambio, salga y vuelva a entrar para actualizar.)</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccessGroup(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal editar grupo */}
      <Modal show={!!editGroup.id} onHide={() => setEditGroup({ id: null, value: '', subtitle: '' })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar número de grupo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Número de grupo</label>
            <input
              type="number"
              className="form-control"
              value={editGroup.value}
              onChange={(e) => setEditGroup({ ...editGroup, value: e.target.value })}
              min={0}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Subtítulo (opcional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Holando"
              value={editGroup.subtitle}
              onChange={(e) => setEditGroup({ ...editGroup, subtitle: e.target.value })}
              maxLength={40}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditGroup({ id: null, value: '', subtitle: '' })}>Cancelar</Button>
          <Button variant="primary" onClick={guardarEdicionGrupo}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal eliminar grupo */}
      <Modal show={!!deleteGroupId} onHide={() => setDeleteGroupId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>¿Eliminar grupo?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Esta acción eliminará el grupo y todos sus parámetros. ¿Desea continuar?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteGroupId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminarGrupo}>Eliminar</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showInfo} onHide={() => setShowInfo(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Información sobre los promedios</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p>
            Es normal que veas una <strong>pequeña diferencia</strong> entre el promedio que aparece en
            <strong> Parámetros</strong> y el promedio que aparece en <strong> Control</strong>.
          </p>

          <p>
            Esto ocurre porque cada sección calcula ese promedio de una forma distinta:
          </p>

          <ul>
            <li>
              <strong>En Parámetros:</strong> se usa la ración base configurada para cada categoría y rodeo.
            </li>
            <li>
              <strong>En Control:</strong> se calcula la ración real que recibe cada animal de manera individual.
            </li>
          </ul>

          <p>
            Por este motivo, el valor puede variar levemente entre ambas pantallas.
          </p>

          <p>
            Además, el promedio puede cambiar si se modifica el
            <strong> porcentaje de alimentación</strong>, ya que afecta directamente la ración que recibe cada animal.
          </p>

          <p className="text-muted">
            En resumen: la diferencia es totalmente normal y depende de los parámetros actuales de alimentación.
          </p>
          <hr />


          {grupos.length > 1 && (
            <>
              <h5>Promedio Global</h5>

              <p>
                se calcula usando las raciones que vos configuraste en Parámetros para cada grupo.
                Es decir, se basa en <strong>lo que debería comer cada animal según tus parámetros</strong>, no en la ración real del día.

                Por ese motivo, en algunos casos el resultado puede ser <strong>distinto al promedio que aparece en Control</strong>, ya que en Control se usa la ración real que está recibiendo cada animal.

                Para obtener este valor, el sistema calcula el <strong>promedio de cada grupo</strong> según sus raciones configuradas, y luego combina esos promedios teniendo en cuenta cuántos animales hay en cada grupo.
                El resultado es una <strong>vista general</strong> de cómo quedaría la alimentación del tambo según los parámetros definidos.
              </p>
            </>
          )}


        </Modal.Body>


        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowInfo(false)}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSyncInfo} onHide={() => setShowSyncInfo(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Actualizacion en proceso</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Los cambios se guardaron correctamente. Pueden verse reflejados en unos minutos.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSyncInfo(false)}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Advertencia de Cálculo */}
      <Modal show={showWarningModal} onHide={() => setShowWarningModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
             </svg>
             Información
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            El Grupo {warningMessage.nroGrupo} aún no tiene parámetros de alimentación configurados.
          </p>
          <p>
            Para poder calcular el promedio primero debe agregar los parámetros de alimentación para este grupo.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowWarningModal(false)}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

    </Layout >
  );
};

export default Parametros;
