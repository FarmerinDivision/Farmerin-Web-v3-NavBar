import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FirebaseContext } from '../../firebase2';
import Layout from '../../components/layout/layout';
import DetalleEventoAnimal from '../../components/layout/detalleEventoAnimal';
import { Tab, Tabs, Alert } from 'react-bootstrap';
import Lottie from 'lottie-react';
import vacaAnimacion from '../../public/animaciones/Animation - Vaca.json';
import styles from '../../styles/animalDetail.module.scss';
import {
    RiBarChart2Line,
    RiHeartPulseLine,
    RiInformationLine,
    RiChat1Line,
    RiArrowLeftLine
} from 'react-icons/ri';

const AnimalDetail = () => {
    const router = useRouter();
    const { id, from } = router.query;
    
    const backUrl = from === 'gralAnimales' ? '/gralAnimales' : '/animales';
    const backText = from === 'gralAnimales' ? 'Volver a Gral Animales' : 'Volver a Animales';

    const { firebase } = useContext(FirebaseContext);

    const [animal, setAnimal] = useState(null);
    const [eventos, guardarEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [mostrarTodos, setMostrarTodos] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchAnimalData = async () => {
            try {
                // Fetch animal
                const doc = await firebase.db.collection('animal').doc(id).get();
                if (doc.exists) {
                    setAnimal({ id: doc.id, ...doc.data() });
                } else {
                    setError('Animal no encontrado.');
                }

                // Fetch eventos
                const snapshotEventos = await firebase.db.collection('animal').doc(id).collection('eventos').orderBy('fecha', 'desc').get();
                const eve = snapshotEventos.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                guardarEventos(eve);
            } catch (err) {
                console.error(err);
                setError('Hubo un error al cargar los datos.');
            } finally {
                setCargando(false);
            }
        };

        fetchAnimalData();
    }, [id, firebase]);

    const formatDate = (timestamp) => {
        if (!timestamp) return '—';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toISOString().split('T')[0];
    };

    const getStatusStyle = (status) => {
        if (!status) return styles.badgeStatus;
        const lower = status.toLowerCase();
        if (lower.includes('seca')) return styles.badgeStatusSeca;
        if (lower.includes('vacia') || lower.includes('vacía')) return styles.badgeStatusVacia;
        if (lower.includes('preñada')) return styles.badgeStatusPreñada;
        if (lower.includes('ordeñe')) return styles.badgeStatusOrdeñe;
        return styles.badgeStatus;
    };

    if (cargando) {
        return (
            <Layout titulo="Cargando Animal...">
                <div className={styles.loaderContainer}>
                    <div style={{ maxWidth: 300, textAlign: 'center' }}>
                        <Lottie animationData={vacaAnimacion} loop autoplay />
                        <p className={styles.textoLoader}>CARGANDO FICHA DEL ANIMAL...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !animal) {
        return (
            <Layout titulo="Error">
                <div className={styles.pageContainer}>
                    <Alert variant="danger">{error || 'Animal no encontrado.'}</Alert>
                    <Link href={backUrl}>
                        <button className="btn btn-secondary mt-3">{backText}</button>
                    </Link>
                </div>
            </Layout>
        );
    }

    const { rp, erp, lactancia, ingreso, categoria, estrep, nservicio, fservicio, estpro, fparto, racion, uc, ca, anorm, observaciones, grupo, fuc } = animal;

    return (
        <Layout titulo={`Animal RP: ${rp || 'Sin RP'}`}>
            <div className={styles.pageContainer}>
                
                {/* BACK LINK */}
                <div className={styles.backLinkContainer}>
                    <Link href={backUrl} passHref>
                        <a className={styles.backLink}>
                            <RiArrowLeftLine size={20} />
                            {backText}
                        </a>
                    </Link>
                </div>

                {/* HEADER CARD */}
                <div className={styles.headerCard}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleRow}>
                            <h2 className={styles.mainTitle}>RP: {rp}</h2>
                            {estpro && (
                                <span className={getStatusStyle(estpro)}>
                                    {estpro}
                                </span>
                            )}
                        </div>
                        <div className={styles.metaInfo}>
                            <span>eRP: {erp || '—'}</span>
                            <span>•</span>
                            <span>{categoria || 'Sin categoría'}</span>
                        </div>
                    </div>
                </div>

                {/* TABS & CONTENT */}
                <div className={styles.tabsContainer}>
                    <Tabs defaultActiveKey="general">
                        <Tab eventKey="general" title="General">
                            <div className={styles.gridContainer}>
                                
                                {/* Información General */}
                                <div className={styles.cardSection}>
                                    <div className={styles.cardHeader}>
                                        <RiInformationLine /> <h4>Info. General</h4>
                                    </div>
                                    <div className={styles.cardInnerGrid1Col}>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Ingreso</span>
                                            <span className={styles.dataValue}>{ingreso || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Productiva */}
                                <div className={styles.cardSection}>
                                    <div className={styles.cardHeader}>
                                        <RiBarChart2Line /> <h4>Productiva</h4>
                                    </div>
                                    <div className={styles.cardInnerGrid1Col}>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Categoría</span>
                                            <span className={styles.dataValue}>{categoria || 'Sin categoría'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Lactancias</span>
                                            <span className={styles.dataValue}>{lactancia || '0'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>C. Anterior</span>
                                            <span className={styles.dataValue}>{ca || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Estado */}
                                <div className={styles.cardSection}>
                                    <div className={styles.cardHeader}>
                                        <RiHeartPulseLine /> <h4>Estado</h4>
                                    </div>
                                    <div className={styles.cardInnerGrid1Col}>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Estado Prod.</span>
                                            <span className={styles.dataValue}>{estpro || '—'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>C. Lechero</span>
                                            <span className={styles.dataValue}>{uc || '—'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Últ. Control</span>
                                            <span className={styles.dataValue}>{formatDate(fuc)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Reproducción */}
                                <div className={styles.cardSection}>
                                    <div className={styles.cardHeader}>
                                        <RiHeartPulseLine /> <h4>Reproducción</h4>
                                    </div>
                                    <div className={styles.cardInnerGrid1Col}>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Estado Reprod.</span>
                                            <span className={styles.dataValue}>{estrep || '—'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Últ. Parto</span>
                                            <span className={styles.dataValue}>{fparto || '—'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Últ. Servicio</span>
                                            <span className={styles.dataValue}>{fservicio || '—'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Servicios</span>
                                            <span className={styles.dataValue}>{nservicio || '0'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Anormalidad</span>
                                            <span className={styles.dataValue}>{anorm || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Identificación (2 cols) */}
                                <div className={`${styles.cardSection} ${styles.colSpan2}`}>
                                    <div className={styles.cardHeader}>
                                        <RiInformationLine /> <h4>Identificación</h4>
                                    </div>
                                    <div className={styles.cardInnerGrid}>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>RP</span>
                                            <span className={styles.dataValue}>{rp || '—'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>eRP</span>
                                            <span className={styles.dataValue}>{erp || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Alimentación (2 cols) */}
                                <div className={`${styles.cardSection} ${styles.colSpan2}`}>
                                    <div className={styles.cardHeader}>
                                        <RiInformationLine /> <h4>Alimentación</h4>
                                    </div>
                                    <div className={styles.cardInnerGrid}>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Grupo</span>
                                            <span className={styles.dataValue}>{grupo || '—'}</span>
                                        </div>
                                        <div className={styles.dataRow}>
                                            <span className={styles.dataLabel}>Ración (kg)</span>
                                            <span className={styles.dataValue}>{racion || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Observaciones (full width) */}
                                <div className={`${styles.cardSection} ${styles.colSpan4}`}>
                                    <div className={styles.cardHeader}>
                                        <RiChat1Line /> <h4>Observaciones</h4>
                                    </div>
                                    <div className={styles.cardInnerGrid1Col}>
                                        {observaciones ? (
                                            <span className={styles.dataValue}>{observaciones}</span>
                                        ) : (
                                            <span className={styles.emptyObs}>Sin observaciones registradas.</span>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </Tab>

                        <Tab eventKey="eventos" title="Eventos">
                            <div className={styles.gridContainer} style={{ display: 'block' }}>
                                {eventos.length === 0 ? (
                                    <Alert variant="info" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#475569', borderRadius: '12px' }}>
                                        No hay eventos registrados para este animal.
                                    </Alert>
                                ) : (
                                    <div className={styles.timelineWrapper}>
                                        <table className={styles.timelineTable}>
                                            <thead>
                                                <tr>
                                                    <th>Fecha</th>
                                                    <th>Evento</th>
                                                    <th>Detalle</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(mostrarTodos ? eventos : eventos.slice(0, 3)).map((e) => (
                                                    <DetalleEventoAnimal key={e.id} evento={e} />
                                                ))}
                                            </tbody>
                                        </table>

                                        {eventos.length > 3 && (
                                            <div className="text-center">
                                                <button
                                                    className={styles.timelineToggleBtn}
                                                    onClick={() => setMostrarTodos(!mostrarTodos)}
                                                >
                                                    {mostrarTodos ? 'Ver menos eventos' : `Ver todos (${eventos.length})`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Tab>
                    </Tabs>
                </div>

            </div>
        </Layout>
    );
};

export default AnimalDetail;
