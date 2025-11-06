import { useContext, useState } from 'react';
import { FirebaseContext } from '../firebase2';
import { Button, Spinner } from 'react-bootstrap';
import Layout from '../components/layout/layout';

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
      <div style={{ marginTop: 20 }}>
        <Button
          onClick={completarCamposEventos}
          disabled={procesando}
          variant="success"
        >
          {procesando ? <Spinner animation="border" size="sm" /> : 'Completar eventos Dirsa'}
        </Button>
        {mensaje && <p>{mensaje}</p>}
      </div>
    </Layout>
  );
}
