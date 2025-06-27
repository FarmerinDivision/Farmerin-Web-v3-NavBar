import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleListado from '../components/layout/detalleListado';
import StickyTable from 'react-sticky-table-thead';
import SelectTambo from '../components/layout/selectTambo';
import { Button, Form, Row, Col, Table, Modal } from 'react-bootstrap';
import { RiAddBoxLine } from 'react-icons/ri';
import Listado from './listados/[id]'; // reutilizamos el componente de edición
import styles from '../styles/Listados.module.scss';

const Listados = () => {
  const [listados, guardarListados] = useState([]);
  const [tipo, guardarTipo] = useState('todos');
  const [showNuevo, setShowNuevo] = useState(false);

  const { firebase, tamboSel } = useContext(FirebaseContext);

  useEffect(() => {
    if (tamboSel) {
      const unsubscribe = firebase.db
        .collection('listado')
        .where('idtambo', '==', tamboSel.id)
        .onSnapshot(manejarSnapshot);

      return () => unsubscribe();
    }
  }, [tipo, tamboSel]);

  const manejarSnapshot = (snapshot) => {
    const datos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (tipo !== 'todos') {
      guardarListados(datos.filter((l) => l.tipo.includes(tipo)));
    } else {
      guardarListados(datos);
    }
  };

  const handleChange = (e) => {
    guardarTipo(e.target.value);
  };

  const handleCloseNuevo = () => setShowNuevo(false);

  return (
    <Layout titulo="Listados">
      <div className={styles.listadosContainer}>
        <h2 className={styles.tituloSeccion}>
          📋 Listados de{' '}
          <strong className={styles.nombreTambo}>{tamboSel?.nombre}</strong>
        </h2>

        {/* Filtro y botón nueva opción */}
        <div className={styles.botoneraTipo}>
          <Row>
            <Col>
              <Form.Control
                as="select"
                id="tipo"
                name="tipo"
                value={tipo}
                className={styles.selectorTipo}
                onChange={handleChange}
                required
              >
                <option value="todos">Todos...</option>
                <option value="servicio">Servicio</option>
                <option value="tratamiento">Tratamiento</option>
                <option value="enfermedad">Enfermedad</option>
                <option value="baja">Motivo de Baja</option>
              </Form.Control>
            </Col>

            <Col md="auto">
              <Button
                className={styles.botonNuevo}
                onClick={() => setShowNuevo(true)}
              >
                <RiAddBoxLine size={20} />
                Nueva Opción
              </Button>
            </Col>
          </Row>
        </div>

        {/* Tabla de resultados */}
        <div className={styles.tablaContainer}>
          {tamboSel ? (
            <StickyTable height={500}>
              <Table className={styles.tablaListados} responsive>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {listados.map((l) => (
                    <DetalleListado key={l.id} listado={l} />
                  ))}
                </tbody>
              </Table>
            </StickyTable>
          ) : (
            <SelectTambo />
          )}
        </div>
      </div>

      {/* MODAL NUEVA OPCIÓN */}
      <Modal
        show={showNuevo}
        onHide={handleCloseNuevo}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Nueva Opción</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Listado
            idListado=""
            isModal={true}
            onClose={handleCloseNuevo}
          />
        </Modal.Body>
      </Modal>
    </Layout>
  );
};

export default Listados;
