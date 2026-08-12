import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import SelectTambo from '../components/layout/selectTambo';
import DetalleEvento from '../components/layout/detalleEvento';
import { Alert, Modal } from 'react-bootstrap';
import { RiSearchLine, RiFileExcel2Fill } from 'react-icons/ri';
import { format, subDays } from 'date-fns';
import ReactExport from "../components/utils/ExcelExport";
import { FaSort } from 'react-icons/fa';
import styles from '../styles/ReportesModernos.module.scss';

const Loader = () => (
  <div className={styles.loadingOverlay}>
    <div className="spinner-border text-info" role="status" style={{ width: '3rem', height: '3rem' }}></div>
    <div className={styles.loadingText}>Procesando datos del reporte Dirsa...</div>
  </div>
);

const ReporteDirsa = () => {

  const [valores, guardarValores] = useState({
    fini: format(Date.now(), 'yyyy-MM-dd'),
    ffin: format(Date.now(), 'yyyy-MM-dd'),
    visto: 'todos',
    tipo: 'todos',
    tipoFecha: 'ud'
  });

  const [eventos, guardarEventos] = useState([]);
  const [procesando, guardarProcesando] = useState(false);
  const { fini, ffin, visto, tipo, tipoFecha } = valores;
  const { firebase, tamboSel, usuario } = useContext(FirebaseContext);
  const [orderRp, guardarOrderRp] = useState('asc');
  const [orderFecha, guardarOrderFecha] = useState('asc');
  const [orderEvento, guardarOrderEvento] = useState('asc');
  const [animales, guardarAnimales] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [mensajeAlert, setMensajeAlert] = useState('');

  const ExcelFile = ReactExport.ExcelFile;
  const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
  const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

  const excelFilename = (() => {
    try {
      const hoy = format(Date.now(), 'yyyy-MM-dd');
      let fechaEtiqueta = hoy;
      if (valores?.tipoFecha === 'ef' && fini && ffin) {
        fechaEtiqueta = `${fini}_a_${ffin}`;
      } else if (valores?.tipoFecha === 'mv') {
        fechaEtiqueta = `mes_${format(Date.now(), 'yyyy-MM')}`;
      } else if (valores?.tipoFecha === 'ma') {
        const ma = new Date();
        ma.setMonth(ma.getMonth() - 1);
        fechaEtiqueta = `mes_anterior_${format(ma, 'yyyy-MM')}`;
      }

      const filtros = [];
      if (tipo && tipo !== 'todos') filtros.push(`Evento ${tipo}`);
      if (visto && visto !== 'todos') {
        filtros.push(visto === 'true' ? 'Vistos' : 'Pendientes');
      }

      const partes = ['Parte Diario', fechaEtiqueta, filtros.join(' - ')].filter(Boolean);
      return partes.join(' - ');
    } catch (e) {
      return 'Parte Diario';
    }
  })();

  useEffect(() => {
    if (tamboSel) buscarAnimales();
  }, [tamboSel]);

  useEffect(() => {
    if (tamboSel) buscarAnimales();
  }, []);

  function buscarAnimales() {
    try {
      firebase.db.collection('animal').where('idtambo', '==', tamboSel?.id).get().then(snapshotAnimal);
    } catch (error) {
      setMensajeAlert(error.message);
      setShowAlert(true);
    }
  }

  function snapshotAnimal(snapshot) {
    const an = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    guardarAnimales(an);
  }

  function timeout(delay) {
    return new Promise(res => setTimeout(res, delay));
  }

  const handleSubmit = async (e, overrideTipoFecha = null) => {
    if (e) e.preventDefault();
    guardarProcesando(true);
    guardarEventos([]);

    let iniciob, finb;
    let inicioAux;
    let finAux = format(Date.now(), 'yyyy-MM-dd');
    finAux = finAux + 'T21:59:00';
    let ff = valores.ffin + 'T21:59:00';

    const activeTipoFecha = overrideTipoFecha || tipoFecha;

    if (activeTipoFecha === "ef") {
      iniciob = firebase.fechaTimeStamp(valores.fini);
      finb = firebase.fechaTimeStamp(ff);
    }

    if (activeTipoFecha === "ud") {
      inicioAux = subDays(Date.now(), 1);
      inicioAux = format(inicioAux, 'yyyy-MM-dd');
      iniciob = firebase.fechaTimeStamp(inicioAux);
      finb = firebase.fechaTimeStamp(finAux);
    }

    if (activeTipoFecha === "mv") {
      const primerDiaMes = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
      iniciob = firebase.fechaTimeStamp(primerDiaMes);
      finb = firebase.fechaTimeStamp(ff);
    }

    if (activeTipoFecha === "ma") {
      const actual = new Date();
      const primerDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth(), 0);
      iniciob = firebase.fechaTimeStamp(format(primerDiaMesAnterior, 'yyyy-MM-dd'));
      finb = firebase.fechaTimeStamp(format(ultimoDiaMesAnterior, 'yyyy-MM-dd') + 'T21:59:00');
    }

    animales.forEach(a => {
      buscarEventos(a, iniciob, finb);
    });

    await timeout(3000);
    guardarEventos(eventosPrevios => eliminarEventosDuplicados(eventosPrevios));
    guardarProcesando(false);
  };

  const handleChange = e => {
    if (e.preventDefault) e.preventDefault();
    guardarValores({
      ...valores,
      [e.target.name]: e.target.value
    });

    if (e.target.name === 'tipoFecha' && (e.target.value === 'ud' || e.target.value === 'mv' || e.target.value === 'ma')) {
      setTimeout(() => handleSubmit(null, e.target.value), 0);
    }
  }

  function buscarEventos(an, iniciob, finb) {
    try {
      let query = firebase.db.collection('animal').doc(an.id).collection('eventos')
        .where('fecha', '>=', iniciob)
        .where('fecha', '<=', finb);

      function snapshotEventos(snapshot) {
        const nuevosEventos = [];

        snapshot.docs.forEach(doc => {
          const data = doc.data();

          if (
            data.tipo === 'Control Lechero' ||
            data.tipo === 'Control Lechero mediante planilla Dirsa'
          ) {
            return;
          }

          let fevento;
          try {
            fevento = format(firebase.timeStampToDate(data.fecha), 'dd/MM/yyyy');
          } catch (error) {
            fevento = 'error';
          }

          let erp;
          try {
            erp = an.erp.toString();
          } catch (error) {
            erp = '';
          }

          const e = {
            id: doc.id,
            animal: an,
            rp: an.rp,
            erp: erp,
            fevento: fevento,
            ...data
          };

          if (typeof e.usuario === 'string' && e.usuario.includes(' - Dirsa')) {
            const coincideTipo = tipo === 'todos' || e.tipo === tipo;
            const esVisto = e.vistoUsuario && e.vistoUsuario.indexOf(usuario.uid) !== -1;
            const coincideVisto =
              visto === 'todos' ||
              (visto === 'true' && esVisto) ||
              (visto === 'false' && !esVisto);

            if (coincideTipo && coincideVisto) {
              nuevosEventos.push(e);
            }
          }
        });

        guardarEventos(eventosPrevios => {
          const todos = [...eventosPrevios, ...nuevosEventos];
          return eliminarEventosDuplicados(todos);
        });
      }

      query.get().then(snapshotEventos);

    } catch (error) {
      setMensajeAlert(error.message);
      setShowAlert(true);
    }
  }

  const handleClickRP = e => {
    e.preventDefault();
    if (orderRp == 'asc') {
      const a = eventos.sort((a, b) => (a.rp < b.rp) ? 1 : -1);
      guardarOrderRp('desc');
      guardarEventos(a);
    } else {
      const b = eventos.sort((a, b) => (a.rp > b.rp) ? 1 : -1);
      guardarOrderRp('asc');
      guardarEventos(b);
    }
  }

  const handleClickFecha = e => {
    e.preventDefault();
    if (orderFecha == 'asc') {
      const a = eventos.sort((a, b) => (a.fecha < b.fecha) ? 1 : -1);
      guardarOrderFecha('desc');
      guardarEventos(a);
    } else {
      const b = eventos.sort((a, b) => (a.fecha > b.fecha) ? 1 : -1);
      guardarOrderFecha('asc');
      guardarEventos(b);
    }
  }

  const handleClickEvento = e => {
    e.preventDefault();
    if (orderEvento == 'asc') {
      const a = eventos.sort((a, b) => (a.tipo < b.tipo) ? 1 : -1);
      guardarOrderEvento('desc');
      guardarEventos(a);
    } else {
      const b = eventos.sort((a, b) => (a.tipo > b.tipo) ? 1 : -1);
      guardarOrderEvento('asc');
      guardarEventos(b);
    }
  }

  function eliminarEventosDuplicados(eventos) {
    const mapa = new Map();
    eventos.forEach(evento => {
      let fechaMillis;
      if (evento.fecha?.toDate) {
        fechaMillis = evento.fecha.toDate().setHours(0, 0, 0, 0);
      } else if (evento.fecha instanceof Date) {
        fechaMillis = evento.fecha.setHours(0, 0, 0, 0);
      } else if (typeof evento.fecha === 'number') {
        const d = new Date(evento.fecha);
        fechaMillis = d.setHours(0, 0, 0, 0);
      } else {
        try {
          const partes = evento.fevento.split('/');
          const d = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
          fechaMillis = d.setHours(0, 0, 0, 0);
        } catch {
          fechaMillis = evento.fevento;
        }
      }
      const clave = `${fechaMillis}-${evento.rp}-${evento.tipo}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, evento);
      }
    });
    return Array.from(mapa.values());
  }

  const totalEventos = eventos.length;
  const eventosVistos = eventos.filter(e => e.vistoUsuario && e.vistoUsuario.indexOf(usuario?.uid) !== -1).length;
  const eventosPendientes = totalEventos - eventosVistos;

  if (!tamboSel) {
    return <Layout titulo="Reporte Dirsa" style={{ paddingTop: 0 }}><SelectTambo /></Layout>;
  }

  return (
    <Layout titulo="Reporte de eventos" style={{ paddingTop: 0 }}>
      <Modal show={showAlert} onHide={() => setShowAlert(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">{mensajeAlert}</Alert>
        </Modal.Body>
      </Modal>

      <div className={styles.reporteRoot}>

        {/* ENCABEZADO */}
        <h1 className={styles.headerTitle}>Reporte de Eventos Dirsa</h1>
        <p className={styles.headerSubtitle}>Visualice y exporte los eventos registrados específicamente para Dirsa.</p>

        {/* TOOLBAR HORIZONTAL */}
        <div className={styles.toolbarCard}>
          <form onSubmit={handleSubmit} className={styles.toolbarRow}>

            <div className={styles.filterGroup}>
              <label>Período Rápido</label>
              <div className={styles.segmentedControl}>
                <button
                  type="button"
                  name="tipoFecha"
                  value="mv"
                  className={valores.tipoFecha === 'mv' ? styles.active : ''}
                  onClick={(e) => {
                    const fakeEvent = { target: { name: 'tipoFecha', value: 'mv' }, preventDefault: () => { } };
                    handleChange(fakeEvent);
                  }}
                >Mes Actual</button>
                <button
                  type="button"
                  name="tipoFecha"
                  value="ma"
                  className={valores.tipoFecha === 'ma' ? styles.active : ''}
                  onClick={(e) => {
                    const fakeEvent = { target: { name: 'tipoFecha', value: 'ma' }, preventDefault: () => { } };
                    handleChange(fakeEvent);
                  }}
                >Mes Anterior</button>
                <button
                  type="button"
                  name="tipoFecha"
                  value="ef"
                  className={valores.tipoFecha === 'ef' ? styles.active : ''}
                  onClick={(e) => {
                    const fakeEvent = { target: { name: 'tipoFecha', value: 'ef' }, preventDefault: () => { } };
                    handleChange(fakeEvent);
                  }}
                >Rango</button>
              </div>
            </div>

            {valores.tipoFecha === 'ef' && (
              <>
                <div className={styles.filterGroup}>
                  <label>Desde</label>
                  <input type="date" name="fini" value={fini} onChange={handleChange} required />
                </div>
                <div className={styles.filterGroup}>
                  <label>Hasta</label>
                  <input type="date" name="ffin" value={ffin} onChange={handleChange} required />
                </div>
              </>
            )}

            <div className={styles.filterGroup}>
              <label>Estado</label>
              <select name="visto" value={visto} onChange={handleChange}>
                <option value="todos">Todos</option>
                <option value="false">Pendientes</option>
                <option value="true">Vistos</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Evento</label>
              <select name="tipo" value={tipo} onChange={handleChange}>
                <option value="todos">Todos</option>
                <option value="Aborto">Aborto</option>
                <option value="Alta">Alta</option>
                <option value="Baja">Baja</option>
                <option value="Celo">Celo</option>
                <option value="Parto">Parto</option>
                <option value="Secado">Secado</option>
                <option value="Servicio">Servicio</option>
                <option value="Tacto">Tacto</option>
                <option value="Tratamiento">Tratamiento</option>
              </select>
            </div>

            <div className={styles.actionsArea}>
              <button type="submit" className={styles.btnPrimary}>
                <RiSearchLine size={18} />
                Buscar
              </button>
            </div>

          </form>
        </div>

        {procesando ? (
          <Loader />
        ) : (
          eventos.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emoji}>📋</div>
              <h2>No se encontraron registros</h2>
              <p>Ajuste el período seleccionado o el rango de fechas para visualizar información.</p>
            </div>
          ) : (
            <>
              {/* KPI GRID */}
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiIcon}>📊</div>
                  <div className={styles.kpiContent}>
                    <span className={styles.kpiLabel}>Total Eventos</span>
                    <span className={styles.kpiValue}>{totalEventos}</span>
                  </div>
                </div>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiIcon}>⏳</div>
                  <div className={styles.kpiContent}>
                    <span className={styles.kpiLabel}>Pendientes</span>
                    <span className={styles.kpiValue} style={{ color: '#d97706' }}>{eventosPendientes}</span>
                  </div>
                </div>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiIcon}>✅</div>
                  <div className={styles.kpiContent}>
                    <span className={styles.kpiLabel}>Vistos</span>
                    <span className={styles.kpiValue} style={{ color: '#059669' }}>{eventosVistos}</span>
                  </div>
                </div>
              </div>

              <div className={styles.tableCard}>
                <div className={styles.tableToolbar}>
                  <h3>Resultados — {totalEventos} eventos encontrados</h3>
                  <ExcelFile
                    element={
                      <button type="button" className={styles.btnSecondary}>
                        <RiFileExcel2Fill /> Descargar Excel
                      </button>
                    }
                    filename={excelFilename}
                  >
                    <ExcelSheet data={eventos} name="Eventos">
                      <ExcelColumn label="Fecha" value="fevento" />
                      <ExcelColumn label="RP" value="rp" />
                      <ExcelColumn label="Evento" value="tipo" />
                      <ExcelColumn label="Detalle" value="detalle" />
                      <ExcelColumn label="eRP" value="erp" />
                      <ExcelColumn label="Usuario" value="usuario" />
                    </ExcelSheet>
                  </ExcelFile>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.modernTable}>
                    <thead>
                      <tr>
                        <th onClick={handleClickFecha} style={{ cursor: 'pointer' }}>
                          <div className={styles.thContent}>Fecha <FaSort size={13} color="#9ca3af" /></div>
                        </th>
                        <th onClick={handleClickRP} style={{ cursor: 'pointer' }}>
                          <div className={styles.thContent}>RP <FaSort size={13} color="#9ca3af" /></div>
                        </th>
                        <th onClick={handleClickEvento} style={{ cursor: 'pointer' }}>
                          <div className={styles.thContent}>Evento <FaSort size={13} color="#9ca3af" /></div>
                        </th>
                        <th>Detalle</th>
                        <th>eRP</th>
                        <th>Usuario</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventos.map(e => {
                        const isVisto = e.vistoUsuario && e.vistoUsuario.indexOf(usuario.uid) !== -1;
                        return (
                          <DetalleEvento
                            key={e.id}
                            evento={e}
                            eventos={eventos}
                            guardarEventos={guardarEventos}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </Layout>
  );
};

export default ReporteDirsa;