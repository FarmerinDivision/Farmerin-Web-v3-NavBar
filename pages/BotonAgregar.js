import React, { useState } from 'react';
import { FirebaseContext } from '../firebase2';
import { useContext } from 'react';
import Layout from '../components/layout/layout';
import firebase from 'firebase/app';
import 'firebase/firestore';
import AdminTamboSelector from '../components/utils/AdminTamboSelector';
import styles from '../styles/Administrador.module.scss';
import { Card } from 'react-bootstrap';

function BotonAgregar() {
    const { firebase } = useContext(FirebaseContext);
    const [mensaje, setMensaje] = useState('');

    const agregarCampo = async () => {
        try {
            const docRef = await firebase.db.collection("animal").where("idtambo", "==", "jGWqeJjPAW3yJtAZpKJr").get();
            const batch = firebase.db.batch();

            docRef.docs.forEach(doc => {
                const docRef = firebase.db.collection("animal").doc(doc.id);
                batch.update(docRef, { racionmodificada: 1 }); // NOMBRE DEL CAMPO QUE SE QUIERE AGREGAR
            });

            await batch.commit();
            setMensaje("Campo 'raumentada' añadido a todos los documentos.");
        } catch (e) {
            setMensaje(`Error al añadir el campo: ${e.message}`);
        }
    };

    const eliminarCampos = async () => {
        try {
            const docRef = await firebase.db.collection("animal").where("idtambo", "==", "jGWqeJjPAW3yJtAZpKJr").get();
            const batch = firebase.db.batch();

            docRef.docs.forEach(doc => {
                const docRef = firebase.db.collection("animal").doc(doc.id);
                batch.update(docRef, {
                    raumentada: firebase.firestore.FieldValue.delete(),
                    rdisminuida: firebase.firestore.FieldValue.delete()
                });
            });

            await batch.commit();
            setMensaje("Campos 'raumentada' y 'rdisminuida' eliminados de todos los documentos.");
        } catch (e) {
            setMensaje(`Error al eliminar los campos: ${e.message}`);
        }
    };

    return (
        <Layout>
            <div className={styles.botonAgregarContainer}>

                <div className={styles.header}>
                    <h1 className={styles.title}>Modificación de Estructura</h1>
                    <p className={styles.subtitle}>Herramienta avanzada para agregar o eliminar campos en animales.</p>
                </div>

                <div className={styles.cardInfo}>
                    <ul>
                        <p><strong>¿Qué podés hacer acá?</strong></p>
                        <p>En esta pantalla podés agregar o eliminar campos en los registros de animales de un tambo específico.</p>
                        <p><strong>La herramienta permite:</strong></p>
                        <li>Agregar un campo nuevo a todos los animales del tambo seleccionado.</li>
                        <li>Eliminar campos existentes de forma masiva cuando ya no son necesarios.</li>
                        <p><strong>Estas acciones se aplican a todos los animales del tambo y modifican directamente la estructura de los datos.</strong></p>
                        <p><strong>⚠️ Usá esta herramienta con precaución, ya que los cambios son masivos y no se pueden deshacer.</strong></p>
                    </ul>
                </div>

                <AdminTamboSelector />

                <div className={styles.centerContent}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className={styles.btnSuccess} onClick={agregarCampo}>
                            Agregar Campo
                        </button>
                        <button className={styles.btnDanger} onClick={eliminarCampos}>
                            Eliminar Campos
                        </button>
                    </div>
                    {mensaje && <div className={mensaje.includes('Error') ? styles.errorMessage : styles.successMessage}>{mensaje}</div>}
                </div>
            </div>
        </Layout>
    );
}

export default BotonAgregar;
