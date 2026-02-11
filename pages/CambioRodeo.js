import React, { useContext, useState } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import AdminTamboSelector from '../components/utils/AdminTamboSelector';
import styles from '../styles/Administrador.module.scss';
import { Card } from 'react-bootstrap';

// Función para actualizar el campo 'rodeo' basado en la ración para todos los animales con un idTambo específico
async function actualizarRodeoPorTambo(firebase, racion) {
    const db = firebase.db;
    const batch = db.batch();

    try {
        const querySnapshot = await db.collection("animal")
            .where("idtambo", "==", "jGWqeJjPAW3yJtAZpKJr")
            .where("racion", "==", racion)
            .get();

        querySnapshot.docs.forEach(doc => {
            let nuevoValorRodeo;

            // Determina el nuevo valor de 'rodeo' basado en 'racion'
            if (racion === 9) {
                nuevoValorRodeo = 1;
            } else if (racion === 1) {
                nuevoValorRodeo = 2;
            } else if (racion === 5) {
                nuevoValorRodeo = 5;
            } else if (racion === 2) {
                nuevoValorRodeo = 4;
            } else if (racion === 8) {
                nuevoValorRodeo = 3;
            } else {
                console.error("Ración no válida");
                return;
            }

            const docRef = db.collection("animal").doc(doc.id);
            batch.update(docRef, { rodeo: nuevoValorRodeo });
        });

        await batch.commit();
        console.log(`Campo 'rodeo' actualizado con éxito para todos los animales con ración ${racion}`);
    } catch (error) {
        console.error("Error al actualizar el campo 'rodeo': ", error);
    }
}

// Componente principal que se exporta por defecto
export default function CambioRodeo() {
    const { firebase } = useContext(FirebaseContext);
    const [mensaje, setMensaje] = useState('');

    const actualizarRodeoRacion9 = async () => {
        try {
            await actualizarRodeoPorTambo(firebase, 9);
            setMensaje("Campo 'rodeo' actualizado con éxito para ración 9.");
        } catch (error) {
            setMensaje("Error al actualizar el campo 'rodeo' para ración 9: " + error.message);
        }
    };

    const actualizarRodeoRacion1 = async () => {
        try {
            await actualizarRodeoPorTambo(firebase, 1);
            setMensaje("Campo 'rodeo' actualizado con éxito para ración 1.");
        } catch (error) {
            setMensaje("Error al actualizar el campo 'rodeo' para ración 1: " + error.message);
        }
    };

    const actualizarRodeoRacion5 = async () => {
        try {
            await actualizarRodeoPorTambo(firebase, 5);
            setMensaje("Campo 'rodeo' actualizado con éxito para ración 5.");
        } catch (error) {
            setMensaje("Error al actualizar el campo 'rodeo' para ración 5: " + error.message);
        }
    };

    const actualizarRodeoRacion2 = async () => {
        try {
            await actualizarRodeoPorTambo(firebase, 2);
            setMensaje("Campo 'rodeo' actualizado con éxito para ración 2.");
        } catch (error) {
            setMensaje("Error al actualizar el campo 'rodeo' para ración 2: " + error.message);
        }
    };

    return (
        <Layout titulo="Cambio de Rodeo">
            <div className={styles.cambioRodeoContainer}>

                <div className={styles.header}>
                    <h1 className={styles.title}>Cambio de Rodeo</h1>
                    <p className={styles.subtitle}>Actualización automática de rodeos según ración.</p>
                </div>

                <div className={styles.cardInfo}>
                    <ul>
                        <p><strong>¿Qué podés hacer acá?</strong></p>
                        <p>En esta pantalla podés actualizar automáticamente el rodeo de los animales según la ración asignada.</p>
                        <p><strong>La herramienta trabaja sobre un tambo específico y:</strong></p>
                        <li>Busca los animales que tengan una ración determinada.</li>
                        <li>Actualiza el campo rodeo en función de esa ración.</li>
                        <li>Aplica el cambio de forma masiva a todos los animales que cumplan la condición.</li>
                        <p><strong>Cada botón ejecuta el cambio para una ración en particular.</strong></p>
                        <p><strong>Esta acción modifica datos existentes y no se puede deshacer, por lo que se recomienda verificar la información antes de ejecutar los cambios.</strong></p>
                    </ul>
                </div>

                <AdminTamboSelector />

                <div className={styles.card}>
                    <div className={styles.buttonGrid}>
                        <button className={styles.btnPrimary} onClick={actualizarRodeoRacion9}>Actualizar Rodeo para Ración 9</button>
                        <button className={styles.btnPrimary} onClick={actualizarRodeoRacion1}>Actualizar Rodeo para Ración 1</button>
                        <button className={styles.btnPrimary} onClick={actualizarRodeoRacion5}>Actualizar Rodeo para Ración 5</button>
                        <button className={styles.btnPrimary} onClick={actualizarRodeoRacion2}>Actualizar Rodeo para Ración 2</button>
                    </div>
                    {mensaje && <div className={styles.successMessage} style={{ marginTop: '1.5rem' }}>{mensaje}</div>}
                </div>
            </div>
        </Layout>
    );
}
