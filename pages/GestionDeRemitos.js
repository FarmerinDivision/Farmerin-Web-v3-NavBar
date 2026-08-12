import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import SelectTambo from '../components/layout/selectTambo';
import { Spinner } from 'react-bootstrap';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  RiSearchLine, RiFileExcel2Line, RiDownload2Line,
  RiCloseLine, RiZoomInLine, RiZoomOutLine,
  RiImage2Line
} from 'react-icons/ri';
import styles from '../styles/GestionRemitos.module.scss';

const Thumbnail = ({ fileName, tamboId, firebase, onClick }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (fileName && tamboId) {
      const fetchUrl = async () => {
        try {
          const path = `${tamboId}/recepciones/${fileName}`;
          const downloadUrl = await firebase.getArchivo(path);
          setUrl(downloadUrl);
        } catch (error) {
          console.error("Error loading image from path:", `${tamboId}/recepciones/${fileName}`, error);
        }
      };
      fetchUrl();
    } else {
      console.log("Missing fileName or tamboId in Thumbnail:", { fileName, tamboId });
    }
  }, [fileName, tamboId, firebase]);

  return (
    <div className={styles.thumbnailContainer} onClick={() => onClick(url)}>
      {url ? <img src={url} alt="Remito" /> : <RiImage2Line />}
    </div>
  );
};

