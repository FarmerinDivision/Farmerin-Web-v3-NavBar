import React, { useContext, useState } from 'react';
import { FirebaseContext } from '../../firebase2';
import { AiFillAlert } from 'react-icons/ai';
import { GiCow, GiInfo } from 'react-icons/gi';
import styles from '../../styles/perfilFarmerin.module.scss';

import { Modal as BootstrapModal, Button } from 'react-bootstrap';

export const ObtenerAnimalesPerfilForm = () => {
    const { firebase, tamboSel } = useContext(FirebaseContext);
    const [vacas, setVacas] = useState(0);
    const [vacasEnOrdeñe, setVacasEnOrdeñe] = useState(0);
    const [vacasSecas, setVacasSecas] = useState(0);
    const [vaquillonas, setVaquillonas] = useState(0);
    const [vaquillonasEnOrdeñe, setVaquillonasEnOrdeñe] = useState(0);
    const [vaquillonasSecas, setVaquillonasSecas] = useState(0);
    const [vaquillonasServicio, setVaquillonasServicio] = useState(0);
    const [crias, setCrias] = useState(0);
    const [mostrarLista, setMostrarLista] = useState(false);
    const [showVacasModal, setShowVacasModal] = useState(false);
    const [showVaquillonasModal, setShowVaquillonasModal] = useState(false);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!tamboSel) return;

        try {
            const vacasSnapshot = await firebase.db
                .collection('animal')
                .where('idtambo', '==', tamboSel.id)
                .where('mbaja', '==', '')
                .where('categoria', '==', 'Vaca')
                .get();
            const vacasData = vacasSnapshot.docs.map((doc) => doc.data());
            setVacas(vacasData.length);
            setVacasEnOrdeñe(vacasData.filter((vaca) => vaca.estpro === 'En Ordeñe').length);
            setVacasSecas(vacasData.filter((vaca) => vaca.estpro === 'seca').length);

            const vaquillonasSnapshot = await firebase.db
                .collection('animal')
                .where('idtambo', '==', tamboSel.id)
                .where('categoria', '==', 'Vaquillona')
                .where('mbaja', '==', '')
                .get();
            const vaquillonasData = vaquillonasSnapshot.docs.map((doc) => doc.data());
            console.log('VAQUILLONAS', vaquillonasData);
            setVaquillonas(vaquillonasData.length);
            setVaquillonasEnOrdeñe(vaquillonasData.filter((vaquillona) => vaquillona.estpro === 'En Ordeñe').length);
            setVaquillonasSecas(vaquillonasData.filter((vaquillona) => vaquillona.estpro === 'seca').length);
            setCrias(vaquillonasData.filter((vaquillona) => vaquillona.estpro === 'cria').length);


        } catch (error) {
            console.log(error);
        }

        setMostrarLista(true);
    };


    return (
        <div className="card-fondoBotones">
            <form className="animales-form" onSubmit={handleSubmit}>
                <button className="obtener-animales-button" style={{ '--clr': '#00ad54' }} type="submit">
                    <span className="obtener-animales-button-decor"></span>
                    <div className="obtener-animales-button-content">
                        <div className="obtener-animales-button__icon">
                            <GiCow size={24} style={{ color: '#fff' }} />
                        </div>
                        <span className="obtener-animales-button__text">Obtener Animales</span>
                    </div>
                </button>
            </form>
            <BootstrapModal show={mostrarLista} onHide={() => setMostrarLista(false)} centered size="md">
                <BootstrapModal.Header closeButton>
                    <BootstrapModal.Title>Animales del Tambo</BootstrapModal.Title>
                </BootstrapModal.Header>
                <BootstrapModal.Body>
                    <div className={styles.perfilModal}>

                        <div className={styles.perfilResumen}>

                            <div className={styles.perfilIcono}>
                                <GiCow />
                            </div>

                            <div className={styles.perfilTotal}>

                                <span>Total de Animales</span>

                                <h1>{vacas + vaquillonas}</h1>

                            </div>

                            <GiInfo className={styles.perfilInfo} />

                        </div>

                        <h6 className={styles.perfilSubtitulo}>

                            VER LISTADOS

                        </h6>

                        <div
                            className={styles.perfilCard}
                            onClick={() => setShowVacasModal(true)}
                        >

                            <div>

                                <h5>Lista de Vacas</h5>

                                <small>Ver todas las vacas registradas</small>

                            </div>

                            <div className={styles.perfilArrow}>
                                →
                            </div>

                        </div>

                        <div
                            className={styles.perfilCard}
                            onClick={() => setShowVaquillonasModal(true)}
                        >

                            <div>

                                <h5>Lista de Vaquillonas</h5>

                                <small>Ver todas las vaquillonas registradas</small>

                            </div>
                            <div className={styles.perfilArrow}>
                                →
                            </div>

                        </div>

                    </div>
                </BootstrapModal.Body>
            </BootstrapModal>

            <BootstrapModal show={showVacasModal} onHide={() => setShowVacasModal(false)} centered>
                <BootstrapModal.Header closeButton>
                    <BootstrapModal.Title>Lista de Vacas</BootstrapModal.Title>
                </BootstrapModal.Header>
                <BootstrapModal.Body>
                    <div className={styles.listaPerfil}>
                        <p>
                            <strong>Vacas</strong>
                            <span>{vacas}</span>
                        </p>
                        <p>
                            <strong>Vacas en Ordeñe</strong>
                            <span>{vacasEnOrdeñe}</span>
                        </p>
                        <p>
                            <strong>Vacas Secas</strong>
                            <span>{vacasSecas}</span>
                        </p>
                    </div>
                </BootstrapModal.Body>
            </BootstrapModal>

            <BootstrapModal show={showVaquillonasModal} onHide={() => setShowVaquillonasModal(false)} centered>
                <BootstrapModal.Header closeButton>
                    <BootstrapModal.Title>Lista de Vaquillonas</BootstrapModal.Title>
                </BootstrapModal.Header>
                <BootstrapModal.Body>
                    <div className={styles.listaPerfil}>
                        <p>
                            <strong>Vaquillonas</strong>
                            <span>{vaquillonas}</span>
                        </p>
                        <p>
                            <strong>Vaquillonas en Ordeñe</strong>
                            <span>{vaquillonasEnOrdeñe}</span>
                        </p>
                        <p>
                            <strong>Vaquillonas Secas</strong>
                            <span>{vaquillonasSecas}</span>
                        </p>
                        <p>
                            <strong>Crias</strong>
                            <span>{crias}</span>
                        </p>
                    </div>
                </BootstrapModal.Body>
            </BootstrapModal>
        </div>
    );
};
