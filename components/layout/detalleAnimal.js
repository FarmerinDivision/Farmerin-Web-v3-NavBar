import React, { useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { FirebaseContext } from '../../firebase2';
import { RiEdit2Line, RiAddBoxLine, RiDeleteBin2Line, RiEyeLine } from 'react-icons/ri';
import { Modal, Button, Alert, Form } from 'react-bootstrap';
import { format } from 'date-fns';
import styles from '../../styles/Animales.module.scss';
import modalStyles from '../../styles/modalTamboForm.module.scss';

const DetalleAnimal = ({ animal, guardarElim, onNavigate }) => {
  const { firebase } = useContext(FirebaseContext);
  const router = useRouter();
  // onNavigate: funcion opcional del padre para guardar el scroll antes de navegar.
  // Si no se provee, usa router.push directamente (compatibilidad hacia atras).
  const navigate = onNavigate ?? ((path) => router.push(path));
  const [showElim, setShowElim] = useState(false);
  const [error, guardarError] = useState(false);
  const [descError, guardarDescError] = useState('');
  const [motivos, guardarMotivos] = useState([]);
  const [isTransferencia, setIsTransferencia] = useState(false);
  const [tamboDestino, setTamboDestino] = useState('');
  const [tambosUsuario, setTambosUsuario] = useState([]);

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
        // fecha de baja como string
        const fechaBajaStr = format(Date.now(), 'yyyy-MM-dd');
        // fecha en timestamp (usando tu helper)
        const fechaBajaTs = firebase.nowTimeStamp();

        // actualizar animal (string en fbaja y motivo en mbaja)
        await firebase.db.collection('animal').doc(id).update({
          fbaja: fechaBajaStr,
          mbaja: motivo,
        });

        // agregar evento en subcolección "eventos"
        await firebase.db
          .collection('animal')
          .doc(id)
          .collection('eventos')
          .add({
            fecha: fechaBajaTs,
            tipo: "Baja",
            detalle: motivo,
            usuario: firebase.auth.currentUser?.displayName || "sistema",
          });

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
  if (motivo.toLowerCase().includes("transferencia")) {
    setIsTransferencia(true);
    // cargar tambos del usuario logueado
    firebase.db.collection('tambo')
      .where('usuarios', 'array-contains', firebase.auth.currentUser.uid)
      .get()
      .then(snapshot => {
        const arrayTambos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTambosUsuario(arrayTambos);
      });
  } else {
    setIsTransferencia(false);
    setTamboDestino('');
  }
};


  return (
    <>
      <tr>
        <td className={styles.celda}>
          <div className={styles.acciones}>
            <div className={styles.tooltipWrapper}>
              <Button className={styles.btnIconoInfo} onClick={() => navigate('/animales/' + id)}>
                <RiEyeLine size={20} />
              </Button>
              <span className={styles.tooltipText}>Ver ficha</span>
            </div>

            <div className={styles.tooltipWrapper}>
              <Button className={styles.btnIconoEditar} onClick={() => navigate('/animales/editar/' + id)}>
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
      <Modal 
        show={showElim} 
        onHide={handleCloseElim}
        centered
        dialogClassName={modalStyles.premiumModalTambo}
        backdropClassName={modalStyles.premiumBackdropTambo}
      >
        <div className={modalStyles.header}>
          <div>
            <h2 className={modalStyles.title}>Dar de Baja Animal</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Esta acción registrará la baja del animal seleccionado.
            </p>
          </div>
          <button type="button" className={modalStyles.closeButton} onClick={handleCloseElim} aria-label="Cerrar">
            ✕
          </button>
        </div>
        
        <div className={modalStyles.body}>
          <div className={modalStyles.sectionBlock}>
            <div style={{ textAlign: 'center' }}>
              <p className={modalStyles.infoCardLabel} style={{ marginBottom: '8px' }}>ANIMAL SELECCIONADO</p>
              <h3 className={modalStyles.infoCardValue} style={{ fontSize: '24px' }}>RP: {rp}</h3>
            </div>
          </div>

          <div className={modalStyles.sectionBlock} style={{ marginBottom: 0 }}>
            <h3 className={modalStyles.sectionTitle}>Motivo de Baja</h3>
            <div className={modalStyles.formGroup}>
              <Form.Control as="select" onChange={changeMotivo} defaultValue="0">
                <option value="0" disabled>Seleccione un motivo de baja</option>
                {motivos.map(m => (
                  <option key={m.id} value={m.descripcion}>{m.descripcion}</option>
                ))}
              </Form.Control>
              <span style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                La baja quedará registrada en el historial del animal.
              </span>
            </div>
            
            {error && (
              <Alert variant="danger" className="mt-3 mb-0">
                <p className="mb-0">{descError}</p>
              </Alert>
            )}
          </div>
        </div>

        <div className={modalStyles.footer}>
          <button type="button" className={modalStyles.btnSecondary} onClick={handleCloseElim}>
            Cancelar
          </button>
          <button type="button" className={modalStyles.btnDanger} onClick={eliminarAnimal}>
            Confirmar Baja
          </button>
        </div>
      </Modal>




    </>
  );
};

export default DetalleAnimal;
