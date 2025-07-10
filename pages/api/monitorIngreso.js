// pages/api/monitor.js
import firebase from '../../firebase'; // Asegurate de que esta ruta sea correcta según tu estructura

export default async function handler(req, res) {
  const { tamboId } = req.query;

  if (!tamboId) {
    return res.status(400).json({ error: 'Falta tamboId' });
  }

  try {
    const docRef = firebase.db.collection('tambo').doc(tamboId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'No se encontró el tambo' });
    }

    const monitorLink = docSnap.data().monitor;

    if (!monitorLink || typeof monitorLink !== 'string') {
      return res.status(400).json({ error: 'No se encontró el link del monitor' });
    }

    // 🔐 Redirección segura (el cliente no ve el link real)
    return res.redirect(302, monitorLink);

  } catch (error) {
    console.error('Error al obtener el link del monitor:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
