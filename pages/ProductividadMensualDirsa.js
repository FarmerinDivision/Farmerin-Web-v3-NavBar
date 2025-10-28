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
    if (!tamboSel) {
      setMensaje('Seleccioná un tambo para continuar.');
      return;
    }
    if (!mesSeleccionado) {
      setMensaje('Seleccioná un mes.');
      return;
    }

    setProcesando(true);
    setEventos([]);
    setMensaje('');

    try {
      // Obtenemos todos los animales del tambo seleccionado
      const animalesSnap = await firebase.db.collection('animal').get();

      let resultados = [];

      // Recorremos cada animal y buscamos los eventos correspondientes
      for (const animalDoc of animalesSnap.docs) {
        const eventosSnap = await firebase.db
          .collection('animal')
          .doc(animalDoc.id)
          .collection('eventos')
          .where('tipo', '==', 'Control Lechero mediante planilla Dirsa')
          .get();

        eventosSnap.forEach((evDoc) => {
          const ev = evDoc.data();

          // Convertir campo fecha a texto legible
          let fechaTexto = '';
          if (ev.fecha?.seconds) {
            fechaTexto = format(new Date(ev.fecha.seconds * 1000), "d 'de' MMMM 'de' yyyy");
          } else if (typeof ev.fecha === 'string') {
            fechaTexto = ev.fecha.toLowerCase();
          }

          // Filtrar por mes seleccionado (nombre en español)
          if (fechaTexto.includes(mesSeleccionado)) {
            resultados.push({
              id: evDoc.id,
              animalId: animalDoc.id,
              nombre: ev.nombre || animalDoc.data().nombre || '',
              fecha: fechaTexto,
              RP: ev.RP || '',
              raza: ev.raza || '',
              observaciones: ev.observaciones || '',
            });
          }
        });
      }

      if (resultados.length === 0) {
        setMensaje('No se encontraron controles lecheros para el mes seleccionado.');
      }

      setEventos(resultados);
    } catch (error) {
      console.error('Error al obtener los eventos:', error);
      setMensaje('Ocurrió un error al cargar los datos.');
    } finally {
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
              <Form.Select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className={styles.select}
              >
                <option value="">-- Seleccioná un mes --</option>
                {MESES.map((m, i) => (
                  <option key={i} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </Form.Select>
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
