import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import { Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { RiArrowDownLine, RiArrowUpLine, RiDeleteBin2Line, RiSubtractLine, RiEdit2Line } from 'react-icons/ri';
import ParametroEdit from '../../pages/parametros/[id]'; // asegurate de que esté adaptado para funcionar como componente modal
import styles from '../../styles/Parametro.module.scss'
const Parametro = ({ parametro, parametros, guardarParametros, porcentaje }) => {
  const { id, orden, condicion, min, max, um, racion } = parametro;
  const { firebase } = useContext(FirebaseContext);

  const [showModal, setShowModal] = useState(false);

  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

  const eliminarParam = async () => {
    await firebase.db.collection('parametro').doc(id).delete();
    const actualizados = parametros.filter(p => p.id !== id).map((param, i) => {
      param.orden = i + 1;
      firebase.db.collection('parametro').doc(param.id).update(param);
      return param;
    });
    guardarParametros(actualizados);
  };
   const handleDown = () => {
      const parOrd = parametros.map(p => {
         // Revisamos que el id recibido coincida con el elemento que queremos actualizar
         if (p.id === id) {
            // Actualizamos el orden
            p.orden += 1;
            try {
               firebase.db.collection('parametro').doc(p.id).update(p);
            } catch (error) {
               console.log(error);
            }
            // Regresamos el nuevo elemento con el orden actualizad
            return p;
         }
         //Si es el anterior le sumo uno
         if (p.orden === orden + 1) {
            p.orden -= 1;
            try {
               firebase.db.collection('parametro').doc(p.id).update(p);
            } catch (error) {
               console.log(error);
            }
            // Regresamos el nuevo elemento con el orden actualizado
            return p;

         }
         // Si no es el elemento que deseamos actualizar lo regresamos tal como está
         return p;
      });

      parOrd.sort(function (a, b) {
         if (a.orden > b.orden) {
            return 1;
         }
         if (a.orden < b.orden) {
            return -1;
         }
         // a must be equal to b
         return 0;
      });

      //actualizamos state
      guardarParametros(parOrd);

   };

   function handleUp() {

      //console.log(parametros);
      const parOrd = parametros.map(p => {
         // Revisamos que la llave recibida coincida con el elemento que queremos actualizar
         if (p.id === id) {
            // Actualizamos el orden
            p.orden -= 1;
            try {
               firebase.db.collection('parametro').doc(p.id).update(p);
            } catch (error) {
               console.log(error);
            }
            // Regresamos el nuevo elemento con el orden actualizad
            return p;
         }
         //Si el el anterior le sumo uno
         if (p.orden === orden - 1) {
            p.orden += 1;
            try {
               firebase.db.collection('parametro').doc(p.id).update(p);
            } catch (error) {
               console.log(error);
            }
            // Regresamos el nuevo elemento con el orden actualizado
            return p;

         }
         // Si no es el elemento que deseamos actualizar lo regresamos tal como está
         return p;
      });

      parOrd.sort(function (a, b) {
         if (a.orden > b.orden) {
            return 1;
         }
         if (a.orden < b.orden) {
            return -1;
         }
         // a must be equal to b
         return 0;
      });

      //actualizamos state
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
          <Button
            variant="outline-info"
            size="sm"
            onClick={handleShow}
            className={styles.iconBtnEdit}
          >
            <RiEdit2Line />
          </Button>
          <span className={styles.tooltipText}>Editar</span>
        </div>

        <div className={styles.tooltipWrapper}>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={eliminarParam}
            className={styles.iconBtnElim}
          >
            <RiDeleteBin2Line />
          </Button>
          <span className={styles.tooltipText}>Eliminar</span>
        </div>

        {orden !== 1 ? (
          <div className={styles.tooltipWrapper}>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleUp}
              className={styles.iconBtnSubir}
            >
              <RiArrowUpLine />
            </Button>
            <span className={styles.tooltipText}>Subir</span>
          </div>
        ) : (
          <div className={styles.tooltipWrapper}>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled
              className={styles.iconBtnStop}
            >
              <RiSubtractLine />
            </Button>
            <span className={styles.tooltipText}>No se puede subir</span>
          </div>
        )}

        {orden !== parametros.length ? (
          <div className={styles.tooltipWrapper}>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleDown}
              className={styles.iconBtnBajar}
            >
              <RiArrowDownLine />
            </Button>
            <span className={styles.tooltipText}>Bajar</span>
          </div>
        ) : (
          <div className={styles.tooltipWrapper}>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled
              className={styles.iconBtnStop}
            >
              <RiSubtractLine />
            </Button>
            <span className={styles.tooltipText}>No se puede bajar</span>
          </div>
        )}
      </td>
    </tr>

    {/* Modal visible fuera de la fila */}
    <Modal
      show={showModal}
      onHide={handleClose}
      size="lg"
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className={styles.ModalHeader}>
        <Modal.Title className={styles.ModalTitle}>Editar Parámetro</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.ModalBody}>
        <ParametroEdit
          idParametro={id}
          isModal={true}
          onClose={handleClose}
        />
      </Modal.Body>
    </Modal>
  </>
);

};

export default Parametro;
