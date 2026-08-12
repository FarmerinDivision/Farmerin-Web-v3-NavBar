import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import Layout from '../components/layout/layout';
import { FirebaseContext } from '../firebase2';
import * as XLSX from 'xlsx';
import { GiCow } from 'react-icons/gi';
import { RiFileExcel2Fill, RiArrowRightSLine, RiArrowLeftSLine } from 'react-icons/ri';
import AnimalesEnOrdeñe from '../components/layout/fichaEnOrdeñe';
import styles from '../styles/ControlIngreso.module.scss';
import { format } from 'date-fns';

function control_ingreso() {
  const [data, setData] = useState([]);
  const [secosNaNData, setSecosNaNData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animalesAusentes, setAnimalesAusentes] = useState([]);
  const [animalesNuncaPaso, setAnimalesNuncaPaso] = useState([]);
  const [animalesNoLeyo, setAnimalesNoLeyo] = useState([]);
  const [animalesSeLeyo, setAnimalesSeLeyo] = useState([]);
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [selectedLists, setSelectedLists] = useState({
    seLeyo: false,
    noLeyo: false,
    ausentes: false,
    nuncaPaso: false,
    secosNaN: false
  });
  const [animalesConRP, setAnimalesConRP] = useState([]);
  const [showFichaEnOrdeñe, setShowFichaEnOrdeñe] = useState(false);

  useEffect(() => {
    const obtenerDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!tamboSel) {
          throw new Error("No se ha seleccionado un tambo");
        }
        const docSnapshot = await firebase.db.collection('tambo').doc(tamboSel.id).get();
        if (!docSnapshot.exists) {
          throw new Error("El documento del tambo no existe");
        }
        const racionesURL = docSnapshot.data().raciones;
        const noRegsURL = docSnapshot.data().noreg;

        if (!racionesURL || !noRegsURL) {
          throw new Error("Los campos raciones o noregs no contienen URLs válidas");
        }

        const [racionesResponse, noRegsResponse] = await Promise.all([
          axios.get(racionesURL),
          axios.get(noRegsURL)
        ]);

        const parser = new DOMParser();
        const racionesDoc = parser.parseFromString(racionesResponse.data, 'text/html');
        const racionesTable = racionesDoc.querySelector('table');

        if (!racionesTable) {
          throw new Error('No se encontró la tabla en los datos de raciones');
        }

        const parsedData = tableToDataFrame(racionesTable);
        setData(parsedData);

        const noRegsDoc = parser.parseFromString(noRegsResponse.data, 'text/html');
        const noRegsTable = noRegsDoc.querySelector('table');

        if (!noRegsTable) {
          throw new Error('No se encontró la tabla en los datos de noregs');
        }

        const parsedNoRegsData = tableToDataFrame(noRegsTable);
        setSecosNaNData(parsedNoRegsData);

      } catch (error) {
        console.error("Error al obtener los datos:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    obtenerDatos();
  }, [tamboSel, firebase]);

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      setAnimalesAusentes(data.filter(row => parseInt(row.DiasAusente) >= 2));
      setAnimalesNuncaPaso(data.filter(row => parseInt(row.DiasAusente) === -1));
      setAnimalesNoLeyo(data.filter(row => parseInt(row.DiasAusente) === 1));
      setAnimalesSeLeyo(data.filter(animal => parseInt(animal.DiasAusente) === 0));
    }
  }, [data]);

  const toggleList = (listType) => {
    setSelectedLists({
      seLeyo: false,
      noLeyo: false,
      ausentes: false,
      nuncaPaso: false,
      secosNaN: false,
      [listType]: true
    });
  };

  const closeList = () => {
    setSelectedLists({
      seLeyo: false,
      noLeyo: false,
      ausentes: false,
      nuncaPaso: false,
      secosNaN: false
    });
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();

    const limpiarNombreHoja = (nombre) => {
      return nombre.replace(/[:\/\\?*\[\]]/g, '_');
    };

    const agregarHoja = (nombreHoja, datos) => {
      const nombreLimpio = limpiarNombreHoja(nombreHoja);
      const formatearERP = (rfid) => {
        const erp = rfid?.replace(/⛔/g, '').trim() || '';
        return erp.length === 14 ? `0${erp}` : erp;
      };

      let datosFormateados;
      if (nombreHoja === 'Seca/NR') {
        datosFormateados = datos.map(animal => ({
          'RP': animal.rp || animal.RP || 'No Registrada',
          'eRP': formatearERP(animal.RFID),
          'EST.PRO': animal.estpro || 'No Registrada',
          'EST.REP': animal.estrep || 'No Registrada'
        }));
      } else {
        datosFormateados = datos.map(animal => ({
          'RP': animal.RP || 'No Registrada',
          'eRP': formatearERP(animal.RFID),
          'Dias Ausentes': animal.DiasAusente || 'No Registrado'
        }));
      }

      const ws = XLSX.utils.json_to_sheet(datosFormateados);
      XLSX.utils.book_append_sheet(wb, ws, nombreLimpio);
    };

    agregarHoja('Se Leyo', animalesSeLeyo);
    agregarHoja('No Se Leyo', animalesNoLeyo);
    agregarHoja('Ausentes', animalesAusentes);
    agregarHoja('Nunca Se Leyo', animalesNuncaPaso);
    agregarHoja('Seca/NR', animalesConRP.length > 0 ? animalesConRP : secosNaNData);

    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Control_Ingreso_${fechaActual}.xlsx`;

    XLSX.writeFile(wb, nombreArchivo);
  };

  if (loading) {
    return (
      <Layout titulo="Herramientas">
        <div className={styles.loadingScreen}>
          <div className={styles.spinner}></div>
          <h2>Conectando al lector...</h2>
          <p>Obteniendo datos de ingreso del tambo en tiempo real.</p>
        </div>
      </Layout>
    );
  }

  if (error || data.length === 0) {
    return (
      <Layout titulo="Herramientas">
        <div className={styles.tvContainer}>
          <div className={styles.emoji}>⚠️</div>
          <h3>{error ? "Aviso: Error al obtener datos de ingreso" : "Aviso: Sin datos de ingreso"}</h3>
          <p>Revise la conexión del sistema de ordeñe o intente más tarde.</p>
        </div>
      </Layout>
    );
  }

  const totalAnimales = data.length + secosNaNData.length;
  const leidos = animalesSeLeyo.length;
  const porcentaje = totalAnimales > 0 ? Math.round((leidos / totalAnimales) * 100) : 0;
  
  let estadoGeneral = "Excelente";
  let colorBarra = "#10b981";
  if (porcentaje < 85) { estadoGeneral = "Regular"; colorBarra = "#f59e0b"; }
  if (porcentaje < 70) { estadoGeneral = "Crítico"; colorBarra = "#ef4444"; }

  return (
    <Layout titulo="Herramientas" style={{ paddingTop: 0 }}>
      <div className={styles.dashboardRoot}>
        
        {/* ENCABEZADO */}
        <div className={styles.headerBar}>
          <div className={styles.titleSection}>
            <h1>Control de Ingreso</h1>
            <p>{tamboSel?.nombre} — {format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnCow} onClick={() => setShowFichaEnOrdeñe(true)}>
              <GiCow size={20} /> Ficha En Ordeñe
            </button>
            <button className={styles.btnExcel} onClick={descargarExcel}>
              <RiFileExcel2Fill size={20} /> Exportar
            </button>
          </div>
        </div>

        {/* KPI ROW */}
        <div className={styles.kpiRow}>
          <div className={`${styles.kpiCard} ${styles.verde}`}>
            <div className={styles.kpiHeader}>
              <div className={styles.iconBox}>🟢</div> Leídos
            </div>
            <div className={styles.kpiValue}>{animalesSeLeyo.length}</div>
            <div><span className={styles.kpiPercentage}>{totalAnimales > 0 ? Math.round((animalesSeLeyo.length / totalAnimales) * 100) : 0}%</span></div>
          </div>
          <div className={`${styles.kpiCard} ${styles.rojo}`}>
            <div className={styles.kpiHeader}>
              <div className={styles.iconBox}>🔴</div> No Leídos
            </div>
            <div className={styles.kpiValue}>{animalesNoLeyo.length}</div>
            <div><span className={styles.kpiPercentage}>{totalAnimales > 0 ? Math.round((animalesNoLeyo.length / totalAnimales) * 100) : 0}%</span></div>
          </div>
          <div className={`${styles.kpiCard} ${styles.azul}`}>
            <div className={styles.kpiHeader}>
              <div className={styles.iconBox}>🔵</div> Ausentes
            </div>
            <div className={styles.kpiValue}>{animalesAusentes.length}</div>
            <div><span className={styles.kpiPercentage}>{totalAnimales > 0 ? Math.round((animalesAusentes.length / totalAnimales) * 100) : 0}%</span></div>
          </div>
          <div className={`${styles.kpiCard} ${styles.naranja}`}>
            <div className={styles.kpiHeader}>
              <div className={styles.iconBox}>🟠</div> Nunca Leídos
            </div>
            <div className={styles.kpiValue}>{animalesNuncaPaso.length}</div>
            <div><span className={styles.kpiPercentage}>{totalAnimales > 0 ? Math.round((animalesNuncaPaso.length / totalAnimales) * 100) : 0}%</span></div>
          </div>
          <div className={`${styles.kpiCard} ${styles.negro}`}>
            <div className={styles.kpiHeader}>
              <div className={styles.iconBox}>⚫</div> Seca / NR
            </div>
            <div className={styles.kpiValue}>{secosNaNData.length}</div>
            <div><span className={styles.kpiPercentage}>{totalAnimales > 0 ? Math.round((secosNaNData.length / totalAnimales) * 100) : 0}%</span></div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className={styles.mainGrid}>
          
          {/* GRÁFICO */}
          <div className={styles.chartContainer}>
            <h3>Distribución de Lecturas</h3>
            <div className={styles.chartWrapper}>
              <TamboChart
                animalesAusentes={animalesAusentes}
                animalesNoLeyo={animalesNoLeyo}
                animalesNuncaPaso={animalesNuncaPaso}
                animalesSeLeyo={animalesSeLeyo}
                secosNaNData={secosNaNData}
              />
            </div>
          </div>

          {/* PANEL LATERAL */}
          <div className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <h3>Panel de Acción</h3>
              {Object.values(selectedLists).some(Boolean) && (
                <button className={styles.backBtn} onClick={closeList}>
                  <RiArrowLeftSLine style={{verticalAlign: 'middle', marginRight: '4px'}}/> Volver
                </button>
              )}
            </div>
            
            <div className={styles.panelBody}>
              {/* Si no hay lista seleccionada, mostramos tarjetas de acción */}
              {!Object.values(selectedLists).some(Boolean) && (
                <>
                  <ActionCard icon="🟢" title="Animales Leídos" count={animalesSeLeyo.length} onClick={() => toggleList('seLeyo')} />
                  <ActionCard icon="🔴" title="No Leídos" count={animalesNoLeyo.length} onClick={() => toggleList('noLeyo')} />
                  <ActionCard icon="🔵" title="Ausentes" count={animalesAusentes.length} onClick={() => toggleList('ausentes')} />
                  <ActionCard icon="🟠" title="Nunca Leídos" count={animalesNuncaPaso.length} onClick={() => toggleList('nuncaPaso')} />
                  <ActionCard icon="⚫" title="Seca / NR" count={secosNaNData.length} onClick={() => toggleList('secosNaN')} />
                </>
              )}

              {/* Si hay lista seleccionada, renderizamos dentro del panel */}
              {selectedLists.seLeyo && <AnimalesSeLeyoList animales={animalesSeLeyo} />}
              {selectedLists.noLeyo && <AnimalesNoLeyoList animales={animalesNoLeyo} />}
              {selectedLists.ausentes && <AnimalesAusentesList animales={animalesAusentes} />}
              {selectedLists.nuncaPaso && <AnimalesNuncaPasoList animales={animalesNuncaPaso} />}
              {selectedLists.secosNaN && <AnimalesSecosNaNList animales={secosNaNData} onAnimalesConRPUpdate={setAnimalesConRP} />}
            </div>
          </div>
        </div>

        {/* BOTTOM SUMMARY */}
        <div className={styles.bottomSummary}>
          <div className={styles.summaryText}>
            Resumen General: <strong>{totalAnimales} Animales procesados</strong>
          </div>
          <div className={styles.summaryStatus}>
            <span style={{fontWeight: 600, color: '#111827'}}>Eficiencia: {porcentaje}% ({estadoGeneral})</span>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{width: `${porcentaje}%`, backgroundColor: colorBarra}}></div>
            </div>
          </div>
        </div>

        <AnimalesEnOrdeñe show={showFichaEnOrdeñe} setShow={setShowFichaEnOrdeñe} />
      </div>
    </Layout>
  );
}

/* ==============================================================
   COMPONENTES AUXILIARES
   ============================================================== */

function ActionCard({ icon, title, count, onClick }) {
  return (
    <div className={styles.actionCard} onClick={onClick}>
      <div className={styles.actionInfo}>
        <div className={styles.iconBox} style={{fontSize: '1.2rem'}}>{icon}</div>
        <div>
          <span className={styles.title}>{title}</span>
          <span className={styles.subtitle}>{count} animales registrados</span>
        </div>
      </div>
      <RiArrowRightSLine className={styles.arrow} />
    </div>
  );
}

function TamboChart({ animalesAusentes, animalesNoLeyo, animalesNuncaPaso, animalesSeLeyo, secosNaNData }) {
  const chartData = {
    labels: ['SE LEYO', 'NO SE LEYO', 'AUSENTES', 'NUNCA SE LEYO', 'SECA/NR'],
    datasets: [{
      data: [
        animalesSeLeyo.length,
        animalesNoLeyo.length,
        animalesAusentes.length,
        animalesNuncaPaso.length,
        secosNaNData.length
      ],
      backgroundColor: ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#111827'],
      borderRadius: 6,
      borderWidth: 0,
      barPercentage: 0.6
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: true, color: '#f3f4f6' },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        border: { display: false }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        padding: 12,
        titleFont: { size: 14, family: 'Inter' },
        bodyFont: { size: 14, family: 'Inter' },
        displayColors: false,
        cornerRadius: 8
      }
    }
  };

  return <Bar data={chartData} options={chartOptions} />;
}

// --- Componentes de Listados adaptados para el panel lateral ---

const formatearRFIDGeneral = (rfid) => {
  const erp = (rfid || '').replace(/⛔/g, '').replace(/\s+/g, '').trim();
  return erp.length === 14 ? `0${erp}` : erp;
};

function AnimalesSeLeyoList({ animales }) {
  if (animales.length === 0) return <p>No hay registros.</p>;
  return (
    <table className={styles.modernTable}>
      <thead><tr><th>RP</th><th>eRP</th></tr></thead>
      <tbody>
        {animales.map((a, i) => (
          <tr key={i}>
            <td style={{fontWeight: 600}}>{a.RP || '-'}</td>
            <td><span className={styles.tableBadge}>{formatearRFIDGeneral(a.RFID) || '-'}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AnimalesNoLeyoList({ animales }) {
  if (animales.length === 0) return <p>No hay registros.</p>;
  return (
    <table className={styles.modernTable}>
      <thead><tr><th>RP</th><th>eRP</th></tr></thead>
      <tbody>
        {animales.map((a, i) => (
          <tr key={i}>
            <td style={{fontWeight: 600}}>{a.RP || '-'}</td>
            <td><span className={styles.tableBadge}>{formatearRFIDGeneral(a.RFID) || '-'}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AnimalesAusentesList({ animales }) {
  if (animales.length === 0) return <p>No hay registros.</p>;
  return (
    <table className={styles.modernTable}>
      <thead><tr><th>RP</th><th>eRP</th><th>Días Aus.</th></tr></thead>
      <tbody>
        {animales.map((a, i) => (
          <tr key={i}>
            <td style={{fontWeight: 600}}>{a.RP || '-'}</td>
            <td><span className={styles.tableBadge}>{formatearRFIDGeneral(a.RFID) || '-'}</span></td>
            <td style={{color: '#ef4444', fontWeight: 600}}>{a.DiasAusente}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AnimalesNuncaPasoList({ animales }) {
  if (animales.length === 0) return <p>No hay registros.</p>;
  return (
    <table className={styles.modernTable}>
      <thead><tr><th>RP</th><th>eRP</th></tr></thead>
      <tbody>
        {animales.map((a, i) => (
          <tr key={i}>
            <td style={{fontWeight: 600}}>{a.RP || '-'}</td>
            <td><span className={styles.tableBadge}>{formatearRFIDGeneral(a.RFID) || '-'}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AnimalesSecosNaNList({ animales, onAnimalesConRPUpdate }) {
  const { firebase } = useContext(FirebaseContext);
  const [animalesConRP, setAnimalesConRP] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerRPs = async () => {
      setLoading(true);
      const animalesActualizados = await Promise.all(
        animales.map(async (animal) => {
          const erp = formatearRFIDGeneral(animal.RFID);
          const snapshot = await firebase.db.collection('animal')
            .where('erp', '==', erp)
            .where('mbaja', '==', '')
            .get();

          if (!snapshot.empty) {
            const animalDoc = snapshot.docs[0];
            return {
              ...animal,
              rp: animalDoc.data().rp,
              estpro: animalDoc.data().estpro,
              estrep: animalDoc.data().estrep
            };
          }
          return animal;
        })
      );
      setAnimalesConRP(animalesActualizados);
      onAnimalesConRPUpdate(animalesActualizados);
      setLoading(false);
    };

    obtenerRPs();
  }, [animales, firebase, onAnimalesConRPUpdate]);

  if (loading) return <div style={{textAlign: 'center', padding: '20px', color: '#6b7280'}}>Obteniendo datos...</div>;
  if (animalesConRP.length === 0) return <p>No hay registros.</p>;

  return (
    <table className={styles.modernTable}>
      <thead>
        <tr><th>RP</th><th>eRP</th><th>EST. PRO</th><th>EST. REP</th></tr>
      </thead>
      <tbody>
        {animalesConRP.map((a, i) => (
          <tr key={i}>
            <td style={{fontWeight: 600}}>{a.rp || a.RP || '-'}</td>
            <td><span className={styles.tableBadge}>{formatearRFIDGeneral(a.RFID) || '-'}</span></td>
            <td>{a.estpro || '-'}</td>
            <td>{a.estrep || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function tableToDataFrame(table) {
  const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
  const rows = Array.from(table.querySelectorAll('tr')).slice(1);
  return rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    return headers.reduce((obj, header, index) => {
      let value = cells[index] ? cells[index].textContent.trim() : '';
      if (header === 'RFID') {
        const rfidClean = value.replace(/⛔/g, '');
        if (rfidClean.length === 14) {
          value = `0${rfidClean}`;
        }
      }
      obj[header] = value;
      return obj;
    }, {});
  });
}

export default control_ingreso;