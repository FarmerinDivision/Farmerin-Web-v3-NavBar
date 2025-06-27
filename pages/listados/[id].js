import React, { useEffect, useContext, useState } from 'react';
import { FirebaseContext } from '../../firebase2';
import { useRouter } from 'next/router';
import useValidacion from '../../hook/useValidacion';
import validarCrearListado from '../../validacion/validarCrearListado';
import { Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import Link from 'next/link';
import { ContenedorSpinner, Mensaje } from '../../components/ui/Elementos';
import styles from '../../styles/Listados.module.scss';

const STATE_INICIAL = {
    tipo: '',
    descripcion: ''
};

const Listado = ({ idListado = null, isModal = false, onClose = null }) => {
    const router = useRouter();
    const idFromRouter = router?.query?.id;
    const id = idListado || idFromRouter;

    const [exito, guardarExito] = useState(false);
    const [descExito, guardarDescExito] = useState('');
    const [error, guardarError] = useState(false);
    const [descError, guardarDescError] = useState('');
    const [procesando, guardarProcesando] = useState(false);
    const { usuario, firebase, tamboSel } = useContext(FirebaseContext);

    const titulo = id === '0' || idListado === '0' ? 'Nueva Opción' : 'Editar Opción';

    const {
        valores,
        errores,
        handleSubmit,
        handleChange,
        handleBlur,
        guardarValores
    } = useValidacion(STATE_INICIAL, validarCrearListado, editListado);

    const { tipo, descripcion } = valores;

    useEffect(() => {
        if (!id || id === '0') return;

        const obtenerListado = async () => {
            try {
                const doc = await firebase.db.collection('listado').doc(id).get();
                if (doc.exists) {
                    const data = doc.data();
                    // Validar que el tipo sea válido
                    const tipoValido = ['servicio', 'tratamiento', 'enfermedad', 'baja'].includes(data.tipo);
                    guardarValores({
                        ...data,
                        tipo: tipoValido ? data.tipo : ''
                    });
                } else {
                    guardarDescError('La opción no existe');
                    guardarError(true);
                }
            } catch (error) {
                guardarDescError(error.message);
                guardarError(true);
            }
        };

        obtenerListado();
    }, [id]);

    async function editListado() {
        guardarProcesando(true);

        if (id === '0') {
            if (!usuario) return router.push('/login');

            const nuevoListado = {
                idtambo: tamboSel.id,
                tipo,
                descripcion
            };

            try {
                await firebase.db.collection('listado').add(nuevoListado);
                guardarExito(true);
                guardarDescExito('Opción creada con éxito!');
            } catch (error) {
                guardarDescError(error.message);
                guardarError(true);
            }
        } else {
            try {
                await firebase.db.collection('listado').doc(id).update(valores);
                guardarExito(true);
                guardarDescExito('Opción editada con éxito!');
            } catch (error) {
                guardarDescError(error.message);
                guardarError(true);
            }
        }

        guardarProcesando(false);

        if (onClose) onClose();
        else router.push('/listados');
    }

    const contenido = (
        <div className={styles.modalContent}>
            {procesando ? (
                <ContenedorSpinner>
                    <Spinner animation="border" variant="info" />
                </ContenedorSpinner>
            ) : (
                <>
                    <div className={styles.alertSection}>
                        <Alert variant="success" show={exito}>{descExito}</Alert>
                        <Alert variant="danger" show={error}>
                            <Alert.Heading>Oops! Se ha producido un error!</Alert.Heading>
                            <p>{descError}</p>
                        </Alert>
                    </div>

                    <Form onSubmit={handleSubmit} className={styles.modalBody}>
                        <Form.Label><h5>Opción</h5></Form.Label>
                        <Row>
                            <Col>
                                <div className={styles.formGroup}>
                                    <Form.Label>Tipo</Form.Label>
                                    <Form.Control
                                        as="select"
                                        id="tipo"
                                        name="tipo"
                                        value={tipo}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Seleccione tipo...</option>
                                        <option value="servicio">Servicio</option>
                                        <option value="tratamiento">Tratamiento</option>
                                        <option value="enfermedad">Enfermedad</option>
                                        <option value="baja">Motivo de Baja</option>
                                    </Form.Control>
                                </div>
                            </Col>
                            <Col>
                                <div className={styles.formGroup}>
                                    <Form.Label>Descripción</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="descripcion"
                                        placeholder="Descripción"
                                        value={descripcion}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        required
                                    />
                                    {errores.descripcion && (
                                        <Alert variant="danger">{errores.descripcion}</Alert>
                                    )}
                                </div>
                            </Col>
                        </Row>

                        <Row className={styles.buttonRow}>
                            <Col>
                                <Button type="submit" variant="success" block>
                                    Guardar
                                </Button>
                            </Col>
                            {!idListado && (
                                <Col>
                                    <Link href="/listados" passHref legacyBehavior onClick={onClose}>
                                        <Button variant="info" block>
                                            Volver
                                        </Button>
                                    </Link>
                                </Col>
                            )}
                            {idListado && onClose && (
                                <Col>
                                    <Button variant="secondary" block onClick={onClose}>
                                        Cancelar
                                    </Button>
                                </Col>
                            )}
                        </Row>
                    </Form>
                </>
            )}
        </div>
    );

    return isModal || idListado ? contenido : (
        <div className={styles.pageWrapper}>
            <h1 className={styles.pageTitle}>{titulo}</h1>
            {contenido}
        </div>
    );
};

export default Listado;
