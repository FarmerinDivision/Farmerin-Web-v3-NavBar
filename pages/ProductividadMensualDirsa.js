import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { Botonera, Mensaje, ContenedorSpinner, Contenedor } from '../components/ui/Elementos';
import { Button, Form, Row, Col, Spinner, Table } from 'react-bootstrap';
import { RiSearchLine } from 'react-icons/ri';
import { format } from 'date-fns';
import styles from '../styles/Dirsa.module.scss';

/**
 * ProductividadMensualDirsa
 * Consulta los eventos de tipo "Control Lechero mediante planilla Dirsa"
 * del mes seleccionado en todos los animales del tambo actual.
 */

const ProductividadMensualDirsa = () => {
  const { firebase, tamboSel } = useContext(FirebaseContext);

  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [mensaje, setMensaje] = useState('');

  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[Dirsa] handleSubmit: inicio', { tamboSel, mesSeleccionado });
    if (!tamboSel) {
      console.log('[Dirsa] handleSubmit: sin tambo seleccionado');
      setMensaje('Seleccioná un tambo para continuar.');
      return;
    }
    if (!mesSeleccionado) {
      console.log('[Dirsa] handleSubmit: sin mes seleccionado');
      setMensaje('Seleccioná un mes.');
      return;
    }

    setProcesando(true);
    setEventos([]);
    setMensaje('');

    try {
      // Obtenemos todos los animales del tambo seleccionado
      console.log('[Dirsa] Cargando animales del tambo seleccionado...');
      const animalesSnap = await firebase.db
        .collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .get();
      console.log('[Dirsa] Animales cargados:', animalesSnap.size);

      let resultados = [];
      const mesIndexSel = MESES.indexOf(mesSeleccionado);
      console.log('[Dirsa] Índice de mes seleccionado:', mesIndexSel, mesSeleccionado);

      // Recorremos cada animal y buscamos los eventos correspondientes
      for (const animalDoc of animalesSnap.docs) {
        console.log('[Dirsa] Procesando animal', { animalId: animalDoc.id });
        const eventosSnap = await firebase.db
          .collection('animal')
          .doc(animalDoc.id)
          .collection('eventos')
          .where('tipo', '==', 'Control Lechero mediante planilla Dirsa')
          .get();
        console.log('[Dirsa] Eventos encontrados para animal', animalDoc.id, ':', eventosSnap.size);

        eventosSnap.forEach((evDoc) => {
          const ev = evDoc.data();
          console.log('[Dirsa] Evento leído', { eventoId: evDoc.id, ev });

          // Normalizar fecha a Date
          let fechaDate = null;
          if (ev.fecha?.seconds) {
            fechaDate = new Date(ev.fecha.seconds * 1000);
          } else if (typeof ev.fecha?.toDate === 'function') {
            fechaDate = ev.fecha.toDate();
          } else if (typeof ev.fecha === 'string') {
            const parsed = new Date(ev.fecha);
            if (!isNaN(parsed)) fechaDate = parsed;
          }
          if (!fechaDate) {
            console.log('[Dirsa] Evento sin fecha válida, se omite', { eventoId: evDoc.id, fecha: ev.fecha });
            return;
          }

          console.log('[Dirsa] Fecha normalizada', { eventoId: evDoc.id, fechaDate });

          // Filtrar por mes seleccionado con índice numérico
          if (fechaDate.getMonth() === mesIndexSel) {
            const animalData = animalDoc.data() || {};
            const fechaStr = format(fechaDate, 'dd/MM/yyyy');
            console.log('[Dirsa] Evento coincide con mes seleccionado', { eventoId: evDoc.id, fechaStr });
            resultados.push({
              id: evDoc.id,
              animalId: animalDoc.id,
              fecha: fechaStr,
              RP: ev.rp || animalData.rp || '',
              ERP: ev.erp || animalData.erp || '',
              detalle: ev.detalle || '',
            });
          } else {
            console.log('[Dirsa] Evento NO coincide con mes seleccionado', {
              eventoId: evDoc.id,
              mesEvento: fechaDate.getMonth(),
              mesSeleccionado: mesIndexSel
            });
          }
        });
      }

      console.log('[Dirsa] Total resultados:', resultados.length);
      if (resultados.length === 0) {
        setMensaje('No se encontraron controles lecheros para el mes seleccionado.');
      }

      setEventos(resultados);
    } catch (error) {
      console.error('Error al obtener los eventos:', error);
      setMensaje('Ocurrió un error al cargar los datos.');
    } finally {
      console.log('[Dirsa] Finaliza búsqueda');
      setProcesando(false);
    }
  };

  return (
    <Layout titulo="Productividad Mensual Dirsa">
      <Botonera>
        <Form onSubmit={handleSubmit} className={styles.form}>
          <Row>
            <Col md={6}>
              <Form.Label>Seleccioná el mes</Form.Label>
              <Form.Control
                as="select"
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className={styles.select}
              >
                <option value="">-- Seleccioná un mes --</option>
                {MESES.map((m, i) => (
                  <option key={i} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </Form.Control>
            </Col>
            <Col md={6} className={styles.acciones}>
              <Button variant="info" type="submit" className={styles.button}>
                <RiSearchLine size={20} /> Buscar
              </Button>
            </Col>
          </Row>
        </Form>
      </Botonera>

      {procesando && (
        <ContenedorSpinner>
          <Spinner animation="border" variant="info" role="status" />
          <div className={styles.spinnerText}>Buscando registros...</div>
        </ContenedorSpinner>
      )}

      {!procesando && mensaje && (
        <Mensaje>
          <div className={styles.mensajeCaja}>{mensaje}</div>
        </Mensaje>
      )}

      {!procesando && eventos.length > 0 && (
        <Contenedor>
          <Table striped bordered hover className={styles.tabla}>
            <thead>
              <tr>
                <th>Animal</th>
                <th>RP</th>
                <th>Raza</th>
                <th>Fecha</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.nombre || ev.animalId}</td>
                  <td>{ev.RP}</td>
                  <td>{ev.raza}</td>
                  <td>{ev.fecha}</td>
                  <td>{ev.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Contenedor>
      )}
    </Layout>
  );
};

export default ProductividadMensualDirsa;
