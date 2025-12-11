// src/components/Parametros.js
import React, { useState, useEffect, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleParametro from '../components/layout/detalleParametro';
import SelectTambo from '../components/layout/selectTambo';
import { Button, DropdownButton, Dropdown, Row, Col, Modal } from 'react-bootstrap';
import { RiAddLine, RiEditBoxLine, RiDeleteBin2Line } from 'react-icons/ri';
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
    setValor(snapshot.data().porcentaje);
  }

  const cargarGrupos = async () => {
    if (!tamboSel) return;
    setCargandoGrupos(true);
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
      setCargandoGrupos(false);
    }
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
      setShowNuevoGrupo(true); // abrir modal ya

      // escribir en background (sin bloquear UI)
      ref.set(base)
        .then(() => {
          // refrescar lista sin bloquear
          cargarGrupos();
        })
        .catch((error) => {
          console.error('Error creando grupo', error);
          setShowNuevoGrupo(false);
          setSuccessMsgGroup('No se pudo crear el grupo. Intente nuevamente.');
          setShowSuccessGroup(true);
        })
        .finally(() => setCreatingGroup(false));
    } catch (error) {
      console.error('Error creando grupo', error);
      setCreatingGroup(false);
    }
  };

  const handleApplyChange = async () => {
    if (selectedChange === null || !tamboSel) return;

    let nuevoPorcentaje = selectedChange;
    if (nuevoPorcentaje > 100) nuevoPorcentaje = 100;
    if (nuevoPorcentaje < -50) nuevoPorcentaje = -50;

    const porcentajeAnimal = { porcentaje: 1 + nuevoPorcentaje / 100 };
    const p = { porcentaje: nuevoPorcentaje };

    // ✅ Cambio instantáneo en pantalla
    setValor(nuevoPorcentaje);
    setPorc(nuevoPorcentaje);
    setSelectedChange(null);

    try {
      // ✅ Actualiza el porcentaje general en el tambo
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);

      // ✅ Batch update para animales (más rápido)
      const snapshot = await firebase.db
        .collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .get();

      const batch = firebase.db.batch();
      snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return !data.fbaja && !data.mbaja;
        })
        .forEach(doc => {
          const ref = firebase.db.collection('animal').doc(doc.id);
          batch.update(ref, porcentajeAnimal);
        });

      await batch.commit();

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
      console.error("Error al aplicar cambio:", error);
    }
  };


  const restablecer = async () => {
    if (!tamboSel) return;

    const p = { porcentaje: 0 };
    const pAnimal = { porcentaje: 1 };

    // ✅ Cambio instantáneo en pantalla
    setValor(0);
    setSelectedChange(null);
    setIsIncrease(true);

    try {
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);

      const snapshot = await firebase.db
        .collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .get();

      const batch = firebase.db.batch();
      snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return !data.fbaja && !data.mbaja;
        })
        .forEach(doc => {
          const ref = firebase.db.collection('animal').doc(doc.id);
          batch.update(ref, pAnimal);
        });

      await batch.commit();

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

    alert("Redondeos individuales listos en la consola.");
  };


  /***********************************************
  * 🔥 PROMEDIO INDIVIDUAL (FLUJO IGUAL A CONTROL)
  * Usando ración del PARÁMETRO según rodeo
  ***********************************************/
  const calcularPromedioIndividual = (nroGrupo, gruposData = grupos) => {
    console.log("===============================================");
    console.log("🔥 CALCULANDO PROMEDIO INDIVIDUAL (MODO CONTROL)");
    console.log("Grupo:", nroGrupo);
    console.log("===============================================");

    // 1️⃣ Filtrar animales que realmente pertenecen al grupo
    const animalesDelGrupo = animales.filter(a => Number(a.grupo) === Number(nroGrupo));

    if (animalesDelGrupo.length === 0) {
      alert("No hay animales en este grupo.");
      return;
    }

    // 2️⃣ Conseguir parámetros del grupo correcto
    const grupoEncontrado = gruposData.find(g => g.grupo === nroGrupo);
    if (!grupoEncontrado) {
      alert("No se encontró el grupo en parámetros.");
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
      alert("No hay animales válidos para este cálculo.");
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
      <div className={styles.container}>
        <h1 className={styles.titulo}> Parametros de Alimentación</h1>

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

        <div className={styles.bloqueBotones}>
          <DropdownButton
            id="dropdown-aumentar-button"
            title={
              isIncrease && selectedChange !== null
                ? `Aumento: ${selectedChange}%`
                : "Seleccionar Aumento"
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

          <Button className={styles.botonRestablecer} onClick={restablecer}>
            Restablecer
          </Button>

          <DropdownButton
            id="dropdown-reducir-button"
            title={
              !isIncrease && selectedChange !== null
                ? `Reducción: ${selectedChange}%`
                : "Seleccionar Reducción"
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

          <Button className={`${styles.nuevoGrupoBtn} ${styles.mlAuto}`} onClick={crearNuevoGrupo} disabled={creatingGroup}>
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

        {/* 🆕 🔵 NUEVO DIV EN EL MEDIO – RESUMEN GENERAL */}
        <div className={styles.resumenHeader}>
          <div className={styles.resumenHeaderTop}>
            <h3 className={styles.resumenTitulo}>Resumen del Tambo</h3>

            {/* Botón de info alineado */}
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


          <div className={styles.resumenContenido}>
            <div className={styles.item}>
              <span className={styles.itemTitulo}>Total animales obtenidos</span>
              <span className={styles.itemValor}>{animales.length}</span>
            </div>

            {Object.keys(cantidadAnimalesPorGrupo).map(g => (
              <div className={styles.item} key={g}>
                <span className={styles.itemTitulo}>Grupo {g}</span>
                <span className={styles.itemValor}>
                  {cantidadAnimalesPorGrupo[g]} animales
                </span>
              </div>
            ))}
          </div>
          {grupos.length > 1 && (
            <div className={styles.promedioGlobalContainer}>
              <div className={styles.tooltipWrapper}>
                <button
                  className={styles.cta}
                  onClick={async () => {

                    // 1️⃣ Leer parámetros actualizados desde Firebase
                    const snap = await firebase.db
                      .collection("parametro")
                      .where("idtambo", "==", tamboSel.id)
                      .orderBy("grupo")
                      .get();

                    const gruposActualizados = snap.docs
                      .map(d => ({ id: d.id, ...d.data() }))
                      .filter(d => Array.isArray(d.parametros));

                    // 2️⃣ Calcular promedios individuales por grupo ANTES del global
                    for (const g of gruposActualizados) {
                      await calcularPromedioIndividual(g.grupo, gruposActualizados);
                    }

                    // 3️⃣ Calcular promedio global con la NUEVA FÓRMULA
                    await calcularPromedioGlobal(gruposActualizados);

                    // 4️⃣ Actualizar el estado de grupos
                    setGrupos(gruposActualizados);

                    // 5️⃣ Resetear indicador visual
                    setParametrosModificados(false);
                  }}

                >
                  <span className={styles.hoverUnderline}>
                    {parametrosModificados ? "Recalcular Promedio Global" : "Promedio Global"}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="10"
                    viewBox="0 0 46 16"
                  >
                    <path
                      d="M8,0,6.545,1.455l5.506,5.506H-30V9.039H12.052L6.545,14.545,8,16l8-8Z"
                      transform="translate(30)"
                    ></path>
                    <g
                      id="arrow"
                      stroke="none"
                      strokeWidth="1"
                      fill="none"
                      fillRule="evenodd"
                    >
                      <path
                        className={styles.one}
                        d="M40.1543933,3.89485454 L58.7849315,21.8256394"
                      ></path>
                      <path
                        className={styles.two}
                        d="M58.7849315,21.8256394 L40.1543933,39.7558593"
                      ></path>
                      <path
                        className={styles.three}
                        d="M0.424211384,21.8256394 L58.7849315,21.8256394"
                      ></path>
                    </g>
                  </svg>
                </button>

                <span className={styles.tooltipText}>
                  Presione para calcular promedio global
                </span>
              </div>

              {promedioTotalGrupos && (
                <div className={styles.promedioGrupo}>
                  <div className={styles.hoverUnderlineText}>
                    PROMEDIO GLOBAL: {promedioTotalGrupos} KG
                  </div>
                </div>
              )}
            </div>

          )}

        </div>


        {tamboSel ? (
          <>
            {/* Botón de nuevo grupo movido a la barra de acciones superior */}
            {cargandoGrupos ? (
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
              grupos.map((g) => (
                <div key={g.id} className={styles.cardGrupo}>
                  <div className={styles.headerGrupo}>
                    <h2 className={styles.tituloGrupo}>Grupo {g.grupo}{g.subtitulo ? ` - ${g.subtitulo}` : ''}</h2>
                    {/* ⭐ Agregá el promedio acá ADENTRO del map ⭐ */}
                    <div className={styles.promedioWrapper} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                      <div className={styles.tooltipWrapper}>
                        <button
                          className={styles.cta}
                          onClick={async () => {

                            // 1) Leer parámetros actualizados desde Firebase
                            const snap = await firebase.db
                              .collection("parametro")
                              .where("idtambo", "==", tamboSel.id)
                              .orderBy("grupo")
                              .get();

                            const gruposActualizados = snap.docs
                              .map(d => ({ id: d.id, ...d.data() }))
                              .filter(d => Array.isArray(d.parametros));

                            // 2) Calcular usando parámetros nuevos
                            await calcularPromedioIndividual(g.grupo, gruposActualizados);

                            setParametrosModificados(false);
                          }}
                        >
                          <span className={styles.hoverUnderline}>
                            {parametrosModificados ? "Recalcular promedio" : "Calcular promedio"}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="30"
                            height="10"
                            viewBox="0 0 46 16"
                          >
                            <path
                              d="M8,0,6.545,1.455l5.506,5.506H-30V9.039H12.052L6.545,14.545,8,16l8-8Z"
                              transform="translate(30)"
                            ></path>
                          </svg>
                        </button>

                        {/* 👉 Tooltip nuevo */}
                        <span className={styles.tooltipText}>Presione para calcular</span>
                      </div>


                      <div className={styles.promedioGrupo}>
                        <span className={styles.hoverUnderlineText}>
                          Promedio : <strong>{promediosIndividuales[g.grupo] ?? "0.00"} kg</strong>
                        </span>
                      </div>
                    </div>


                    <div className={styles.accionesGrupo}>
                      <div className={styles.tooltipWrapper}>
                        <Button variant="outline-primary" size="sm" onClick={() => abrirEditarGrupo(g)}>
                          <RiEditBoxLine size={25} />
                        </Button>
                        <span className={styles.tooltipText}>Editar grupo</span>
                      </div>
                      <div className={styles.tooltipWrapper}>
                        <Button variant="outline-danger" size="sm" onClick={() => confirmarEliminarGrupo(g.id)}>
                          <RiDeleteBin2Line size={25} />
                        </Button>
                        <span className={styles.tooltipText}>Eliminar grupo</span>
                      </div>
                    </div>
                  </div>
                  <Row className="gx-4 gy-4 mt-2">
                    {/* PARAMETROS DEL TAMBO */}
                    {(g.parametros || []).map((cat) => (
                      <Col md={6} key={cat.categoria}>
                        <DetalleParametro
                          idTambo={tamboSel.id}
                          groupId={g.id}
                          categoria={cat.categoria}
                          porcentaje={porcentaje}
                          onParametroChange={() => setParametrosModificados(true)}
                        />
                      </Col>
                    ))}
                  </Row>
                </div>
              ))
            )}
          </>
        ) : (
          <SelectTambo />
        )}
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
                  {(g.parametros || []).map((cat) => (
                    <Col md={6} key={cat.categoria}>
                      <DetalleParametro
                        idTambo={tamboSel?.id}
                        groupId={nuevoGrupoId}
                        categoria="Vaca"
                        porcentaje={porcentaje}
                      />
                    </Col>
                  ))}

                </Col>
                <Col md={6} className={styles.modalParamCol}>
                  <h5 className={styles.modalParamColTitulo}>Parametros para Vaquillona</h5>
                  {(g.parametros || []).map((cat) => (
                    <Col md={6} key={cat.categoria}>
                      <DetalleParametro
                        idTambo={tamboSel?.id}
                        groupId={nuevoGrupoId}
                        categoria="Vaquillona"
                        porcentaje={porcentaje}
                      />
                    </Col>
                  ))}

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

    </Layout >
  );
};

export default Parametros;
