import React, { useContext, useEffect, useState } from 'react';
import { Tab, Tabs, Modal, Button, Table } from 'react-bootstrap';
import { FirebaseContext } from '../../firebase2';
import { Alert } from 'react-bootstrap';
import DetalleEventoAnimal from './detalleEventoAnimal';
import styles from '../../styles/fichaAnimal.module.scss';

/* NUEVO DISEÑO MODAL FICHA
   Problema raíz identificado: bootstrap.min.css se carga DESPUÉS de globals.css en _app.js,
   por lo que las reglas de .modal-dialog { max-width: 500px } de Bootstrap pisaban nuestros estilos.
   Solución: se aplican inline styles directamente al dialog, que siempre tienen mayor especificidad. */

/* NUEVO DISEÑO MODAL FICHA — estilos inline para el dialog (máxima especificidad) */
const DIALOG_STYLE = {
    width: '90vw',
    maxWidth: '1400px',
};

/* NUEVO DISEÑO MODAL FICHA — estilos inline para el contenido del modal */
const CONTENT_STYLE = {
    maxHeight: '90vh',
    borderRadius: '14px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

/* NUEVO DISEÑO MODAL FICHA — estilos inline para el header oscuro */
const HEADER_STYLE = {
    background: 'linear-gradient(135deg, #fdfdffff 0%, #ffffffff 100%)',
    color: '#171616ff',
    borderBottom: 'none',
    padding: '18px 24px 14px',
    flexShrink: 0,
};

const FichaAnimal = ({ animal, show, setShow }) => {
    const { id, rp, erp, lactancia, ingreso, categoria, estrep, nservicio, fservicio, estpro, fparto, racion, uc, ca, anorm, observaciones, grupo, fuc } = animal;

    const handleClose = () => { setShow(false) };
    const [eventos, guardarEventos] = useState([]);
    const { firebase } = useContext(FirebaseContext);
    const [mostrarTodos, setMostrarTodos] = useState(false);

    useEffect(() => {
        try {
            firebase.db.collection('animal').doc(id).collection('eventos').orderBy('fecha', 'desc').get().then(snapshotEventos);
        } catch (error) {
            console.log(error.message);
        }
    }, []);

    // Función para formatear timestamp de Firebase
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toISOString().split('T')[0]; // yyyy-mm-dd
    };

    function snapshotEventos(snapshot) {
        const eve = snapshot.docs.map(doc => {
            return {
                id: doc.id,
                ...doc.data()
            }
        })
        guardarEventos(eve);
    }

    /* NUEVO DISEÑO MODAL FICHA — helper: muestra valor o guión si está vacío */
    const val = (v) => (v !== undefined && v !== null && v !== '') ? v : '—';

    return (
        <>
            {/* NUEVO DISEÑO MODAL FICHA
                Se inyectan estilos críticos del dialog directamente en el DOM mediante <style>.
                Esto garantiza mayor especificidad que bootstrap.min.css sin modificar otros modales. */}
            <style>{`
                .animal-detail-modal-override {
                    width: 85vw !important;
                    max-width: 1300px !important;
                    min-width: 1050px !important;
                    margin: 1.75rem auto !important;
                }
                @media (max-width: 1100px) {
                    .animal-detail-modal-override {
                        width: 95vw !important;
                        min-width: 0 !important;
                    }
                }
                .animal-detail-modal-override .modal-content {
                    width: 100% !important;
                    max-width: none !important;
                    min-width: 0 !important;
                    max-height: 90vh !important;
                    border-radius: 14px !important;
                    overflow: hidden !important;
                    display: flex !important;
                    flex-direction: column !important;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
                }
                .animal-detail-modal-override .modal-body {
                    padding: 0 !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    flex: 1 1 auto !important;
                }
                .animal-detail-modal-override .modal-footer {
                    border-top: 1px solid #e8ecf0 !important;
                    padding: 12px 24px !important;
                    background: #f8fafc !important;
                    flex-shrink: 0 !important;
                }
                .animal-detail-modal-override .nav-tabs {
                    border-bottom: 2px solid #e8ecf0 !important;
                    padding: 0 24px !important;
                    background: #f8fafc !important;
                }
                .animal-detail-modal-override .nav-tabs .nav-link {
                    font-weight: 600 !important;
                    font-size: 0.9rem !important;
                    color: #6b7280 !important;
                    border: none !important;
                    border-bottom: 3px solid transparent !important;
                    margin-bottom: -2px !important;
                    padding: 10px 20px !important;
                }
                .animal-detail-modal-override .nav-tabs .nav-link.active {
                    color: #17a2b8 !important;
                    border-bottom-color: #17a2b8 !important;
                    background: transparent !important;
                }
            `}</style>

            <Modal
                show={show}
                onHide={handleClose}
                dialogClassName="animal-detail-modal-override"
                centered
            >
                {/* NUEVO DISEÑO MODAL FICHA — Header oscuro con inline style para máxima especificidad */}
                <Modal.Header closeButton style={HEADER_STYLE}>
                    <div className={styles.fichaHeader}>
                        <div className={styles.fichaHeaderRp}>
                            RP: {val(rp)}
                            {estpro && (
                                <span className={styles.fichaBadgeEstado}>{estpro}</span>
                            )}
                        </div>
                        <div className={styles.fichaHeaderSub}>
                            eRP: {val(erp)}&nbsp;&nbsp;•&nbsp;&nbsp;{val(categoria)}
                        </div>
                    </div>
                </Modal.Header>

                <Modal.Body>
                    <Tabs defaultActiveKey="general">

                        {/* ===== PESTAÑA GENERAL ===== */}
                        <Tab eventKey="general" title="General">
                            <div className={styles.fichaBody}>

                                {/* NUEVO DISEÑO MODAL FICHA — Fila 1: 4 tarjetas en grid */}
                                <div className={styles.fichaGrid}>

                                    {/* Tarjeta — Info. General */}
                                    <div className={styles.fichaCard}>
                                        <div className={styles.fichaCardTitle}>
                                            <span className={styles.fichaCardIcon}>📋</span>
                                            Info. General
                                        </div>
                                        <div className={styles.fichaDataRow}>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Ingreso</span>
                                                <span className={val(ingreso) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(ingreso)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Anorm.</span>
                                                <span className={val(anorm) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(anorm)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tarjeta — Productiva */}
                                    <div className={styles.fichaCard}>
                                        <div className={styles.fichaCardTitle}>
                                            <span className={styles.fichaCardIcon}>🐄</span>
                                            Productiva
                                        </div>
                                        <div className={styles.fichaDataRow}>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Categoría</span>
                                                <span className={val(categoria) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(categoria)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Lactancias</span>
                                                <span className={val(lactancia) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(lactancia)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>C. Anterior</span>
                                                <span className={val(ca) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(ca)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Últ. Control</span>
                                                <span className={formatDate(fuc) ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {formatDate(fuc) || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tarjeta — Estado */}
                                    <div className={styles.fichaCard}>
                                        <div className={styles.fichaCardTitle}>
                                            <span className={styles.fichaCardIcon}>📊</span>
                                            Estado
                                        </div>
                                        <div className={styles.fichaDataRow}>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Estado Prod.</span>
                                                <span className={val(estpro) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(estpro)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>C. Lechero</span>
                                                <span className={val(uc) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(uc)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tarjeta — Reproducción */}
                                    <div className={styles.fichaCard}>
                                        <div className={styles.fichaCardTitle}>
                                            <span className={styles.fichaCardIcon}>🔬</span>
                                            Reproducción
                                        </div>
                                        <div className={styles.fichaDataRow}>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Estado Rep.</span>
                                                <span className={val(estrep) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(estrep)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Últ. Parto</span>
                                                <span className={val(fparto) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(fparto)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Nro. Serv.</span>
                                                <span className={val(nservicio) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(nservicio)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Últ. Servicio</span>
                                                <span className={val(fservicio) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(fservicio)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                {/* fin fichaGrid — fila 1 */}

                                {/* NUEVO DISEÑO MODAL FICHA — Fila 2: Identificación + Alimentación */}
                                <div className={styles.fichaGridBottom}>

                                    {/* Tarjeta — Identificación */}
                                    <div className={styles.fichaCard}>
                                        <div className={styles.fichaCardTitle}>
                                            <span className={styles.fichaCardIcon}>🏷️</span>
                                            Identificación
                                        </div>
                                        <div className={styles.fichaDataRow}>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>RP</span>
                                                <span className={val(rp) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(rp)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>ERP</span>
                                                <span className={val(erp) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(erp)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tarjeta — Alimentación */}
                                    <div className={styles.fichaCard}>
                                        <div className={styles.fichaCardTitle}>
                                            <span className={styles.fichaCardIcon}>🌾</span>
                                            Alimentación
                                        </div>
                                        <div className={styles.fichaDataRow}>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Grupo</span>
                                                <span className={val(grupo) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(grupo)}
                                                </span>
                                            </div>
                                            <div className={styles.fichaDataItem}>
                                                <span className={styles.fichaDataLabel}>Ración (kg)</span>
                                                <span className={val(racion) !== '—' ? styles.fichaDataValue : styles.fichaDataValueEmpty}>
                                                    {val(racion)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                {/* fin fichaGridBottom — fila 2 */}

                                {/* Observaciones — se muestra solo si tiene valor */}
                                {observaciones && (
                                    <div className={styles.fichaObservaciones}>
                                        <strong>Observaciones:</strong> {observaciones}
                                    </div>
                                )}

                            </div>
                        </Tab>

                        {/* ===== PESTAÑA EVENTOS — lógica 100% original ===== */}
                        <Tab eventKey="eventos" title="Eventos">
                            <div className={styles.fichaBody}>
                                {eventos.length === 0 ? (
                                    <Alert variant="warning">No hay eventos registrados</Alert>
                                ) : (
                                    <>
                                        <Table responsive>
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
                                        </Table>
                                        {eventos.length > 3 && (
                                            <div className="text-center mt-3">
                                                <Button
                                                    className={styles.fichaBotonToggle}
                                                    onClick={() => setMostrarTodos(!mostrarTodos)}
                                                >
                                                    {mostrarTodos ? 'Ver menos' : 'Ver más'}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Tab>

                    </Tabs>
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="info"
                        onClick={handleClose}
                    >
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default FichaAnimal;