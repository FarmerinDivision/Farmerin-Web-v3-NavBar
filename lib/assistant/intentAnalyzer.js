/**
 * Analyzes and classifies the user's intent based on text patterns, contextual state, and domain knowledge rules.
 */
function analyzeIntent(query, context = {}) {
  const q = (query || '').toLowerCase().trim();

  // 1. Reset preguntas intent (Módulo Login / Global)
  if (
    q === 'reiniciar preguntas' ||
    q.includes('reiniciar preguntas') ||
    q === 'empezar de nuevo' ||
    q === 'volver al inicio' ||
    q === 'reiniciar'
  ) {
    return {
      intent: 'reiniciar_preguntas',
      topic: 'reiniciar'
    };
  }

  // 1a. Animal Search Intents
  if (
    q.includes('deseás buscar un animal en específico') ||
    q.includes('deseas buscar un animal en especifico') ||
    q.includes('buscar un animal en específico') ||
    q.includes('buscar un animal en especifico') ||
    q === '¿deseás buscar un animal en específico?' ||
    q === 'deseas buscar un animal' ||
    q === 'buscar animal'
  ) {
    return {
      intent: 'buscar_animal_inicio',
      topic: 'busqueda_animal'
    };
  }

  if (
    q === 'buscar por rp (caravana)' ||
    q.includes('buscar por rp') ||
    q === 'rp (caravana)' ||
    q === 'buscar rp'
  ) {
    return {
      intent: 'buscar_por_rp',
      topic: 'busqueda_animal_rp'
    };
  }

  if (
    q === 'buscar por erp (botón electrónico)' ||
    q.includes('buscar por erp') ||
    q === 'erp (botón electrónico)' ||
    q === 'buscar erp'
  ) {
    return {
      intent: 'buscar_por_erp',
      topic: 'busqueda_animal_erp'
    };
  }

  // 1b. Specific Login module intents
  if (context.section === 'login' || q.includes('contraseña') || q.includes('correo') || q.includes('mail') || q.includes('inicio sesión') || q.includes('inicio sesion')) {
    // "¿Cómo inicio sesión?" intent
    if (
      q.includes('cómo inicio sesión') || q.includes('como inicio sesion') ||
      q.includes('cómo me identifico') || q.includes('como me identifico')
    ) {
      return {
        intent: 'como_inicio_sesion',
        topic: 'inicio_sesion'
      };
    }

    // "Sí, la olvidé" intent
    if (
      q === 'sí, la olvidé' || q === 'si, la olvide' ||
      q.includes('sí, la olvidé') || q.includes('si, la olvide')
    ) {
      return {
        intent: 'confirmar_olvido',
        topic: 'olvidaste_contrasena'
      };
    }

    // "No me llegó el mail" intent
    if (
      q.includes('no me llegó el mail') || q.includes('no me llego el mail') ||
      q.includes('nunca me llegó') || q.includes('nunca me llego') ||
      q.includes('no me llegó el correo') || q.includes('no me llego el correo') ||
      q.includes('no recibí el mail') || q.includes('no recibi el mail') ||
      q.includes('no me llegó nada') || q.includes('no me llego nada') ||
      q.includes('nunca recibí el correo') || q.includes('nunca recibi el correo') ||
      q.includes('no llega el correo')
    ) {
      return {
        intent: 'correo_no_llegado',
        topic: 'no_recepcion_correo'
      };
    }

    // "Olvidaste tu contraseña" / Password recovery intent
    if (
      q.includes('olvidaste tu contraseña') || q.includes('olvidaste tu contrasena') ||
      q.includes('olvidé mi contraseña') || q.includes('olvide mi contraseña') ||
      q.includes('recuperar mi contraseña') || q.includes('recuperar contraseña')
    ) {
      return {
        intent: 'recuperacion_contrasena',
        topic: 'olvidaste_contrasena'
      };
    }

    // "Correo o contraseña incorrectos" intent
    if (
      q.includes('correo o contraseña incorrectos') ||
      q.includes('correo o contraseña incorrecto') ||
      q.includes('correo o contrasena incorrectos') ||
      q.includes('credenciales incorrectas')
    ) {
      return {
        intent: 'credenciales_incorrectas',
        topic: 'credenciales_incorrectas'
      };
    }
  }

  // 1c. Specific Tambos module intents
  if (context.section === 'tambos' || q.includes('tambo') || q.includes('link') || q.includes('ficha')) {
    // "Seleccionar tambo" intent
    if (
      q.includes('cómo selecciono un tambo') || q.includes('como selecciono un tambo') ||
      q.includes('cómo hago para entrar a un tambo') || q.includes('como hago para entrar a un tambo') ||
      q.includes('cómo elijo un tambo') || q.includes('como elijo un tambo') ||
      q.includes('cómo selecciono el tambo') || q.includes('como selecciono el tambo') ||
      q.includes('quiero ingresar a un tambo') || q.includes('como elijo tambo') ||
      q.includes('seleccionar un tambo') || q.includes('seleccionar tambo')
    ) {
      return {
        intent: 'seleccionar_tambo',
        topic: 'seleccionar_tambo'
      };
    }

    // "Editar tambo" intent
    if (
      q.includes('cómo edito un tambo') || q.includes('como edito un tambo') ||
      q.includes('quiero modificar un tambo') || q.includes('quiero modificar el tambo') ||
      q.includes('cómo cambio los datos del tambo') || q.includes('como cambio los datos del tambo') ||
      q.includes('necesito editar los datos') || q.includes('dónde puedo modificar un tambo') ||
      q.includes('donde puedo modificar un tambo') || q.includes('dónde edito un tambo') ||
      q.includes('editar un tambo') || q.includes('editar tambo')
    ) {
      return {
        intent: 'editar_tambo',
        topic: 'editar_tambo'
      };
    }

    // "Crear tambo" intent
    if (
      q.includes('cómo creo un tambo') || q.includes('como creo un tambo') ||
      q.includes('cómo creo tambo') || q.includes('como creo tambo') ||
      q.includes('cómo creo un nuevo tambo') || q.includes('como creo un nuevo tambo') ||
      q.includes('crear un tambo') || q.includes('crear tambo')
    ) {
      return {
        intent: 'crear_tambo',
        topic: 'crear_tambo'
      };
    }

    // "Ficha del tambo" intent
    if (
      q.includes('qué datos tiene la ficha del tambo') || q.includes('que datos tiene la ficha del tambo') ||
      q.includes('qué datos tiene la ficha de tambo') || q.includes('que datos tiene la ficha de tambo') ||
      q.includes('datos de la ficha del tambo') || q.includes('datos de la ficha') ||
      q.includes('qué campos tiene la ficha') || q.includes('que campos tiene la ficha') ||
      q.includes('ficha del tambo') || q.includes('ficha de tambo') ||
      q.includes('datos tiene la ficha')
    ) {
      return {
        intent: 'ficha_tambo',
        topic: 'ficha_tambo'
      };
    }

    // "Link del tambo" intent
    if (
      q.includes('dónde encuentro el link') || q.includes('donde encuentro el link') ||
      q.includes('cómo obtengo el link') || q.includes('como obtengo el link') ||
      q.includes('quién me da el link') || q.includes('quien me da el link') ||
      q.includes('necesito el enlace') || q.includes('cómo agrego el link') ||
      q.includes('de dónde saco el link') || q.includes('de donde saco el link') ||
      q.includes('link del tambo') || q.includes('enlace del tambo') ||
      q.includes('quien coloca el link') || q.includes('dónde coloco el link') ||
      q.includes('campo host') || q.includes('campo link')
    ) {
      return {
        intent: 'link_tambo',
        topic: 'link_tambo'
      };
    }
  }

  // 1c2. Specific Animales module intents
  if (context.section === 'animales' || q.includes('animal') || q.includes('rp') || q.includes('erp')) {
    // "Alta animal" intent
    if (
      q.includes('cómo doy de alta un animal') || q.includes('como doy de alta un animal') ||
      q.includes('dar de alta un animal') || q.includes('alta de animal') ||
      q.includes('cómo registro un animal') || q.includes('como registro un animal') ||
      q.includes('alta animal') || q.includes('crear animal') || q.includes('nuevo animal')
    ) {
      return {
        intent: 'alta_animal',
        topic: 'alta_animal'
      };
    }

    // "Editar animal" intent
    if (
      q.includes('cómo edito un animal') || q.includes('como edito un animal') ||
      q.includes('editar un animal') || q.includes('editar animal') ||
      q.includes('modificar animal') || q.includes('cómo modifico un animal')
    ) {
      return {
        intent: 'editar_animal',
        topic: 'editar_animal'
      };
    }

    // "Baja animal" intent
    if (
      q.includes('cómo doy de baja un animal') || q.includes('como doy de baja un animal') ||
      q.includes('dar de baja un animal') || q.includes('baja de animal') ||
      q.includes('baja animal') || q.includes('eliminar animal') || q.includes('borrar animal')
    ) {
      return {
        intent: 'baja_animal',
        topic: 'baja_animal'
      };
    }

    // "Animal no aparece" intent
    if (
      q.includes('no me aparece un animal') || q.includes('no me aparece animal') ||
      q.includes('por qué no encuentro mi animal') || q.includes('porque no encuentro mi animal') ||
      q.includes('no encuentro mi animal') || q.includes('no encuentro un animal') ||
      q.includes('no aparece en el listado') || q.includes('no aparece mi animal')
    ) {
      return {
        intent: 'animal_no_aparece',
        topic: 'animal_no_aparece'
      };
    }
  }

  // 1c2.5 Specific Reportes/Gral Animales intents
  if (context.section === 'reportes' || q.includes('animal') || q.includes('lista') || q.includes('ficha')) {
    if (q.includes('qué información puedo consultar') || q.includes('que informacion puedo consultar') || q.includes('qué datos puedo ver') || q.includes('qué información general')) {
      return {
        intent: 'gral_animales_info',
        topic: 'gral_animales_info'
      };
    }
    if (q.includes('cómo busco') || q.includes('como busco') || q.includes('cómo filtro') || q.includes('como filtro') || q.includes('buscar una vaca') || q.includes('por qué filtros')) {
      return {
        intent: 'gral_animales_busqueda',
        topic: 'gral_animales_busqueda'
      };
    }
    if (q.includes('entrar a la ficha') || q.includes('entro a la ficha') || q.includes('ver la ficha') || q.includes('abrir la ficha')) {
      return {
        intent: 'gral_animales_ficha',
        topic: 'gral_animales_ficha'
      };
    }
  }

  // 1c3. Specific Parámetros module intents
  if (context.section === 'parametros' || context.section === 'nutricion' || q.includes('parámetro') || q.includes('parametro') || q.includes('grupo') || q.includes('racion') || q.includes('ración')) {
    // 1. "¿Qué es Parámetros?"
    if (
      q === '¿qué es parámetros?' || q === 'que es parametros' || q === 'qué es parámetros' ||
      q.includes('qué es parámetros') || q.includes('que es parametros') ||
      q.includes('qué es la sección parámetros') || q.includes('que es la seccion parametros')
    ) {
      return {
        intent: 'que_es_parametros',
        topic: 'que_es_parametros'
      };
    }

    // 2. "¿Cómo creo un grupo?"
    if (
      q === '¿cómo creo un grupo?' || q === 'como creo un grupo' || q === 'cómo creo un grupo' ||
      q.includes('cómo creo un grupo') || q.includes('como creo un grupo') ||
      q.includes('cómo crear un grupo') || q.includes('como crear un grupo') ||
      q.includes('crear un grupo')
    ) {
      return {
        intent: 'como_creo_un_grupo',
        topic: 'como_creo_un_grupo'
      };
    }

    // 3. "¿Para qué sirven los botones de aumento y reducción?"
    if (
      q.includes('botones de aumento y reducción') || q.includes('botones de aumento y reduccion') ||
      q.includes('aumento y reducción') || q.includes('aumento y reduccion') ||
      q.includes('sirven los botones de aumento') || q.includes('para qué sirven los botones de aumento')
    ) {
      return {
        intent: 'aumento_reduccion_racion',
        topic: 'aumento_reduccion_racion'
      };
    }

    // 4. "¿Qué es el promedio global?"
    if (
      q.includes('promedio global') || q.includes('qué es el promedio global') || q.includes('que es el promedio global')
    ) {
      return {
        intent: 'promedio_global',
        topic: 'promedio_global'
      };
    }

    // 5. "¿De qué forma se ejecutan los valores que asigno?"
    if (
      q.includes('de qué forma se ejecutan') || q.includes('de que forma se ejecutan') ||
      q.includes('se ejecutan los valores') || q.includes('ejecutan los valores que asigno') ||
      q.includes('cómo se ejecutan los valores') || q.includes('como se ejecutan los valores') ||
      q.includes('proceso nocturno') || q.includes('ejecutan los valores')
    ) {
      return {
        intent: 'ejecucion_valores_nocturno',
        topic: 'ejecucion_valores_nocturno'
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DIRSA BLOCKS — must be evaluated BEFORE the generic Producción, Parte
  // Diario and Control Lechero blocks because they share overlapping keywords
  // like "evento", "producción", "reporte", "control", etc.
  // ──────────────────────────────────────────────────────────────────────────

  // 1c15. Dirsa: Reporte de Eventos (MUST be evaluated before Cargar Eventos)
  if (context.screen === 'reporte_eventos' || q.includes('reporte de eventos') || q.includes('reporte eventos')) {
    if (q.includes('qué es') || q.includes('que es') || q.includes('para qué sirve') || q.includes('para que sirve')) {
      return { intent: 'reporte_eventos_que_es', topic: 'reporte_eventos_que_es' };
    }
    if (q.includes('cómo acceder') || q.includes('como acceder') || q.includes('cómo entro') || q.includes('como entro')) {
      return { intent: 'reporte_eventos_como_acceder', topic: 'reporte_eventos_como_acceder' };
    }
    if (q.includes('qué información') || q.includes('que informacion') || q.includes('qué muestra') || q.includes('que muestra')) {
      return { intent: 'reporte_eventos_que_muestra', topic: 'reporte_eventos_que_muestra' };
    }
    if (q.includes('qué eventos') || q.includes('que eventos')) {
      return { intent: 'reporte_eventos_que_eventos', topic: 'reporte_eventos_que_eventos' };
    }
    if (q.includes('filtros') || q.includes('filtro')) {
      return { intent: 'reporte_eventos_filtros', topic: 'reporte_eventos_filtros' };
    }
    if (q.includes('cómo consultar') || q.includes('como consultar') || q.includes('cómo consulto') || q.includes('como consulto')) {
      return { intent: 'reporte_eventos_como_consultar', topic: 'reporte_eventos_como_consultar' };
    }
    if (q.includes('qué acciones') || q.includes('que acciones') || q.includes('qué puedo hacer') || q.includes('que puedo hacer')) {
      return { intent: 'reporte_eventos_acciones', topic: 'reporte_eventos_acciones' };
    }
    if (q.includes('qué relación') || q.includes('que relacion') || q.includes('relación con') || q.includes('relacion con')) {
      return { intent: 'reporte_eventos_relacion', topic: 'reporte_eventos_relacion' };
    }
  }

  // 1c16. Dirsa: Reporte de Producción (MUST be evaluated before Cargar Eventos)
  if (context.screen === 'reporte_produccion' || q.includes('reporte de producción') || q.includes('reporte de produccion') || q.includes('reporte produccion') || q.includes('reporte producción')) {
    if (q.includes('qué es') || q.includes('que es') || q.includes('para qué sirve') || q.includes('para que sirve')) {
      return { intent: 'reporte_produccion_que_es', topic: 'reporte_produccion_que_es' };
    }
    if (q.includes('cómo acceder') || q.includes('como acceder') || q.includes('cómo entro') || q.includes('como entro')) {
      return { intent: 'reporte_produccion_como_acceder', topic: 'reporte_produccion_como_acceder' };
    }
    if (q.includes('qué información') || q.includes('que informacion') || q.includes('qué muestra') || q.includes('que muestra')) {
      return { intent: 'reporte_produccion_que_muestra', topic: 'reporte_produccion_que_muestra' };
    }
    if (q.includes('cómo utilizar') || q.includes('como utilizar') || q.includes('cómo usar') || q.includes('como usar') || q.includes('pasos')) {
      return { intent: 'reporte_produccion_como_usar', topic: 'reporte_produccion_como_usar' };
    }
    if (q.includes('qué acciones') || q.includes('que acciones') || q.includes('qué puedo hacer') || q.includes('que puedo hacer')) {
      return { intent: 'reporte_produccion_acciones', topic: 'reporte_produccion_acciones' };
    }
    if (q.includes('qué relación') || q.includes('que relacion') || q.includes('relación con') || q.includes('relacion con')) {
      return { intent: 'reporte_produccion_relacion', topic: 'reporte_produccion_relacion' };
    }
  }

  // 1c17. Dirsa: Cargar Eventos (fallback for context.section === 'dirsa' when
  // neither Reporte de Eventos nor Reporte de Producción matched above)
  if (context.screen === 'cargar_eventos' || context.section === 'dirsa' || q.includes('cargar eventos')) {
    if (q.includes('qué es') || q.includes('que es') || q.includes('para qué sirve') || q.includes('para que sirve')) {
      return { intent: 'cargar_eventos_que_es', topic: 'cargar_eventos_que_es' };
    }
    if (q.includes('cómo acceder') || q.includes('como acceder') || q.includes('cómo entro') || q.includes('como entro')) {
      return { intent: 'cargar_eventos_como_acceder', topic: 'cargar_eventos_como_acceder' };
    }
    if (q.includes('qué información') || q.includes('que informacion') || q.includes('informacion permite')) {
      return { intent: 'cargar_eventos_info', topic: 'cargar_eventos_info' };
    }
    if (q.includes('cómo utilizar') || q.includes('como utilizar') || q.includes('cómo usar') || q.includes('como usar') || q.includes('cómo cargar') || q.includes('como cargar') || q.includes('pasos')) {
      return { intent: 'cargar_eventos_como_usar', topic: 'cargar_eventos_como_usar' };
    }
    if (q.includes('qué acciones') || q.includes('que acciones') || q.includes('qué puedo hacer') || q.includes('que puedo hacer')) {
      return { intent: 'cargar_eventos_acciones', topic: 'cargar_eventos_acciones' };
    }
    if (q.includes('qué requisitos') || q.includes('que requisitos')) {
      return { intent: 'cargar_eventos_requisitos', topic: 'cargar_eventos_requisitos' };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GENERIC BLOCKS — only reached if the Dirsa-specific blocks above did not
  // match. Additional guards exclude queries that mention Dirsa-specific
  // compound phrases so they don't get incorrectly captured here.
  // ──────────────────────────────────────────────────────────────────────────

  // Helper: true when the query clearly targets a Dirsa section
  const isDirsaQuery = q.includes('cargar eventos') || q.includes('reporte de eventos') || q.includes('reporte eventos') || q.includes('reporte de producción') || q.includes('reporte de produccion') || q.includes('reporte produccion') || q.includes('reporte producción') || context.section === 'dirsa';

  // 1c4. Specific Control Lechero module intents
  if (!isDirsaQuery && (context.section === 'nutricion' || q.includes('control') || q.includes('lechero') || q.includes('planilla') || q.includes('reporte'))) {
    
    if (q.includes('qué es cargar control') || q.includes('que es cargar control')) {
      return { intent: 'cargar_control_que_es', topic: 'cargar_control_que_es' };
    }
    
    if (q.includes('cómo realizo una carga') || q.includes('como realizo una carga') || q.includes('paso a paso') || q.includes('cómo cargar') || q.includes('como cargar')) {
      return { intent: 'cargar_control_pasos', topic: 'cargar_control_pasos' };
    }
    
    if (q.includes('qué datos debo completar') || q.includes('que datos debo completar') || q.includes('qué datos tengo que') || q.includes('que datos tengo que')) {
      return { intent: 'cargar_control_datos', topic: 'cargar_control_datos' };
    }
    
    if (q.includes('animal da error') || q.includes('hay un error') || q.includes('error en planilla')) {
      return { intent: 'cargar_control_error', topic: 'cargar_control_error' };
    }

    if (q.includes('qué es el reporte') || q.includes('que es el reporte') || q.includes('qué es este reporte') || q.includes('que es este reporte')) {
      return { intent: 'reporte_control_que_es', topic: 'reporte_control_que_es' };
    }

    if (q.includes('cómo consulto un mes') || q.includes('como consulto un mes')) {
      return { intent: 'reporte_control_consultar', topic: 'reporte_control_consultar' };
    }

    if (q.includes('ver curva') || q.includes('qué es ver curva') || q.includes('que es ver curva')) {
      return { intent: 'reporte_control_curva', topic: 'reporte_control_curva' };
    }

    if (q.includes('ver gráfico') || q.includes('ver grafico') || q.includes('qué es ver gráfico') || q.includes('que es ver grafico')) {
      return { intent: 'reporte_control_grafico', topic: 'reporte_control_grafico' };
    }
  }

  // 1c5. Producción intents (Reportes > Producción, NOT Dirsa > Reporte de Producción)
  if (!isDirsaQuery && (context.screen === 'produccion' || context.section === 'produccion' || q.includes('producción') || q.includes('produccion') || q.includes('litros') || q.includes('ordeñe') || q.includes('ordene'))) {
    if (q.includes('qué es') || q.includes('que es') || q.includes('para qué sirve') || q.includes('para que sirve')) {
      return { intent: 'produccion_que_es', topic: 'produccion_que_es' };
    }
    if (q.includes('cómo consulto') || q.includes('como consulto') || q.includes('cómo accedo') || q.includes('como accedo') || q.includes('período') || q.includes('periodo') || q.includes('fecha')) {
      return { intent: 'produccion_como_consultar', topic: 'produccion_como_consultar' };
    }
    if (q.includes('qué datos') || q.includes('que datos') || q.includes('qué información muestra') || q.includes('que informacion muestra') || q.includes('indicadores') || q.includes('muestra la sección') || q.includes('muestra la seccion')) {
      return { intent: 'produccion_que_muestra', topic: 'produccion_que_muestra' };
    }
    if (q.includes('exporto') || q.includes('excel') || q.includes('descargar') || q.includes('descarga')) {
      return { intent: 'produccion_exportar', topic: 'produccion_exportar' };
    }
    if (q.includes('gráfico') || q.includes('grafico') || q.includes('curva') || q.includes('evolución') || q.includes('evolucion')) {
      return { intent: 'produccion_grafico', topic: 'produccion_grafico' };
    }
  }

  // 1c6. Parte Diario intents (Reportes > Parte Diario, NOT Dirsa > Reporte de Eventos)
  if (!isDirsaQuery && (context.screen === 'parte_diario' || context.section === 'parte_diario' || q.includes('parte diario') || q.includes('novedad') || q.includes('parto') || q.includes('servicio') || (q.includes('alta') && !q.includes('alta masiva') && !q.includes('masiva')) || q.includes('baja'))) {
    if (q.includes('qué es') || q.includes('que es') || q.includes('para qué sirve') || q.includes('para que sirve')) {
      return { intent: 'parte_diario_que_es', topic: 'parte_diario_que_es' };
    }
    if (q.includes('cómo consulto') || q.includes('como consulto') || q.includes('cómo busco') || q.includes('como busco') || q.includes('filtro') || q.includes('fecha')) {
      return { intent: 'parte_diario_como_consultar', topic: 'parte_diario_como_consultar' };
    }
    if (q.includes('qué datos') || q.includes('que datos') || q.includes('qué información') || q.includes('que informacion') || q.includes('muestra')) {
      return { intent: 'parte_diario_que_muestra', topic: 'parte_diario_que_muestra' };
    }
    if (q.includes('exporto') || q.includes('excel') || q.includes('descargar') || q.includes('descarga')) {
      return { intent: 'parte_diario_exportar', topic: 'parte_diario_exportar' };
    }
    if (q.includes('marcar') || q.includes('visto') || q.includes('leído') || q.includes('leido')) {
      return { intent: 'parte_diario_marcar_visto', topic: 'parte_diario_marcar_visto' };
    }
  }

  // 1c18. Mi Farmerin
  if (context.screen === 'perfil_usuario' || context.screen === 'mi_farmerin' || context.section === 'mi_farmerin' || q.includes('mi farmerin')) {
    if (q.includes('qué es') || q.includes('que es') || q.includes('para qué sirve') || q.includes('para que sirve')) {
      return { intent: 'mi_farmerin_que_es', topic: 'mi_farmerin_que_es' };
    }
    if (q.includes('qué información') || q.includes('que informacion') || q.includes('qué muestra') || q.includes('que muestra')) {
      return { intent: 'mi_farmerin_que_muestra', topic: 'mi_farmerin_que_muestra' };
    }
    if (q.includes('qué acciones') || q.includes('que acciones') || q.includes('qué puedo hacer') || q.includes('que puedo hacer')) {
      return { intent: 'mi_farmerin_acciones', topic: 'mi_farmerin_acciones' };
    }
    if (q.includes('qué opciones') || q.includes('que opciones') || q.includes('funcionalidades')) {
      return { intent: 'mi_farmerin_opciones', topic: 'mi_farmerin_opciones' };
    }
    if (q.includes('qué relación') || q.includes('que relacion') || q.includes('relación con') || q.includes('relacion con')) {
      return { intent: 'mi_farmerin_relacion', topic: 'mi_farmerin_relacion' };
    }
  }

  // 1c19. Ayuda intents
  if (context.section === 'ayuda' || q.includes('ayuda') || q.includes('contacto') || q.includes('youtube') || q.includes('tutoriales')) {
    if (q.includes('qué es') || q.includes('que es') || q.includes('para qué sirve') || q.includes('para que sirve')) {
      return { intent: 'ayuda_que_es', topic: 'ayuda_que_es' };
    }
    if (q.includes('medios de contacto') || q.includes('vías de contacto') || q.includes('vias de contacto') || q.includes('cómo me comunico') || q.includes('como me comunico') || q.includes('teléfono') || q.includes('telefono') || q.includes('whatsapp') || q.includes('correo')) {
      return { intent: 'ayuda_medios_contacto', topic: 'ayuda_medios_contacto' };
    }
    if (q.includes('información o herramientas') || q.includes('informacion o herramientas') || q.includes('herramientas ofrece') || q.includes('canales oficiales')) {
      return { intent: 'ayuda_informacion_herramientas', topic: 'ayuda_informacion_herramientas' };
    }
    if (q.includes('youtube') || q.includes('videos') || q.includes('tutoriales')) {
      return { intent: 'ayuda_youtube', topic: 'ayuda_youtube' };
    }
  }

  // 1d. Human support request
  if (
    q.includes('soporte') ||
    q.includes('humano') ||
    q.includes('persona') ||
    q.includes('atención al cliente') ||
    q.includes('hablar con alguien')
  ) {
    return {
      intent: 'soporte_humano',
      topic: 'soporte_tecnico',
      requiresSupportDerivation: true
    };
  }

  // 2. Data modification action request (STRICT READ-ONLY BOUNDARY)
  if (
    q.startsWith('crea ') || q.startsWith('crear ') ||
    q.startsWith('edita ') || q.startsWith('editar ') ||
    q.startsWith('elimina ') || q.startsWith('eliminar ') ||
    q.startsWith('borra ') || q.startsWith('borrar ') ||
    q.startsWith('modifica ') || q.startsWith('modificar ') ||
    q.includes('por mí') || q.includes('hazlo tú') || q.includes('hacelo vos')
  ) {
    // If it asks HOW to do it, it's consulta_de_uso. If it commands the bot to do it, it's action_mutation.
    if (!q.includes('cómo') && !q.includes('como') && !q.includes('pasos')) {
      return {
        intent: 'accion_mutacion',
        topic: 'accion_bloqueada',
        message: 'Por razones de seguridad y control, yo no puedo crear, editar ni eliminar datos directamente en Farmerin. El control siempre pertenece al usuario. Sin embargo, te puedo explicar paso a paso cómo realizar esta acción.'
      };
    }
  }

  // 3. Navigation intent
  if (
    q.includes('ir a') ||
    q.includes('llévame') ||
    q.includes('llevame') ||
    q.includes('abrir sección') ||
    q.includes('navegar a')
  ) {
    let targetSection = 'tambos';
    if (q.includes('animal')) targetSection = 'animales';
    if (q.includes('nutricion') || q.includes('nutrición')) targetSection = 'nutricion';
    if (q.includes('reporte')) targetSection = 'reportes';
    if (q.includes('dirsa')) targetSection = 'dirsa';

    return {
      intent: 'navegacion',
      targetSection,
      topic: 'navegacion_guiada'
    };
  }

  // 4. Problem & Diagnostic intent
  if (
    q.includes('no puedo') ||
    q.includes('no me aparece') ||
    q.includes('no aparecen') ||
    q.includes('no funciona') ||
    q.includes('error') ||
    q.includes('problema') ||
    q.includes('fallo') ||
    q.includes('se trabó') ||
    q.includes('cargando panel') ||
    q.includes('no veo') ||
    q.includes('no se ve')
  ) {
    let topic = 'general';
    if (q.includes('horario') || q.includes('turnos')) topic = 'horarios';
    if (q.includes('guardar') || q.includes('cambio')) topic = 'guardar_cambios';
    if (q.includes('cargando') || q.includes('panel')) topic = 'cargando_panel';
    if (q.includes('administrador') || q.includes('permisos')) topic = 'permisos';
    if (q.includes('animales') || q.includes('redireccion')) topic = 'redireccion';
    if ((q.includes('no veo') || q.includes('no se ve')) && (q.includes('animal') || q.includes('listado') || q.includes('lista'))) topic = 'gral_animales_vacio';

    return {
      intent: 'problema',
      topic,
      primarySource: 'errores'
    };
  }

  // 5. Usage query ("¿Cómo creo...?", "¿Cómo edito...?", "¿Cómo entro...?")
  if (
    q.includes('cómo') || q.includes('como') ||
    q.includes('pasos') ||
    q.includes('puedo') ||
    q.includes('donde') || q.includes('dónde')
  ) {
    return {
      intent: 'consulta_de_uso',
      topic: 'instrucciones_uso',
      primarySource: 'manual'
    };
  }

  // 6. Data query ("¿Qué estado tiene el animal X?", "¿Cuál es el link actual?")
  if (
    q.includes('qué estado') || q.includes('que estado') ||
    q.includes('cuál es') || q.includes('cual es') ||
    q.includes('datos de') || q.includes('información de')
  ) {
    return {
      intent: 'consulta_de_datos',
      topic: 'datos_lectura',
      primarySource: 'data'
    };
  }

  // 7. General informative query ("¿Qué es...?", "¿Para qué sirve...?")
  if (
    q.includes('qué es') || q.includes('que es') ||
    q.includes('para qué sirve') || q.includes('para que sirve') ||
    q.includes('significa') || q.includes('campos')
  ) {
    return {
      intent: 'consulta_informativa',
      topic: 'informacion_general',
      primarySource: 'manual'
    };
  }

  // Default fallback to informative query
  return {
    intent: 'consulta_informativa',
    topic: 'general',
    primarySource: 'faq'
  };
}

module.exports = {
  analyzeIntent
};
