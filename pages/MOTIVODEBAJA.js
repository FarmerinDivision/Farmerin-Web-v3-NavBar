import React, { useState, useContext } from "react";
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import styles from '../styles/Herramientas.module.scss';

const MiComponente = () => {
  const [animales, setAnimales] = useState([]);
  const [animalesFijos, setAnimalesFijos] = useState([]); // animales del tambo fijo
  const [animalesGrupo, setAnimalesGrupo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const { firebase, tamboSel } = useContext(FirebaseContext);

  // ID de tambo fijo que vos definís
  const TAMBO_FIJO_ID = "cyXDv2ydRIbXEmFRaUND";

  // 🔹 Obtener animales del tambo seleccionado
  const obtenerAnimales = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await firebase.db.collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .get();

      const listaAnimales = [];
      querySnapshot.forEach((doc) => {
        listaAnimales.push({ id: doc.id, ...doc.data() });
      });

      setAnimales(listaAnimales);
    } catch (error) {
      console.error("Error obteniendo animales:", error);
      setError("Error obteniendo animales. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };


  // 🔹 Obtener animales de un tambo fijo y asignar grupo=0
  const obtenerAnimalesConGrupo = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await firebase.db.collection('animal')
        .where('idtambo', '==', TAMBO_FIJO_ID)
        .get();

      const listaAnimales = [];
      querySnapshot.forEach((doc) => {
        listaAnimales.push({ id: doc.id, ...doc.data() });
      });

      if (listaAnimales.length === 0) {
        alert("No se encontraron animales en el tambo fijo.");
        setAnimalesGrupo([]);
        return;
      }

      // batch update para agregar grupo = 0
      const batch = firebase.db.batch();
      for (const animal of listaAnimales) {
        const animalRef = firebase.db.collection('animal').doc(animal.id);
        batch.update(animalRef, { grupo: 0 });
      }
      await batch.commit();

      // reflejar en el estado local
      const listaConGrupo = listaAnimales.map(a => ({
        ...a,
        grupo: 0,
      }));

      setAnimalesGrupo(listaConGrupo);
      alert(`Se actualizaron ${listaConGrupo.length} animales con grupo=0`);
    } catch (error) {
      console.error("Error obteniendo/actualizando animales con grupo:", error);
      setError("Error procesando los animales.");
    } finally {
      setLoading(false);
    }
  };






  // 🔹 Obtener animales de un tambo fijo
  const obtenerAnimalesFijos = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await firebase.db.collection('animal')
        .where('idtambo', '==', TAMBO_FIJO_ID)
        .get();

      const listaAnimales = [];
      querySnapshot.forEach((doc) => {
        listaAnimales.push({ id: doc.id, ...doc.data() });
      });

      setAnimalesFijos(listaAnimales);
      alert(`Se obtuvieron ${listaAnimales.length} animales del tambo fijo.`);
    } catch (error) {
      console.error("Error obteniendo animales del tambo fijo:", error);
      setError("Error obteniendo animales del tambo fijo.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Actualizar racion a 5
  // 🔹 Actualizar racion y fracion
  const actualizarRacionFijos = async () => {
    if (animalesFijos.length === 0) {
      alert("Primero obtené los animales del tambo fijo.");
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const batch = firebase.db.batch();

      for (const animal of animalesFijos) {
        const animalRef = firebase.db.collection('animal').doc(animal.id);
        batch.update(animalRef, {
          racion: 5,
          fracion: firebase.nowTimeStamp()  // 👈 acá se guarda el timestamp
        });
      }

      await batch.commit();

      // 🔹 Reflejar cambios en la lista local
      setAnimalesFijos(prev =>
        prev.map(a => ({
          ...a,
          racion: 5,
          fracion: new Date() // para que también lo veas actualizado en la UI
        }))
      );

      alert("Raciones y fracion actualizadas correctamente.");
    } catch (error) {
      console.error("Error actualizando raciones:", error);
      setError("Error actualizando raciones.");
    } finally {
      setUpdating(false);
    }
  };

  // Función original de actualizar eventos
  const actualizarEventos = async () => {
    if (animales.length === 0) {
      alert("No hay animales para actualizar.");
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const batch = firebase.db.batch();

      for (const animal of animales) {
        const eventosRef = firebase.db.collection('animal').doc(animal.id).collection('eventos');

        const eventosSnapshot = await eventosRef.get();
        eventosSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        const nuevoEvento = {
          fecha: new Date(),
          descripcion: "Evento agregado automáticamente",
          tipo: "actualizacion",
        };

        const nuevoEventoRef = eventosRef.doc();
        batch.set(nuevoEventoRef, nuevoEvento);
      }

      await batch.commit();
      alert("Eventos actualizados correctamente.");
    } catch (error) {
      console.error("Error actualizando eventos:", error);
      setError("Error actualizando eventos. Intenta nuevamente.");
    } finally {
      setUpdating(false);
    }
  };

  // 🔹 Nueva función para asignar grupo=0 a los animales obtenidos
  const asignarGrupoAnimales = async () => {
    if (animales.length === 0) {
      alert("Primero obtené los animales del tambo seleccionado.");
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const batch = firebase.db.batch();

      for (const animal of animales) {
        const animalRef = firebase.db.collection('animal').doc(animal.id);
        batch.update(animalRef, { grupo: 0 });
      }

      await batch.commit();

      // 🔹 Reflejar cambios en la UI
      setAnimales(prev =>
        prev.map(a => ({
          ...a,
          grupo: 0,
        }))
      );

      alert("Se asignó grupo=0 a todos los animales.");
    } catch (error) {
      console.error("Error asignando grupo:", error);
      setError("Error asignando grupo a los animales.");
    } finally {
      setUpdating(false);
    }
  };

  // /*
  // 🔹 Actualizar eventos Control Lechero para muchos tambos
  /* "cyXDv2ydRIbXEmFRaUND",
     "gTzakuM6yFSNZgjJopZG",
     "e4ZnILyD3WBb5tuamAiq",
     "cictlHfUlNkH0KnQtXJS",
     "nkVublhzhK1pwFEjx9DW",
     "7uZStkH1TDzgkhkgzUtH",
     "PgIQZisE8chKEODVk72E",
     "SrkWyL9Uoa6uBFkf3WaH",
     "b720kztM2SLhXHXPMCJb",
     */
  // 🔥 Ultra Optimizado: BulkWriter + Lecturas Paralelas + Skip de Eventos ya Actualizados
  // ⚡ Optimizado SIN bulkWriter — compatible con Firebase client
  const actualizarEventosControlLechero = async () => {
    const TAMBO_IDS = [
      "gTzakuM6yFSNZgjJopZG",
      "e4ZnILyD3WBb5tuamAiq",
      "cictlHfUlNkH0KnQtXJS",
      "nkVublhzhK1pwFEjx9DW",
      "7uZStkH1TDzgkhkgzUtH",
      "PgIQZisE8chKEODVk72E",
      "SrkWyL9Uoa6uBFkf3WaH",
      "b720kztM2SLhXHXPMCJb",
    ];

    console.log("🚀 Iniciando actualización optimizada sin bulkWriter...");
    setUpdating(true);
    setError(null);

    let totalActualizados = 0;
    let totalSaltados = 0;
    let totalErrores = 0;

    // ⭐ Pool de concurrencia
    const ejecutarPool = async (tareas, limite = 15) => {
      const resultados = [];
      const cola = [...tareas];

      const workers = new Array(limite).fill(null).map(async () => {
        while (cola.length) {
          const tarea = cola.shift();
          try {
            resultados.push(await tarea());
          } catch (e) {
            console.error("❌ Error en pool:", e);
          }
        }
      });

      await Promise.all(workers);
      return resultados;
    };

    try {
      for (const idTambo of TAMBO_IDS) {
        console.log("--------------------------------------------------");
        console.log("🏷 TAMBO:", idTambo);

        const snapAnimales = await firebase.db
          .collection("animal")
          .where("idtambo", "==", idTambo)
          .get();

        console.log(`🐄 Animales encontrados: ${snapAnimales.size}`);

        if (snapAnimales.empty) {
          console.warn("⚠ Tambo sin animales, se saltea.");
          continue;
        }

        // Creamos las tareas de procesamiento de animales
        const tareasAnimales = snapAnimales.docs.map((docAnimal) => async () => {
          const animal = docAnimal.data();
          const animalId = docAnimal.id;

          const rp = animal.rp ?? null;
          const erp = animal.erp ?? null;

          const snapEventos = await firebase.db
            .collection("animal")
            .doc(animalId)
            .collection("eventos")
            .where("tipo", "==", "Control Lechero")
            .get();

          if (snapEventos.empty) return;

          // Procesamos eventos
          const batch = firebase.db.batch();
          let batchCount = 0;

          for (const evDoc of snapEventos.docs) {
            const evento = evDoc.data();

            const yaTieneCampos =
              evento.rp !== undefined &&
              evento.erp !== undefined &&
              evento.idtambo !== undefined;

            if (yaTieneCampos) {
              totalSaltados++;
              continue;
            }

            batch.update(evDoc.ref, {
              rp,
              erp,
              idtambo: idTambo
            });

            totalActualizados++;
            batchCount++;

            if (batchCount === 400) {
              await batch.commit();
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }
        });

        // Procesamos animales en paralelo (15 por vez)
        await ejecutarPool(tareasAnimales, 15);
      }

      alert(
        `✔ Proceso terminado\n` +
        `Eventos actualizados: ${totalActualizados}\n` +
        `Eventos saltados: ${totalSaltados}\n` +
        `Errores: ${totalErrores}`
      );

    } catch (e) {
      console.error("🔥 ERROR FATAL:", e);
      setError("Error general durante la actualización.");
    }

    setUpdating(false);
    console.log("🏁 Finalizó la actualización");
  };



  return (
    <Layout titulo="Herramientas">
      <div className={styles.miComponente}>
        {/* 🔹 Botones */}
        <div className={styles.acciones}>
          <button onClick={obtenerAnimales} disabled={loading}>
            {loading ? "Cargando..." : "Obtener Animales"}
          </button>
          <button onClick={actualizarEventosControlLechero} disabled={updating}>
            {updating ? "Actualizando..." : "Actualizar Eventos Control Lechero"}
          </button>

          {/* Este botón aparece solo si hay animales */}
          {animales.length > 0 && (
            <button onClick={asignarGrupoAnimales} disabled={updating}>
              {updating ? "Asignando..." : "Asignar Grupo=0"}
            </button>
          )}

          <button onClick={obtenerAnimalesConGrupo} disabled={loading}>
            {loading ? "Cargando..." : "Obtener Animales + Grupo=0"}
          </button>
        </div>

        {/* 🔹 Mensajes de error */}
        {error && <p className={styles.error}>{error}</p>}

        {/* 🔹 Lista animales del tambo seleccionado */}
        <h3>Animales del tambo seleccionado</h3>
        <ul>
          {animales.length === 0 && !loading && <li>No se encontraron animales.</li>}
          {animales.map((animal) => (
            <li key={animal.id}>
              <span>Nombre: {animal.rp}</span>
              <span>ID: {animal.erp}</span>
              <span>Ración: {animal.racion || "N/A"}</span>
              <span>Grupo: {animal.grupo ?? "Sin grupo"}</span>
            </li>
          ))}
        </ul>

        {/* 🔹 Lista animales con grupo */}
        <h3>Animales del tambo fijo con grupo=0</h3>
        <ul>
          {animalesGrupo.length === 0 && !loading && <li>No se encontraron animales.</li>}
          {animalesGrupo.map((animal) => (
            <li key={animal.id}>
              <span>Nombre: {animal.rp}</span>
              <span>ID: {animal.erp}</span>
              <span>Grupo: {animal.grupo}</span>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );


};

export default MiComponente;