const GestionDeRemitos = () => {
  const { firebase, tamboSel } = useContext(FirebaseContext);

  const [recepciones, setRecepciones] = useState([]);
  const [procesando, setProcesando] = useState(false);

  const [valores, setValores] = useState({
    fini: format(Date.now(), 'yyyy-MM-dd'),
    ffin: format(Date.now(), 'yyyy-MM-dd'),
    tipoFecha: 'mv' // Por defecto mes actual
  });

  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const [modal, setModal] = useState({
    open: false,
    url: null
  });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const formatFecha = useCallback((fecha) => {
    if (!fecha) return '';
    if (typeof fecha === 'string') return fecha;
    if (fecha.toDate && typeof fecha.toDate === 'function') {
      return format(fecha.toDate(), 'dd/MM/yyyy');
    }
    if (fecha.seconds) {
      return format(new Date(fecha.seconds * 1000), 'dd/MM/yyyy');
    }
    return String(fecha);
  }, []);

  const handleSubmit = useCallback(async (e, overrideTipoFecha = null) => {
    if (e) e.preventDefault();
    setRecepciones([]);
    setProcesando(true);
    setPage(1);

    const activeTipoFecha = overrideTipoFecha || valores.tipoFecha;
    let inicio, fin;
    let finAux = format(Date.now(), 'yyyy-MM-dd') + 'T23:59:59';

    if (activeTipoFecha === 'ef') {
      inicio = firebase.fechaTimeStamp(valores.fini);
      fin = firebase.fechaTimeStamp(valores.ffin + 'T23:59:59');
    } else if (activeTipoFecha === 'ud') { // Hoy
      const inicioAux = format(Date.now(), 'yyyy-MM-dd');
      inicio = firebase.fechaTimeStamp(inicioAux);
      fin = firebase.fechaTimeStamp(finAux);
    } else if (activeTipoFecha === 'mv') { // Mes actual
      const fechaActual = new Date();
      const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
      inicio = firebase.fechaTimeStamp(format(primerDiaMes, 'yyyy-MM-dd'));
      fin = firebase.fechaTimeStamp(finAux);
    } else if (activeTipoFecha === 'ma') { // Mes anterior
      const actual = new Date();
      const primerDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(actual.getFullYear(), actual.getMonth(), 0);
      inicio = firebase.fechaTimeStamp(format(primerDiaMesAnterior, 'yyyy-MM-dd'));
      fin = firebase.fechaTimeStamp(format(ultimoDiaMesAnterior, 'yyyy-MM-dd') + 'T23:59:59');
    }

    setValores(prev => ({ ...prev, tipoFecha: activeTipoFecha }));

    if (tamboSel) {
      try {
        console.log("Fetching for tambo:", tamboSel.id, "from:", inicio, "to:", fin);
        const query = firebase.db.collection('tambo')
          .doc(tamboSel.id)
          .collection('recepcion')
          .where('fecha', '>=', inicio)
          .where('fecha', '<=', fin);

        const snapshot = await query.get();
        console.log("Snapshot empty?", snapshot.empty, "Docs count:", snapshot.docs.length);

        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filtrar solo las recepciones de tipo "Racion" y que tengan el objeto/array de "ocr"
        // Se hace en el cliente para evitar requerir la creación de un nuevo índice compuesto en Firestore
        data = data.filter(doc => {
          const tipoStr = (doc.tipo || '').toLowerCase().trim();
          const esRacion = tipoStr.includes('racion') || tipoStr.includes('ración');
          return esRacion && doc.ocr;
        });

        console.log("Filtered records count:", data.length);
        if (data.length > 0) {
          console.log("First record sample:", data[0]);
        }

        // Orden local por fecha descendente
        data.sort((a, b) => {
          const timeA = a.fecha?.toMillis ? a.fecha.toMillis() : (a.fecha?.seconds ? a.fecha.seconds * 1000 : 0);
          const timeB = b.fecha?.toMillis ? b.fecha.toMillis() : (b.fecha?.seconds ? b.fecha.seconds * 1000 : 0);
          return timeB - timeA;
        });

        setRecepciones(data);
      } catch (error) {
        console.error("Error fetching recepciones:", error);
      }
    }
    setProcesando(false);
  }, [valores, tamboSel, firebase]);

  // Cargar datos automáticamente si hay un tambo seleccionado al inicio o cuando cambia
  useEffect(() => {
    if (tamboSel) {
      handleSubmit(null, valores.tipoFecha);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamboSel]);

  const handleChange = (e) => {
    const newValores = { ...valores, [e.target.name]: e.target.value };
    setValores(newValores);

    if (["ud", "mv", "ma"].includes(e.target.value)) {
      handleSubmit(null, e.target.value);
    }
  };

  const filteredRecepciones = useMemo(() => {
    try {
      if (!busqueda.trim()) return recepciones;
      const lowerB = busqueda.toLowerCase();
      return recepciones.filter(r => {
        const ocrData = Array.isArray(r.ocr) ? (r.ocr[0] || {}) : (r.ocr || {});
        const fechaF = formatFecha(r.fecha).toLowerCase();
        const usuarioF = (r.usuario || '').toLowerCase();
        const obsF = (ocrData.producto || '').toLowerCase();
        const tipoF = (r.tipo || '').toLowerCase();
        const pesoF = String(ocrData.pesoNeto || '').toLowerCase();

        return fechaF.includes(lowerB) ||
          usuarioF.includes(lowerB) ||
          obsF.includes(lowerB) ||
          tipoF.includes(lowerB) ||
          pesoF.includes(lowerB);
      });
    } catch (err) {
      console.error("Error in filteredRecepciones:", err);
      return [];
    }
  }, [recepciones, busqueda]);

  const totalPages = Math.ceil(filteredRecepciones.length / itemsPerPage) || 1;

  const paginatedRecepciones = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredRecepciones.slice(start, start + itemsPerPage);
  }, [filteredRecepciones, page]);

  const exportToExcel = () => {
    try {
      if (filteredRecepciones.length === 0) return;

      const wsData = [
        ["Fecha", "Fecha Remito", "Usuario", "Tipo", "Peso Neto", "Observaciones"]
      ];

      filteredRecepciones.forEach(r => {
        const ocrData = Array.isArray(r.ocr) ? (r.ocr[0] || {}) : (r.ocr || {});
        const fechaFormateada = formatFecha(r.fecha);
        const fechaRemitoFormateada = formatFecha(ocrData.fechaDetectada) || '-';
        const pesoNeto = ocrData.pesoNeto || '-';
        const obs = ocrData.producto || '-';

        wsData.push([
          fechaFormateada,
          fechaRemitoFormateada,
          r.usuario || '',
          r.tipo || '',
          pesoNeto,
          obs
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Remitos");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(data, `Gestion_Remitos_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  const downloadImage = async (r) => {
    const fileName = r.foto || r.remito;
    if (!fileName || !tamboSel) {
      console.log("Missing fileName or tamboSel in downloadImage:", { fileName, tamboId: tamboSel?.id });
      return;
    }

    const ocrData = Array.isArray(r.ocr) ? (r.ocr[0] || {}) : (r.ocr || {});
    // Prioridad 1: ocrData.fechaDetectada, Prioridad 2: r.fecha, Prioridad 3: 'SIN-FECHA'
    const rawFecha = ocrData.fechaDetectada || r.fecha;
    const dateFormatted = formatFecha(rawFecha) || '';
    const safeDate = dateFormatted ? dateFormatted.replace(/\//g, '-') : 'SIN-FECHA';

    const extensionMatch = fileName.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
    const extension = extensionMatch ? `.${extensionMatch[1]}` : '.jpg';

    const friendlyFileName = `IMGFarmerinRemito-${safeDate}${extension}`;

    try {
      console.log("Attempting to download image:", fileName);
      const path = `${tamboSel.id}/recepciones/${fileName}`;
      const downloadUrl = await firebase.getArchivo(path);

      try {
        // En este punto, `downloadUrl` contiene la URL válida (Firebase la generó correctamente).
        // Intentamos obtener el archivo como blob para poder renombrarlo con `saveAs`.
        const response = await fetch(downloadUrl);

        if (!response.ok) {
          // fetch() pudo conectarse, pero Firebase Storage devolvió un error (404, 403, etc.)
          if (response.status === 404) {
            throw new Error("HTTP_404: La imagen no existe en Firebase Storage.");
          } else if (response.status === 403) {
            throw new Error("HTTP_403: No tienes permisos para acceder a esta imagen.");
          } else {
            throw new Error(`HTTP_${response.status}: Ocurrió un error en el servidor.`);
          }
        }

        const blob = await response.blob();
        saveAs(blob, friendlyFileName);

      } catch (fetchError) {
        // 1. Manejo de Errores HTTP conocidos (lanzados manualmente arriba)
        if (fetchError.message && fetchError.message.startsWith("HTTP_")) {
          console.error("Error HTTP al descargar:", fetchError.message);
          alert(`No se pudo descargar: ${fetchError.message.split(": ")[1]}`);
        }
        // 2. Manejo de Error de Red o CORS (fetch() lanza TypeError cuando CORS falla o no hay internet)
        else if (fetchError.name === "TypeError") {
          console.error("Error de Red o CORS bloqueó la descarga:", fetchError);

          // Fallback: Si CORS falla, abrimos la imagen en una nueva pestaña.
          // El navegador permitirá verla (y descargarla manualmente) porque no se está procesando vía JavaScript.
          window.open(downloadUrl, '_blank');

          alert(
            "CORS REQUERIDO: El navegador bloqueó la descarga automática.\n\n" +
            "Para que la app pueda descargar y renombrar el archivo a '" + friendlyFileName + "', debe leer su contenido vía JavaScript. Sin embargo, Firebase Storage bloquea esto por seguridad (política de Same-Origin / CORS).\n\n" +
            "Por ahora, hemos abierto la imagen en una nueva pestaña.\n\n" +
            "Para solucionar esto definitivamente y permitir la descarga directa, es INDISPENSABLE configurar CORS en tu bucket de Firebase Storage mediante Google Cloud CLI:\n" +
            "1. Crea el archivo cors.json:\n" +
            '[{"origin": ["*"], "method": ["GET"], "maxAgeSeconds": 3600}]\n' +
            "2. Ejecuta:\n" +
            "gsutil cors set cors.json gs://TU-BUCKET.appspot.com"
          );
        }
        // 3. Manejo de Errores Desconocidos
        else {
          console.error("Error desconocido durante la descarga:", fetchError);
          alert("Ocurrió un error inesperado al intentar descargar la imagen.");
        }
      }
    } catch (error) {
      console.error("Error retrieving download URL:", error);
      alert("No se pudo obtener la ruta del archivo para descargar la imagen.");
    }
  };

  const openModal = (url) => {
    if (url) {
      setModal({ open: true, url });
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const closeModal = () => {
    setModal({ open: false, url: null });
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom(prev => Math.min(5, Math.max(0.3, prev + delta)));
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };

  const handleMouseUp = () => setDragging(false);

  const renderOcrStatus = (estado) => {
    if (estado === 'ok') {
      return <span className={`${styles.chip} ${styles.success}`}>Procesado</span>;
    } else if (estado === 'error') {
      return <span className={`${styles.chip} ${styles.error}`}>Error</span>;
    } else {
      return <span className={`${styles.chip} ${styles.warning}`}>Pendiente</span>;
    }
  };

  if (!tamboSel) {
    return (
      <Layout titulo="Gestión de Remitos">
        <SelectTambo />
      </Layout>
    );
  }

  return (
    <Layout titulo="Gestión de Remitos">
      {/* Header Sección */}
      <div className={styles.header}>
        <h1>Gestión de Remitos</h1>
        <p>Visualice y administre todos los remitos registrados y sus datos obtenidos mediante OCR.</p>
      </div>

      <div className={styles.filterCard}>
        <form onSubmit={handleSubmit}>
          <div className={styles.filterRow}>

            {/* Período */}
            <div className={styles.filterGroup} style={{ flex: '0 0 auto' }}>
              <label>Período Rápido</label>
              <div className={styles.segmentedControl}>
                <button
                  type="button"
                  name="tipoFecha"
                  value="mv"
                  className={valores.tipoFecha === 'mv' ? styles.active : ''}
                  onClick={(e) => {
                    handleChange({ target: { name: 'tipoFecha', value: 'mv' } });
                  }}
                >
                  Mes en curso
                </button>
                <button
                  type="button"
                  name="tipoFecha"
                  value="ma"
                  className={valores.tipoFecha === 'ma' ? styles.active : ''}
                  onClick={(e) => {
                    handleChange({ target: { name: 'tipoFecha', value: 'ma' } });
                  }}
                >
                  Mes anterior
                </button>
                <button
                  type="button"
                  name="tipoFecha"
                  value="ef"
                  className={valores.tipoFecha === 'ef' ? styles.active : ''}
                  onClick={(e) => {
                    setValores({ ...valores, tipoFecha: 'ef' });
                  }}
                >
                  Por fecha
                </button>
              </div>
            </div>

            {/* Selector Rango de Fecha */}
            {valores.tipoFecha === 'ef' && (
              <>
                <div className={styles.filterGroup} style={{ flex: '0 0 auto' }}>
                  <label>Fecha desde</label>
                  <input type="date" name="fini" value={valores.fini} onChange={(e) => setValores({ ...valores, fini: e.target.value })} required />
                </div>
                <div className={styles.filterGroup} style={{ flex: '0 0 auto' }}>
                  <label>Fecha hasta</label>
                  <input type="date" name="ffin" value={valores.ffin} onChange={(e) => setValores({ ...valores, ffin: e.target.value })} required />
                </div>
              </>
            )}

            {/* Buscador general */}
            <div className={styles.searchGroup}>
              <RiSearchLine className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por fecha, usuario, obs, tipo, peso..."
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                style={{ height: '40px', borderRadius: '6px', border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA' }}
              />
            </div>

            {/* Acciones */}
            <div className={styles.actionsArea}>
              <button type="button" className={styles.btnSecondary} onClick={exportToExcel} disabled={filteredRecepciones.length === 0}>
                <RiFileExcel2Line />
                Exportar Excel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                <RiSearchLine />
                Buscar
              </button>
            </div>

          </div>
        </form>
      </div>

      {procesando ? (
        <div className={styles.loadingOverlay}>
          <Spinner animation="border" variant="info" role="status" style={{ width: '3rem', height: '3rem', color: '#17A2B8' }} />
          <div className={styles.loadingText}>Cargando remitos...</div>
        </div>
      ) : (
        <>
          {filteredRecepciones.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.illustration} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 13V13.01" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 7V10" stroke="#E9ECEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h2>No se encontraron remitos para los filtros seleccionados.</h2>
              <p>Intenta con otros criterios de búsqueda o ajusta el rango de fechas.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>
                        <div className={styles.thTooltipWrapper}>
                          <span className={styles.thContent}>Imagen</span>
                          <span className={styles.thTooltipText}>Visualice la fotografía.</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper}>
                          <span className={styles.thContent}>Fecha</span>
                          <span className={styles.thTooltipText}>Fecha en la que se registró el evento.</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper}>
                          <span className={styles.thContent}>Fecha Remito</span>
                          <span className={styles.thTooltipText}>Fecha impresa en el remito físico.</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper}>
                          <span className={styles.thContent}>Balanceado</span>
                          <span className={styles.thTooltipText}>Descripcion en el remito.</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper}>
                          <span className={styles.thContent}>Peso</span>
                          <span className={styles.thTooltipText}>Peso neto identificado en el remito.</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper}>
                          <span className={styles.thContent}>Tipo</span>
                          <span className={styles.thTooltipText}>Tipo de recepción registrado.</span>
                        </div>
                      </th>
                      <th>Usuario</th>
                      {/* Columna Acciones — temporalmente deshabilitada
                      <th>
                        <div className={styles.thTooltipWrapper}>
                          <span className={styles.thContent}>Acciones</span>
                          <span className={styles.thTooltipText}>Descargue la imagen original del remito.</span>
                        </div>
                      </th>
                      */}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecepciones.map((r) => {
                      const ocrData = Array.isArray(r.ocr) ? (r.ocr[0] || {}) : (r.ocr || {});
                      return (
                        <tr key={r.id}>
                          <td>
                            <Thumbnail
                              fileName={r.foto || r.remito}
                              tamboId={tamboSel.id}
                              firebase={firebase}
                              onClick={openModal}
                            />
                          </td>
                          <td>{formatFecha(r.fecha) || '-'}</td>
                          <td>{formatFecha(ocrData.fechaDetectada) || '-'}</td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ocrData.producto}>
                            {ocrData.producto || '-'}
                          </td>
                          <td>{ocrData.pesoNeto || '-'}</td>
                          <td>{r.tipo || '-'}</td>
                          <td>{r.usuario || '-'}</td>
                          {/* Celda Acciones — temporalmente deshabilitada
                          <td>
                            <div className={styles.tableActions}>
                              <button
                                className={styles.btnDownload}
                                title="Descargar imagen"
                                onClick={() => downloadImage(r)}
                              >
                                <RiDownload2Line />
                              </button>
                            </div>
                          </td>
                          */}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <span>Mostrando {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredRecepciones.length)} de {filteredRecepciones.length}</span>
                  <div className={styles.pageButtons}>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      &lt;
                    </button>
                    <span style={{ margin: '0 8px', alignSelf: 'center', fontSize: '13px', fontWeight: '500' }}>
                      Página {page} de {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal de Previsualización con Zoom */}
      {modal.open && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.88)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
              userSelect: 'none'
            }}
          >
            {/* Botón cerrar */}
            <button
              onClick={closeModal}
              title="Cerrar"
              style={{
                position: 'absolute',
                top: '0',
                right: '0',
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <RiCloseLine size={26} color="#333" />
            </button>

            {/* Controles de Zoom */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10,
                backgroundColor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                borderRadius: '40px',
                padding: '8px 18px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(0.3, +(prev - 0.25).toFixed(2))); }}
                title="Alejar"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: '36px', height: '36px',
                  cursor: 'pointer',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  color: '#fff', transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <RiZoomOutLine size={18} />
              </button>

              <span
                onClick={(e) => { e.stopPropagation(); setZoom(1); setPosition({ x: 0, y: 0 }); }}
                title="Restablecer zoom"
                style={{
                  color: '#fff', fontSize: '13px', fontWeight: '600',
                  minWidth: '48px', textAlign: 'center',
                  cursor: 'pointer', letterSpacing: '0.5px'
                }}
              >
                {Math.round(zoom * 100)}%
              </span>

              <button
                onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(5, +(prev + 0.25).toFixed(2))); }}
                title="Acercar"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: '36px', height: '36px',
                  cursor: 'pointer',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  color: '#fff', transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <RiZoomInLine size={18} />
              </button>
            </div>

            {/* Imagen con zoom y arrastre */}
            <img
              src={modal.url}
              alt="Remito ampliado"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transition: dragging ? 'none' : 'transform 0.2s ease',
                transformOrigin: 'center center',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GestionDeRemitos;
