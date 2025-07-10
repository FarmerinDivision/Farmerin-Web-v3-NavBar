import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import { Button, Modal } from 'react-bootstrap';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiDeleteBin2Line,
  RiSubtractLine,
  RiEdit2Line
} from 'react-icons/ri';
import ParametroEdit from '../../pages/parametros/[id]';
import styles from '../../styles/Parametro.module.scss';

const Parametro = ({ parametro, parametros, guardarParametros, porcentaje, onUpdate }) => {
  const { id, orden, condicion, min, max, um, racion, categoria } = parametro;
  const { firebase } = useContext(FirebaseContext);

  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleShow = () => setShowModal(true);
  const handleClose = () => {
    setShowModal(false);
    setSuccessMsg('Parámetro actualizado correctamente.');
    setShowSuccess(true);
  };



  const eliminarParam = async () => {
    await firebase.db.collection('parametro').doc(id).delete();
    const actualizados = parametros
      .filter(p => p.id !== id)
      .map((param, i) => {
        const actualizado = { ...param, orden: i + 1 };
        firebase.db.collection('parametro').doc(param.id).update(actualizado);
        return actualizado;
      });

    guardarParametros(actualizados);
  };

  const handleDown = () => {
    const parOrd = parametros.map(p => {
      if (p.id === id) {
        p.orden += 1;
        firebase.db.collection('parametro').doc(p.id).update(p);
        return p;
      }
      if (p.orden === orden + 1) {
        p.orden -= 1;
        firebase.db.collection('parametro').doc(p.id).update(p);
        return p;
      }
      return p;
    });

    parOrd.sort((a, b) => a.orden - b.orden);
    guardarParametros(parOrd);
  };

  const handleUp = () => {
    const parOrd = parametros.map(p => {
      if (p.id === id) {
        p.orden -= 1;
        firebase.db.collection('parametro').doc(p.id).update(p);
        return p;
      }
      if (p.orden === orden - 1) {
        p.orden += 1;
        firebase.db.collection('parametro').doc(p.id).update(p);
        return p;
      }
      return p;
    });

    parOrd.sort((a, b) => a.orden - b.orden);
    guardarParametros(parOrd);
  };

  return (
    <>
      <tr className={styles.filaParametro}>
        <td className={styles.columna}><strong>{orden}</strong></td>
        <td className={styles.columna}>{condicion}</td>
        <td className={styles.columna}>{min}</td>
        <td className={styles.columna}>{max}</td>
        <td className={styles.columna}>{um}</td>
        <td className={styles.columna}>{racion} kg</td>
        <td className={styles.colAcciones}>
          <div className={styles.tooltipWrapper}>
            <Button variant="outline-info" size="sm" onClick={handleShow} className={styles.iconBtnEdit}>
              <RiEdit2Line />
            </Button>
            <span className={styles.tooltipText}>Editar parámetro</span>
          </div>

          <div className={styles.tooltipWrapper}>
            <Button variant="outline-danger" size="sm" onClick={() => setShowConfirm(true)} className={styles.iconBtnElim}>
              <RiDeleteBin2Line />
            </Button>
            <span className={styles.tooltipText}>Eliminar parámetro</span>
          </div>

          {orden !== 1 ? (
            <div className={styles.tooltipWrapper}>
              <Button variant="outline-primary" size="sm" onClick={handleUp} className={styles.iconBtnSubir}>
                <RiArrowUpLine />
              </Button>
              <span className={styles.tooltipText}>Mover hacia arriba</span>
            </div>
          ) : (
            <div className={styles.tooltipWrapper}>
              <Button variant="outline-secondary" size="sm" disabled className={styles.iconBtnStop}>
                <RiSubtractLine />
              </Button>
              <span className={styles.tooltipText}>No se puede subir</span>
            </div>
          )}

          {orden !== parametros.length ? (
            <div className={styles.tooltipWrapper}>
              <Button variant="outline-primary" size="sm" onClick={handleDown} className={styles.iconBtnBajar}>
                <RiArrowDownLine />
              </Button>
              <span className={styles.tooltipText}>Mover hacia abajo</span>
            </div>
          ) : (
            <div className={styles.tooltipWrapper}>
              <Button variant="outline-secondary" size="sm" disabled className={styles.iconBtnStop}>
                <RiSubtractLine />
              </Button>
              <span className={styles.tooltipText}>No se puede bajar</span>
            </div>
          )}
        </td>
      </tr>

      {/* Modal de edición */}
      <Modal show={showModal} onHide={handleClose} size="lg" centered backdrop="static">
        <Modal.Header closeButton className={styles.ModalHeader}>
          <Modal.Title className={styles.ModalTitle}>Editar Parámetro</Modal.Title>
        </Modal.Header>
        <Modal.Body className={styles.ModalBody}>
          <ParametroEdit
            idParametro={id}
            isModal={true}
            onClose={handleClose}
            onUpdate={onUpdate}
          />
        </Modal.Body>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>¿Eliminar parámetro?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Estás seguro de que deseás eliminar el siguiente parámetro?</p>
          <ul>
            <li><strong>Categoría:</strong> {categoria}</li>
            <li><strong>Condición:</strong> {condicion}</li>
            <li><strong>Rango:</strong> {min} - {max} {um}</li>
            <li><strong>Ración:</strong> {racion} kg</li>
          </ul>

        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              setShowConfirm(false); // ✅ Cierra confirmación primero

              // 🔁 Usamos un pequeño delay para permitir que el cierre del modal se procese
              setTimeout(async () => {
                await eliminarParam(); // 🔥 Elimina
                if (onUpdate) onUpdate(); // 🔁 Refresca tabla

                setSuccessMsg('Parámetro eliminado correctamente.');
                setShowSuccess(true); // ✅ Mostramos el cartel
              }, 300);
            }}
          >
            Eliminar
          </Button>

        </Modal.Footer>
      </Modal>
      <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>✅ Acción completada</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{successMsg}</p>
          <p className="text-muted">
            (Si no ve el parámetro, salga y vuelva a entrar para actualizar.)
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccess(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

    </>
  );
};

export default Parametro;
