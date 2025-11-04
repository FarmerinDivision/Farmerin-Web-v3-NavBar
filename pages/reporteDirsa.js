import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, Contenedor, ContenedorSpinner } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import SelectTambo from '../components/layout/selectTambo';
import StickyTable from "react-sticky-table-thead";
import DetalleEvento from '../components/layout/detalleEvento';
import { Button, Form, Row, Col, Alert, Spinner, Table, ButtonGroup, Modal } from 'react-bootstrap';
import { RiSearchLine } from 'react-icons/ri';
import { format, subDays } from 'date-fns';
import ReactExport from "react-export-excel";
import { FaSort } from 'react-icons/fa';
import styles from '../styles/ParteDiario.module.scss';

const ReporteDirsa = () => {
  const [valores, guardarValores] = useState({
    fini: format(Date.now(), 'yyyy-MM-dd'),
    ffin: format(Date.now(), 'yyyy-MM-dd'),
    tipoFecha: 'ud'
  });
  const [eventos, guardarEventos] = useState([]);
  const [procesando, guardarProcesando] = useState(false);
  const { firebase, tamboSel, usuario } = useContext(FirebaseContext);
  const [animales, guardarAnimales] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [mensajeAlert, setMensajeAlert] = useState('');
  const [ordenFecha, setOrdenFecha] = useState('asc');

  const ExcelFile = ReactExport.ExcelFile;
  const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
  const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

  const excelFilename = `Reporte Dirsa - ${format(Date.now(), 'yyyy-MM-dd')}`;

  useEffect(() => {
    if (tamboSel) buscarAnimales();
  }, [tamboSel]);

  function buscarAnimales() {
    firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).get().then(snapshot => {
      const an = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      guardarAnimales(an);
    }).catch(e => {
      setMensajeAlert(e.message);
      setShowAlert(true);
    });
  }

  function timeout(delay) {
    return new Promise(res => setTimeout(res, delay));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    guardarProcesando(true);
    guardarEventos([]);

    const ff = valores.ffin + 'T21:59:00';
    let iniciob, finb;

    if (valores.tipoFecha === "ud") {
      const inicioAux = subDays(Date.now(), 1);
      iniciob = firebase.fechaTimeStamp(format(inicioAux, 'yyyy-MM-dd'));
      finb = firebase.fechaTimeStamp(ff);
    } else {
      iniciob = firebase.fechaTimeStamp(valores.fini);
      finb = firebase.fechaTimeStamp(ff);
    }

    animales.forEach(a => buscarEventos(a, iniciob, finb));
    await timeout(3000);
    guardarProcesando(false);
  };

  function buscarEventos(an, iniciob, finb) {
    try {
      firebase.db.collection('animal').doc(an.id).collection('eventos')
        .where('fecha', '>=', iniciob)
        .where('fecha', '<=', finb)
        .get()
        .then(snapshot => {
          const nuevos = [];
          snapshot.docs.forEach(doc => {
            const data = doc.data();

            // 🔍 Mostrar sólo eventos cargados por Dirsa
            const esDirsa = data?.usuario?.includes("Dirsa");
            if (esDirsa) {
              nuevos.push({
                id: doc.id,
                rp: an.rp,
                erp: an.erp || '',
                fevento: format(firebase.timeStampToDate(data.fecha), 'dd/MM/yyyy'),
                ...data
              });
            }
          });

          guardarEventos(prev => eliminarDuplicados([...prev, ...nuevos]));
        });
    } catch (error) {
      setMensajeAlert(error.message);
      setShowAlert(true);
    }
  }

  function eliminarDuplicados(eventos) {
    const mapa = new Map();
    eventos.forEach(ev => {
      const clave = `${ev.rp}-${ev.tipo}-${ev.fevento}`;
      if (!mapa.has(clave)) mapa.set(clave, ev);
    });
    return Array.from(mapa.values());
  }

  const ordenarPorFecha = () => {
    const nuevoOrden = ordenFecha === 'asc' ? 'desc' : 'asc';
    const ordenados = [...eventos].sort((a, b) => (a.fecha > b.fecha ? 1 : -1));
    if (nuevoOrden === 'desc') ordenados.reverse();
    setOrdenFecha(nuevoOrden);
    guardarEventos(ordenados);
  };

  return (
    <Layout titulo="Reporte Dirsa">
      <Modal show={showAlert} onHide={() => setShowAlert(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Error!</Modal.Title></Modal.Header>
        <Modal.Body><Alert variant="danger"><p>{mensajeAlert}</p></Alert></Modal.Body>
      </Modal>

      <Botonera>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col lg={true}>
              <Form.Label>Rango de fechas</Form.Label>
              <Form.Control type="date" name="fini" value={valores.fini} onChange={(e) => guardarValores({ ...valores, fini: e.target.value })} />
            </Col>
            <Col lg={true}>
              <Form.Label>Hasta</Form.Label>
              <Form.Control type="date" name="ffin" value={valores.ffin} onChange={(e) => guardarValores({ ...valores, ffin: e.target.value })} />
            </Col>
            <Col lg={true}>
              <br />
              <Button variant="info" type="submit" block><RiSearchLine size={22} /> Buscar</Button>
            </Col>
            <Col lg={true}>
              <br />
              <ExcelFile element={<Button variant="success" block>Exportar Excel</Button>} filename={excelFilename}>
                <ExcelSheet data={eventos} name="Eventos Dirsa">
                  <ExcelColumn label="Fecha" value="fevento" />
                  <ExcelColumn label="RP" value="rp" />
                  <ExcelColumn label="Evento" value="tipo" />
                  <ExcelColumn label="Detalle" value="detalle" />
                  <ExcelColumn label="Usuario" value="usuario" />
                </ExcelSheet>
              </ExcelFile>
            </Col>
          </Row>
        </Form>
      </Botonera>

      {procesando ? (
        <ContenedorSpinner>
          <Spinner animation="border" variant="info" />
          <div>Procesando datos de Reporte Dirsa...</div>
        </ContenedorSpinner>
      ) : tamboSel ? (
        eventos.length === 0 ? (
          <Mensaje><h3>No hay resultados de Dirsa en el rango indicado</h3></Mensaje>
        ) : (
          <Contenedor>
            <StickyTable height={450}>
              <Table responsive>
                <thead>
                  <tr>
                    <th onClick={ordenarPorFecha}>Fecha <FaSort size={15} /></th>
                    <th>RP</th>
                    <th>Evento</th>
                    <th>Detalle</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map(e => (
                    <DetalleEvento key={e.id} evento={e} eventos={eventos} guardarEventos={guardarEventos} />
                  ))}
                </tbody>
              </Table>
            </StickyTable>
          </Contenedor>
        )
      ) : (
        <SelectTambo />
      )}
    </Layout>
  );
};

export default ReporteDirsa;
