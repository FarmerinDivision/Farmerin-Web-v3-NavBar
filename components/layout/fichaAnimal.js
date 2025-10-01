import React, { useContext, useEffect, useState } from 'react';
import { Row, Tab, Tabs, Col, Modal, Button, Table } from 'react-bootstrap';
import { FirebaseContext } from '../../firebase2';
import { Alert } from 'react-bootstrap';
import DetalleEventoAnimal from './detalleEventoAnimal';
import styles from '../../styles/gralAnimales.module.scss';

const FichaAnimal = ({ animal, show, setShow }) => {
    const { id, rp, erp, lactancia, ingreso, categoria, estrep, nservicio, fservicio, estpro, fparto, racion, uc, ca, anorm, observaciones } = animal;

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
                        &nbsp;
                        <Row>
                            <Col lg={true}>
                                <p><b>Ingreso:</b>&nbsp;{ingreso}</p>
                            </Col>
                            
                            <Col lg={true}>
                                <p><b>Categoria:</b>&nbsp;{categoria}</p>
                            </Col>
                            <Col lg={true}>
                                <p><b>Lactancias:</b>&nbsp;{lactancia}</p>
                            </Col>
                        </Row>
                        <Row>
                            <Col lg={true}>
                                <p><b>Est. Rep.:</b>&nbsp;{estrep}</p>
                            </Col>
                            <Col lg={true}>
                                <p><b>Ult. Serv.:</b>&nbsp;{fservicio}</p>
                            </Col>
                            <Col lg={true}>
                                <p><b>Nro. Serv.:</b>&nbsp;{nservicio}</p>
                            </Col>
                        </Row>
                        <Row>
                            <Col lg={true}>
                                <p><b>Est. Prod.:</b>&nbsp;{estpro}</p>
                            </Col>
                            <Col lg={true}>
                                <p><b>Ult. Parto:</b>&nbsp;{fparto}</p>
                            </Col>
                            <Col lg={true}>
                                <p><b>Ración:</b>&nbsp;{racion}</p>
                            </Col>
                        </Row>
                        <Row>
                            <Col lg={true}>
                                <p><b>C. Lechero:</b>&nbsp;{uc}</p>
                            </Col>
                            <Col lg={true}>
                                <p><b>Anorm.:</b>&nbsp;{anorm}</p>
                            </Col>
                            <Col lg={true}>
                                <p><b>C. Anterior:</b>&nbsp;{ca}</p>
                            </Col>
                        </Row>
                        <Row>
                            <Col lg={true}>
                                <p><b>Observaciones:</b>&nbsp;{observaciones}</p>
                            </Col>
                        </Row>

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