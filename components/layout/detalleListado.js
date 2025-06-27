import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import { RiEdit2Line, RiDeleteBin2Line } from 'react-icons/ri';
import { Alert, Button, Modal } from 'react-bootstrap';
import Listado from '../../pages/listados/[id]'; // reutilizamos el formulario como componente
import styles from '../../styles/Listados.module.scss';

const DetalleListado = ({ listado }) => {
  const { id, tipo, descripcion } = listado;
  const { usuario, firebase } = useContext(FirebaseContext);

  const [error, guardarError] = useState(false);
  const [descError, guardarDescError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handleCloseDelete = () => {
    setShowDelete(false);
    guardarError(false);
  };

  const handleCloseEdit = () => {
    setShowEdit(false);
  };

  const eliminarListado = async () => {
    try {
      await firebase.db.collection('listado').doc(id).delete();
    } catch (error) {
      guardarDescError(error.message);
      guardarError(true);
    }
  };

  return (
    <>
      <tr>
        <td><h6>{tipo}</h6></td>
        <td><h6>{descripcion}</h6></td>
        <td>
          <div className={styles.tooltipWrapper}>
            <Button
              className={styles.btnIconoEditar}
              onClick={() => setShowEdit(true)}
            >
              <RiEdit2Line size={20} />
            </Button>
            <span className={styles.tooltipText}>Editar</span>
          </div>

          <div className={styles.tooltipWrapper}>
            <Button
              className={styles.btnIconoEliminar}
              onClick={() => setShowDelete(true)}
            >
              <RiDeleteBin2Line size={20} />
            </Button>
            <span className={styles.tooltipText}>Eliminar</span>
          </div>
        </td>
      </tr>

      {/* MODAL DE EDICIÓN */}
      <Modal
        show={showEdit}
        onHide={handleCloseEdit}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Editar Opción</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Listado
            idListado={id}
            isModal={true}
            onClose={handleCloseEdit}
          />
        </Modal.Body>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Modal show={showDelete} onHide={handleCloseDelete}>
        <Modal.Header closeButton>
          <Modal.Title>Atención</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Desea eliminar la opción "{descripcion}"?</p>
          <Alert variant="danger" show={error}>
            <Alert.Heading>¡Oops! Se ha producido un error</Alert.Heading>
            <p>{descError}</p>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={eliminarListado}>Aceptar</Button>
          <Button variant="danger" onClick={handleCloseDelete}>Cancelar</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DetalleListado;
