import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import DetalleEvento from './detalleEvento';
import { format } from 'date-fns';

const DetalleReportesDirsa = ({ animal, inicio, fin }) => {
  const [eventos, guardarEventos] = useState([]);
  const { id } = animal;
  const { firebase } = useContext(FirebaseContext);

  useEffect(() => {
    buscarEventos();
  }, []);

  function buscarEventos() {
    try {
      firebase.db.collection('animal').doc(id).collection('eventos')
        .where('fecha', '>=', inicio)
        .where('fecha', '<=', fin)
        .get()
        .then(snapshotEventos);
    } catch (error) {
      console.error(error.message);
    }
  }

  function snapshotEventos(snapshot) {
    const even = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      // ✅ Filtrar solo los eventos cargados mediante Dirsa
      .filter(e => e.usuario?.includes("Dirsa"))
      .map(e => ({
        ...e,
        fevento: e.fecha ? format(firebase.timeStampToDate(e.fecha), 'dd/MM/yyyy') : ''
      }));

    guardarEventos(even);
  }

  return (
    <>
      {eventos.length > 0 && eventos.map(e => (
        <DetalleEvento
          key={e.id}
          evento={e}
          animal={animal}
          eventos={eventos}
          guardarEventos={guardarEventos}
        />
      ))}
    </>
  );
};

export default DetalleReportesDirsa;
