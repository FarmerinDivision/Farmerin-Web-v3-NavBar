
import React, { useState, useContext, useEffect } from 'react';
import { Modal, Button, Form, ListGroup } from 'react-bootstrap';
import { FirebaseContext } from '../../firebase2';

const AdminTamboSelector = () => {
    const { firebase, guardarTamboSel, tamboSel } = useContext(FirebaseContext);
    const [show, setShow] = useState(false);
    const [tambos, setTambos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => {
        setShow(true);
        if (tambos.length === 0) {
            fetchTambos();
        }
    };

    const fetchTambos = async () => {
        setCargando(true);
        try {
            // Traemos todos los tambos (limitado a 50 inicialmente si son muchos, o todos si son pocos)
            // Para admin global asumimos que puede ver todos o una lista grande.
            // Optimizacion: Solo traer id y nombre
            const snapshot = await firebase.db.collection('tambo').orderBy('nombre').get();
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTambos(lista);
        } catch (error) {
            console.error("Error fetching tambos:", error);
        }
        setCargando(false);
    };

    const seleccionarTambo = (tambo) => {
        guardarTamboSel(tambo);
        handleClose();
    };

    const filtrados = tambos.filter(t =>
        t.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="mb-3 p-3 bg-white border rounded shadow-sm d-flex align-items-center justify-content-between">
            <div>
                <strong>Tambo Seleccionado: </strong>
                <span className="text-primary">{tamboSel ? tamboSel.nombre : 'Ninguno'}</span>
            </div>
            <Button variant="outline-primary" size="sm" onClick={handleShow}>
                Cambiar Tambo
            </Button>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Seleccionar Tambo</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Control
                            type="text"
                            placeholder="Buscar tambo..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </Form.Group>

                    {cargando ? (
                        <p className="text-center">Cargando...</p>
                    ) : (
                        <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {filtrados.map(t => (
                                <ListGroup.Item
                                    key={t.id}
                                    action
                                    onClick={() => seleccionarTambo(t)}
                                    active={tamboSel?.id === t.id}
                                >
                                    {t.nombre}
                                </ListGroup.Item>
                            ))}
                            {filtrados.length === 0 && <p className="text-center mt-2">No se encontraron resultados</p>}
                        </ListGroup>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AdminTamboSelector;
