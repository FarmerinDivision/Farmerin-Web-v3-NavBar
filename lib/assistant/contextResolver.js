/**
 * Maps application routes to canonical section names and human-readable titles.
 */
const ROUTE_MAP = {
  '/': { section: 'tambos', screen: 'mis_tambos', title: 'Tambos' },
  '/login': { section: 'login', screen: 'login', title: 'Iniciar Sesión' },
  '/crear-cuenta': { section: 'login', screen: 'crear_cuenta', title: 'Crear Cuenta' },
  '/animales': { section: 'animales', screen: 'listado_animales', title: 'Animales' },
  '/gralAnimales': { section: 'reportes', screen: 'gral_animales', title: 'Gral Animales' },
  '/altaMasiva': { section: 'configuracion', screen: 'alta_masiva', title: 'Alta Masiva' },
  '/actualizacion': { section: 'configuracion', screen: 'actualizacion_masiva', title: 'Actualización Masiva' },
  '/parametros': { section: 'nutricion', screen: 'parametros_nutricion', title: 'Parámetros Nutricionales' },
  '/control': { section: 'nutricion', screen: 'control_nutricion', title: 'Control Nutricional' },
  '/controlLechero': { section: 'nutricion', screen: 'cargar_control_lechero', title: 'Cargar Control Lechero' },
  '/ControlLecheroMensual': { section: 'nutricion', screen: 'reporte_control_lechero', title: 'Reporte Control Lechero' },
  '/raciones': { section: 'herramientas', screen: 'control_ingreso', title: 'Control de Ingreso' },
  '/produccion': { section: 'reportes', screen: 'produccion', title: 'Producción' },
  '/parteDiario': { section: 'reportes', screen: 'parte_diario', title: 'Parte Diario' },
  '/recepciones': { section: 'reportes', screen: 'recepciones', title: 'Recepciones' },
  '/GestionDeRemitos': { section: 'reportes', screen: 'gestion_remitos', title: 'Gestión de Remitos' },
  '/monitor': { section: 'herramientas', screen: 'monitor_ingreso', title: 'Monitor de Ingreso' },
  '/IngresosTurnos': { section: 'herramientas', screen: 'control_turnos', title: 'Control de Turnos' },
  '/listados': { section: 'configuracion', screen: 'listados', title: 'Listados' },
  '/dirsa': { section: 'dirsa', screen: 'cargar_eventos', title: 'Cargar Eventos' },
  '/ProductividadMensualDirsa': { section: 'dirsa', screen: 'reporte_produccion', title: 'Reporte de Producción' },
  '/reporteDirsa': { section: 'dirsa', screen: 'reporte_eventos', title: 'Reporte de Eventos' },
  '/ayuda': { section: 'ayuda', screen: 'centro_ayuda', title: 'Ayuda' },
  '/farmerin-tio': { section: 'farmerin_tio', screen: 'farmerin_tio', title: 'Farmerin T.I.O.' },
  '/perfilFarmerin': { section: 'mi_farmerin', screen: 'perfil_usuario', title: 'Mi Farmerin' }
};

/**
 * Resolves context given a current route path and state parameters.
 */
function resolveContext(pathname, extraContext = {}) {
  const baseRoute = ROUTE_MAP[pathname] || {
    section: 'tambos',
    screen: pathname.replace('/', '') || 'mis_tambos',
    title: 'Farmerin'
  };

  const context = {
    path: pathname,
    section: extraContext.section || baseRoute.section,
    screen: extraContext.screen || baseRoute.screen,
    sectionTitle: baseRoute.title,
    tamboId: extraContext.tamboId || null,
    tamboName: extraContext.tamboName || null,
    selectedElement: extraContext.selectedElement || null,
    elementId: extraContext.elementId || null,
    usuario: extraContext.usuario ? {
      email: extraContext.usuario.email,
      displayName: extraContext.usuario.displayName || extraContext.usuario.email
    } : null
  };

  return context;
}

/**
 * Disambiguates contextual phrasing (e.g., "este campo", "estos horarios")
 * using the provided screen and element context.
 */
function resolveContextualQuery(userQuery, context) {
  let query = userQuery ? userQuery.trim() : '';

  if (!context) return query;

  const lowerQuery = query.toLowerCase();

  // Handle "este campo" or "para qué sirve este campo"
  if (lowerQuery.includes('este campo') || lowerQuery.includes('para qué sirve este')) {
    if (context.selectedElement) {
      return query.replace(/este campo|este/gi, `el campo ${context.selectedElement}`);
    } else if (context.section === 'tambos') {
      return '¿Qué campos componen la ficha de un tambo y para qué sirve cada uno?';
    }
  }

  // Handle "estos horarios" or "mis horarios"
  if (lowerQuery.includes('estos horarios') || lowerQuery.includes('mis horarios') || lowerQuery.includes('los horarios')) {
    if (context.tamboName) {
      return `¿Cómo consulto los horarios de ordeñe para el tambo ${context.tamboName}?`;
    }
  }

  return query;
}

module.exports = {
  ROUTE_MAP,
  resolveContext,
  resolveContextualQuery
};
