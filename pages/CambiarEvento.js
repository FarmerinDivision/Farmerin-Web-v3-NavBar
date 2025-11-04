import { useContext, useState } from 'react';
import { FirebaseContext } from '../firebase2';
import { Button, Spinner } from 'react-bootstrap';
import Layout from '../components/layout/layout';

////// ✅ Código optimizado con índices e indexación de collectionGroup()

export default function CompletarEventosDirsaBtn() {
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
      let totalEventosActualizados = 0;

      // ✅ Obtener todos los eventos Dirsa del tambo usando índices (rápido)
      const eventosSnap = await firebase.db
        .collectionGroup('eventos')
        .where('tipo', '==', 'Control Lechero mediante planilla Dirsa')
        .where('idtambo', '==', tamboSel.id)
        .get();

      const batch = firebase.db.batch();

      for (const evDoc of eventosSnap.docs) {
        const evData = evDoc.data();

        // 👌 Si ya tiene los datos → NO tocar
        if (evData.idtambo && evData.rp && evData.erp) continue;

        // ✅ Si falta info → completar

        const updateData = {
          idtambo: evData.idtambo ?? tamboSel.id,
          rp: evData.rp ?? null,
          erp: evData.erp ?? null,
        };

        batch.update(evDoc.ref, updateData);
        totalEventosActualizados++;
      }

      await batch.commit();
      setMensaje(`✅ Eventos Dirsa actualizados: ${totalEventosActualizados}`);
    } catch (error) {
      console.error(error);
      setMensaje('❌ Error al actualizar eventos.');
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
          {procesando ? <Spinner animation="border" size="sm" /> : 'Completar eventos'}
        </Button>
        {mensaje && <p>{mensaje}</p>}
      </div>
    </Layout>
  );
}
