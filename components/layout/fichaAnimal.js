import React, { useContext, useEffect, useState } from 'react';
import { Row, Tab, Tabs, Col, Modal, Button, Table } from 'react-bootstrap';
import { FirebaseContext } from '../../firebase2';
import { Alert } from 'react-bootstrap';
import DetalleEventoAnimal from './detalleEventoAnimal';
import styles from '../../styles/gralAnimales.module.scss';

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

    return (
        <Modal show={show} onHide={handleClose}
            size="lg"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title>
                    RP: {rp} - eRP: {erp}

                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Tabs defaultActiveKey="general" >
                    <Tab eventKey="general" title="General">
                        <div className="p-3">
                            <Row>
                                {/* Primera columna */}
                                <Col lg={4}>
                                    <p><b>Est. Prod.:</b> {estpro}</p>
                                    <p><b>Est. Rep.:</b> {estrep}</p>
                                    <p><b>Categoría:</b> {categoria}</p>
                                    <p><b>Grupo:</b> {grupo}</p>
                                    <p><b>Ración:</b> {racion}</p>
                                </Col>

                                {/* Segunda columna */}
                                <Col lg={4}>
                                    <p><b>Ult. Serv.:</b> {fservicio}</p>
                                    <p><b>Ult. Parto:</b> {fparto}</p>
                                    <p><b>Ult. Control:</b> {formatDate(fuc)}</p>
                                    <p><b>Ingreso:</b> {ingreso}</p>
                                </Col>

                                {/* Tercera columna */}
                                <Col lg={4}>
                                    <p><b>Lactancias:</b> {lactancia}</p>
                                    <p><b>Nro. Serv.:</b> {nservicio}</p>
                                    <p><b>C. Anterior:</b> {ca}</p>
                                    <p><b>C. Lechero:</b> {uc}</p>
                                    <p><b>Anorm.:</b> {anorm}</p>
                                </Col>
                            </Row>

                            {/* Observaciones debajo en el medio */}
                            <Row className="mt-3">
                                <Col lg={{ span: 8, offset: 2 }}>
                                    <p><b>Observaciones:</b> {observaciones}</p>
                                </Col>
                            </Row>
                        </div>
                    </Tab>

                    <Tab eventKey="eventos" title="Eventos">
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
    );
}

export default FichaAnimal;