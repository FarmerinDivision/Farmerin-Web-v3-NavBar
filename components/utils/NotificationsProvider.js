import React, { createContext, useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';

export const NotificacionesContext = createContext();

export const NotificacionesProvider = ({ children }) => {
  const { firebase, tambos, tamboSel } = useContext(FirebaseContext);

  const [notificaciones, setNotificaciones] = useState([]);
  const [sinLeer, setSinLeer] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [ultimoCambio, setUltimoCambio] = useState(null);

  useEffect(() => {
    if (firebase && tambos?.length > 0) {
      cargarNotificaciones();
    }
  }, [firebase, tambos]);

  useEffect(() => {
    if (firebase && tamboSel?.id) {
      obtenerHistorial(tamboSel.id);
      obtenerUltimoCambio(tamboSel.id);
    }
  }, [firebase, tamboSel]);

  const cargarNotificaciones = async () => {
    const tambosArray = tambos.map(t => t.id);
    try {
      const chunk = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
      const getFechaMs = (f) => {
        if (!f) return 0;
        if (f instanceof Date) return f.getTime();
        if (typeof f?.toDate === 'function') return f.toDate().getTime();
        if (typeof f === 'string') return new Date(f).getTime() || 0;
        return 0;
      };

      let docs = [];
      if (tambosArray.length <= 10) {
        const snapshot = await firebase.db.collection('alerta')
          .where('idtambo', 'in', tambosArray)
          .orderBy('fecha', 'desc')
          .get();
        docs = snapshot.docs;
      } else {
        const chunks = chunk(tambosArray, 10);
        const promises = chunks.map(ids =>
          firebase.db.collection('alerta')
            .where('idtambo', 'in', ids)
            .orderBy('fecha', 'desc')
            .get()
        );
        const snaps = await Promise.all(promises);
        docs = snaps.flatMap(s => s.docs);
      }

      const byId = new Map();
      for (const d of docs) {
        byId.set(d.id, { id: d.id, ...d.data() });
      }
      const data = Array.from(byId.values()).sort((a, b) => getFechaMs(b.fecha) - getFechaMs(a.fecha));
      setNotificaciones(data);
      setSinLeer(data.filter(a => !a.visto));
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    }
  };

  const marcarComoLeidas = async () => {
    try {
      await Promise.all(sinLeer.map(alerta =>
        firebase.db.collection('alerta').doc(alerta.id).update({ ...alerta, visto: true })
      ));
      cargarNotificaciones(); // Refrescar
    } catch (err) {
      console.error("Error al marcar como leídas:", err);
    }
  };

  const obtenerHistorial = async (idTambo) => {
    try {
      const snapshot = await firebase.db
        .collection('tambo')
        .doc(idTambo)
        .collection('notificaciones')
        .orderBy('fecha', 'desc')
        .get();

      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorial(data);
    } catch (err) {
      console.error("Error al obtener historial:", err);
    }
  };

  const obtenerUltimoCambio = async (idTambo) => {
    try {
      const snapshot = await firebase.db
        .collection('tambo')
        .doc(idTambo)
        .collection('notificaciones')
        .orderBy('fecha', 'desc')
        .limit(1)
        .get();

      const doc = snapshot.docs[0];
      if (doc) {
        setUltimoCambio({ id: doc.id, ...doc.data() });
      }
    } catch (err) {
      console.error("Error al obtener último cambio:", err);
    }
  };
  const marcarUltimoCambioComoLeido = async () => {
    if (!ultimoCambio || ultimoCambio.visto) return;
    try {
      await firebase.db.collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .doc(ultimoCambio.id)
        .update({ visto: true });

      obtenerUltimoCambio(tamboSel.id); // Refrescar
    } catch (err) {
      console.error("Error al marcar como leído:", err);
    }
  };

  return (
    <NotificacionesContext.Provider
      value={{
        notificaciones,
        sinLeer,
        marcarComoLeidas,
        historial,
        ultimoCambio,
        marcarUltimoCambioComoLeido
      }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
};
