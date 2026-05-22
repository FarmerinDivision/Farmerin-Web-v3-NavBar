import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, ContenedorSpinner, Contenedor } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleRecepciones from '../components/layout/detalleRecepciones';
import SelectTambo from '../components/layout/selectTambo';
import StickyTable from "react-sticky-table-thead";
import { Button, Form, Row, Col, Alert, Spinner, Table, ButtonGroup } from 'react-bootstrap';
import { RiSearchLine } from 'react-icons/ri';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import styles from '../styles/Recepciones.module.scss'


const Recepciones = () => {
  const [recepciones, guardarRecepciones] = useState([]);
  const [valores, guardarValores] = useState({
    fini: format(Date.now(), 'yyyy-MM-dd'),
    ffin: format(Date.now(), 'yyyy-MM-dd'),
    inicio: '',
    fin: '',
    visto: 'todos',
    tipo: 'todos',
    tipoFecha: 'ud'
  });

  const [procesando, guardarProcesando] = useState(false);
  const { fini, ffin, inicio, fin, visto, tipo, tipoFecha } = valores;
  const { firebase, tamboSel } = useContext(FirebaseContext);

  const handleSubmit = e => {
    guardarRecepciones([]);
    guardarProcesando(true);
    e.preventDefault();
    let inicio, fin;
    let inicioAux;
    let finAux = format(Date.now(), 'yyyy-MM-dd');
    finAux = finAux + 'T21:59:00';
    let ff = valores.ffin + 'T21:59:00';

    if (tipoFecha == "ef") {
      inicio = firebase.fechaTimeStamp(valores.fini);
      fin = firebase.fechaTimeStamp(ff);
    }

    if (tipoFecha == "ud") {
      inicioAux = subDays(Date.now(), 1);
      inicioAux = format(inicioAux, 'yyyy-MM-dd');
      inicio = firebase.fechaTimeStamp(inicioAux);
      fin = firebase.fechaTimeStamp(finAux);
    }

    if (tipoFecha == "us") {
      inicioAux = subDays(Date.now(), 7);
      inicioAux = format(inicioAux, 'yyyy-MM-dd');
      inicio = firebase.fechaTimeStamp(inicioAux);
      fin = firebase.fechaTimeStamp(finAux);
    }
    if (tipoFecha == "mv") {
      const fechaActual = new Date();
      const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1); // primerDiaMes, calcula el primer día del mes actual.
      const hoy = format(fechaActual, 'yyyy-MM-dd') + 'T21:59:00'; // hoy, toma la fecha de hoy hasta el final del día.
      // Convierte ambas fechas al formato de Firebase para buscar los eventos.
      inicio = firebase.fechaTimeStamp(format(primerDiaMes, 'yyyy-MM-dd'));
      fin = firebase.fechaTimeStamp(hoy);
    }

    if (tipoFecha == "ma") {
      const actual = new Date();
      const primerDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth(), 0);
      inicio = firebase.fechaTimeStamp(format(primerDiaMesAnterior, 'yyyy-MM-dd'));
      fin = firebase.fechaTimeStamp(format(ultimoDiaMesAnterior, 'yyyy-MM-dd') + 'T21:59:00');
    }

    guardarValores({
      fini: fini,
      ffin: ffin,
      inicio: inicio,
      fin: fin,
      visto: visto,
      tipo: tipo,
      tipoFecha: tipoFecha
    });

    if (tamboSel) {
      try {
        let recepcionRef = firebase.db.collection('tambo').doc(tamboSel.id).collection('recepcion').where('fecha', '>=', inicio).where('fecha', '<=', fin);
        let query = recepcionRef.where('fecha', '>=', inicio).where('fecha', '<=', fin);
        if (visto != 'todos') {
          let v = false;
          if (visto == 'true') v = true;
          query = query.where('visto', '==', v);
        }
        if (tipo != 'todos') {
          query = query.where('tipo', '==', tipo);
        }
        query.get().then(snapshotRecepcion);
      } catch (error) {
        console.log(error.message);
      }
    }
  }

  const handleChange = (e) => {
    const newValores = {
      ...valores,
      [e.target.name]: e.target.value,
    };

    guardarValores(newValores);

    // Si el usuario selecciona "ULTIMO DÍA" o "MES EN CURSO", o "MES ANTERIOR", ejecuta la búsqueda automáticamente
    if (e.target.value === "ud" || e.target.value === "mv" || e.target.value === "ma") {
      setTimeout(() => handleSubmit(new Event("submit")), 0);
    }
  };

  function snapshotRecepcion(snapshot) {
    const recep = snapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...doc.data()
      }
    })
    guardarRecepciones(recep);
    guardarProcesando(false);
  }

  const exportToExcel = () => {
    const wsData = [
      ["Fecha", "Tipo", "Remito", "Observacion", "Usuario"]
    ];

    recepciones.forEach(r => {
      const fechaFormateada = r.fecha.toDate ? format(r.fecha.toDate(), 'yyyy-MM-dd') : r.fecha;
      const remitoConFecha = `${fechaFormateada} - ${r.remito}`;

      wsData.push([
        fechaFormateada,
        r.tipo,
        remitoConFecha,
        r.obs,
        r.usuario
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recepciones");
    XLSX.writeFile(wb, "recepciones.xlsx");
  }
  return (

    <Layout
      titulo="Recepciones"
    >
      <>
        <Botonera>

          <Form
            onSubmit={handleSubmit}
          >

            <Row>
              <Col lg={true}>

                <Form.Label>Ver Recepciones desde:</Form.Label>
                <br></br>
                <ButtonGroup className={styles.recepcionBotonera}>
                  <div className={styles.recepcionTooltip}>
                    <Button
                      className={`${styles.recepcionBtn} ${valores.tipoFecha === 'ud' ? 'activo' : ''}`}
                      variant="info"
                      name="tipoFecha"
                      value="ud"
                      onClick={handleChange}
                    >
                      ULTIMO DÍA
                    </Button>
                    <span className={styles.recepcionTooltipText}>Ultimas 24 horas</span>
                  </div>
                  <div className={styles.recepcionTooltip}>
                    <Button
                      className={`${styles.recepcionBtn} ${valores.tipoFecha === 'mv' ? 'activo' : ''}`}
                      variant="info"
                      name="tipoFecha"
                      value="mv"
                      onClick={handleChange}
                    >
                      MES EN CURSO
                    </Button>
                    <span className={styles.recepcionTooltipText}>Eventos del ultimo mes</span>
                  </div>
                  <div className={styles.recepcionTooltip}>
                    <Button
                      className={`${styles.recepcionBtn} ${valores.tipoFecha === 'ma' ? 'activo' : ''}`}
                      variant="info"
                      name="tipoFecha"
                      value="ma"
                      onClick={handleChange}
                    >
                      MES ANTERIOR
                    </Button>
                    <span className={styles.recepcionTooltipText}>Mes anterior</span>
                  </div>
                  <div className={styles.recepcionTooltip}>
                    <Button
                      className={`${styles.recepcionBtn} ${valores.tipoFecha === 'ef' ? 'activo' : ''}`}
                      variant="info"
                      name="tipoFecha"
                      value="ef"
                      onClick={handleChange}
                    >
                      POR FECHA
                    </Button>
                    <span className={styles.recepcionTooltipText}>Selecciona un rango de fechas</span>
                  </div>
                </ButtonGroup>
              </Col>

              {(valores.tipoFecha == 'ef') ?
                <>
                  <Col lg={true}>
                    <Form.Group>
                      <Form.Label>Inicio</Form.Label>
                      <Form.Control
                        type="date"
                        id="fini"
                        name="fini"
                        value={fini}
                        onChange={handleChange}
                        required

                      />
                    </Form.Group>
                  </Col>
                  <Col lg={true}>
                    <Form.Group>
                      <Form.Label>Fin</Form.Label>
                      <Form.Control
                        type="date"
                        id="ffin"
                        name="ffin"
                        value={ffin}
                        onChange={handleChange}
                        required

                      />
                    </Form.Group>
                  </Col>

                </>
                :
                <>
                  <Col lg={true}></Col>
                  <Col lg={true}></Col>
                </>

              }
            </Row>
            <Row>
              <Col lg={true}>
                <Form.Group>
                  <Form.Label>Estado</Form.Label>
                  <Form.Control
                    as="select"
                    id="visto"
                    name="visto"
                    value={visto}
                    onChange={handleChange}
                    required
                  >
                    <option value="todos" >Todos</option>
                    <option value="false">Pendientes</option>
                    <option value="true" >Vistos</option>

                  </Form.Control>
                </Form.Group>
              </Col>
              <Col lg={true}>
                <Form.Group>
                  <Form.Label>Tipo</Form.Label>
                  <Form.Control
                    as="select"
                    id="tipo"
                    name="tipo"
                    value={tipo}
                    onChange={handleChange}
                    required
                  >
                    <option value="todos" >Todos</option>
                    <option value="Racion" >Racion</option>
                    <option value="Art. Limpieza" >Art. Limpieza</option>
                    <option value="Art. Veterinaria" >Art. Veterinaria</option>
                    <option value="Semen" >Semen</option>

                  </Form.Control>
                </Form.Group>
              </Col>
              <Col lg={true}>
                <Form.Group>
                  <br></br>
                  <Button
                    variant="info" block
                    type="submit"
                  >
                    <RiSearchLine size={22} />
                    Buscar
                  </Button>
                </Form.Group>
                <Button variant="success" block onClick={exportToExcel}>Descargar Excel</Button>
              </Col>
            </Row>

          </Form>
        </Botonera >

        {procesando ?
          <div className={styles.spinnerOverlay}>
            <Spinner animation="border" variant="info" role="status" style={{ width: '3rem', height: '3rem' }} />
            <div className={styles.spinnerText}>Procesando datos de recepciones...</div>
          </div>
          :
          //si hay tambo

          tamboSel ?

            recepciones.length == 0 ?
              <Mensaje>
                <div className={styles.mensajeCaja}>
                  <h2 className={styles.tituloSinResultados}>Sin resultados</h2>
                  <p className={styles.textoSecundario}>
                    Presione el rango de fecha que quiere mostrar para ver los resultados
                  </p>
                </div>
              </Mensaje>
              :

              <Contenedor>
                <StickyTable height={400}>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Remito</th>
                        <th>Observacion</th>
                        <th>Foto</th>
                        <th>Usuario</th>
                        <th>Visto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recepciones.map(r => (
                        <DetalleRecepciones
                          key={r.id}
                          recepcion={r}

                        />
                      )
                      )}
                    </tbody>
                  </Table>
                </StickyTable>
              </Contenedor>
            :
            <SelectTambo />

        }
      </>
    </Layout >

  )
}

export default Recepciones