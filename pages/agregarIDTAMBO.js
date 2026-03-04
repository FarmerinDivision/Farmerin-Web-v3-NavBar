import React, { useEffect, useState, useContext } from "react";
import Layout from "../components/layout/layout";
import { FirebaseContext } from "../firebase2";

export default function BuscarEventos() {

  const { firebase } = useContext(FirebaseContext);

  const [tambos, setTambos] = useState([]);
  const [tamboSeleccionado, setTamboSeleccionado] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);

  const tiposEventos = [
    { label: 'Servicio', tipo: 'Servicio' },
    { label: 'Parto', tipo: 'Parto' },
    { label: 'Aborto', tipo: 'Aborto' },
    { label: 'Secado', tipo: 'Secado' },
    { label: 'Tacto', tipo: 'Tacto' },
    { label: 'Celo', tipo: 'Celo' },
    { label: 'Alta Vaquillona', tipo: 'Alta Vaquillona' },
    { label: 'Alta', tipo: 'Alta' },
    { label: 'Baja', tipo: 'Baja' },
    { label: 'Rechazo', tipo: 'Rechazo' },
    { label: 'Tratamiento', tipo: 'Tratamiento' },
    { label: 'Recepcion', tipo: 'Recepcion' },
    { label: 'Cambio eRP', tipo: 'Cambio eRP' },
    { label: 'Produccion', tipo: 'Produccion' },
  ];

  // 🔹 Obtener tambos al cargar
  useEffect(() => {
    if (!firebase) return;

    async function obtenerTambos() {

      const snapshot = await firebase.db.collection("tambo").get();

      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTambos(lista);
    }

    obtenerTambos();
  }, [firebase]);

  // 🔎 Buscar eventos por tambo + tipo (sin idtambo asignado)
  async function buscarEventos(tipo) {

    if (!tamboSeleccionado) {
      alert("Seleccioná un tambo primero");
      return;
    }

    setTipoSeleccionado(tipo);
    setCargando(true);
    setEventos([]);

    try {
      const eventosSinIdTambo = [];

      // Caso especial: eventos a nivel TAMBO (Recepcion / Produccion)
      if (tipo === "Recepcion") {
        const recepSnap = await firebase.db
          .collection("tambo")
          .doc(tamboSeleccionado.id)
          .collection("recepcion")
          .get();

        recepSnap.forEach((doc) => {
          const data = doc.data();
          if (!data.idtambo) {
            eventosSinIdTambo.push({
              id: doc.id,
              ...data,
              ref: doc.ref,
              // sin animal asociado
              animalId: null,
              animalRp: "",
              animalErp: "",
            });
          }
        });
      } else if (tipo === "Produccion") {
        const prodSnap = await firebase.db
          .collection("tambo")
          .doc(tamboSeleccionado.id)
          .collection("produccion")
          .get();

        prodSnap.forEach((doc) => {
          const data = doc.data();
          if (!data.idtambo) {
            eventosSinIdTambo.push({
              id: doc.id,
              ...data,
              ref: doc.ref,
              animalId: null,
              animalRp: "",
              animalErp: "",
            });
          }
        });
      } else {
        // Resto de eventos: a nivel ANIMAL en subcolección "eventos"
        const snapshotAnimales = await firebase.db
          .collection("animal")
          .where("idtambo", "==", tamboSeleccionado.id)
          .get();

        const consultasEventos = snapshotAnimales.docs.map(async (docAnimal) => {
          const datosAnimal = docAnimal.data();

          const eventosSnapshot = await docAnimal.ref
            .collection("eventos")
            .where("tipo", "==", tipo)
            .get();

          eventosSnapshot.forEach((docEvento) => {
            const data = docEvento.data();

            if (!data.idtambo) {
              eventosSinIdTambo.push({
                id: docEvento.id,
                ...data,
                ref: docEvento.ref,
                animalId: docAnimal.id,
                animalRp: datosAnimal.rp || "",
                animalErp: datosAnimal.erp || "",
              });
            }
          });
        });

        await Promise.all(consultasEventos);
      }

      setEventos(eventosSinIdTambo);

    } catch (error) {
      console.error("Error buscando eventos:", error);
    }

    setCargando(false);
  }

  // ✅ Asignar idtambo a todos los eventos listados
  async function asignarIdTambo() {
    if (!tamboSeleccionado) {
      alert("Seleccioná un tambo primero");
      return;
    }

    if (eventos.length === 0) {
      alert("No hay eventos para actualizar.");
      return;
    }

    const confirmar = window.confirm(
      `Vas a asignar el ID del tambo "${tamboSeleccionado.nombre}" a ${eventos.length} eventos. ¿Continuar?`
    );

    if (!confirmar) return;

    setCargando(true);

    try {
      const actualizaciones = eventos.map((ev) =>
        ev.ref.update({ idtambo: tamboSeleccionado.id })
      );

      await Promise.all(actualizaciones);

      alert("Se actualizó el idtambo de todos los eventos encontrados.");
      setEventos([]);

    } catch (error) {
      console.error("Error asignando idtambo:", error);
      alert("Ocurrió un error al actualizar los eventos. Revisá la consola.");
    }

    setCargando(false);
  }

  return (
    <Layout titulo="Agregar IDTAMBO">
    <div style={{ padding: 20 }}>

      <h2>Seleccionar Tambo</h2>

      {/* 🔵 BOTONES TAMBO */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>

        {tambos.map(tambo => (
          <button
            key={tambo.id}
            onClick={() => setTamboSeleccionado(tambo)}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor:
                tamboSeleccionado?.id === tambo.id ? "#1b829b" : "#e0e0e0",
              color:
                tamboSeleccionado?.id === tambo.id ? "#fff" : "#000"
            }}
          >
            {tambo.nombre}
          </button>
        ))}

      </div>

      {tamboSeleccionado && (
        <>
          <h3>Eventos del tambo: {tamboSeleccionado.nombre}</h3>

          {/* 🔘 BOTONES EVENTOS */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>

            {tiposEventos.map((ev) => (
              <button
                key={ev.tipo}
                onClick={() => buscarEventos(ev.tipo)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    tipoSeleccionado === ev.tipo ? "#1b829b" : "#dcdcdc",
                  color:
                    tipoSeleccionado === ev.tipo ? "#fff" : "#000"
                }}
              >
                {ev.label}
              </button>
            ))}

          </div>
        </>
      )}

      {/* ⏳ Loader */}
      {cargando && (
        <p style={{ marginTop: 20, fontWeight: "bold", color: "#1b829b" }}>
          🔍 Buscando eventos...
        </p>
      )}

      {/* 📋 Resultados */}
      {!cargando && eventos.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Total eventos SIN idtambo: {eventos.length}</h3>

          <button
            onClick={asignarIdTambo}
            style={{
              marginBottom: 16,
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor: "#1b829b",
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            Asignar IDTAMBO a estos eventos
          </button>

          <ul>
            {eventos.map(ev => (
              <li key={ev.id} style={{ marginBottom: 8 }}>
                <div><strong>Evento:</strong> {ev.id}</div>
                <div><strong>Tipo:</strong> {ev.tipo}</div>
                <div><strong>Fecha:</strong> {ev.fecha ? ev.fecha.toDate ? ev.fecha.toDate().toLocaleDateString() : String(ev.fecha) : "Sin fecha"}</div>
                <div><strong>Usuario:</strong> {ev.usuario || "Sin usuario"}</div>
                <div><strong>Detalle:</strong> {ev.detalle || "Sin detalle"}</div>
                <div>
                  <strong>Animal RP:</strong>{" "}
                  {ev.animalRp || "Sin RP"}
                </div>
                <div>
                  <strong>Animal eRP:</strong>{" "}
                  {ev.animalErp || "Sin eRP"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
    </Layout>
  );
}