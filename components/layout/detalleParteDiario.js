import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import DetalleEvento from './detalleEvento';

const DetalleParteDiario = ({ animal, inicio, fin, visto,tipo }) => {

  const [eventos, guardarEventos] = useState([]);
  const { id } = animal;
  const { firebase,usuario } = useContext(FirebaseContext);

  useEffect(() => {
    guardarEventos([]); // Limpiar antes de buscar si cambian los filtros
    buscarEventos();
  }, [inicio, fin, visto, tipo]);

  function buscarEventos() {
    try {
      let animalRef = firebase.db.collection('animal').doc(id).collection('eventos');
      let query = animalRef.where('fecha', '>=', inicio).where('fecha', '<=', fin);
      //agrega el filtro de visto.
      if (visto != 'todos') {
        let v = false;
        if (visto=='true') v=true;
        
        query=query.where('visto', '==', v);
      }
      //agrega filtro de tipo de evento (eliminado de la query para evitar problemas de índices)
      //Se filtrará en memoria en snapshotEventos
      query.get().then(snapshotEventos);
      //firebase.db.collection('animal').doc(id).collection('eventos').where('fecha','>=',inicio).where('fecha','<=',fin).get().then(snapshotEventos);

    } catch (error) {
      console.log(error.message);
    }

  }

  function snapshotEventos(snapshot) {
    const even = snapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...doc.data()
      }
    }).filter(e => {
        // Filtrar por tipo en memoria
        if (tipo !== 'todos') {
            const t = (e.tipo || '').trim().toLowerCase();
            return t === tipo.toLowerCase();
        }
        return true;
    });
    
    guardarEventos(prevEventos => [...prevEventos, ...even]);

  }

  return (
    <>
      { eventos.length != 0 ?

        eventos.map(e => (
          <DetalleEvento
            key={e.id}
            evento={e}
            animal={animal}
            eventos={eventos}
            guardarEventos={guardarEventos}

          />
        )
        )

        :
        <></>
      }
    </>

  );
}

export default DetalleParteDiario;