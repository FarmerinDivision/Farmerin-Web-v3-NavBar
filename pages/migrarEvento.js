import React, { useState, useEffect, useContext } from "react";
import { FirebaseContext } from "../firebase2";
import Layout from "../components/layout/layout";
import AdminTamboSelector from '../components/utils/AdminTamboSelector';
import styles from '../styles/Administrador.module.scss';
import { Card } from 'react-bootstrap';

function EventoMigracion() {
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [animalesConEvento, setAnimalesConEvento] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [migrando, setMigrando] = useState(false);

  useEffect(() => {
    async function obtenerAnimalesConEvento() {
      setCargando(true);

      try {
        // 1️⃣ Obtener los animales filtrados por "idtambo"
        const animalesSnapshot = await firebase.db.collection("animal")
          .where("idtambo", "==", tamboSel.id)
          .get();

        const animalesLista = animalesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 2️⃣ Filtrar solo los que tienen la subcolección "evento"
        const animalesConEvento = [];

        for (const animal of animalesLista) {
          const eventoSnapshot = await firebase.db.collection("animal")
            .doc(animal.id)
            .collection("evento")
            .get(); // Verificamos la existencia de la subcolección "evento"

          if (!eventoSnapshot.empty) {
            // Si tiene eventos, los agregamos
            animalesConEvento.push({
              id: animal.id,
              rp: animal.rp || "Sin RP", // Mostramos RP
              erp: animal.erp || "Sin ERP", // Mostramos ERP
              eventos: eventoSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })),
            });
          }
        }

        setAnimalesConEvento(animalesConEvento);
      } catch (error) {
        console.error("Error obteniendo animales con evento:", error);
      }

      setCargando(false);
    }

    obtenerAnimalesConEvento();
  }, [firebase, tamboSel]);

  async function migrarEventos() {
    if (animalesConEvento.length === 0) return;

    setMigrando(true);
    const batch = firebase.db.batch();

    animalesConEvento.forEach((animal) => {
      animal.eventos.forEach((evento) => {
        const { id, ...data } = evento;

        const eventoRef = firebase.db.collection("animal")
          .doc(animal.id)
          .collection("eventos") // Migramos a "eventos" (no "evento")
          .doc(id);

        batch.set(eventoRef, data);
        batch.delete(firebase.db.collection("animal").doc(animal.id).collection("evento").doc(id));
      });
    });

    try {
      await batch.commit();
      alert("Migración completada.");
      setAnimalesConEvento([]);
    } catch (error) {
      console.error("Error en la migración:", error);
    }

    setMigrando(false);
  }

  return (
    <Layout titulo="Migrar Evento">
      <div className={styles.migrarEventoContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Migración de Eventos</h1>
          <p className={styles.subtitle}>Herramienta para normalizar la estructura de eventos antiguos.</p>
        </div>

        <div className={styles.cardInfo}>
          <ul>
            <p><strong>¿Qué podés hacer acá?</strong></p>
            <p>En esta pantalla podés migrar eventos antiguos de los animales del tambo seleccionado.</p>
            <p>Esta herramienta busca animales que todavía tengan la subcolección <code>evento</code> y migra esa información a la nueva subcolección <code>eventos</code>, manteniendo los datos existentes.</p>
            <p><strong>Antes de ejecutar la migración:</strong></p>
            <li>Los eventos se copian a la nueva estructura.</li>
            <li>Los eventos antiguos se eliminan automáticamente.</li>
            <li>Este proceso no se puede deshacer.</li>
            <p><strong>Usá esta herramienta solo cuando sea necesario y preferentemente una sola vez por tambo.</strong></p>
          </ul>
        </div>

        <AdminTamboSelector />

        <div className={styles.card}>
          {cargando ? (
            <div className={styles.loading}>Cargando animales con subcolección "evento"...</div>
          ) : animalesConEvento.length === 0 ? (
            <div className={styles.successMessage}>
              No hay animales con la subcolección "evento". El tambo está normalizado.
            </div>
          ) : (
            <>
              <div className={styles.migrarEventoList}>
                <ul className={styles.list}>
                  {animalesConEvento.map((animal) => (
                    <li key={animal.id} className={styles.listItem}>
                      <div>
                        <strong>Animal ID:</strong> {animal.id} | <strong>RP:</strong> {animal.rp} | <strong>ERP:</strong> {animal.erp}
                      </div>
                      <ul style={{ paddingLeft: '1rem', marginTop: '0.5rem', color: '#64748b' }}>
                        {animal.eventos.map((evento) => (
                          <li key={evento.id}>
                            ID Evento: {evento.id} - Tipo: {evento.tipo || "Sin tipo"} - Fecha: {evento.fecha
                              ? new Date(evento.fecha.seconds * 1000).toLocaleDateString()
                              : "Sin fecha"}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button
                  className={styles.btnDanger}
                  onClick={migrarEventos}
                  disabled={migrando}
                >
                  {migrando ? "Migrando..." : "Migrar Eventos Ahora"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default EventoMigracion;
