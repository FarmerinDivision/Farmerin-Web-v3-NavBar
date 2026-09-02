const fs = require('fs');
const path = require('path');

// Base directory path for knowledge files
function getKnowledgeBasePath() {
  const rootDir = process.cwd();
  const dirPath = path.join(rootDir, 'farmeirn-ai', 'knowledge-base');
  if (fs.existsSync(dirPath)) {
    return dirPath;
  }
  const altPath = path.join(rootDir, 'knowledge');
  if (fs.existsSync(altPath)) {
    return altPath;
  }
  return dirPath;
}

/**
 * Helper to get all .md files in a directory recursively.
 */
function getMdFilesRecursive(dirPath) {
  let results = [];
  if (!fs.existsSync(dirPath)) return results;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getMdFilesRecursive(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push({ name: entry.name, path: fullPath });
    }
  }
  return results;
}

/**
 * Scans the knowledge base directory and determines section availability.
 * A section is AVAILABLE (documented) if its directory contains at least one
 * non-empty .md file (> 50 bytes of actual documentation content).
 */
function getSectionsAvailability() {
  const basePath = getKnowledgeBasePath();
  const sections = {};

  if (!fs.existsSync(basePath)) {
    return sections;
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sectionName = entry.name.toLowerCase();
      const sectionDir = path.join(basePath, entry.name);
      
      let isDocumented = false;
      let totalBytes = 0;
      const mdFiles = getMdFilesRecursive(sectionDir);
      
      for (const fileItem of mdFiles) {
        const stat = fs.statSync(fileItem.path);
        if (stat.size > 50) {
          isDocumented = true;
          totalBytes += stat.size;
        }
      }

      sections[sectionName] = {
        name: sectionName,
        displayName: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
        isDocumented,
        totalBytes,
        path: sectionDir
      };
    }
  }

  // Alias maps for nutricion sub-sections
  if (sections['nutricion'] && sections['nutricion'].isDocumented) {
    sections['parametros'] = sections['nutricion'];
    sections['control'] = sections['nutricion'];
  }

  // Alias maps for reportes sub-sections (produccion, parte_diario)
  if (sections['reportes'] && sections['reportes'].isDocumented) {
    sections['produccion'] = sections['reportes'];
    sections['parte_diario'] = sections['reportes'];
    sections['recepciones'] = sections['reportes'];
    sections['gestion_remitos'] = sections['reportes'];
  }

  // Alias maps for herramientas sub-sections
  if (sections['herramientas'] && sections['herramientas'].isDocumented) {
    sections['monitor_ingreso'] = sections['herramientas'];
    sections['control_ingreso'] = sections['herramientas'];
    sections['control_turnos'] = sections['herramientas'];
  }

  return sections;
}

/**
 * Loads all knowledge markdown documents for a specific section.
 */
function loadSectionDocs(sectionName) {
  const basePath = getKnowledgeBasePath();
  const target = (sectionName || 'tambos').toLowerCase();
  
  let sectionDir = path.join(basePath, target);
  if (!fs.existsSync(sectionDir)) {
    const subPath = path.join(basePath, 'nutricion', target);
    if (fs.existsSync(subPath)) {
      sectionDir = subPath;
    } else {
      sectionDir = path.join(basePath, 'nutricion');
    }
  }

  if (!fs.existsSync(sectionDir)) {
    return null;
  }

  const docs = {
    overview: '',
    faq: '',
    errors: '',
    rawFiles: {}
  };

  const mdFiles = getMdFilesRecursive(sectionDir);
  for (const item of mdFiles) {
    const content = fs.readFileSync(item.path, 'utf-8');
    docs.rawFiles[item.name] = content;

    const lowerName = item.name.toLowerCase();
    if (lowerName.includes('faq')) {
      docs.faq += `\n\n` + content;
    } else if (lowerName.includes('error') || lowerName.includes('problema')) {
      docs.errors += `\n\n` + content;
    } else {
      docs.overview += `\n\n` + content;
    }
  }

  return docs;
}

/**
 * Determines if animal search by RP/eRP is allowed for a given section/screen.
 */
