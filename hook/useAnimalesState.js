import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';


/**
 * Clave base para sessionStorage. Se sufija con el ID del tambo activo
 * para que el cache se invalide automaticamente al cambiar de tambo.
 */
const STORAGE_KEY = 'animales_ui_state';
const SCROLL_KEY  = 'animales_scroll_y';
const DATA_KEY    = 'animales_data_cache';

/**
 * Lee y parsea un item de sessionStorage de forma segura.
 * Devuelve null si no existe o hay un error de parseo.
 */
function readFromSession(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Escribe un valor en sessionStorage de forma segura.
 */
function writeToSession(key, value) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage puede lanzar en modo privado con cuota llena
  }
}

/**
 * useAnimalesState
 *
 * Hook que preserva automaticamente el estado de UI de la pagina animales.js
 * en sessionStorage. Al montar la pagina, restaura la ultima busqueda, filtros,
 * orden y posicion de scroll. Al navegar fuera, guarda el estado actual.
 *
 * @param {object|null} tamboSel - El tambo seleccionado actualmente.
 * @returns {object} Estado y handlers para usar directamente en animales.js.
 */
export function useAnimalesState(tamboSel) {
  const router  = useRouter();
  const tamboId = tamboSel?.id ?? null;

  // Claves con tamboId para invalidar cache al cambiar de tambo
  const uiKey   = tamboId ? `${STORAGE_KEY}_${tamboId}` : null;
  const dataKey  = tamboId ? `${DATA_KEY}_${tamboId}`    : null;

  // Leer estado guardado al montar (solo en cliente)
  const savedUi   = uiKey   ? readFromSession(uiKey)   : null;
  const savedData = dataKey ? readFromSession(dataKey)  : null;

  // Estado de UI - inicializado desde sessionStorage o con defaults
  const [searchTerm,   setSearchTermRaw]   = useState(savedUi?.searchTerm   ?? '');
  const [filtroRapido, setFiltroRapidoRaw] = useState(savedUi?.filtroRapido ?? 'Todos');
  const [orderRp,      setOrderRpRaw]      = useState(savedUi?.orderRp      ?? 'asc');
  const [orderEr,      setOrderErRaw]      = useState(savedUi?.orderEr      ?? 'asc');
  const [orderEp,      setOrderEpRaw]      = useState(savedUi?.orderEp      ?? 'asc');

  // Datos (cache de Firestore)
  const [animalesBase, setAnimalesBaseRaw] = useState(savedData ?? []);

  // ─── Persistencia reactiva del estado de UI ────────────────────────────────
  useEffect(() => {
    if (!uiKey) return;
    writeToSession(uiKey, { searchTerm, filtroRapido, orderRp, orderEr, orderEp });
  }, [uiKey, searchTerm, filtroRapido, orderRp, orderEr, orderEp]);

  // ─── Persistencia del cache de datos ──────────────────────────────────────
  const setAnimalesBase = useCallback((data) => {
    setAnimalesBaseRaw(data);
    if (dataKey) writeToSession(dataKey, data);
  }, [dataKey]);

  // Setters de UI (alias para claridad)
  const setSearchTerm   = useCallback((v) => setSearchTermRaw(v),   []);
  const setFiltroRapido = useCallback((v) => setFiltroRapidoRaw(v), []);
  const setOrderRp      = useCallback((v) => setOrderRpRaw(v),      []);
  const setOrderEr      = useCallback((v) => setOrderErRaw(v),      []);
  const setOrderEp      = useCallback((v) => setOrderEpRaw(v),      []);

  // ─── Guardar scroll justo antes de salir ──────────────────────────────────
  useEffect(() => {
    const saveScroll = (url) => {
      // Solo guardar si la ruta destino es un detalle o edicion de animal
      if (url.startsWith('/animales/')) {
        writeToSession(SCROLL_KEY, window.scrollY);
        sessionStorage.setItem('__animales_navigated', 'true');
      }
    };
    router.events.on('routeChangeStart', saveScroll);
    return () => router.events.off('routeChangeStart', saveScroll);
  }, [router.events]);

  // ─── Restaurar scroll al montar ───────────────────────────────────────────
  useEffect(() => {
    if (!tamboId) return;

    const cameBack = sessionStorage.getItem('__animales_navigated') === 'true';
    if (!cameBack) return;

    const savedY = readFromSession(SCROLL_KEY);
    if (savedY !== null) {
      // Doble rAF para que la tabla ya este renderizada
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedY, behavior: 'instant' });
        });
      });
    }

    // Limpiar la bandera (no la posicion: puede necesitarse si vuelve de nuevo)
    sessionStorage.removeItem('__animales_navigated');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamboId]);

  // ─── Detectar si venimos de edicion (invalidar cache) ─────────────────────
  const cameFromEdit = useCallback(() => {
    if (typeof document === 'undefined') return false;
    return document.referrer.includes('/animales/editar/');
  }, []);

  const hasCachedData = animalesBase.length > 0 && !cameFromEdit();

  // ─── Limpiar cache de datos (util post-edicion) ────────────────────────────
  const clearDataCache = useCallback(() => {
    if (dataKey) sessionStorage.removeItem(dataKey);
    setAnimalesBaseRaw([]);
  }, [dataKey]);

  // ─── navigateWithState ────────────────────────────────────────────────────
  // Navega guardando el scroll ANTES de que Next.js cambie de pagina.
  // Usar esta funcion desde animales.js (como prop para DetalleAnimal).
  const navigateWithState = useCallback((path) => {
    writeToSession(SCROLL_KEY, window.scrollY);
    sessionStorage.setItem('__animales_navigated', 'true');
    router.push(path);
  }, [router]);

  return {
    // Estado de UI
    searchTerm,    setSearchTerm,
    filtroRapido,  setFiltroRapido,
    orderRp,       setOrderRp,
    orderEr,       setOrderEr,
    orderEp,       setOrderEp,
    // Datos
    animalesBase,  setAnimalesBase,
    hasCachedData,
    clearDataCache,
    // Navegacion
    navigateWithState,
  };
}
