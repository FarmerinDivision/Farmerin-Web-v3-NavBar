import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { RiAddBoxLine, RiEyeLine } from 'react-icons/ri';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import differenceInDays from 'date-fns/differenceInDays';
import { format } from 'date-fns';
import styles from '../../styles/gralAnimales.module.scss';
import FichaAnimal from './fichaAnimal';

const DetalleGralAnimal = ({ animal }) => {

   const { id, idtambo, rp, erp, racion, lactancia, ingreso, observaciones, estpro, estrep, fparto, fservicio, categoria, uc, ca, rodeo, grupo, nservicio, diasLact } = animal;
   const router = useRouter();
   const [calculado, guardarCalculado] = useState({});
   const [showFicha, setShowFicha] = useState(false);

   useEffect(() => {
      let fser;
      // formateo fecha de servicio
      try {
         fser = format(new Date(fservicio), 'dd/MM/yy');
      } catch (error) {
         fser = "";
      }

      const calc = {
         fser
      };
      guardarCalculado(calc);
   }, []);

   return (
      <>
         <tr>
            <td style={{ cursor: 'pointer', fontWeight: 700, color: '#1e293b' }} onClick={() => setShowFicha(true)}>
               {rp}
            </td>
            <td>
               {erp}
            </td>
            <td>
               {grupo}
            </td>
            <td>
               {categoria}
            </td>
            <td>
               {rodeo}
            </td>
            <td>
               {estrep}
            </td>
            <td>
               {estpro}
            </td>
            <td>
               {lactancia}
            </td>
            <td>
               {uc}
            </td>
            <td>
               {ca}
            </td>
            <td>
               {diasLact}
            </td>
            <td>
               {racion}
            </td>
            <td>
               {nservicio}
            </td>
            <td>
               {calculado.fser}
            </td>

            <td>
               <div className={styles.tooltipWrapper}>
                  <Button className={styles.btnIconoInfo} onClick={() => setShowFicha(true)}>
                     <RiEyeLine size={20} />
                  </Button>
                  <span className={styles.tooltipText}>Ver ficha</span>
               </div>
            </td>
         </tr>

         {showFicha && (
            <FichaAnimal
               animal={animal}
               show={showFicha}
               setShow={setShowFicha}
            />
         )}
      </>
   );
}

export default DetalleGralAnimal;