function isAnimalSearchAllowed(sectionName, screenName) {
  const sec = (sectionName || '').toLowerCase();
  const scr = (screenName || '').toLowerCase();

  const forbiddenScreens = [
    'recepciones',
    'gestion_remitos',
    'parametros_nutricion',
    'parametros',
    'control_ingreso',
    'monitor_ingreso',
    'alta_masiva',
    'actualizacion_masiva',
    'listados',
    'cargar_eventos',
    'produccion',
    'login',
    'crear_cuenta',
    'farmerin_tio',
    'mis_tambos',
    'centro_ayuda',
    'perfil_usuario'
  ];

  if (forbiddenScreens.includes(scr) || forbiddenScreens.includes(sec)) {
    return false;
  }

  const allowedScreens = [
    'listado_animales',
    'gral_animales',
    'cargar_control_lechero',
    'reporte_control_lechero',
    'control_nutricion',
    'control_turnos',
    'parte_diario',
    'reporte_produccion',
    'reporte_eventos'
  ];

  return allowedScreens.includes(scr);
}

/**
 * Extracts structured initial quick options based on available section documentation.
 */
function getInitialOptionsForSection(sectionName, context = {}) {
  const avail = getSectionsAvailability();
  const normalized = (sectionName || 'tambos').toLowerCase();
  const screen = (context?.screen || '').toLowerCase();
  
  const sectionData = avail[normalized];
  if (!sectionData || !sectionData.isDocumented) {
    return [
      { label: `¿Cuándo estará disponible la sección ${normalized.charAt(0).toUpperCase() + normalized.slice(1)}?`, action: 'availability' },
      { label: 'Ir a sección Tambos', action: 'navigate_tambos' },
      { label: 'Hablar con soporte técnico', action: 'support' }
    ];
  }

  let options = [];

  if (normalized === 'login') {
    options = [
      { label: '¿Cómo inicio sesión?', action: 'query', text: '¿Cómo inicio sesión?' },
      { label: '¿Olvidaste tu contraseña?', action: 'query', text: '¿Olvidaste tu contraseña?' },
      { label: 'Me aparece "Correo o contraseña incorrectos".', action: 'query', text: 'Me aparece "Correo o contraseña incorrectos"' }
    ];
  } else if (normalized === 'tambos') {
    options = [
      { label: '¿Cómo selecciono un tambo?', action: 'query', text: '¿Cómo selecciono un tambo?' },
      { label: '¿Cómo edito un tambo?', action: 'query', text: '¿Cómo edito un tambo?' },
      { label: '¿Cómo creo un tambo?', action: 'query', text: '¿Cómo creo un tambo?' },
      { label: '¿Qué datos tiene la ficha del tambo?', action: 'query', text: '¿Qué datos tiene la ficha del tambo?' }
    ];
  } else if (normalized === 'animales') {
    options = [
      { label: '¿Cómo doy de alta un animal?', action: 'query', text: '¿Cómo doy de alta un animal?' },
      { label: '¿Cómo edito un animal?', action: 'query', text: '¿Cómo edito un animal?' },
      { label: '¿Cómo doy de baja un animal?', action: 'query', text: '¿Cómo doy de baja un animal?' },
      { label: 'No me aparece un animal en el listado', action: 'query', text: 'No me aparece un animal en el listado' }
    ];
  }

  if (normalized === 'nutricion' || normalized === 'parametros' || normalized === 'control') {
    if (screen.includes('parametro') || normalized === 'parametros') {
      return [
        { label: '¿Qué es Parámetros?', action: 'query', text: '¿Qué es Parámetros?' },
        { label: '¿Cómo creo un grupo?', action: 'query', text: '¿Cómo creo un grupo?' },
        { label: '¿Para qué sirven los botones de aumento y reducción?', action: 'query', text: '¿Para qué sirven los botones de aumento y reducción?' },
        { label: '¿Qué es el promedio global?', action: 'query', text: '¿Qué es el promedio global?' },
        { label: '¿De qué forma se ejecutan los valores que asigno?', action: 'query', text: '¿De qué forma se ejecutan los valores que asigno?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }

    if (screen === 'control_nutricion' || normalized === 'control') {
      return [
        { label: '¿Qué es la sección Control?', action: 'query', text: '¿Qué es la sección Control?' },
        { label: '¿Qué datos veo en el panel izquierdo?', action: 'query', text: '¿Qué datos veo en el panel izquierdo?' },
        { label: '¿Cómo analizo la información?', action: 'query', text: '¿Cómo analizo la información?' },
        { label: '¿Cómo cambio el modo?', action: 'query', text: '¿Cómo cambio el modo?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }

    if (screen === 'cargar_control_lechero') {
      return [
        { label: '¿Qué es Cargar Control?', action: 'query', text: '¿Qué es Cargar Control y para qué sirve?' },
        { label: '¿Cómo realizo una carga?', action: 'query', text: '¿Cómo se realiza una carga paso a paso?' },
        { label: '¿Qué datos debo completar?', action: 'query', text: '¿Qué datos tengo que completar en la planilla?' },
        { label: '¿Qué hago si hay un error?', action: 'query', text: '¿Qué hago si un animal da error?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }

    if (screen === 'reporte_control_lechero') {
      return [
        { label: '¿Qué es este reporte?', action: 'query', text: '¿Qué es el Reporte de Control Lechero?' },
        { label: '¿Cómo consulto un mes?', action: 'query', text: '¿Cómo consulto un mes?' },
        { label: '¿Qué es "Ver curva"?', action: 'query', text: '¿Qué es "Ver curva"?' },
        { label: '¿Qué es "Ver gráfico"?', action: 'query', text: '¿Qué es "Ver gráfico"?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }

    return [
      { label: '¿Cómo se configura la ración en Parámetros?', action: 'query', text: '¿Cómo se configura la ración en Parámetros?' },
      { label: '¿Cómo funciona el Control Nutricional?', action: 'query', text: '¿Cómo funciona el Control Nutricional?' },
      { label: '¿Para qué sirve el Porcentaje de Ajuste?', action: 'query', text: '¿Para qué sirve el Porcentaje de Ajuste?' },
      { label: '¿Diferencia entre Modo Automático y Manual?', action: 'query', text: '¿Qué diferencia hay entre Automático y Manual?' }
    ];
  }

  if (normalized === 'reportes' || normalized === 'produccion' || normalized === 'parte_diario' || normalized === 'recepciones' || normalized === 'gestion_remitos') {
    if (screen === 'gral_animales') {
      return [
        { label: '¿Qué información puedo consultar?', action: 'query', text: '¿Qué información puedo consultar de un animal?' },
        { label: '¿Cómo busco un animal?', action: 'query', text: '¿Cómo busco una vaca en particular?' },
        { label: '¿Cómo entro a la ficha de un animal?', action: 'query', text: '¿Cómo entro a la ficha individual de un animal?' },
        { label: 'No veo ningún animal en el listado', action: 'query', text: 'No se ve ningún animal en el listado' }
      ];
    }

    if (screen === 'produccion') {
      return [
        { label: '¿Qué es Producción?', action: 'query', text: '¿Qué es la sección Producción y para qué sirve?' },
        { label: '¿Cómo consulto la producción?', action: 'query', text: '¿Cómo consulto la información de producción?' },
        { label: '¿Qué datos muestra la sección?', action: 'query', text: '¿Qué información muestra la sección Producción?' },
        { label: '¿Cómo exporto a Excel?', action: 'query', text: '¿Cómo exporto los datos de producción a Excel?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }

    if (screen === 'parte_diario') {
      return [
        { label: '¿Qué es Parte Diario?', action: 'query', text: '¿Qué es el Parte Diario y para qué sirve?' },
        { label: '¿Cómo consulto los eventos?', action: 'query', text: '¿Cómo consulto los eventos del Parte Diario?' },
        { label: '¿Qué información muestra?', action: 'query', text: '¿Qué información muestra el Parte Diario?' },
        { label: '¿Cómo exporto a Excel?', action: 'query', text: '¿Cómo exporto el Parte Diario a Excel?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }

    if (screen === 'recepciones') {
      return [
        { label: '¿Qué es Recepciones?', action: 'query', text: '¿Qué es Recepciones y para qué sirve?' },
        { label: '¿Qué información muestra?', action: 'query', text: '¿Qué información muestra la sección Recepciones?' },
        { label: '¿Cómo consulto la información?', action: 'query', text: '¿Cómo consulto la información de Recepciones?' },
        { label: '¿Qué acciones puedo realizar?', action: 'query', text: '¿Qué acciones puedo realizar en Recepciones?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }

    if (screen === 'gestion_remitos') {
      return [
        { label: '¿Qué es Gestión de Remitos?', action: 'query', text: '¿Qué es Gestión de Remitos y para qué sirve?' },
        { label: '¿Qué información muestra?', action: 'query', text: '¿Qué información muestra Gestión de Remitos?' },
        { label: '¿Cómo consulto la información?', action: 'query', text: '¿Cómo consulto la información de Gestión de Remitos?' },
        { label: '¿Qué acciones puedo realizar?', action: 'query', text: '¿Qué acciones puedo realizar en Gestión de Remitos?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
  }

  if (normalized === 'herramientas' || normalized === 'monitor_ingreso' || normalized === 'control_ingreso' || normalized === 'control_turnos') {
    if (screen === 'monitor_ingreso') {
      return [
        { label: '¿Qué es Monitor de Ingreso?', action: 'query', text: '¿Qué es Monitor de Ingreso y para qué sirve?' },
        { label: '¿Qué información muestra?', action: 'query', text: '¿Qué información muestra el Monitor de Ingreso?' },
        { label: '¿Qué significa N/A?', action: 'query', text: '¿Qué significa que un animal aparezca como N/A?' },
        { label: '¿Qué significa tanda completa o excedida?', action: 'query', text: '¿Qué significa que la tanda esté completa o excedida?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
    if (screen === 'control_ingreso') {
      return [
        { label: '¿Qué es Control de Ingreso?', action: 'query', text: '¿Qué es Control de Ingreso y para qué sirve?' },
        { label: '¿Qué significa cada categoría?', action: 'query', text: '¿Qué significa cada categoría: Se Leyó, No Se Leyó, Ausentes...?' },
        { label: '¿Qué significa el porcentaje de eficacia?', action: 'query', text: '¿Qué significa el porcentaje de eficacia?' },
        { label: '¿Qué información puedo ver de un animal?', action: 'query', text: '¿Qué información puedo ver de un animal?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
    if (screen === 'control_turnos') {
      return [
        { label: '¿Qué es Control de Turnos?', action: 'query', text: '¿Qué es Control de Turnos y para qué sirve?' },
        { label: '¿Cuándo se actualiza la información?', action: 'query', text: '¿Cuándo se actualiza la información de un turno?' },
        { label: '¿Qué es "Analizar Turno"?', action: 'query', text: '¿Qué es "Analizar Turno"?' },
        { label: '¿Puedo consultar los animales de cada turno?', action: 'query', text: '¿Puedo consultar los animales de cada turno?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
  }

  if (normalized === 'configuracion' || normalized === 'alta_masiva' || normalized === 'actualizacion_masiva' || normalized === 'listados') {
    if (screen === 'alta_masiva') {
      return [
        { label: '¿Qué es Alta Masiva?', action: 'query', text: '¿Qué es Alta Masiva y para qué sirve?' },
        { label: '¿Cómo utilizar la sección?', action: 'query', text: '¿Cómo cargar animales y utilizar la sección?' },
        { label: 'Planillas de descarga', action: 'query', text: '¿Qué planillas puedo descargar?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
    if (screen === 'actualizacion_masiva') {
      return [
        { label: '¿Qué es Actualización Masiva?', action: 'query', text: '¿Qué es Actualización Masiva y para qué sirve?' },
        { label: '¿Cómo utilizar la sección?', action: 'query', text: '¿Cuáles son los pasos para utilizar la sección?' },
        { label: 'Planillas de descarga', action: 'query', text: '¿Qué planillas puedo descargar?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
    if (screen === 'listados') {
      return [
        { label: '¿Qué es Listados?', action: 'query', text: '¿Qué es Listados y para qué sirve?' },
        { label: '¿Qué información muestra?', action: 'query', text: '¿Qué información muestra la sección Listados?' },
        { label: '¿Qué acciones puedo realizar?', action: 'query', text: '¿Qué acciones puedo realizar en Listados?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
  }

  if (normalized === 'dirsa') {
    if (screen === 'cargar_eventos') {
      return [
        { label: '¿Qué es Cargar Eventos?', action: 'query', text: '¿Qué es Cargar Eventos?' },
        { label: '¿Cómo acceder?', action: 'query', text: '¿Cómo acceder?' },
        { label: '¿Qué información permite cargar?', action: 'query', text: '¿Qué información permite cargar?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
    if (screen === 'reporte_eventos') {
      return [
        { label: '¿Qué es Reporte de Eventos?', action: 'query', text: '¿Qué es Reporte de Eventos y para qué sirve?' },
        { label: '¿Cómo acceder?', action: 'query', text: '¿Cómo acceder?' },
        { label: '¿Qué información muestra?', action: 'query', text: '¿Qué información muestra?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
    if (screen === 'reporte_produccion') {
      return [
        { label: '¿Qué es Reporte de Producción?', action: 'query', text: '¿Qué es Reporte de Producción y para qué sirve?' },
        { label: '¿Cómo acceder?', action: 'query', text: '¿Cómo acceder?' },
        { label: '¿Qué información muestra?', action: 'query', text: '¿Qué información muestra?' },
        { label: 'Comunicarse con el soporte técnico', action: 'support' }
      ];
    }
  }

  if (normalized === 'farmerin_tio') {
    return [
      { label: 'Hablar con soporte técnico', action: 'support' }
    ];
  }

  if (normalized === 'ayuda') {
    return [
      { label: '¿Qué es Ayuda y para qué sirve?', action: 'query', text: '¿Qué es Ayuda y para qué sirve?' },
      { label: '¿Qué medios de contacto ofrece Farmerin?', action: 'query', text: '¿Qué medios de contacto ofrece Farmerin?' },
      { label: '¿Qué información o herramientas ofrece?', action: 'query', text: '¿Qué información o herramientas ofrece?' },
      { label: '¿Qué puedo encontrar en el canal de YouTube?', action: 'query', text: '¿Qué puedo encontrar en el canal de YouTube?' },
      { label: 'Comunicarse con el soporte técnico', action: 'support' }
    ];
  }

  let resultOptions = [];

  if (normalized === 'mi_farmerin') {
    resultOptions = [
      { label: '¿Qué es Mi Farmerin?', action: 'query', text: '¿Qué es Mi Farmerin y para qué sirve?' },
      { label: '¿Qué información muestra?', action: 'query', text: '¿Qué información muestra Mi Farmerin?' },
      { label: '¿Qué acciones puedo realizar?', action: 'query', text: '¿Qué acciones puedo realizar en Mi Farmerin?' },
      { label: '¿Qué opciones están disponibles?', action: 'query', text: '¿Qué opciones o funcionalidades están disponibles en Mi Farmerin?' },
      { label: 'Comunicarse con el soporte técnico', action: 'support' }
    ];
  } else {
    resultOptions = [
      { label: `¿Cómo funciona ${sectionData.displayName}?`, action: 'query', text: `¿Cómo funciona la sección ${sectionData.displayName}?` },
      { label: `Tengo un problema en ${sectionData.displayName}`, action: 'query', text: `Tengo un problema en ${sectionData.displayName}` },
      { label: 'Hablar con soporte humano', action: 'support' }
    ];
  }

  if (isAnimalSearchAllowed(normalized, screen)) {
    return [
      { label: '¿Deseás buscar un animal en específico?', action: 'query', text: '¿Deseás buscar un animal en específico?' },
      ...resultOptions
    ];
  }

  return resultOptions;
}

module.exports = {
  getKnowledgeBasePath,
  getSectionsAvailability,
  loadSectionDocs,
  getInitialOptionsForSection,
  isAnimalSearchAllowed
};

