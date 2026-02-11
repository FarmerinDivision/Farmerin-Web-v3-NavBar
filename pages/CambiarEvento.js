import { useContext, useState } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import AdminTamboSelector from '../components/utils/AdminTamboSelector';
import styles from '../styles/Administrador.module.scss';
import { Card } from 'react-bootstrap';

export default function CompletarCamposEventosBtn() {
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const completarCamposEventos = async () => {
    if (!tamboSel) {
      setMensaje('⚠ Seleccioná un tambo primero.');
      return;
    }

    setProcesando(true);
    setMensaje('');

    try {
      // 🔹 1️⃣ Obtener todos los animales del tambo seleccionado
      const animalesSnap = await firebase.db
        .collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .get();

      let totalEventosActualizados = 0;

      // 🔹 2️⃣ Recorrer animales
      for (const animalDoc of animalesSnap.docs) {
        const animal = animalDoc.data();
        const { rp, erp, idtambo } = animal;

        // Referencia a la subcolección eventos del animal
        const eventosRef = firebase.db
          .collection('animal')
          .doc(animalDoc.id)
          .collection('eventos');

        // 🔹 3️⃣ Obtener solo eventos del tipo requerido
        const eventosSnap = await eventosRef
          .where('tipo', '==', 'Control Lechero mediante planilla Dirsa')
          .get();

        if (eventosSnap.empty) continue;

        const batch = firebase.db.batch();

        for (const evDoc of eventosSnap.docs) {
          const evData = evDoc.data();

          // Si ya tiene los campos, lo salteamos
          if (evData.rp && evData.erp && evData.idtambo) continue;

          // Actualizamos el evento con los datos del animal
          batch.update(evDoc.ref, {
            rp: rp ?? null,
            erp: erp ?? null,
            idtambo: idtambo ?? tamboSel.id,
          });

          totalEventosActualizados++;
        }

        // 🔹 Aplicar el batch si hay cambios
        await batch.commit();
      }

      setMensaje(`✅ Se completaron ${totalEventosActualizados} eventos "Control Lechero mediante planilla Dirsa"`);
    } catch (error) {
      console.error(error);
      setMensaje('❌ Error al actualizar los eventos.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Layout>
      <div className={styles.cambiarEventoContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Completar Eventos DIRSA</h1>
          <p className={styles.subtitle}>Normalización de datos faltantes en eventos de control lechero.</p>
        </div>

        <div className={styles.cardInfo}>
          <ul>
            <p><strong>¿Qué podés hacer acá?</strong></p>
            <p>En esta pantalla podés completar automáticamente datos faltantes en eventos de Control Lechero del tambo seleccionado.</p>
            <p><strong>La herramienta:</strong></p>
            <li>Recorre los animales del tambo.</li>
            <li>Busca eventos del tipo “Control Lechero mediante planilla Dirsa”.</li>
            <li>Completa en cada evento los campos RP, ERP e idtambo usando la información del animal correspondiente.</li>
            <li>Omite los eventos que ya tienen estos datos cargados.</li>
            <p><strong>Este proceso no crea ni elimina eventos, solo completa información faltante para mantener los datos consistentes.</strong></p>
            <p><strong>ℹ️ Solo se actualizan eventos que tengan datos incompletos.</strong></p>
          </ul>
        </div>

        <AdminTamboSelector />

        <div className={styles.card}>
          <div style={{ marginTop: 20 }}>
            <button
              onClick={completarCamposEventos}
              disabled={procesando}
              className={styles.btnSuccess}
            >
              {procesando ? 'Procesando...' : 'Completar eventos Dirsa'}
            </button>

            {mensaje && (
              <div className={mensaje.includes('Error') || mensaje.includes('⚠') ? styles.errorMessage : styles.successMessage} style={{ marginTop: '1rem' }}>
                {mensaje}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
