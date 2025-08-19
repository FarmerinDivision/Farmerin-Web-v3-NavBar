import React, { useState, useEffect, useContext } from 'react'
import { FirebaseContext } from '../firebase2';
import { Botonera, Contenedor } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import StickyTable from "react-sticky-table-thead"
import SelectTambo from '../components/layout/selectTambo';
import { Button, Form, Row, Col, Table, Modal } from 'react-bootstrap';
import { RiAddBoxLine, RiEdit2Line, RiDeleteBin2Line } from 'react-icons/ri';
import ListadoModal from './listados/[id]';
import styles from '../styles/Listados.module.scss';

const Listados = () => {

  const [listados, guardarListados] = useState([]);
  const [tipo, guardarTipo] = useState('todos');
  const { firebase, tamboSel } = useContext(FirebaseContext);

  // states modal editar/crear
  const [showModal, setShowModal] = useState(false);
  const [idListadoSel, setIdListadoSel] = useState("0");

  // states modal eliminar
  const [showEliminar, setShowEliminar] = useState(false);
  const [idEliminar, setIdEliminar] = useState(null);

  useEffect(() => {
    if (tamboSel) {
      const obtenerListados = () => {
        firebase.db
          .collection('listado')
          .where('idtambo', '==', tamboSel.id)
          .onSnapshot(manejarSnapshot)
      }
      obtenerListados();
    }
  }, [tipo, tamboSel]);

  function manejarSnapshot(snapshot) {
    const listadosData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (tipo !== "todos") {
      const filtro = listadosData.filter(l => l.tipo.includes(tipo));
      guardarListados(filtro);
    } else {
      guardarListados(listadosData);
    }
  }

  const handleChange = e => {
    guardarTipo(e.target.value);
  }

  const abrirModal = (id) => {
    setIdListadoSel(id);
    setShowModal(true);
  };

  const handleShowElim = (id) => {
    setIdEliminar(id);
    setShowEliminar(true);
  };

  const eliminarListado = async () => {
    if (!idEliminar) return;
    try {
      await firebase.db.collection('listado').doc(idEliminar).delete();
    } catch (error) {
      console.error("Error eliminando listado:", error);
    }
    setShowEliminar(false);
    setIdEliminar(null);
  };

  return (
    <Layout titulo="Listados">
      <>
        <Botonera>
          <h5>Tipos</h5>
          <Row>
            <Col lg={true}>
              <Form.Control
                as="select"
                id="tipo"
                name="tipo"
                value={tipo}
                placeholder="Seleccione tipo"
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
                className={styles.btnNuevaOpcion}
                onClick={() => abrirModal("0")}
              >
                <RiAddBoxLine size={22} />
                Nueva Opción
              </Button>
            </Col>
          </Row>
        </Botonera>

        <Contenedor>
          {tamboSel ?
            <StickyTable height={670}>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {listados.map(l => (
                    <tr key={l.id}>
                      <td>{l.tipo}</td>
                      <td>{l.descripcion}</td>
                      <td>
                        <div className={styles.tooltipWrapper}>
                          <Button
                            className={styles.btnIconoEditar}
                            onClick={() => abrirModal(l.id)}
                          >
                            <RiEdit2Line size={20} />
                          </Button>
                          <span className={styles.tooltipText}>Editar listado</span>
                        </div>

                        <div className={styles.tooltipWrapper}>
                          <Button
                            className={styles.btnIconoEliminar}
                            onClick={() => handleShowElim(l.id)}
                          >
                            <RiDeleteBin2Line size={20} />
                          </Button>
                          <span className={styles.tooltipText}>Eliminar listado</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </StickyTable>
            :
            <SelectTambo />
          }
        </Contenedor>

        {/* Modal para alta/edición */}
        <ListadoModal
          show={showModal}
          onHide={() => setShowModal(false)}
          idListado={idListadoSel}
        />

        {/* Modal confirmación eliminar */}
        <Modal show={showEliminar} onHide={() => setShowEliminar(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirmar eliminación</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            ¿Seguro que deseas eliminar este listado? Esta acción no se puede deshacer.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEliminar(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={eliminarListado}>
              Eliminar
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    </Layout>
  )
}

export default Listados;
