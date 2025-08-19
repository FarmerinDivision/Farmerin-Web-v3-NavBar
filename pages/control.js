import React, { useState, useEffect, useContext } from 'react'
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, ContenedorSpinner, Contenedor } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleControl from '../components/layout/detalleControl';
import SelectTambo from '../components/layout/selectTambo';
import StickyTable from "react-sticky-table-thead";
import differenceInDays from 'date-fns/differenceInDays';
import { Alert, Table, Modal, Button } from 'react-bootstrap';
import { FaSort } from 'react-icons/fa';
import { RiSendPlaneLine } from 'react-icons/ri';
import { useDispatch } from 'react-redux'; // Import useDispatch
import { addNotification } from '../redux/notificacionSlice';
import styles from '../styles/Control.module.scss'
// Control

const Control = () => {
    //states de ordenamiento
    const [animales, guardarAnimales] = useState([]);
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
    const [orderRac, guardarOrderRac] = useState('asc');
    const [showModal, setShowModal] = useState(false);
    const [modalMessages, setModalMessages] = useState([]);
    const [promRacMod, guardarPromRacMod] = useState(0);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const { firebase, tamboSel } = useContext(FirebaseContext);
    const dispatch = useDispatch(); // Ensure dispatch is defined
    let prom = 0;
    let promS = 0;
    let promL = 0;
    let diasLact = 0;
    let diasPre = 0;
    useEffect(() => {

        if (tamboSel) {

            const obtenerAnim = () => {
                try {
                    firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('estpro', '==', 'En Ordeñe').where('fbaja', '==', '').orderBy('rp').get().then(snapshotAnimal)
                } catch (error) {
                    console.log(error)
                }
            }
            //busca los animales en ordeñe
            obtenerAnim();
            mostrarMensajeModal();

        }
    }, [tamboSel])

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

        animales.every(a => {
            promL = promL + parseInt(a.diasLact);
            prom = prom + parseInt(a.racion);
            promS = promS + parseInt(a.sugerido);
            totalRacMod += parseFloat(a.racionModificada);
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

            guardarPromAct(prom);
            guardarPromSug(promS);
            guardarPromLac(promL);
            guardarPromRacMod(promRacModificado);
        }
    }



    function snapshotAnimal(snapshot) {
        const an = snapshot.docs.map(doc => {
            try {
                diasLact = differenceInDays(Date.now(), new Date(doc.data().fparto));
            } catch {
                diasLact = 0;
            }

            try {
                //Calcula los dias de preñez
                if (doc.data().estrep == "vacia") {
                    diasPre = 0;
                } else {
                    diasPre = differenceInDays(Date.now(), new Date(doc.data().fservicio));
                }
            } catch {
                diasPre = 0;
            };
            return {
                id: doc.id,
                diasLact: diasLact,
                diasPre: diasPre,
                actu: false,
                racionModificada: calcularRacionModificada(doc.data()), // Cálculo actualizado
                ...doc.data()
            }

        })

        //aca, antes de guardar animales, recorro el array an y le agrego el sugerido 
        //y la diferencia entre el actual y el sugerido. Despues ordeno en forma descendente 
        //por diferencia y despues guardo animales. En detalle de control, elimino el calculo de sugerido.
        function compare(a, b) {

            let difa = Math.abs(parseInt(a.racion) - parseInt(a.sugerido));
            let difb = Math.abs(parseInt(b.racion) - parseInt(b.sugerido));

            if (difa < difb) {
                return 1;
            }
            if (difa > difb) {
                return -1;
            }
            return 0;
        }

        an.sort(compare);
        guardarAnimales(an);
    }

    const handleClickRP = e => {
        e.preventDefault();
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

    const handleClickRo = e => {
        e.preventDefault();
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

    const handleClickDl = e => {
        e.preventDefault();
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

    return (
        <Layout titulo="Nutricion">
            <>
                <Botonera>
                    <h6 className={styles.resumenNutricion}>
                        <strong className={styles.nombreControl}>Control de alimentación:</strong> <strong>{animales.length}</strong> animales -  <strong className={styles.nombreControl}>Promedio actual:</strong> <strong>{promRacMod}</strong> Kgs.- <strong className={styles.nombreControl}>Promedio Sugerido:</strong> <strong>{promSug} </strong> Kgs.- <strong className={styles.nombreControl}>Promedio Dias Lact.:</strong> <strong>{promLac}</strong> Dias.
                    </h6>
                </Botonera>

                {tamboSel ? (
                    animales.length == 0 ? (
                        <Mensaje>
                            <div className={styles.mensajeCaja}>
                                <h2 className={styles.tituloSinResultados}>No se encontraron resultados</h2>
                            </div>
                        </Mensaje>
                    ) : (
                        <Contenedor>
                            <StickyTable className={styles.stickyTable} height={660}>
                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickRP}>
                                                    <span className={styles.thContent}>
                                                        RP
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Caravana</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickLact}>
                                                    <span className={styles.thContent}>
                                                        Lact.
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Número de lactancia</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickGr}>
                                                    <span className={styles.thContent}>
                                                        Categ
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Categoría del animal</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickRo}>
                                                    <span className={styles.thContent}>
                                                        Rodeo
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Rodeo asignado</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickUC}>
                                                    <span className={styles.thContent}>
                                                        Le.UC
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Litros Último Control</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper}>
                                                    <span className={styles.thContent}>F.UC</span>
                                                    <span className={styles.thTooltipText}>Fecha de Último Control</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickCA}>
                                                    <span className={styles.thContent}>
                                                        Le.CA
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Litros Control Anterior</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickAn}>
                                                    <span className={styles.thContent}>
                                                        Anorm.
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Anomalías</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickDl}>
                                                    <span className={styles.thContent}>
                                                        Días Lact.
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Días en lactancia</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickER}>
                                                    <span className={styles.thContent}>
                                                        Est. Rep.
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Estado Reproductivo</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickDP}>
                                                    <span className={styles.thContent}>
                                                        Días Preñ.
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Días de preñez</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper} onClick={handleClickRac}>
                                                    <span className={styles.thContent}>
                                                        Ración
                                                        <FaSort size={15} className={styles.sortIcon} />
                                                    </span>
                                                    <span className={styles.thTooltipText}>Ración actual (Kg)</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper}>
                                                    <span className={styles.thContent}>F.Racion</span>
                                                    <span className={styles.thTooltipText}>Fecha última modificación de ración</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.controlTooltip}>
                                                    <Button
                                                        className={styles.controlBtn}
                                                        onClick={() => setShowConfirmModal(true)}
                                                    >
                                                        <RiSendPlaneLine />
                                                    </Button>
                                                    <span className={styles.controlTooltipText}>Asignar la ración sugerida a todos</span>
                                                </div>
                                            </th>

                                            <th>
                                                <div className={styles.thTooltipWrapper}>
                                                    <span className={styles.thContent}>R.Sugerida</span>
                                                    <span className={styles.thTooltipText}>Ración Sugerida</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {animales.map(a => (
                                            <DetalleControl
                                                key={a.id}
                                                animal={a}
                                                animales={animales}
                                                guardarAnimales={guardarAnimales}
                                                racionModificada={a.racionModificada}
                                                aplicarRacionSugerida={aplicarRacionSugerida}
                                            />
                                        ))}
                                    </tbody>
                                </Table>
                            </StickyTable>
                        </Contenedor>
                    )
                ) : (
                    <SelectTambo />
                )}

                {/* Modal de notificaciones */}
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

                {/* Modal de confirmación */}
                <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Confirmar Aplicación</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        ¿Estás seguro de que deseas aplicar la ración sugerida a todos los animales?
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


                {/* Modal de acción completa */}
                <Modal
                    show={showSuccessModal}
                    onHide={() => setShowSuccessModal(false)}
                    centered
                    size="sm"
                    backdrop="static"
                    dialogClassName="modal-alert-success"
                >
                    <Modal.Body className="text-center p-4">
                        <div className="mb-3">
                            <span
                                style={{
                                    display: 'inline-block',
                                    backgroundColor: '#28a745',
                                    borderRadius: '50%',
                                    width: '70px',
                                    height: '70px',
                                    lineHeight: '70px',
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
                        <p className="text-muted mb-0">Los cambios fueron guardados correctamente.</p>
                    </Modal.Body>
                </Modal>
                {/* Modal de error */}
                <Modal
                    show={showErrorModal}
                    onHide={() => setShowErrorModal(false)}
                    centered
                    size="sm"
                    backdrop="static"
                    dialogClassName="modal-alert-error"
                >
                    <Modal.Body className="text-center p-4">
                        <div className="mb-3">
                            <span
                                style={{
                                    display: 'inline-block',
                                    backgroundColor: '#dc3545',
                                    borderRadius: '50%',
                                    width: '70px',
                                    height: '70px',
                                    lineHeight: '70px',
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
                </Modal>


            </>
        </Layout>
    );

}

export default Control