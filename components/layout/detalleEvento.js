import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../../firebase2'
import { format } from 'date-fns'
import { RiCheckDoubleLine, RiCheckLine, RiAddBoxLine } from 'react-icons/ri';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import DetalleCria from './detalleCria';
import FichaAnimal from './fichaAnimal';

// Mapa de colores por tipo de evento
const EVENTO_COLORS = {
   'Alta':        { bg: '#dcfce7', color: '#166534' },
   'Baja':        { bg: '#fee2e2', color: '#991b1b' },
   'Parto':       { bg: '#dbeafe', color: '#1e40af' },
   'Celo':        { bg: '#fef9c3', color: '#854d0e' },
   'Tacto':       { bg: '#f3e8ff', color: '#6b21a8' },
   'Servicio':    { bg: '#ffedd5', color: '#9a3412' },
   'Secado':      { bg: '#e0f2fe', color: '#075985' },
   'Aborto':      { bg: '#fce7f3', color: '#9d174d' },
   'Tratamiento': { bg: '#f1f5f9', color: '#334155' },
};

const EventoBadge = ({ tipo }) => {
   const style = EVENTO_COLORS[tipo] || { bg: '#f1f5f9', color: '#334155' };
   return (
      <span style={{
         backgroundColor: style.bg,
         color: style.color,
         padding: '3px 10px',
         borderRadius: '999px',
         fontSize: '12px',
         fontWeight: 600,
         letterSpacing: '0.3px',
         display: 'inline-block',
      }}>
         {tipo}
      </span>
   );
};

const DetalleEvento = ({ evento, eventos, guardarEventos }) => {
   const { firebase, usuario } = useContext(FirebaseContext);
   const { id, fecha, tipo, detalle, vistoUsuario, crias, rp, erp, animal, fevento } = evento;
   const [show, setShow] = useState(false);
   const [visto, setVisto] = useState(false);
   const handleShow = () => { setShow(true) };

   useEffect(() => {
      if (vistoUsuario) {
         if (vistoUsuario.indexOf(usuario.uid) != -1) {
            setVisto(true);
         } else {
            setVisto(false);
         }
      } else {
         setVisto(false);
      }
   }, [])

   function cambiarVisto() {
      const eventosAct = eventos.map(e => {
         if (e.id === id) {
            async function fEditar(e) {
               try {
                  if (e.vistoUsuario) {
                     e.vistoUsuario.push(usuario.uid);
                     setVisto(true);
                  } else {
                     e.vistoUsuario = [usuario.uid];
                     setVisto(true);
                  }
                  await firebase.db.collection('animal').doc(animal.id).collection('eventos').doc(e.id).update(e);
                  return e;
               } catch (error) {
                  console.log(error.message);
                  return e;
               }
            }
            fEditar(e);
         }
         return e;
      });
      guardarEventos(eventosAct);
   };

   return (
      <>
         <tr style={{ opacity: visto ? 0.65 : 1 }}>
            <td style={{ color: '#6b7280', fontSize: '13px' }}>
               {fevento}
            </td>
            <td>
               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#1e293b', cursor: 'pointer' }} onClick={handleShow}>{rp}</span>
                  <OverlayTrigger placement="bottom" overlay={<Tooltip>Ver Ficha</Tooltip>}>
                     <button
                        onClick={handleShow}
                        style={{
                           background: 'none',
                           border: 'none',
                           color: '#94a3b8',
                           cursor: 'pointer',
                           padding: '2px',
                           lineHeight: 1,
                        }}
                     >
                        <RiAddBoxLine size={18} />
                     </button>
                  </OverlayTrigger>
               </div>
            </td>

            <td>
               <EventoBadge tipo={tipo} />
            </td>

            {tipo == 'Parto' ?
               <td style={{ fontSize: '13px', color: '#4b5563' }}>
                  {detalle + '/ Crias:'}
                  {crias && crias.map(c => (
                     <DetalleCria
                        key={c.id}
                        cria={c}
                     />
                  ))}
               </td>
               :
               <td style={{ fontSize: '13px', color: '#4b5563' }}>
                  {detalle}
               </td>
            }

            <td style={{ color: '#6b7280', fontSize: '13px' }}>
               {erp || <span style={{ color: '#d1d5db' }}>—</span>}
            </td>
            <td style={{ fontSize: '12px', color: '#94a3b8' }}>
               {evento.usuario}
            </td>
            <td>
               {visto ? (
                  <span style={{
                     display: 'inline-flex',
                     alignItems: 'center',
                     gap: '4px',
                     color: '#059669',
                     fontWeight: 600,
                     fontSize: '12px',
                  }}>
                     <RiCheckDoubleLine size={18} /> Visto
                  </span>
               ) : (
                  <OverlayTrigger placement="bottom" overlay={<Tooltip>Marcar como visto</Tooltip>}>
                     <button
                        onClick={cambiarVisto}
                        style={{
                           background: '#f1f5f9',
                           border: '1px solid #e2e8f0',
                           borderRadius: '6px',
                           color: '#64748b',
                           cursor: 'pointer',
                           padding: '4px 10px',
                           fontSize: '12px',
                           fontWeight: 500,
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: '4px',
                           transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                     >
                        <RiCheckLine size={14} /> Marcar
                     </button>
                  </OverlayTrigger>
               )}
            </td>
         </tr>
         {show &&
            <FichaAnimal
               animal={animal}
               show={show}
               setShow={setShow}
            />
         }
      </>
   )
}

export default DetalleEvento;