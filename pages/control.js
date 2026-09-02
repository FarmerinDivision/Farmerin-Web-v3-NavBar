import React, { useState, useEffect, useContext } from 'react'
import { FirebaseContext } from '../firebase2';
import { Mensaje } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleControl from '../components/layout/detalleControl';
import SelectTambo from '../components/layout/selectTambo';
import differenceInDays from 'date-fns/differenceInDays';
import { Alert, Modal, Button } from 'react-bootstrap';
import { FaSort } from 'react-icons/fa';
import { RiFileExcel2Fill, RiFilter3Line, RiInformationLine } from 'react-icons/ri';
import { normalizarParametrosControl } from '../utils/explicarDecisionAlimentacion';
import { explicarDecisionAlimentacion } from '../utils/explicarDecisionAlimentacion';
import { GiCow } from 'react-icons/gi';
import { useDispatch } from 'react-redux';
import { addNotification } from '../redux/notificacionSlice';
import styles from '../styles/Control.module.scss'
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


// Control

const Control = () => {
    // states de ordenamiento y búsqueda
    const [animales, guardarAnimales] = useState([]);
    const [searchRP, setSearchRP] = useState('');
    //states de ordenamiento

    const [promAct, guardarPromAct] = useState(0);
    const [promSug, guardarPromSug] = useState(0);
    const [promLac, guardarPromLac] = useState(0);
    const [orderRp, guardarOrderRp] = useState('asc');
    const [orderEr, guardarOrderEr] = useState('asc');
    const [orderEp, guardarOrderEp] = useState('asc');
    const [orderGr, guardarOrderGr] = useState('asc');
    const [orderRo, guardarOrderRo] = useState('asc');
    const [orderLact, guardarOrderLact] = useState('asc');
    const [orderUC, guardarOrderUC] = useState('asc');
    const [orderCA, guardarOrderCA] = useState('asc');
    const [orderAn, guardarOrderAn] = useState('asc');
    const [orderDl, guardarOrderDl] = useState('asc');
    const [orderDP, guardarOrderDP] = useState('asc');
    const [orderGrupo, setOrderGrupo] = useState('asc');
    const [orderRac, guardarOrderRac] = useState('asc');
    const [orderCriterio, setOrderCriterio] = useState('asc');
    const [showModal, setShowModal] = useState(false);
    const [modalMessages, setModalMessages] = useState([]);
    const [promRacMod, guardarPromRacMod] = useState(0);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [animalesManual, setAnimalesManual] = useState([]);
    const [showManualAlert, setShowManualAlert] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualModalMessages, setManualModalMessages] = useState([]);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showRodeoModal, setShowRodeoModal] = useState(false);
    const [orderRacManual, setOrderRacManual] = useState('asc');
    const [isMobile, setIsMobile] = useState(false);
    const [parametrosFlat, setParametrosFlat] = useState([]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { firebase, tamboSel } = useContext(FirebaseContext);
    const dispatch = useDispatch(); // Ensure dispatch is defined
    let prom = 0;
    let promS = 0;
    let promL = 0;
    let diasLact = 0;
    let diasPre = 0;

    useEffect(() => {
        if (tamboSel) {
            const obtenerParametrosDisplay = async () => {
                try {
                    let snap;
                    try {
                        snap = await firebase.db
                            .collection('parametro')
                            .where('idtambo', '==', tamboSel.id)
                            .orderBy('grupo')
                            .get();
                    } catch (errOrder) {
                        snap = await firebase.db
                            .collection('parametro')
                            .where('idtambo', '==', tamboSel.id)
                            .get();
                    }
                    const docsParametros = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    setParametrosFlat(normalizarParametrosControl(docsParametros));
                } catch (error) {
                    console.log(error);
                    setParametrosFlat([]);
                }
            };
            obtenerParametrosDisplay();

            const obtenerAnim = async () => {
                try {
                    const snapshot = await firebase.db
                        .collection('animal')
                        .where('idtambo', '==', tamboSel.id)
                        .where('estpro', '==', 'En Ordeñe')
                        .where('fbaja', '==', '')
                        .orderBy('rp')
                        .get();

                    snapshotAnimal(snapshot);
                } catch (error) {
                    console.log(error);
                } finally {
                    setTimeout(() => setLoading(false), 1000); // simula animación suave
                }
            };
            obtenerAnim();
            mostrarMensajeModal();
        }
    }, [tamboSel]);


    const mostrarMensajeModal = async () => {
        try {
            const tamboDoc = await firebase.db.collection('tambo').doc(tamboSel.id).get();
            const porcentaje = tamboDoc.data().porcentaje;

            const mensajes = [];
            if (porcentaje > 0) {
                mensajes.push("AUMENTO DE LA RACION APLICADO.");
                mensajes.push("LA RACION SUGERIDA ESTA LIGADA A LOS PARAMETROS POR DEFECTO.");
            } else if (porcentaje < 0) {
                mensajes.push("REDUCCION DE LA RACION APLICADO.");
                mensajes.push("LA RACION SUGERIDA ESTA LIGADA A LOS PARAMETROS POR DEFECTO.");
            }

            if (mensajes.length > 0) {
                setModalMessages(mensajes); // Establece las líneas del mensaje
                dispatch(addNotification({
                    id: Date.now(),
                    mensaje: mensajes.join(' '), // Concatenar mensajes en una sola línea para notificación
                    fecha: firebase.nowTimeStamp(),
                }));
                setShowModal(true);
            }
        } catch (error) {
            console.error("Error fetching porcentaje:", error);
        }
    };


    useEffect(() => {
        promedioActual();

    }, [animales])

    //const calcular promedio de racion
    const promedioActual = () => {
        let totalRacMod = 0;
        let totalRacReal = 0;   // 🔹 Nuevo: acumula la ración REAL del animal

        animales.every(a => {
            promL = promL + parseInt(a.diasLact);
            prom = prom + parseInt(a.racion);
            promS = promS + parseInt(a.sugerido);

            totalRacMod += parseFloat(a.racionModificada); // ya estaba
            totalRacReal += parseFloat(a.racion);          // 🔹 Nuevo: suma la ración real

            return true;
        });


        if (animales.length != 0) {
            prom = prom / animales.length;
            prom = prom.toFixed(2);
            promS = promS / animales.length;
            promS = promS.toFixed(2);
            promL = promL / animales.length;
            promL = promL.toFixed(2);
            const promRacModificado = (totalRacMod / animales.length).toFixed(2);
            const promRacReal = (totalRacReal / animales.length).toFixed(2);
            console.log("PROMEDIO RACIÓN REAL (sin modificar):", promRacReal);

            guardarPromAct(prom);
            guardarPromSug(promS);
            guardarPromLac(promL);
            guardarPromRacMod(promRacModificado);
        }
    }

    // ✅ Función segura para parsear cualquier formato posible de fecha
    function parseFecha(fechaStr) {
        if (!fechaStr) return null;

        // 🔹 Si ya es objeto Date válido
        if (fechaStr instanceof Date && !isNaN(fechaStr)) return fechaStr;

        // 🔹 Si viene como timestamp (por ejemplo, de Firebase)
        if (typeof fechaStr === 'object' && fechaStr.seconds) {
            return new Date(fechaStr.seconds * 1000);
        }

        // 🔹 Si viene como string
        if (typeof fechaStr === 'string') {
            let normalizada = fechaStr.trim();

            // Caso europeo: dd/MM/yyyy
            if (normalizada.includes('/')) {
                const partes = normalizada.split('/');
                if (partes[0].length === 2 && partes[1].length === 2 && partes[2].length === 4) {
                    // Detecta si es formato europeo (dd/MM/yyyy)
                    const [dia, mes, anio] = partes;
                    return new Date(`${anio}-${mes}-${dia}`);
                } else if (partes[0].length === 4 && partes[1].length === 2 && partes[2].length === 2) {
                    // Formato tipo 2025/02/20 → convertir a válido
                    return new Date(normalizada.replace(/\//g, '-'));
                }
            }

            // Caso ISO normal (2021-10-01)
            if (normalizada.includes('-')) {
                return new Date(normalizada);
            }
        }

        return null; // No se pudo convertir
    }



    function snapshotAnimal(snapshot) {
        const an = snapshot.docs.map(doc => {
            const data = doc.data();

            let diasLact = 0;
            let diasPre = 0;

            try {
                const fechaParto = parseFecha(data.fparto);
                diasLact = fechaParto ? differenceInDays(Date.now(), fechaParto) : 0;
            } catch {
                diasLact = 0;
            }

            try {
                const fechaServicio = parseFecha(data.fservicio);
                diasPre = fechaServicio ? differenceInDays(Date.now(), fechaServicio) : 0;
            } catch {
                diasPre = 0;
            }

            return {
                id: doc.id,
                diasLact,
                diasPre,
                actu: false,
                racionModificada: calcularRacionModificada(data),
                racionManual: data.racionManual || false, // ✅ IMPORTANTE: si no existe, es false
                ...data
            };
        });

        // Ordena por diferencia entre ración actual y sugerida
        an.sort((a, b) => {
            const difa = Math.abs(parseInt(a.racion) - parseInt(a.sugerido));
            const difb = Math.abs(parseInt(b.racion) - parseInt(b.sugerido));
            return difb - difa;
        });

        // ✅ Detecta animales con ración manual
        const manuales = an.filter(a => a.racionManual === true);

        if (manuales.length > 0) {
            const mensajes = [
                "⚠ ATENCIÓN: Existen animales con ración en modo manual.",
                "Estos animales no serán modificados al aplicar ración sugerida.",
                `RP afectados: ${manuales.map(a => a.rp).join(", ")}`
            ];

            setAnimalesManual(manuales); // ✅ AGREGAR
            setManualModalMessages(mensajes);
            setShowManualModal(true);
        }


        guardarAnimales(an);
    }


    const handleClickRP = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderRp == 'asc') {
            const a = animales.sort((a, b) => (a.rp < b.rp) ? 1 : -1);
            guardarOrderRp('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (a.rp > b.rp) ? 1 : -1);
            guardarOrderRp('asc');
            guardarAnimales(b);
        }
    }

    const handleClickER = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderEr == 'asc') {
            const a = animales.sort((a, b) => (a.estrep < b.estrep) ? 1 : -1);
            guardarOrderEr('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (a.estrep > b.estrep) ? 1 : -1);
            guardarOrderEr('asc');
            guardarAnimales(b);
        }
    }

    const handleClickEP = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderEp == 'asc') {
            const a = animales.sort((a, b) => (a.estpro < b.estpro) ? 1 : -1);
            guardarOrderEp('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (a.estpro > b.estpro) ? 1 : -1);
            guardarOrderEp('asc');
            guardarAnimales(b);
        }
    }

    const handleClickGr = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderGr == 'asc') {
            const a = animales.sort((a, b) => (a.categoria < b.categoria) ? 1 : -1);
            guardarOrderGr('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (a.categoria > b.categoria) ? 1 : -1);
            guardarOrderGr('asc');
            guardarAnimales(b);
        }
    }

    const handleClickGrupo = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderGrupo === 'asc') {
            const ordenados = animales.sort((a, b) => (a.grupo < b.grupo ? 1 : -1));
            setOrderGrupo('desc');
            guardarAnimales([...ordenados]);
        } else {
            const ordenados = animales.sort((a, b) => (a.grupo > b.grupo ? 1 : -1));
            setOrderGrupo('asc');
            guardarAnimales([...ordenados]);
        }
    };

    const handleClickRo = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderRo == 'asc') {
            const a = animales.sort((a, b) => (a.rodeo < b.rodeo) ? 1 : -1);
            guardarOrderRo('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (a.rodeo > b.rodeo) ? 1 : -1);
            guardarOrderRo('asc');
            guardarAnimales(b);
        }
    }

    const handleClickLact = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderLact == 'asc') {
            const a = animales.sort((a, b) => (parseInt(a.lactancia) < parseInt(b.lactancia)) ? 1 : -1);
            guardarOrderLact('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (parseInt(a.lactancia) > parseInt(b.lactancia)) ? 1 : -1);
            guardarOrderLact('asc');
            guardarAnimales(b);
        }
    }

    const handleClickUC = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderUC == 'asc') {
            const a = animales.sort((a, b) => (parseFloat(a.uc) < parseFloat(b.uc)) ? 1 : -1);
            guardarOrderUC('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (parseFloat(a.uc) > parseFloat(b.uc)) ? 1 : -1);
            guardarOrderUC('asc');
            guardarAnimales(b);
        }
    }

    const handleClickCA = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderCA == 'asc') {
            const a = animales.sort((a, b) => (parseFloat(a.ca) < parseFloat(b.ca)) ? 1 : -1);
            guardarOrderCA('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (parseFloat(a.ca) > parseFloat(b.ca)) ? 1 : -1);
            guardarOrderCA('asc');
            guardarAnimales(b);
        }
    }

    /*  
    const handleClickAn = e => {
          e.preventDefault();
          if (orderAn == 'asc') {
              const a = animales.sort((a, b) => (a.anorm < b.anorm) ? 1 : -1);
              guardarOrderAn('desc');
              guardarAnimales(a);
          } else {
              const b = animales.sort((a, b) => (a.anorm > b.anorm) ? 1 : -1);
              guardarOrderAn('asc');
              guardarAnimales(b);
          }
  
      }
  */
    const handleClickDl = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderDl == 'asc') {
            const a = animales.sort((a, b) => (parseInt(a.diasLact) < parseInt(b.diasLact)) ? 1 : -1);
            guardarOrderDl('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (parseInt(a.diasLact) > parseInt(b.diasLact)) ? 1 : -1);
            guardarOrderDl('asc');
            guardarAnimales(b);
        }
    }

    const handleClickDP = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderDP == 'asc') {
            const a = animales.sort((a, b) => (parseInt(a.diasLact) < parseInt(b.diasLact)) ? 1 : -1);
            guardarOrderDP('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (parseInt(a.diasLact) > parseInt(b.diasLact)) ? 1 : -1);
            guardarOrderDP('asc');
            guardarAnimales(b);
        }
    }

    const handleClickRac = e => {
        e.preventDefault();
        if (isMobile) return;
        if (orderRac == 'asc') {
            const a = animales.sort((a, b) => (parseInt(a.racion) < parseInt(b.racion)) ? 1 : -1);
            guardarOrderRac('desc');
            guardarAnimales(a);
        } else {
            const b = animales.sort((a, b) => (parseInt(a.racion) > parseInt(b.racion)) ? 1 : -1);
            guardarOrderRac('asc');
            guardarAnimales(b);
        }
    }

    const handleClickRacManual = e => {
        e.preventDefault();
        if (isMobile) return;

        const ordenados = [...animales].sort((a, b) => {
            const valA = a.racionManual ? 1 : 0;
            const valB = b.racionManual ? 1 : 0;
            return orderRacManual === 'asc' ? valA - valB : valB - valA;
        });

        setOrderRacManual(orderRacManual === 'asc' ? 'desc' : 'asc');
        guardarAnimales(ordenados);
    };

    const handleClickCriterio = e => {
        e.preventDefault();
        if (isMobile) return;

        // Obtiene el criterio real de cada animal usando la misma lógica del componente
        // 'asc' => primero "Días de Lactancia", luego "Producción (Último Control)"
        // 'desc' => primero "Producción (Último Control)", luego "Días de Lactancia"
        const getCriterio = (a) => {
            const explicacion = explicarDecisionAlimentacion(a, parametrosFlat);
            return explicacion.criterio || '—';
        };

        const getValorNum = (a) => {
            const criterio = getCriterio(a);
            if (criterio === 'Días de Lactancia') return parseInt(a.diasLact) || 0;
            if (criterio === 'Producción (Último Control)') return parseFloat(a.uc) || 0;
            return 0;
        };

        const ordenados = [...animales].sort((a, b) => {
            const cA = getCriterio(a);
            const cB = getCriterio(b);

            // Prioridad de grupo: 0 = Días de Lactancia, 1 = Producción, 2 = Otros
            const prioridadCriterio = (c) => {
                if (c === 'Días de Lactancia') return 0;
                if (c === 'Producción (Último Control)') return 1;
                return 2;
            };

            const pA = prioridadCriterio(cA);
            const pB = prioridadCriterio(cB);

            if (pA !== pB) {
                return orderCriterio === 'asc' ? pA - pB : pB - pA;
            }

            // Dentro del mismo grupo, ordenar por valor numérico descendente
            return getValorNum(b) - getValorNum(a);
        });

        setOrderCriterio(orderCriterio === 'asc' ? 'desc' : 'asc');
        guardarAnimales(ordenados);
    };


    // CALCULA RACION MODIFICADA CON DECIMALES
    /*  const calcularRacionModificada = (animalData) => {
         // Lógica para calcular la ración modificada
          return animalData.racion * animalData.porcentaje;
     };*/

    // CALCULA RACION MODIFICADA CON ENTEROS
    const calcularRacionModificada = (animalData) => {
        //Implementa tu lógica para calcular la ración modificada
        const modificoRacion = animalData.racion * animalData.porcentaje;
        // Redondea el resultado al entero más cercano
        return Math.round(modificoRacion);
    };

    const aplicarRacionSugerida = async () => {
        const batch = firebase.db.batch(); // Alternativa con batch si querés un update atómico

        const animalesActualizados = animales.map(animal => {
            if (animal.sugerido > 0) {
                const ref = firebase.db.collection('animal').doc(animal.id);
                const fracion = firebase.nowTimeStamp();

                // Prepara el cambio
                batch.update(ref, {
                    racion: animal.sugerido,
                    fracion: fracion,
                    actu: true
                });

                // Actualiza en estado local también
                animal.racion = animal.sugerido;
                animal.fracion = fracion;
                animal.actu = true;
            }
            return animal;
        });

        try {
            await batch.commit(); // Ejecuta todas las actualizaciones
            guardarAnimales(animalesActualizados);
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Error actualizando raciones sugeridas:", error);
            setErrorMessage(error.message || "Ocurrió un error al actualizar las raciones sugeridas.");
            setShowErrorModal(true);
        }

    };


    const handleConfirmApply = () => {
        aplicarRacionSugerida(); // Asegúrate de que esta función se llame correctamente
        setShowConfirmModal(false); // Cierra el modal de confirmación
    };


    const descargarExcel = () => {
        const fecha = new Date();
        const d = String(fecha.getDate()).padStart(2, "0");
        const m = String(fecha.getMonth() + 1).padStart(2, "0");
        const a = fecha.getFullYear();

        const nombreTambo = tamboSel?.nombre || "Tambo";
        const nombreArchivo = `Control-${d}-${m}-${a}-${nombreTambo}.xlsx`;

        // ✅ CABECERA con los valores del resumen
        const headerData = [
            ["CONTROL DE ALIMENTACIÓN"],
            [`Total animales: ${animales.length}`],
            [`Promedio actual de ración: ${promRacMod} Kgs.`],
            [`Promedio ración objetivo: ${promSug} Kgs.`],
            [`Promedio días lactancia: ${promLac} días.`],
            [], // línea vacía de separación antes de la tabla
        ];

        // ✅ Datos de la tabla (animales)
        const data = animales.map(a => ({
            RP: a.rp,
            Grupo: a.grupo,
            Categoría: a.categoria,
            Rodeo: a.rodeo,
            "Días Lactancia": a.diasLact,
            Lactancia: a.lactancia,
            "Litros CA": a.ca,
            "Litros UC": a.uc,
            "Fecha UC": a.fuc,
            "Estado Reproductivo": a.estrep,
            "Días Preñez": a.diasPre,
            "Fecha Ración": a.fracion,
            "Ración (Kg)": a.racion,
            "Ración Sugerida (Kg)": a.sugerido,
        }));

        // ✅ Convertimos la tabla a hoja
        const hoja = XLSX.utils.json_to_sheet(data, { origin: "A7" });

        // ✅ Insertamos la cabecera manualmente arriba
        XLSX.utils.sheet_add_aoa(hoja, headerData, { origin: "A1" });

        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Control");

        const excelBuffer = XLSX.write(libro, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });

        saveAs(file, nombreArchivo);
    };

    const calcularRodeos = () => {
        const conteo = {};
        animales.forEach(a => {
            const rodeo = a.rodeo || "Sin rodeo";
            conteo[rodeo] = (conteo[rodeo] || 0) + 1;
        });
        return conteo;
    };

    const rodeos = calcularRodeos();

    const agruparPorGrupo = () => {
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

    const datosPorGrupo = agruparPorGrupo();

    const totalAutomaticos = animales.filter(a => !a.racionManual).length;
    const totalManuales = animales.filter(a => a.racionManual).length;
    const diffPromedio = animales.length
        ? (animales.reduce((s, a) => s + Math.abs(parseInt(a.racion, 10) - parseInt(a.sugerido, 10)), 0) / animales.length).toFixed(2)
        : '0.00';
    const promUC = animales.length
        ? (animales.reduce((s, a) => s + (parseFloat(a.uc) || 0), 0) / animales.length).toFixed(2)
        : '0.00';

    return (
        <Layout titulo="Nutricion">
            <>
                {/* Loader visible solo mientras carga */}
                {loading ? (
                    <div className={styles.spinnerContainerControl}>
                        <div className={styles.spinnerControl}></div>
                        <div className={styles.loaderControl}>
                            <p>Cargando</p>
                            <div className={styles.wordsControl}>
                                <span className={styles.wordControles}>Grupos</span>
                                <span className={styles.wordControles}>Dias de lactancia</span>
                                <span className={styles.wordControles}>Racion</span>
                                <span className={styles.wordControles}>Racion sugerida</span>
                                <span className={styles.wordControles}>Categoria</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.pageContent}>
                        <div className={styles.controlLayout}>
                            {/* COLUMNA IZQUIERDA: CONTROL, INDICADORES, RESUMEN NUTRICIONAL Y ACCIONES */}
                            <div className={styles.controlSidebar}>
                                <div className={styles.sidebarHeader}>
                                    <h1>Control de Alimentación</h1>
                                </div>
                                {/* Campo de búsqueda por RP */}
                                <div className={styles.sidebarSearch}>
                                    <h2 className={styles.sidebarSectionTitle}>Buscar por RP</h2>
                                    <input type="text" placeholder="Buscar por RP..." value={searchRP} onChange={e => setSearchRP(e.target.value)} />
                                </div>

                                {tamboSel && (
                                    <>
                                        {/* INDICADORES */}
                                        <div className={styles.sidebarSection}>
                                            <div className={styles.sidebarIndicators}>
                                                <div className={styles.statCard}>
                                                    <span className={styles.statLabel}>Total animales</span>
                                                    <span className={styles.statValue}>{animales.length}</span>
                                                </div>
                                                <div className={styles.statCard}>
                                                    <span className={styles.statLabel}>Animales Automáticos</span>
                                                    <span className={`${styles.statValue} ${styles.statValueAuto}`}>{totalAutomaticos}</span>
                                                </div>
                                                <div className={styles.statCard}>
                                                    <span className={styles.statLabel}>Animales Manuales</span>
                                                    <span className={`${styles.statValue} ${styles.statValueManual}`}>{totalManuales}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.sidebarDivider} />

                                        {/* RESUMEN NUTRICIONAL */}
                                        <div className={styles.sidebarSection}>
                                            <h2 className={styles.sidebarSectionTitle}>Resumen Nutricional</h2>
                                            <div className={styles.sidebarNutricionalList}>
                                                <div className={styles.nutricionalItem}>
                                                    <span className={styles.nutricionalLabel}>Ración Actual Promedio</span>
                                                    <span className={styles.nutricionalValue}>{promRacMod} kg</span>
                                                </div>
                                                <div className={styles.nutricionalItem}>
                                                    <span className={styles.nutricionalLabel}>Ración Sugerida Promedio</span>
                                                    <span className={styles.nutricionalValue}>{promSug} kg</span>
                                                </div>
                                                <div className={styles.nutricionalItem}>
                                                    <span className={styles.nutricionalLabel}>Promedio Días Lactancia</span>
                                                    <span className={styles.nutricionalValue}>{promLac} días</span>
                                                </div>
                                                <div className={styles.nutricionalItem}>
                                                    <span className={styles.nutricionalLabel}>Producción Promedio (Último Control)</span>
                                                    <span className={styles.nutricionalValue}>{promUC} L</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.sidebarDivider} />

                                        {/* ACCIONES */}
                                        <div className={styles.sidebarSection}>
                                            <h2 className={styles.sidebarSectionTitle}>Acciones</h2>
                                            <div className={styles.sidebarActions}>
                                                <button type="button" className={styles.btnHeaderSecondary} onClick={() => setShowConfirmModal(true)}>
                                                    <RiFilter3Line size={14} /> Aplicar ración objetivo
                                                </button>
                                                <div className={styles.sidebarActionsRow}>
                                                    <button type="button" className={styles.btnHeaderSecondary} onClick={() => setShowInfoModal(true)}>
                                                        <RiInformationLine size={13} /> Info
                                                    </button>
                                                    <button type="button" className={styles.btnHeaderSecondary} onClick={() => setShowRodeoModal(true)}>
                                                        <GiCow size={13} /> Rodeos ({Object.keys(rodeos).length})
                                                    </button>
                                                    <button type="button" className={styles.btnHeaderPrimary} onClick={descargarExcel}>
                                                        <RiFileExcel2Fill size={13} /> Exportar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* COLUMNA DERECHA: LISTA DE ANIMALES EXACTAMENTE IGUAL */}
                            <div className={styles.controlMain}>
                                {showManualAlert && (
                                    <Alert variant="warning" onClose={() => setShowManualAlert(false)} dismissible>
                                        <strong>⚠ Atención:</strong> Hay animales con ración configurada manualmente.
                                        <br />
                                        <strong>RP afectados:</strong> {animalesManual.map(a => a.rp).join(", ")}
                                    </Alert>
                                )}

                                {tamboSel ? (
                                    animales.length === 0 ? (
                                        <Mensaje>
                                            <div className={styles.mensajeCaja}>
                                                <h2 className={styles.tituloSinResultados}>No se encontraron resultados</h2>
                                            </div>
                                        </Mensaje>
                                    ) : (
                                        <div className={styles.tableContainer}>
                                            <table className={styles.controlTable}>
                                                <thead>
                                                    <tr>
                                                        <th className={styles.thAnimal} onClick={handleClickRP}>
                                                            Animal <FaSort size={10} className={styles.sortIcon} />
                                                        </th>
                                                        <th className={styles.thAlimentacion} onClick={handleClickRac}>
                                                            Racion <FaSort size={10} className={styles.sortIcon} />
                                                        </th>
                                                        <th className={styles.thDecision} onClick={handleClickCriterio} style={{ cursor: 'pointer' }}>
                                                            Decisión <FaSort size={10} className={styles.sortIcon} />
                                                        </th>
                                                        <th className={styles.thEstado} onClick={handleClickRacManual}>
                                                            Estado <FaSort size={10} className={styles.sortIcon} />
                                                        </th>
                                                        <th className={styles.thAcciones}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {animales.filter(a => a.rp?.toString().toLowerCase().includes(searchRP.toLowerCase())).map((a) => (
                                                        <DetalleControl
                                                            key={a.id}
                                                            animal={a}
                                                            animales={animales}
                                                            guardarAnimales={guardarAnimales}
                                                            racionModificada={a.racionModificada}
                                                            parametrosFlat={parametrosFlat}
                                                        />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                                ) : (
                                    <SelectTambo />
                                )}
                            </div>
                        </div>

                        {/* ✅ CONTENEDOR FLEX PARA MOSTRAR LOS DOS MODALES UNO AL LADO DEL OTRO */}
                        {(showModal || showManualModal) && (
                            <div
                                style={{
                                    position: "fixed",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    display: "flex",
                                    flexDirection: "row",          // 🟢 PONE LOS MODALES LADO A LADO
                                    gap: "35px",                    // espacio entre los modales
                                    zIndex: 99999,
                                    pointerEvents: "none",          // permite que los modales sigan siendo clickeables
                                }}
                            >

                                {/* 🔹 Modal: Notificaciones */}
                                <div style={{ pointerEvents: "auto", minWidth: "400px" }}>
                                    <Modal show={showModal} onHide={() => setShowModal(false)}>
                                        <Modal.Header closeButton>
                                            <Modal.Title>Notificaciones</Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body>
                                            <ul>
                                                {modalMessages.map((message, index) => (
                                                    <li key={index}>{message}</li>
                                                ))}
                                            </ul>
                                        </Modal.Body>
                                        <Modal.Footer>
                                            <Button variant="secondary" onClick={() => setShowModal(false)}>
                                                Cerrar
                                            </Button>
                                        </Modal.Footer>
                                    </Modal>
                                </div>


                                {/* 🔹 Modal: Animales con Ración Manual */}
                                <div style={{ pointerEvents: "auto", minWidth: "550px" }}>
                                    <Modal show={showManualModal} onHide={() => setShowManualModal(false)} centered size="lg">
                                        <Modal.Header closeButton>
                                            <Modal.Title>⚠️ Animales con Ración Manual</Modal.Title>
                                        </Modal.Header>

                                        <Modal.Body>

                                            {/* Resumen */}
                                            <div
                                                style={{
                                                    background: "#f8f9fa",
                                                    padding: "10px 15px",
                                                    borderRadius: 6,
                                                    marginBottom: 15,
                                                    borderLeft: "4px solid #dc3545"
                                                }}
                                            >
                                                <strong>Total de animales en modo manual:</strong> {animalesManual.length}
                                                <br />
                                                Estos animales <b>no serán modificados</b> con la ración sugerida por los parámetros de alimentación.
                                            </div>

                                            {/* Tabla con scroll */}
                                            <div style={{ maxHeight: 350, overflowY: "auto", borderRadius: 6, border: "1px solid #ddd" }}>
                                                <table style={{ width: "100%", fontSize: 14 }}>
                                                    <thead style={{ background: "#f1f1f1", position: "sticky", top: 0 }}>
                                                        <tr>
                                                            <th style={{ padding: 8 }}>RP</th>
                                                            <th style={{ padding: 8 }}>Grupo</th>
                                                            <th style={{ padding: 8 }}>Rodeo</th>
                                                            <th style={{ padding: 8 }}>Categoría</th>
                                                            <th style={{ padding: 8 }}>Ración Actual</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {animalesManual.map((a) => (
                                                            <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
                                                                <td style={{ padding: 8 }}><b>{a.rp}</b></td>
                                                                <td style={{ padding: 8 }}>{a.grupo ?? "-"}</td>
                                                                <td style={{ padding: 8 }}>{a.rodeo ?? "-"}</td>
                                                                <td style={{ padding: 8 }}>{a.categoria}</td>
                                                                <td style={{ padding: 8 }}>{a.racion} kg</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                        </Modal.Body>

                                        <Modal.Footer>
                                            <Button variant="secondary" onClick={() => setShowManualModal(false)}>
                                                Cerrar
                                            </Button>
                                        </Modal.Footer>
                                    </Modal>
                                </div>

                            </div>
                        )}

                        {/* 🔹 Modal de confirmación */}
                        <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                            <Modal.Header closeButton>
                                <Modal.Title>Confirmar Aplicación</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                ¿Estás seguro de que deseas aplicar la ración objetivo a todos los animales?
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                                    Cancelar
                                </Button>
                                <Button variant="primary" onClick={handleConfirmApply}>
                                    Confirmar
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* 🔹 Modal de éxito */}
                        <Modal
                            show={showSuccessModal}
                            onHide={() => setShowSuccessModal(false)}
                            centered
                            size="sm"
                            backdrop={true}
                            dialogClassName="modal-alert-success"
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>Acción completada</Modal.Title>
                            </Modal.Header>
                            <Modal.Body className="text-center p-4">
                                <div className="mb-3">
                                    <span
                                        style={{
                                            display: "inline-block",
                                            backgroundColor: "#28a745",
                                            borderRadius: "50%",
                                            width: "70px",
                                            height: "70px",
                                            lineHeight: "70px",
                                        }}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="40"
                                            height="40"
                                            fill="white"
                                            viewBox="0 0 16 16"
                                        >
                                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.07 0l3.992-3.992a.75.75 0 1 0-1.06-1.06L7.5 9.439 5.53 7.47a.75.75 0 0 0-1.06 1.06l2.5 2.5z" />
                                        </svg>
                                    </span>
                                </div>
                                <h5 className="fw-bold text-success">¡Ración modificada!</h5>
                                <p className="text-muted mb-0">
                                    Los cambios se guardaron correctamente. Si no los ve reflejados de inmediato, salga de la sección y vuelva a ingresar para actualizar la información.
                                </p>
                            </Modal.Body>
                            <Modal.Footer className="justify-content-center">
                                <Button variant="success" onClick={() => setShowSuccessModal(false)}>
                                    Cerrar
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* 🔹 Modal de error */}
                        <Modal
                            show={showErrorModal}
                            onHide={() => setShowErrorModal(false)}
                            centered
                            size="sm"
                            backdrop={true}
                            dialogClassName="modal-alert-error"
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>Error</Modal.Title>
                            </Modal.Header>
                            <Modal.Body className="text-center p-4">
                                <div className="mb-3">
                                    <span
                                        style={{
                                            display: "inline-block",
                                            backgroundColor: "#dc3545",
                                            borderRadius: "50%",
                                            width: "70px",
                                            height: "70px",
                                            lineHeight: "70px",
                                        }}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="40"
                                            height="40"
                                            fill="white"
                                            viewBox="0 0 16 16"
                                        >
                                            <path d="M7.001 4a.999.999 0 0 1 2 0l-.35 4.35a.65.65 0 0 1-1.3 0L7 4zM8 12a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 8 12z" />
                                        </svg>
                                    </span>
                                </div>
                                <h5 className="fw-bold text-danger">Error</h5>
                                <p className="text-muted mb-0">{errorMessage}</p>
                            </Modal.Body>
                            <Modal.Footer className="justify-content-center">
                                <Button variant="danger" onClick={() => setShowErrorModal(false)}>
                                    Cerrar
                                </Button>
                            </Modal.Footer>
                        </Modal>
                        <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)}>
                            <Modal.Header closeButton>
                                <Modal.Title>Información del Control</Modal.Title>
                            </Modal.Header>

                            <Modal.Body>
                                <ul>
                                    <li><strong>Automático</strong> = Ración calculada según los parámetros de alimentación</li>
                                    <li><strong>Manual</strong> = Ración editada manualmente por el productor</li>
                                    <li>Los animales en modo manual <b>no se modifican</b> con cambios según parámetros de alimentación</li>
                                    <li>La columna <b>Decisión</b> explica por qué cada animal tiene su ración actual</li>
                                    <li>Podés ver cuántos animales hay en cada rodeo con el botón "Rodeos"</li>
                                </ul>
                            </Modal.Body>

                            <Modal.Footer>
                                <Button variant="secondary" onClick={() => setShowInfoModal(false)}>
                                    Cerrar
                                </Button>
                            </Modal.Footer>
                        </Modal>
                        <Modal show={showRodeoModal} onHide={() => setShowRodeoModal(false)} centered>
                            <Modal.Header closeButton>
                                <Modal.Title>Resumen de Rodeos</Modal.Title>
                            </Modal.Header>

                            <Modal.Body>

                                {Object.entries(datosPorGrupo).map(([grupo, categorias]) => {

                                    const totalVacas = Object.values(categorias.Vaca).reduce((a, b) => a + b, 0);
                                    const totalVaquillonas = Object.values(categorias.Vaquillona).reduce((a, b) => a + b, 0);

                                    return (
                                        <div key={grupo} style={{ marginBottom: 25 }}>

                                            {/* TITULO DEL GRUPO */}
                                            <h5 className="mb-2">📌 Grupo {grupo}</h5>
                                            <hr />

                                            {/* CONTENEDOR DOS COLUMNAS */}
                                            <div style={{ display: "flex", gap: 40 }}>

                                                {/* VACAS */}
                                                <div style={{ flex: 1 }}>
                                                    <h6>🐄 Vacas</h6>
                                                    {Object.entries(categorias.Vaca).length > 0 ? (
                                                        Object.entries(categorias.Vaca).map(([rodeo, cant]) => (
                                                            <div key={rodeo}>Rodeo {rodeo}: <strong>{cant}</strong></div>
                                                        ))
                                                    ) : (
                                                        <div style={{ opacity: 0.6 }}>Sin datos</div>
                                                    )}
                                                    <strong>Total: {totalVacas}</strong>
                                                </div>

                                                {/* VAQUILLONAS */}
                                                <div style={{ flex: 1 }}>
                                                    <h6>🐮 Vaquillonas</h6>
                                                    {Object.entries(categorias.Vaquillona).length > 0 ? (
                                                        Object.entries(categorias.Vaquillona).map(([rodeo, cant]) => (
                                                            <div key={rodeo}>Rodeo {rodeo}: <strong>{cant}</strong></div>
                                                        ))
                                                    ) : (
                                                        <div style={{ opacity: 0.6 }}>Sin datos</div>
                                                    )}
                                                    <strong>Total: {totalVaquillonas}</strong>
                                                </div>

                                            </div>

                                        </div>
                                    );
                                })}

                            </Modal.Body>


                            <Modal.Footer>
                                <Button variant="secondary" onClick={() => setShowRodeoModal(false)}>
                                    Cerrar
                                </Button>
                            </Modal.Footer>
                        </Modal>

                    </div>
                )}
            </>

        </Layout>
    );


}

export default Control

