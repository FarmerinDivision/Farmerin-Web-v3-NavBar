import React, { useState, useContext } from "react";
import { FirebaseContext } from "../firebase2";
import Layout from '../components/layout/layout';
import AdminTamboSelector from '../components/utils/AdminTamboSelector';
import styles from '../styles/Administrador.module.scss';
import { Card } from 'react-bootstrap';

const ListaAnimales = () => {
  const { firebase } = useContext(FirebaseContext);
  const [animales, setAnimales] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [contador, setContador] = useState(0); // Nuevo estado para el contador

  // Función para obtener animales con `estpro: "Vq.p/servicio"`
  const obtenerAnimalesPorEstado = async () => {
    setCargando(true);
    try {
      const querySnapshot = await firebase.db.collection("animal")
        .where('idtambo', '==', 'PgIQZisE8chKEODVk72E')
        .where("estpro", "==", "Vq.p/servicio")
        .get();

      const listaAnimales = [];
      querySnapshot.forEach((doc) => {
        listaAnimales.push({ id: doc.id, ...doc.data() });
      });

      setAnimales(listaAnimales);
      setContador(listaAnimales.length); // Actualizar el contador
      console.log("Animales obtenidos:", listaAnimales);
    } catch (error) {
      console.error("Error al obtener los animales:", error);
      alert("Ocurrió un error al obtener los animales.");
    } finally {
      setCargando(false);
    }
  };

  // Función para cambiar el estado de los animales a "seca"
  const cambiarEstadoAseca = async () => {
    setCargando(true);
    try {
      for (const animal of animales) {
        await firebase.db.collection("animal").doc(animal.id).update({
          estpro: "seca",
        });
      }
      alert("Estado de los animales cambiado a 'seca'.");
      setAnimales([]); // Limpiar la lista después del cambio
      setContador(0); // Resetear el contador
    } catch (error) {
      console.error("Error al cambiar el estado:", error);
      alert("Ocurrió un error al cambiar el estado de los animales.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Layout titulo='Cambio a Vaq.p/Servicio a Seca'>
      <div className={styles.cambioAsecaContainer}>

        <div className={styles.header}>
          <h1 className={styles.title}>Cambio Masivo a Seca</h1>
          <p className={styles.subtitle}>Gestión de cambio de estado productivo para vaquillonas.</p>
        </div>

        <div className={styles.cardInfo}>
          <ul>
            <p><strong>¿Qué podés hacer acá?</strong></p>
            <p>En esta pantalla podés cambiar el estado productivo de animales de “Vq.p/servicio” a “seca” para un tambo específico.</p>
            <p><strong>El proceso funciona en dos pasos:</strong></p>
            <li>Primero se obtienen y muestran los animales que actualmente se encuentran en el estado “Vq.p/servicio”.</li>
            <li>Luego, si el listado es correcto, podés ejecutar el cambio para actualizar el estado de todos esos animales a “seca”.</li>
            <p><strong>Antes de aplicar el cambio, se muestra la cantidad de animales que serán afectados para que puedas verificar la información.</strong></p>
            <p><strong>⚠️ Esta acción modifica datos de forma masiva y no se puede deshacer, por lo que se recomienda utilizarla con precaución.</strong></p>
          </ul>
        </div>

        <AdminTamboSelector />

        <div className={styles.card}>
          <div className={styles.actions}>
            {/* Botón para obtener animales */}
            <button
              onClick={obtenerAnimalesPorEstado}
              disabled={cargando}
              className={styles.btnPrimary}
            >
              {cargando ? "Cargando..." : "Obtener Animales"}
            </button>

            {/* Nuevo botón para cambiar el estado a "seca" */}
            {animales.length > 0 && (
              <button
                onClick={cambiarEstadoAseca}
                disabled={cargando}
                className={styles.btnWarning}
              >
                {cargando ? "Cambiando..." : "Cambiar Estado a Seca"}
              </button>
            )}
          </div>

          {/* Contador de animales obtenidos */}
          {contador > 0 && (
            <div className={styles.contadorAseca}>
              Animales obtenidos: {contador}
            </div>
          )}

          {/* Lista de animales */}
          {animales.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID (RFID)</th>
                    <th>Nombre (RP)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {animales.map((item) => (
                    <tr key={item.id}>
                      <td>{item.erp}</td>
                      <td>{item.rp || "Sin nombre"}</td>
                      <td>{item.estpro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !cargando && (
            <div className={styles.successMessage}>No hay animales con ese estado.</div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ListaAnimales;
