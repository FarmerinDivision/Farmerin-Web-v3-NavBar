import React, { useState, useEffect, useContext } from 'react'
import { FirebaseContext } from '../../firebase2';
import { Mensaje, Botonera, Contenedor } from '../../components/ui/Elementos';
import Parametro from '../layout/parametro';
import Link from 'next/link';
import StickyTable from "react-sticky-table-thead"
import { Button, Form, Row, Col, Alert, Spinner, Table, Modal } from 'react-bootstrap';
import { RiAddBoxLine } from 'react-icons/ri';
import { format } from 'date-fns';
import styles from '../../styles/Parametro.module.scss'
import ParametroEdit from '../../pages/parametros/[id]';


const DetalleParametro = ({ idTambo, groupId, categoria, porcentaje, allowCreateEmpty = false }) => {


   const { firebase, usuario } = useContext(FirebaseContext);
   const [parametros, guardarParametros] = useState([]);
   const [cargando, setCargando] = useState(false);
   const [animal, guardarAnimal] = useState([]);
   const [fracion, guardarFracion] = useState([]);
   const [showNuevo, setShowNuevo] = useState(false);
   const [showSuccess, setShowSuccess] = useState(false);
   const [successMsg, setSuccessMsg] = useState('');


   useEffect(() => {
      if (idTambo && groupId) {
         obtenerParam();
      }
   }, [idTambo, groupId])

   useEffect(() => {
      if (idTambo && groupId) {
         obtenerParam();
      }
   }, [porcentaje])

   const obtenerParam = async () => {
      setCargando(true);
      try {
         const doc = await firebase.db.collection('parametro').doc(groupId).get();
         if (doc.exists) {
            const data = doc.data();
            const cats = Array.isArray(data.parametros) ? data.parametros : [];
            const cat = cats.find(c => c.categoria === categoria);
            const lista = (cat?.rodeos || []).slice().sort((a, b) => a.orden - b.orden);
            // Adapt UI rows to include ids derived from orden
            const rows = lista.map(r => ({
               id: `${categoria}-${r.orden}`,
               categoria,
               orden: r.orden,
               condicion: r.condicion ?? r.cond ?? "", // 👈 garantiza compatibilidad
               min: r.min,
               max: r.max,
               um: r.um,
               racion: r.racion
            }));

            guardarParametros(rows);
         } else {
            guardarParametros([]);
         }
         // mantener actualización de animales como antes si se requiere porcentaje
         await firebase.db.collection('animal').where('idtambo', '==', idTambo).get().then(snapshotAnimal)
      } catch (error) {
         console.log(error);
      } finally {
         setCargando(false);
      }
   };


   function snapshotParametros(snapshot) {
      const param = snapshot.docs.map(doc => {
         let p;
         if (porcentaje == 0) {
            p = {
               porcentaje: 0
            }
         } else {
            p = {
               porcentaje: Number(porcentaje)
            }
         }
         if (doc.id) {
            try {
               firebase.db.collection('parametro').doc(String(doc.id)).update(p);
            } catch (error) {
               console.log(error);
            }
         }
         return {
            id: doc.id,
            ...doc.data()
         }
      })
      guardarParametros(param);
   }


   function snapshotAnimal(snapshot) {
      const ani = snapshot.docs.map(doc => {
         let p;
         if (porcentaje == 0) {
            p = {
               fracion: firebase.nowTimeStamp(),
               porcentaje: 0
            }
         } else {
            p = {
               fracion: firebase.nowTimeStamp(),

               porcentaje: Number(porcentaje)
            }
         }
         if (doc.id) {
            try {
               firebase.db.collection('animal').doc(String(doc.id)).update(p);
            } catch (error) {
               console.log(error);
            }
         }
         return {
            id: doc.id,
            ...doc.data()
         }
      })
      guardarAnimal(ani);
   }


   return (
      <>
         <Contenedor className={styles.paramCard}>
            <Row className="align-items-center mb-3">
               <Col xs={12} md>
                  <h3 className={`${styles.tituloCategoria} text-md-start text-center`}>
                     {categoria}
                  </h3>
               </Col>
               <Col xs={12} md="auto" className="text-md-end text-center">
                  <Button
                     variant="success"
                     className={styles.botonNuevo}
                     onClick={() => setShowNuevo(true)}
                  >
                     <RiAddBoxLine size={20} />
                     &nbsp;Nuevo
                  </Button>

               </Col>
            </Row>

            {parametros.length === 0 ? (
               <Mensaje>
                  <Alert variant="warning">
                     No hay parámetros nutricionales configurados para <strong>{categoria}</strong>
                  </Alert>
               </Mensaje>
            ) : (
               <div className={styles.tablaScroll}>
                  <StickyTable height={350} width="100%">

                     <Table striped bordered hover responsive className={styles.tablaParam}>
                        <thead className={styles.tablaHeader}>
                           <tr>
                              <th>Rodeo/Orden</th>
                              <th>Cond</th>
                              <th>Min.</th>
                              <th>Max</th>
                              <th>UM</th>
                              <th>Ración (kg)</th>
                              <th>Acción</th>
                           </tr>
                        </thead>
                        <tbody>
                           {parametros.map((p) => (
                              <Parametro
                                 key={p.id}
                                 parametro={p}
                                 parametros={parametros}
                                 guardarParametros={guardarParametros}
                                 porcentaje={porcentaje}
                                 onUpdate={obtenerParam}
                                 groupId={groupId}
                                 categoria={categoria}
                              />
                           ))}
                        </tbody>
                     </Table>
                  </StickyTable>
               </div>
            )}
         </Contenedor>
         <Modal
            show={showNuevo}
            onHide={() => setShowNuevo(false)}
            size="lg"
            centered
            backdrop="static"
         >
            <Modal.Header closeButton>
               <Modal.Title>Nuevo Parámetro</Modal.Title>
            </Modal.Header>
            <Modal.Body>

               <ParametroEdit
                  idParametro="0"
                  isModal={true}
                  categoriaFija={categoria}
                  groupId={groupId}
                  onClose={() => {
                     setShowNuevo(false);
                     setSuccessMsg('Parámetro creado con éxito.');
                     setShowSuccess(true);
                  }}
                  onAddParam={(nuevoParam) => {
                     guardarParametros(prev => [...prev, nuevoParam].sort((a, b) => a.orden - b.orden));
                  }}
               />

            </Modal.Body>
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

}

export default DetalleParametro;