import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import FichaAnimal from './fichaAnimal';
import ModalAnimalForm from '../../pages/animales/modalAnimalForm'; // ✅ nuevo
import { RiEdit2Line, RiAddBoxLine, RiDeleteBin2Line } from 'react-icons/ri';
import { Modal, Button, Alert, Form } from 'react-bootstrap';
import { format } from 'date-fns';
import styles from '../../styles/Animales.module.scss';

const DetalleAnimal = ({ animal, guardarElim }) => {
  const { firebase } = useContext(FirebaseContext);
  const [showFicha, setShowFicha] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [showElim, setShowElim] = useState(false);
  const [error, guardarError] = useState(false);
  const [descError, guardarDescError] = useState('');
  const [motivos, guardarMotivos] = useState([]);

  const { id, idtambo, rp } = animal;
  let motivo = "0";

  const handleShowElim = () => {
    guardarError(false);
    buscarMotivo();
    setShowElim(true);
  };

  const handleCloseElim = () => setShowElim(false);

  async function eliminarAnimal() {
    guardarError(false);
    if (motivo !== "0") {
      try {
        const a = {
          fbaja: format(Date.now(), 'yyyy-MM-dd'),
          mbaja: motivo,
        };
        await firebase.db.collection('animal').doc(id).update(a);
        guardarElim(true);
        handleCloseElim();
      } catch (error) {
        guardarDescError(error.message);
        guardarError(true);
      }
    } else {
      guardarDescError('Debe seleccionar un motivo de baja');
      guardarError(true);
    }
  }

  const buscarMotivo = () => {
    if (motivos.length === 0) {
      firebase.db.collection('listado').where('tipo', '==', 'baja').where('idtambo', '==', idtambo).get().then(snapshotMotivo);
    }
  };

  function snapshotMotivo(snapshot) {
    const moti = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    guardarMotivos(moti);
  }

  const changeMotivo = e => {
    e.preventDefault();
    motivo = e.target.value;
  };

  return (
    <>
      <tr>
        <td className={styles.celda}>
          <div className={styles.acciones}>
            <div className={styles.tooltipWrapper}>
              <Button className={styles.btnIconoInfo} onClick={() => setShowFicha(true)}>
                <RiAddBoxLine size={20} />
              </Button>
              <span className={styles.tooltipText}>Ver ficha</span>
            </div>

            <div className={styles.tooltipWrapper}>
              <Button className={styles.btnIconoEditar} onClick={() => setShowEditar(true)}>
                <RiEdit2Line size={20} />
              </Button>
              <span className={styles.tooltipText}>Editar animal</span>
            </div>

            <div className={styles.tooltipWrapper}>
              <Button className={styles.btnIconoBorrar} onClick={handleShowElim}>
                <RiDeleteBin2Line size={20} />
              </Button>
              <span className={styles.tooltipText}>Eliminar animal</span>
            </div>
          </div>
        </td>
      </tr>

      {/* Modal de eliminación */}
      <Modal show={showElim} onHide={handleCloseElim}>
        <Modal.Header closeButton>
          <Modal.Title>Atención!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Desea dar de baja el animal {rp}?</p>
          <Form.Control as="select" onChange={changeMotivo}>
            <option value="0">Seleccione motivo...</option>
            {motivos.map(m => (
              <option key={m.id} value={m.descripcion}>{m.descripcion}</option>
            ))}
          </Form.Control>
          <Alert variant="danger" show={error}><p>{descError}</p></Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={eliminarAnimal}>Aceptar</Button>
          <Button variant="danger" onClick={handleCloseElim}>Cancelar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal ficha */}
      {showFicha && (
        <FichaAnimal
          animal={animal}
          show={showFicha}
          setShow={setShowFicha}
        />
      )}

      {/* Modal edición */}
      {showEditar && (
        <ModalAnimalForm
          animal={animal}
          show={showEditar}
          onHide={() => setShowEditar(false)}
          guardarElim={guardarElim}
        />
      )}
    </>
  );
};

export default DetalleAnimal;
