import React, { useState, useEffect, useContext } from 'react'
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import SelectTambo from '../components/layout/selectTambo';
import DetalleEvento from '../components/layout/detalleEvento';
import { Alert, Spinner, Modal } from 'react-bootstrap';
import { RiSearchLine, RiFileExcel2Line } from 'react-icons/ri';
import { format, subDays, addDays } from 'date-fns'
import ReactExport from "../components/utils/ExcelExport";
import { FaSort } from 'react-icons/fa';
import styles from '../styles/GestionRemitos.module.scss'

const ParteDiario = () => {

  const [valores, guardarValores] = useState({
    fini: format(Date.now(), 'yyyy-MM-dd'),
    ffin: format(Date.now(), 'yyyy-MM-dd'),
    visto: 'todos',
    tipo: 'todos',
    tipoFecha: 'ud'
  });

  const [eventos, guardarEventos] = useState([]);
  const [procesando, guardarProcesando] = useState(false);
  const { fini, ffin, inicio, fin, visto, tipo, tipoFecha } = valores;
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

  // Generar nombre de archivo Excel dinámico con fecha/filtros
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

    if (tamboSel) {
      buscarAnimales()
    }
  }, [tamboSel])
  useEffect(() => {

    if (tamboSel) {
      buscarAnimales()
    }
  }, [])

  function buscarAnimales() {
    try {

      firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).get().then(snapshotAnimal);
    } catch (error) {
      setMensajeAlert(error.message);
      setShowAlert(true);

    }

  }
  function snapshotAnimal(snapshot) {
    const an = snapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...doc.data()
      }
    })

    guardarAnimales(an);
  }

  function timeout(delay) {
    return new Promise(res => setTimeout(res, delay));
  }




  const handleSubmit = async (e, overrideTipoFecha = null) => {
    if (e) e.preventDefault();
    guardarProcesando(true);

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

    // Ejecutamos la búsqueda de eventos por animal
    const promesas = animales.map(a => buscarEventos(a, iniciob, finb));

    // Esperamos a que se completen las búsquedas
    const resultados = await Promise.all(promesas);
    const todosEventos = resultados.flat();

    // Eliminar duplicados antes de guardar
    guardarEventos(eliminarEventosDuplicados(todosEventos));

    guardarProcesando(false);

  };


  const handleChange = e => {
    if (e.preventDefault) e.preventDefault();
    guardarValores({
      ...valores,
      [e.target.name]: e.target.value
    });
    
    // Auto submit for quick filters
    if (e.target.name === 'tipoFecha' && (e.target.value === 'ud' || e.target.value === 'mv' || e.target.value === 'ma')) {
      setTimeout(() => handleSubmit(null, e.target.value), 0);
    }
  }


  function buscarEventos(an, iniciob, finb) {
    return new Promise((resolve) => {
      try {
        let query = firebase.db.collection('animal').doc(an.id).collection('eventos')
          .where('fecha', '>=', iniciob)
          .where('fecha', '<=', finb);

        query.get().then(snapshot => {
          const nuevosEventos = [];

          snapshot.docs.forEach(doc => {
            const data = doc.data();

            // --- FILTRO: excluir "Control Lechero" y usuarios " - Dirsa" ---
            const tipoEvento = (data.tipo || '').trim();
            const nombreUsuario = (data.usuario || '').trim();
            const esDirsa = nombreUsuario.toLowerCase().endsWith('- dirsa');

            // Saltar si es "Control Lechero" o si es usuario Dirsa
            if (tipoEvento === 'Control Lechero' || esDirsa) {
              return;
            }

            // --- FILTRO: Tipo de evento seleccionado ---
            if (tipo !== 'todos' && tipoEvento.toLowerCase() !== tipo.toLowerCase()) {
              return;
            }
            // ---------------------------------------------------------------

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

            // --- FILTRO EN MEMORIA: Visto ---
            const isVisto = e.vistoUsuario && e.vistoUsuario.indexOf(usuario.uid) !== -1;
            
            if (visto === 'true' && !isVisto) return;
            if (visto === 'false' && isVisto) return;

            nuevosEventos.push(e);
          });

          resolve(nuevosEventos);
        }).catch(error => {
          console.error(error);
          resolve([]);
        });

      } catch (error) {
        setMensajeAlert(error.message);
        setShowAlert(true);
        resolve([]);
      }
    });
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

  /* ELIMINAR DUPLICADOS */
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




  return (
    <Layout style={{ paddingTop: 0 }} titulo="Parte Diario">
      <Modal show={showAlert} onHide={() => setShowAlert(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Error!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <p>{mensajeAlert}</p>
          </Alert>
        </Modal.Body>
      </Modal>

      {/* Header Sección */}
      <div className={styles.header}>
        <h1>Reporte Diario de Eventos</h1>
        <p>Visualice y exporte eventos registrados según período, estado y tipo de evento.</p>
      </div>

      <div className={styles.filterCard}>
        <form onSubmit={handleSubmit}>
          {/* Fila 1: Fechas y Botones rápidos */}
          <div className={styles.filterRow}>
            <div className={styles.filterGroup} style={{ flex: '0 0 auto', width: '350px' }}>
              <label>Período Rápido</label>
              <div className={styles.segmentedControl}>
                <button
                  type="button"
                  name="tipoFecha"
                  value="ud"
                  className={valores.tipoFecha === 'ud' ? styles.active : ''}
                  onClick={(e) => {
                    const fakeEvent = { target: { name: 'tipoFecha', value: 'ud' }, preventDefault: () => { } };
                    handleChange(fakeEvent);
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  name="tipoFecha"
                  value="mv"
                  className={valores.tipoFecha === 'mv' ? styles.active : ''}
                  onClick={(e) => {
                    const fakeEvent = { target: { name: 'tipoFecha', value: 'mv' }, preventDefault: () => { } };
                    handleChange(fakeEvent);
                  }}
                >
                  Mes Actual
                </button>
                <button
                  type="button"
                  name="tipoFecha"
                  value="ma"
                  className={valores.tipoFecha === 'ma' ? styles.active : ''}
                  onClick={(e) => {
                    const fakeEvent = { target: { name: 'tipoFecha', value: 'ma' }, preventDefault: () => { } };
                    handleChange(fakeEvent);
                  }}
                >
                  Mes Anterior
                </button>
                <button
                  type="button"
                  name="tipoFecha"
                  value="ef"
                  className={valores.tipoFecha === 'ef' ? styles.active : ''}
                  onClick={(e) => {
                    const fakeEvent = { target: { name: 'tipoFecha', value: 'ef' }, preventDefault: () => { } };
                    handleChange(fakeEvent);
                  }}
                >
                  Rango
                </button>
              </div>
            </div>

            {valores.tipoFecha === 'ef' && (
              <>
                <div className={styles.filterGroup}>
                  <label>Fecha Inicio</label>
                  <input type="date" id="fini" name="fini" value={fini} onChange={handleChange} required />
                </div>
                <div className={styles.filterGroup}>
                  <label>Fecha Fin</label>
                  <input type="date" id="ffin" name="ffin" value={ffin} onChange={handleChange} required />
                </div>
              </>
            )}
          </div>

          {/* Fila 2: Filtros de Estado/Evento y Acciones */}
          <div className={styles.filterRow} style={{ marginTop: '12px' }}>
            <div className={styles.filterGroup}>
              <label>Estado</label>
              <select id="visto" name="visto" value={visto} onChange={handleChange} required>
                <option value="todos">Todos</option>
                <option value="false">Pendientes</option>
                <option value="true">Vistos</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Evento</label>
              <select id="tipo" name="tipo" value={tipo} onChange={handleChange} required>
                <option value="todos">Todos</option>
                <option value="Aborto">Aborto</option>
                <option value="Aborto inicia lactancia">Aborto Inicia Lactancia</option>
                <option value="Alta">Alta</option>
                <option value="Alta Vaquillona">Alta Vaquillona</option>
                <option value="Baja">Baja</option>
                <option value="Celo">Celo</option>
                <option value="Cambio eRP">Cambio eRP</option>
                <option value="Parto">Parto</option>
                <option value="Rechazo">Rechazo</option>
                <option value="Secado">Secado</option>
                <option value="Servicio">Servicio</option>
                <option value="Tacto">Tacto</option>
                <option value="Tratamiento">Tratamiento</option>
              </select>
            </div>

            <div className={styles.actionsArea}>
              <ExcelFile
                element={
                  <button type="button" className={styles.btnSecondary}>
                    <RiFileExcel2Line />
                    Exportar Excel
                  </button>
                }
                filename={excelFilename}
              >
                <ExcelSheet data={eventos} name="Eventos">
                  <ExcelColumn label="Fecha" value="fevento" />
                  <ExcelColumn label="RP" value="rp" />
                  <ExcelColumn label="Evento" value="tipo" />
                  <ExcelColumn label="Detalle" value="detalle" />
                  <ExcelColumn
                    label="Crías"
                    value={(row) => {
                      try {
                        if (row.tipo !== 'Parto' || !row.crias || !Array.isArray(row.crias)) return '';
                        return row.crias
                          .map((c) => {
                            const rp = c?.rp || '';
                            const sexo = c?.sexo || '';
                            return `RP: ${rp} / Sexo: ${sexo}`;
                          })
                          .join(' | ');
                      } catch (e) {
                        return '';
                      }
                    }}
                  />
                  <ExcelColumn label="eRP" value="erp" />
                  <ExcelColumn label="Usuario" value="usuario" />
                </ExcelSheet>
              </ExcelFile>

              <button type="submit" className={styles.btnPrimary}>
                <RiSearchLine />
                Buscar Reporte
              </button>
            </div>
          </div>
        </form>
      </div>

      {procesando ? (
        <div className={styles.loadingOverlay}>
          <Spinner animation="border" variant="info" role="status" style={{ width: '3rem', height: '3rem', color: '#17A2B8' }} />
          <div className={styles.loadingText}>Procesando datos de parte diario...</div>
        </div>
      ) : tamboSel ? (
        eventos.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.illustration} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 13V13.01" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 7V10" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2>No se encontraron registros</h2>
            <p>Ajuste el período seleccionado o el rango de fechas para visualizar información.</p>
            <button className={styles.btnSecondary} onClick={() => {
              const fakeEvent = { target: { name: 'tipoFecha', value: 'mv' }, preventDefault: () => { } };
              handleChange(fakeEvent);
            }} style={{marginTop: '16px'}}>
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th onClick={handleClickFecha} style={{cursor: 'pointer'}}>
                      <div className={styles.thContent}>Fecha <FaSort size={15} className={styles.sortIcon} /></div>
                    </th>
                    <th onClick={handleClickRP} style={{cursor: 'pointer'}}>
                      <div className={styles.thContent}>RP <FaSort size={15} className={styles.sortIcon} /></div>
                    </th>
                    <th onClick={handleClickEvento} style={{cursor: 'pointer'}}>
                      <div className={styles.thContent}>Evento <FaSort size={15} className={styles.sortIcon} /></div>
                    </th>
                    <th>Detalle</th>
                    <th>eRP</th>
                    <th>Usuario</th>
                    <th>Visto</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map(e => (
                    <DetalleEvento
                      key={e.id}
                      evento={e}
                      eventos={eventos}
                      guardarEventos={guardarEventos}

                    />
                  )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <SelectTambo />
      )}
    </Layout>

  )
}

export default ParteDiario