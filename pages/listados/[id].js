// [id].js adaptado para modal
import React, { useEffect, useContext, useState } from 'react';
import { FirebaseContext } from '../../firebase2';
import useValidacion from '../../hook/useValidacion';
import validarCrearListado from '../../validacion/validarCrearListado';
import { Form, Button, Alert, Spinner, Row, Col, Modal } from 'react-bootstrap';
import { Contenedor, Mensaje, ContenedorSpinner } from '../../components/ui/Elementos';
import styles from '../../styles/Listados.module.scss';
const STATE_INICIAL = {
    tipo: '',
    descripcion: ''
}

const ListadoModal = ({ show, onHide, idListado }) => {
    const [exito, guardarExito] = useState(false);
    const [descExito, guardarDescExito] = useState('');
    const [error, guardarError] = useState(false);
    const [descError, guardarDescError] = useState('');
    const [procesando, guardarProcesando] = useState(false);
    const [listado, guardarListado] = useState({});

    const { usuario, firebase, tamboSel } = useContext(FirebaseContext);

    const { valores, errores, handleSubmit, handleChange, handleBlur, guardarValores } =
        useValidacion(STATE_INICIAL, validarCrearListado, editListado);
    const { tipo, descripcion } = valores;

    useEffect(() => {
        if (show && idListado) {
            if (idListado === "0") {
                guardarValores(STATE_INICIAL);
                guardarError(false);
            } else {
                const obtenerListado = async () => {
                    const listadoQuery = await firebase.db.collection('listado').doc(idListado);
                    const listado = await listadoQuery.get();
                    if (listado.exists) {
                        guardarValores(listado.data());
                    } else {
                        guardarDescError("La opción no existe");
                        guardarError(true);
                    }
                }
                obtenerListado();
            }
        }
    }, [show, idListado]);

    async function editListado() {
        guardarProcesando(true);
        if (idListado === "0") {
            if (!usuario) return;

            const nuevoListado = { idtambo: tamboSel.id, tipo, descripcion };
            try {
                await firebase.db.collection('listado').add(nuevoListado);
                guardarExito(true);
                guardarDescExito("Opción creada con éxito!");
            } catch (error) {
                guardarDescError(error.message);
                guardarError(true);
            }
        } else {
            try {
                await firebase.db.collection('listado').doc(idListado).update(valores);
                guardarExito(true);
                guardarDescExito("Opción editada con éxito!");
            } catch (error) {
                guardarDescError(error.message);
                guardarError(true);
            }
            guardarListado(valores);
        }
        guardarProcesando(false);
    }

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="lg"
            backdrop="static"
            centered
            className={styles.customModal}
        >
            <Modal.Header
                closeButton
                className={idListado === "0" ? styles.headerNuevo : styles.headerEditar}
            >
                <Modal.Title>
                    {idListado === "0" ? "Nueva Opción" : "Editar Opción"}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {procesando ? (
                    <div className={styles.loaderOverlay}>
                        <div className={styles.loaderCircle}></div>
                        <div className={styles.loaderText}>
                            {idListado === "0"
                                ? "Generando nueva opción, por favor espere..."
                                : "Guardando cambios, por favor espere..."}
                        </div>
                    </div>
                ) : (
                    <>
                        <Mensaje>
                            <Alert variant="success" show={exito} className={styles.alertCustom}>{descExito}</Alert>
                            <Alert variant="danger" show={error} className={styles.alertCustom}>
                                <Alert.Heading>Oops! Se ha producido un error!</Alert.Heading>
                                <p>{descError}</p>
                            </Alert>
                        </Mensaje>
                        <Contenedor>
                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col>
                                        <Form.Group>
                                            <Form.Label>Tipo</Form.Label>
                                            <Form.Control
                                                as="select"
                                                id="tipo"
                                                name="tipo"
                                                value={tipo}
                                                placeholder="seleccione tipo"
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="0">Seleccione tipo...</option>
                                                <option value="servicio">Tipo Servicio</option>
                                                <option value="tratamiento">Tratamiento</option>
                                                <option value="enfermedad">Enfermedad</option>
                                                <option value="baja">Motivo de Baja</option>
                                            </Form.Control>
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group>
                                            <Form.Label>Descripción</Form.Label>
                                            <Form.Control
                                                type="string"
                                                id="descripcion"
                                                placeholder="descripcion"
                                                name="descripcion"
                                                value={descripcion}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                            />
                                            {errores.descripcion && (
                                                <Alert variant="danger">{errores.descripcion}</Alert>
                                            )}
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Button
                                    variant="success"
                                    type="submit"
                                    block
                                    className={styles.btnPrimary} // ← aquí
                                >
                                    Guardar
                                </Button>

                            </Form>
                        </Contenedor>
                    </>
                )}
            </Modal.Body>
        </Modal>
    );
}

export default ListadoModal;
