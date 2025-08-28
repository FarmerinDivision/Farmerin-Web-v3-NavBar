import React, { useState, useContext, useEffect, useRef } from 'react';
import { FirebaseContext } from '../../firebase2';
//import Overlay from 'react-overlays/Overlay';
import { RiReplyLine } from 'react-icons/ri';
import { Alert, Form, Button, Overlay, OverlayTrigger, Tooltip, Modal } from 'react-bootstrap';
import differenceInDays from 'date-fns/differenceInDays';
import { format } from 'date-fns'

const DetalleControl = ({ animal, animales, guardarAnimales, racionModificada }) => {

   const { id, rp, lactancia, estrep, fparto, fservicio, categoria, racion, uc, ca, anorm, sugerido, rodeo, actu, diasLact, diasPre, fuc, fracion } = animal;
   const [sug, guardarSug] = useState(0);
   const [error, guardarError] = useState(false);
   const [descError, guardarDescError] = useState('');
   const [colorCelda, guardarColorCelda] = useState('');
   const target = useRef(null);
   const { firebase, usuario } = useContext(FirebaseContext);
   const [showAlert, setShowAlert] = useState(false);
   const [showSuccessModal, setShowSuccessModal] = useState(false);
   const [showErrorModal, setShowErrorModal] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");

   useEffect(() => {
      guardarSug(sugerido);
      guardarColorCelda('text-info');
      if (Number.parseInt(sugerido) < Number.parseInt(racion)) guardarColorCelda('text-danger');
      if (Number.parseInt(sugerido) > Number.parseInt(racion)) guardarColorCelda('text-success');

   }, []);

   function cambiarRacion() {
      guardarError(false);
      //console.log(parametros);
      const animalesAct = animales.map(a => {
         // Revisamos que la llave recibida coincida con el elemento que queremos actualizar
         if (a.id === id) {
            // Actualizamos la racion
            async function fEditar(a) {
               let racionAnt = a.racion;
               let racionManual = false;
               try {
                  a.racion = sug;
                  a.fracion = firebase.nowTimeStamp();
                  a.actu = true;
                  //si cambia a mano lo pongo en true
                  if (sug != a.sugerido) {
                     racionManual = true;
                  }
                  const anim = {
                     racion: a.racion,
                     fracion: a.fracion,
                     racionManual: racionManual
                  }
                  await firebase.db.collection('animal').doc(a.id).update(anim);
                  setShowAlert(true);
                  setTimeout(() => setShowAlert(false), 3000);
                  return a;

               } catch (error) {
                  //volvemos atrás el cambio si hay un error
                  a.racion = racionAnt;
                  a.actu = false;
                  setErrorMessage(error.message || "Ocurrió un error al modificar la ración.");
                  setShowErrorModal(true);
                  return a;
               }
            }
            fEditar(a);
            setShowSuccessModal(true);
         }
         // Si no es el elemento que deseamos actualizar lo regresamos tal como está
         return a;
      });

      guardarAnimales(animalesAct);

   };

   // Función que se ejecuta conforme el usuario escribe algo
   const changeSugerido = e => {
      //console.log('cambiar sugerido');
      guardarSug(e.target.value);

   }
   let formattedDate = ""
   console.log("fuc:", fuc, rp)
   console.log("firebase:", firebase.timeStampToDate(fuc))
   try {
      formattedDate = format(firebase.timeStampToDate(fuc), 'dd/MM/yyyy')
      console.log("formattedDate:", formattedDate, rp)
   } catch (error) { console.log(error, rp) }
   return (


      <tr>
         <td >{rp} </td>
         <td >{lactancia}</td>
         <td >{categoria}</td>
         <td >{rodeo}</td>
         <td >{parseFloat(uc).toFixed(2)}</td>
         <td >{formattedDate} </td>
         <td >{parseFloat(ca).toFixed(2)}</td>
         <td >{anorm}</td>
         <td >{diasLact}</td>
         <td >{estrep}</td>
         <td >{diasPre}</td>
         <td> {racionModificada}</td>
         <td >{format(firebase.timeStampToDate(fracion), 'dd/MM/yyyy')}
         </td>

         <td>

            <Button
               ref={target}
               variant="link"
               size="sm"
               onClick={cambiarRacion}
            > <OverlayTrigger
               placement="bottom"
               overlay={<Tooltip >Cambiar Racion</Tooltip>}
            >
                  <RiReplyLine size={20} />
               </OverlayTrigger>
            </Button>
         </td>
         <td>
            <Form.Control
               className={colorCelda}
               type="number"
               id="sug"
               placeholder="Kg"
               name="sug"
               min="1"
               size="2"
               max="50"
               value={sug}
               readOnly
            />
            {/* Modal de error */}
            <Modal
               show={showErrorModal}
               onHide={() => setShowErrorModal(false)}
               centered
               size="sm"
               backdrop="static"
               dialogClassName="modal-alert-error"
            >
               <Modal.Body className="text-center p-4">
                  <div className="mb-3">
                     <span
                        style={{
                           display: 'inline-block',
                           backgroundColor: '#dc3545',
                           borderRadius: '50%',
                           width: '70px',
                           height: '70px',
                           lineHeight: '70px',
                        }}
                     >
                        <svg
                           xmlns="http://www.w3.org/2000/svg"
                           width="40"
                           height="40"
                           fill="white"
                           viewBox="0 0 16 16"
                        >
                           <path d="M7.001 4a.999.999 0 0 1 2 0l-.35 4.35a.65.65 0 0 1-1.3 0L7 4zM8 12a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 8 12z" />
                        </svg>
                     </span>
                  </div>
                  <h5 className="fw-bold text-danger">Error</h5>
                  <p className="text-muted mb-0">{errorMessage}</p>
               </Modal.Body>
            </Modal>

         </td>
         <Modal
            show={showSuccessModal}
            onHide={() => setShowSuccessModal(false)}
            centered
            size="sm"
            backdrop="static"
            dialogClassName="modal-alert-success"
         >
            <Modal.Body className="text-center p-4">
               <div className="mb-3">
                  <span
                     style={{
                        display: 'inline-block',
                        backgroundColor: '#28a745',
                        borderRadius: '50%',
                        width: '70px',
                        height: '70px',
                        lineHeight: '70px',
                     }}
                  >
                     <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="40"
                        height="40"
                        fill="white"
                        viewBox="0 0 16 16"
                     >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.07 0l3.992-3.992a.75.75 0 1 0-1.06-1.06L7.5 9.439 5.53 7.47a.75.75 0 0 0-1.06 1.06l2.5 2.5z" />
                     </svg>
                  </span>
               </div>
               <h5 className="fw-bold text-success">¡Ración modificada!</h5>
               <p className="text-muted mb-0">Los cambios fueron guardados correctamente.</p>
            </Modal.Body>
         </Modal>

      </tr>


   );
}

export default DetalleControl;