const { getSectionsAvailability, loadSectionDocs, getInitialOptionsForSection, isAnimalSearchAllowed } = require('../../../lib/assistant/knowledgeEngine');
const { resolveContext, resolveContextualQuery } = require('../../../lib/assistant/contextResolver');
const { analyzeIntent } = require('../../../lib/assistant/intentAnalyzer');
const firebase = require('../../../firebase2/firebase').default;
const differenceInDays = require('date-fns/differenceInDays');
const { format } = require('date-fns');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query: rawQuery, context: rawContext, diagnosticStep, actionType, isManualInput, searchMode } = req.body || {};

    const context = resolveContext(rawContext?.path || '/', rawContext || {});
    const sectionsAvailability = getSectionsAvailability();

    // ── FARMERIN T.I.O. SECTION CONSTRAINT ─────────────────────────────────────
    if (context.section === 'farmerin_tio' || context.path === '/farmerin-tio') {
      if (actionType === 'GET_INITIAL_OPTIONS') {
        return res.status(200).json({
          success: true,
          type: 'initial_options',
          section: 'farmerin_tio',
          options: [
            { label: 'Hablar con soporte técnico', action: 'support' }
          ]
        });
      }

      return res.status(200).json(resJson({
        intent: 'farmerin_tio_info',
        responseText: 'No voy a responder consultas en esta sección porque aquí podés consultar toda la información sobre de qué trata el bot.\n\nSi necesitás ayuda o comunicarte con nuestro equipo, podés hablar directamente con Soporte.',
        offerSupport: true,
        suggestedActions: [
          { label: 'Hablar con soporte técnico', type: 'support' }
        ]
      }, context));
    }

    // Handling initial options request when user opens chat empty
    if (actionType === 'GET_INITIAL_OPTIONS') {
      const options = getInitialOptionsForSection(context.section, context);
      return res.status(200).json({
        success: true,
        type: 'initial_options',
        section: context.section,
        options
      });
    }

    // ── AWAITING RP / eRP INPUT INTERCEPTOR ──────────────────────────────────
    if (searchMode === 'AWAITING_RP' || searchMode === 'AWAITING_ERP') {
      if (!isAnimalSearchAllowed(context.section, context.screen)) {
        return res.status(200).json(resJson({
          intent: 'busqueda_animal_no_permitida',
          responseText: 'La búsqueda de animales no está disponible en esta sección.',
          searchMode: null,
          suggestedActions: [
            { label: 'Reiniciar preguntas', type: 'reset_login' }
          ]
        }, context));
      }

      const searchResult = await executeAnimalSearch(searchMode, rawQuery, context);
      return res.status(200).json(resJson(searchResult, context));
    }

    const resolvedQuery = resolveContextualQuery(rawQuery, context);

    // ── ANIMAL SEARCH INTENT INTERCEPTORS ──────────────────────────────────────
    const intentResult = analyzeIntent(resolvedQuery, context);

    if (intentResult.intent === 'buscar_animal_inicio') {
      if (!isAnimalSearchAllowed(context.section, context.screen)) {
        return res.status(200).json(resJson({
          intent: 'busqueda_animal_no_permitida',
          responseText: 'La búsqueda de animales no está disponible en esta sección.',
          searchMode: null,
          suggestedActions: [
            { label: 'Reiniciar preguntas', type: 'reset_login' }
          ]
        }, context));
      }

      return res.status(200).json(resJson({
        intent: 'buscar_animal_inicio',
        responseText: '¿Deseás buscar un animal en específico?',
        searchMode: null,
        suggestedActions: [
          { label: 'Buscar por RP (caravana)', type: 'query', text: 'Buscar por RP (caravana)' },
          { label: 'Buscar por eRP (botón electrónico)', type: 'query', text: 'Buscar por eRP (botón electrónico)' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'buscar_por_rp') {
      if (!isAnimalSearchAllowed(context.section, context.screen)) {
        return res.status(200).json(resJson({
          intent: 'busqueda_animal_no_permitida',
          responseText: 'La búsqueda de animales no está disponible en esta sección.',
          searchMode: null,
          suggestedActions: [
            { label: 'Reiniciar preguntas', type: 'reset_login' }
          ]
        }, context));
      }

      return res.status(200).json(resJson({
        intent: 'buscar_por_rp',
        responseText: 'Escribí el RP del animal que querés buscar.',
        searchMode: 'AWAITING_RP',
        suggestedActions: [
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'buscar_por_erp') {
      if (!isAnimalSearchAllowed(context.section, context.screen)) {
        return res.status(200).json(resJson({
          intent: 'busqueda_animal_no_permitida',
          responseText: 'La búsqueda de animales no está disponible en esta sección.',
          searchMode: null,
          suggestedActions: [
            { label: 'Reiniciar preguntas', type: 'reset_login' }
          ]
        }, context));
      }

      return res.status(200).json(resJson({
        intent: 'buscar_por_erp',
        responseText: 'Escribí el eRP del animal que querés buscar.',
        searchMode: 'AWAITING_ERP',
        suggestedActions: [
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── MANUAL INPUT FALLBACK ─────────────────────────────────────────────────
    // El usuario escribió en el campo de texto libre (no seleccionó una
    // pregunta sugerida). No interpretamos la consulta: devolvemos fallback.
    // FUTURE HOOK: reemplazar este bloque con una llamada a IA.
    if (isManualInput) {
      const sectionTitle = context.sectionTitle || null;
      const sectionMsg = sectionTitle
        ? `Mi conocimiento actual está basado en las preguntas sugeridas de la sección **${sectionTitle}**.`
        : 'Mi conocimiento actual está basado en las preguntas sugeridas de la sección en la que te encontrás.';

      return res.status(200).json(resJson({
        intent: 'manual_input_fallback',
        responseText: `Por el momento todavía no puedo interpretar consultas escritas libremente.\n\n${sectionMsg}\n\nSi tu duda no aparece entre las opciones disponibles, podés contactarte con Soporte y contarnos qué necesitás.`,
        suggestedActions: [
          { label: 'Reiniciar preguntas', type: 'reset_login' },
          { label: 'Contactar con soporte', type: 'support' }
        ]
      }, context));
    }
    // ──────────────────────────────────────────────────────────────────────e', type: 'support' }
        ]
      }, context));
    }
    // ──────────────────────────────────────────────────────────────────────

    const intentResult = analyzeIntent(resolvedQuery, context);

    // 0a. Reiniciar Preguntas intent
    if (intentResult.intent === 'reiniciar_preguntas') {
      return res.status(200).json(resJson({
        intent: 'reiniciar_preguntas',
        responseText: 'Flujo de preguntas reiniciado. Podés seleccionar una de las preguntas principales para comenzar nuevamente.',
        resetFlow: true
      }, context));
    }

    // 0a1. Login - ¿Cómo inicio sesión?
    if (intentResult.intent === 'como_inicio_sesion') {
      return res.status(200).json(resJson({
        intent: 'como_inicio_sesion',
        responseText: '### ¿Cómo inicio sesión?\n\nPara acceder a Farmerin:\n\n1. Ingresá tu correo electrónico (**Email**) y tu contraseña (**Password**).\n2. Presioná el botón **Iniciar sesión**.\n3. Mientras el sistema procesa tus datos, verás el mensaje *"Iniciando sesión..."*. Al ser validados correctamente, serás redirigido a la página principal.',
        suggestedActions: [
          { label: '¿Olvidaste tu contraseña?', type: 'query', text: '¿Olvidaste tu contraseña?' },
          { label: 'Volver al inicio', type: 'reset_login' }
        ]
      }, context));
    }

    // 0a2. Login - Confirmar Olvido ("Sí, la olvidé")
    if (intentResult.intent === 'confirmar_olvido') {
      return res.status(200).json(resJson({
        intent: 'confirmar_olvido',
        responseText: 'Se ha abierto el formulario de recuperación en la pantalla de inicio de sesión. Por favor, ingresá tu correo electrónico y presioná el botón **"Enviar correo de recuperación"**.',
        suggestedActions: [
          { label: 'No me llegó el mail', type: 'query', text: 'No me llegó el mail' },
          { label: 'Volver al inicio', type: 'reset_login' }
        ]
      }, context));
    }

    // 0b. Login - Recuperación de contraseña ("Olvidaste tu contraseña")
    if (intentResult.intent === 'recuperacion_contrasena') {
      return res.status(200).json(resJson({
        intent: 'recuperacion_contrasena',
        responseText: '### Recuperar contraseña\n\nSi olvidaste tu contraseña:\n\n1. Presiona el botón "Sí, la olvidé".\n2. Ingresa tu correo electrónico en el formulario que aparecerá.\n3. Presiona el botón "Enviar correo de recuperación".\n4. Revisa tu casilla de correo electrónico.\n5. Si no encuentras el correo, revisa la carpeta Spam o Correo no deseado.\n6. Abre el correo de recuperación recibido.\n7. Presiona el enlace incluido en el mensaje.\n8. Serás redirigido a una página donde podrás ingresar tu nueva contraseña.\n9. Guarda los cambios y vuelve a iniciar sesión.',
        suggestedActions: [
          { label: 'Sí, la olvidé', type: 'forgot_password', text: 'Sí, la olvidé' },
          { label: 'No me llegó el mail', type: 'query', text: 'No me llegó el mail' },
          { label: 'Volver al inicio', type: 'reset_login' }
        ]
      }, context));
    }

    // 0c. Login - "No me llegó el mail"
    if (intentResult.intent === 'correo_no_llegado') {
      return res.status(200).json(resJson({
        intent: 'correo_no_llegado',
        responseText: 'Si no recibiste el correo de recuperación para restablecer tu contraseña, por favor verificá tu casilla de **Spam** o correo no deseado.\n\nSi continuás sin recibirlo, podés derivar automáticamente tu consulta al soporte técnico mediante el botón a continuación:',
        offerSupport: true,
        suggestedActions: [
          { label: 'Hablar con soporte', type: 'support' },
          { label: 'Volver al inicio', type: 'reset_login' }
        ]
      }, context));
    }

    // 0d. Login - "Me aparece correo o contraseña incorrectos"
    if (intentResult.intent === 'credenciales_incorrectas') {
      return res.status(200).json(resJson({
        intent: 'credenciales_incorrectas',
        responseText: '### Verificaciones recomendadas\n\n- Verifica que el correo electrónico esté correctamente escrito.\n- Asegúrate de que el correo no tenga espacios al principio o al final.\n- Revisa que la contraseña esté correctamente escrita.\n- Presiona el ícono del ojo para visualizar la contraseña.\n- Comprueba que la contraseña no tenga espacios adicionales ni errores de escritura.\n\n*Si olvidaste tu contraseña, puedes recuperarla desde la opción correspondiente.*',
        suggestedActions: [
          { label: 'Recuperar contraseña', type: 'query', text: '¿Olvidaste tu contraseña?' },
          { label: 'Hablar con soporte', type: 'support' },
          { label: 'Volver al inicio', type: 'reset_login' }
        ]
      }, context));
    }

    // 0e. Tambos - Seleccionar tambo
    if (intentResult.intent === 'seleccionar_tambo') {
      return res.status(200).json(resJson({
        intent: 'seleccionar_tambo',
        responseText: '### Seleccionar un tambo\n\nSi tu usuario tiene acceso a más de un tambo, podrás seleccionarlo desde la lista de tambos disponibles.\n\n1. Presiona sobre el selector de tambos.\n2. Se mostrará el listado de tambos asociados a tu usuario.\n3. Selecciona el tambo con el que deseas trabajar.\n4. Una vez seleccionado, toda la información de la aplicación se actualizará según el tambo elegido.',
        suggestedActions: [
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0f. Tambos - Editar tambo
    if (intentResult.intent === 'editar_tambo') {
      return res.status(200).json(resJson({
        intent: 'editar_tambo',
        responseText: '### Editar un tambo\n\nPara editar un tambo:\n\n1. Ingresa a la ficha del tambo.\n2. Presiona la opción de edición.\n3. Modifica los datos que necesites actualizar.\n4. Guarda los cambios para que se apliquen.\n\n**Importante**\n\nLos campos Host y Link no pueden ser modificados por los usuarios. Cualquier cambio en estos datos deberá ser solicitado al equipo de soporte.',
        suggestedActions: [
          { label: 'Contactar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0f2. Tambos - Crear tambo
    if (intentResult.intent === 'crear_tambo') {
      return res.status(200).json(resJson({
        intent: 'crear_tambo',
        responseText: '### Crear un tambo\n\nPara crear un nuevo tambo:\n\n1. Presiona el botón Crear Tambo.\n2. Se abrirá el formulario de creación.\n3. Completa los datos solicitados:\n   - Nombre del tambo.\n   - Ubicación.\n   - Turnos.\n   - Bajadas.\n   - Y demás datos requeridos por el sistema.\n4. Guarda la información para crear el tambo.\n\n**Importante**\n\nUna vez creado el tambo, deberás comunicarte con el equipo de soporte para que configure los campos Host y Link, necesarios para el correcto funcionamiento de algunas integraciones.',
        suggestedActions: [
          { label: 'Contactar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0f3. Tambos - Ficha del tambo
    if (intentResult.intent === 'ficha_tambo') {
      return res.status(200).json(resJson({
        intent: 'ficha_tambo',
        responseText: '### Datos de la ficha del tambo\n\nLa ficha del tambo contiene la información principal utilizada por Farmerin para su configuración y funcionamiento.\n\nEntre los datos que pueden visualizarse se encuentran:\n\n- Nombre del tambo.\n- Ubicación.\n- Cantidad de turnos.\n- Bajadas configuradas.\n- Información de identificación.\n- Configuraciones generales del establecimiento.\n- Datos de conexión e integración (según permisos).\n\nAlgunos campos pueden ser editables y otros estarán restringidos según el nivel de acceso del usuario.',
        suggestedActions: [
          { label: 'Contactar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0g. Tambos - Link del tambo
    if (intentResult.intent === 'link_tambo') {
      return res.status(200).json(resJson({
        intent: 'link_tambo',
        responseText: 'Los campos **Host** y **Link** no pueden ser modificados por los usuarios. Cualquier cambio en estos datos o su configuración inicial deberá ser solicitado al equipo de soporte.',
        suggestedActions: [
          { label: 'Contactar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0h. Animales - Alta animal
    if (intentResult.intent === 'alta_animal') {
      return res.status(200).json(resJson({
        intent: 'alta_animal',
        responseText: '### Dar de alta un animal\n\nPara registrar un nuevo animal:\n\n1. Presiona el botón Nuevo Animal.\n2. Completa los datos solicitados en el formulario.\n3. Verifica que la información ingresada sea correcta.\n4. Guarda los cambios para registrar el animal en el sistema.\n\n**Recomendaciones**\n\n- Verifica que el RP y el ERP estén correctamente ingresados.\n- Comprueba que no existan errores de carga antes de guardar.\n- Revisa que el animal se haya registrado correctamente una vez finalizado el proceso.',
        suggestedActions: [
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0i. Animales - Editar animal
    if (intentResult.intent === 'editar_animal') {
      return res.status(200).json(resJson({
        intent: 'editar_animal',
        responseText: '### Editar un animal\n\nPara modificar los datos de un animal:\n\n1. Busca el animal en el listado.\n2. Presiona el botón de edición.\n3. Realiza los cambios necesarios.\n4. Guarda la información para actualizar los datos.\n\n**Recomendaciones**\n\n- Verifica cuidadosamente los cambios antes de guardar.\n- Asegúrate de no modificar accidentalmente el RP o ERP si no es necesario.',
        suggestedActions: [
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0j. Animales - Baja animal
    if (intentResult.intent === 'baja_animal') {
      return res.status(200).json(resJson({
        intent: 'baja_animal',
        responseText: '### Dar de baja un animal\n\nPara dar de baja un animal:\n\n1. Busca el animal en el listado.\n2. Presiona el ícono del tacho de basura.\n3. El sistema mostrará la información del animal seleccionado.\n4. Selecciona el motivo de baja correspondiente.\n5. Presiona el botón Confirmar Baja.\n6. El sistema registrará la baja del animal.\n\n**Importante**\n\nAntes de confirmar la baja, verifica que el animal seleccionado sea el correcto.',
        offerSupport: true,
        suggestedActions: [
          { label: 'Hablar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0k. Animales - Animal no aparece en listado
    if (intentResult.intent === 'animal_no_aparece') {
      return res.status(200).json(resJson({
        intent: 'animal_no_aparece',
        responseText: '### ¿Por qué no encuentro mi animal?\n\nSi no encuentras un animal en el listado, pueden existir varias causas:\n\n- Puede haberse ingresado un espacio al inicio o al final del RP o ERP durante la búsqueda.\n- Es posible que al momento de cargar el animal se haya ingresado incorrectamente el RP o ERP.\n- Si estás buscando por ERP, intenta buscar por RP.\n- Si estás buscando por RP, intenta buscar por ERP.\n- Es posible que el animal aún no haya sido dado de alta en el sistema.\n- Las mayúsculas y minúsculas no afectan la búsqueda, ya que Farmerin no discrimina entre ellas.\n\n**¿Qué puedo hacer?**\n\n- Verifica nuevamente el RP o ERP.\n- Prueba realizar la búsqueda utilizando el otro identificador.\n- Confirma que el animal haya sido dado de alta.\n\n**Consultas relacionadas**\n\nTambién puedes consultar:\n- ¿Cómo edito un animal?\n- ¿Cómo doy de alta un animal?',
        offerSupport: true,
        suggestedActions: [
          { label: 'Cómo edito un animal', type: 'query', text: '¿Cómo edito un animal?' },
          { label: 'Cómo doy de alta un animal', type: 'query', text: '¿Cómo doy de alta un animal?' },
          { label: 'Hablar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0l1. Parámetros - 1. ¿Qué es Parámetros?
    if (intentResult.intent === 'que_es_parametros') {
      return res.status(200).json(resJson({
        intent: 'que_es_parametros',
        responseText: 'Parámetros es la sección donde configuramos y creamos los **grupos de alimentación de nuestros animales**.\n\nComo configuración estándar, vamos a encontrar el **Grupo 0**.\n\nTambién vamos a tener la posibilidad de realizar un **aumento o una reducción de la ración** que se está suministrando a los animales.',
        suggestedActions: [
          { label: '¿Cómo creo un grupo?', type: 'query', text: '¿Cómo creo un grupo?' },
          { label: '¿Para qué sirven los botones de aumento y reducción?', type: 'query', text: '¿Para qué sirven los botones de aumento y reducción?' },
          { label: '¿Qué es el promedio global?', type: 'query', text: '¿Qué es el promedio global?' },
          { label: '¿De qué forma se ejecutan los valores que asigno?', type: 'query', text: '¿De qué forma se ejecutan los valores que asigno?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0l2. Parámetros - 2. ¿Cómo creo un grupo?
    if (intentResult.intent === 'como_creo_un_grupo') {
      return res.status(200).json(resJson({
        intent: 'como_creo_un_grupo',
        responseText: 'Para crear un grupo debemos dirigirnos al botón **Nuevo grupo**.\n\nAl presionarlo, se desplegará un formulario donde podremos crear y configurar los **parámetros o criterios de alimentación** para nuestras vacas y vaquillonas.\n\nDentro del formulario, presionando el botón **Nueva**, ubicado en el lado derecho del título, podremos comenzar a crear un nuevo criterio de alimentación.\n\nUna vez seleccionado, se mostrará un formulario donde podremos parametrizar la alimentación según:\n\n* **Días de lactancia.**\n* **Litros producidos.**\n* Un **rango de días**.\n* Un **rango de litros**.\n* Una cantidad **menor o mayor** a determinada cantidad de días o litros.\n* Los **kg de ración** que recibirán los animales que ingresen dentro de ese criterio.\n\nDe esta manera, podemos establecer diferentes criterios para determinar qué cantidad de ración corresponde a cada rodeo u orden de alimentación.\n\nPor ejemplo, podemos establecer un criterio para animales que tengan determinada cantidad de días de lactancia y determinada producción de litros, y asignarles los kg de ración correspondientes.',
        suggestedActions: [
          { label: '¿Qué es Parámetros?', type: 'query', text: '¿Qué es Parámetros?' },
          { label: '¿Para qué sirven los botones de aumento y reducción?', type: 'query', text: '¿Para qué sirven los botones de aumento y reducción?' },
          { label: '¿Qué es el promedio global?', type: 'query', text: '¿Qué es el promedio global?' },
          { label: '¿De qué forma se ejecutan los valores que asigno?', type: 'query', text: '¿De qué forma se ejecutan los valores que asigno?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0l3. Parámetros - 3. ¿Para qué sirven los botones de aumento y reducción?
    if (intentResult.intent === 'aumento_reduccion_racion') {
      return res.status(200).json(resJson({
        intent: 'aumento_reduccion_racion',
        responseText: 'Los botones de **aumento** y **reducción** sirven para modificar proporcionalmente la ración que se está dosificando a los animales.\n\n### Aumento\n\nEl aumento de ración puede aplicarse desde un **10 % hasta un 100 %**.\n\n### Reducción\n\nLa reducción de ración puede aplicarse desde un **10 % hasta un 50 %**.\n\nUna vez seleccionada la opción y el porcentaje correspondiente, debemos presionar el botón **Aplicar**.\n\nDespués de aplicar el cambio, el sistema notificará que el **aumento o reducción de ración fue aplicado**.\n\n### ¿Cómo quitar el aumento o reducción?\n\nPara eliminar el aumento o reducción aplicado, debemos presionar el botón **Restablecer**.\n\n### ¿Cuándo puedo utilizar estas opciones?\n\nEstas opciones pueden utilizarse cuando exista algún problema con el suministro de la ración o cuando, por algún motivo, sea necesario modificar proporcionalmente la cantidad de ración que se está suministrando a los animales.',
        suggestedActions: [
          { label: '¿Qué es Parámetros?', type: 'query', text: '¿Qué es Parámetros?' },
          { label: '¿Cómo creo un grupo?', type: 'query', text: '¿Cómo creo un grupo?' },
          { label: '¿Qué es el promedio global?', type: 'query', text: '¿Qué es el promedio global?' },
          { label: '¿De qué forma se ejecutan los valores que asigno?', type: 'query', text: '¿De qué forma se ejecutan los valores que asigno?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0l4. Parámetros - 4. ¿Qué es el promedio global?
    if (intentResult.intent === 'promedio_global') {
      return res.status(200).json(resJson({
        intent: 'promedio_global',
        responseText: 'El **promedio global** permite obtener un promedio tomando como referencia los valores de los diferentes grupos de alimentación.\n\nSi tenemos **más de 2 grupos**, podemos obtener un promedio global de los mismos a partir de los valores configurados.\n\nDe todas formas, cada grupo cuenta con su propio promedio.\n\nTambién podemos consultar el **promedio de ración** desde el apartado **Control**.',
        suggestedActions: [
          { label: '¿Qué es Parámetros?', type: 'query', text: '¿Qué es Parámetros?' },
          { label: '¿Cómo creo un grupo?', type: 'query', text: '¿Cómo creo un grupo?' },
          { label: '¿Para qué sirven los botones de aumento y reducción?', type: 'query', text: '¿Para qué sirven los botones de aumento y reducción?' },
          { label: '¿De qué forma se ejecutan los valores que asigno?', type: 'query', text: '¿De qué forma se ejecutan los valores que asigno?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0l5. Parámetros - 5. ¿De qué forma se ejecutan los valores que asigno?
    if (intentResult.intent === 'ejecucion_valores_nocturno') {
      return res.status(200).json(resJson({
        intent: 'ejecucion_valores_nocturno',
        responseText: 'Farmerin ejecuta estos parámetros **todas las noches**.\n\nDurante este proceso, el sistema realiza un control del rodeo y revisa los animales del tambo para determinar a qué criterio de alimentación corresponde cada uno.\n\nSegún los parámetros configurados, Farmerin ajusta la ración correspondiente a cada animal.\n\nDe esta manera, el sistema permite llevar un control de las raciones y lograr que cada animal reciba la cantidad correspondiente según el parámetro de alimentación que le fue asignado.\n\nEl objetivo es que las raciones queden actualizadas y los animales estén preparados para el **turno del tambo del día siguiente**.',
        suggestedActions: [
          { label: '¿Qué es Parámetros?', type: 'query', text: '¿Qué es Parámetros?' },
          { label: '¿Cómo creo un grupo?', type: 'query', text: '¿Cómo creo un grupo?' },
          { label: '¿Para qué sirven los botones de aumento y reducción?', type: 'query', text: '¿Para qué sirven los botones de aumento y reducción?' },
          { label: '¿Qué es el promedio global?', type: 'query', text: '¿Qué es el promedio global?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0m. Control Lechero intents
    if (intentResult.intent === 'cargar_control_que_es') {
      return res.status(200).json(resJson({
        intent: 'cargar_control_que_es',
        responseText: '### ¿Qué es Cargar Control Lechero?\nEsta sección te permite cargar la producción mensual de tus animales de una manera rápida y sencilla. Sirve para actualizar la información productiva que utiliza Farmerin para el seguimiento del rodeo.\n\n*Aclaración: Solo se cargan controles lecheros realizados con Farmerin; si tenés planillas de Dirsa, debés cargarlas en la sección Dirsa.*',
        suggestedActions: [
          { label: '¿Cómo realizo una carga?', type: 'query', text: '¿Cómo realizo una carga paso a paso?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'cargar_control_pasos') {
      return res.status(200).json(resJson({
        intent: 'cargar_control_pasos',
        responseText: '### Pasos para realizar una carga:\n1. **Descargar la planilla:** Podés descargar una planilla vacía o un modelo de ejemplo.\n2. **Completar la planilla:** Ingresá el ERP o RP, los litros producidos en el mes y (opcionalmente) anomalías.\n3. **Seleccionar fecha:** Cambiá o confirmá la fecha del control.\n4. **Subir el archivo:** Arrastrá o seleccioná tu Excel.\n5. **Ejecutar:** Presioná "Cargar control lechero".\n6. **Revisar resultados:** El sistema te indicará qué registros se actualizaron correctamente y cuáles tuvieron errores para que puedas corregirlos.',
        suggestedActions: [
          { label: '¿Qué datos debo completar?', type: 'query', text: '¿Qué datos tengo que completar en la planilla?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'cargar_control_datos') {
      return res.status(200).json(resJson({
        intent: 'cargar_control_datos',
        responseText: '### Datos a completar en la planilla:\n- **Identificación del animal:** El ERP (botón electrónico) o el RP de cada animal.\n- **Litros producidos:** Los litros producidos por el animal. Si usás coma (ej. 12,5), el sistema lo pasará a punto automáticamente.\n- **Anomalía:** En caso de que corresponda, podés indicarla (opcional).',
        suggestedActions: [
          { label: '¿Qué hago si hay un error?', type: 'query', text: '¿Qué hago si un animal da error?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'cargar_control_error') {
      return res.status(200).json(resJson({
        intent: 'cargar_control_error',
        responseText: '### ¿Qué hacer ante un error en la carga?\nEl sistema te mostrará qué animales tuvieron error indicando la fila y el eRP/RP con problemas.\nDeberás corregir ese registro directamente en tu planilla Excel, asegurándote de que los litros sean numéricos y el ERP/RP sea válido.\nLuego, podés subir la planilla de nuevo.',
        suggestedActions: [
          { label: 'Hablar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_control_que_es') {
      return res.status(200).json(resJson({
        intent: 'reporte_control_que_es',
        responseText: '### Reporte de Control Lechero\nEs una sección diseñada para consultar toda la información de los controles lecheros que cargaste previamente en el sistema.\nSirve para llevar un registro ordenado de la producción de tus vacas, viendo su evolución y los litros producidos mes a mes.\n*(Nota: No incluye datos de Dirsa, solo controles hechos con Farmerin).*',
        suggestedActions: [
          { label: '¿Cómo consulto un mes?', type: 'query', text: '¿Cómo consulto un mes?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_control_consultar') {
      return res.status(200).json(resJson({
        intent: 'reporte_control_consultar',
        responseText: '### ¿Cómo consultar un mes?\n1. Asegurate de tener un Tambo seleccionado.\n2. Seleccioná el **mes** y el **año** que querés consultar.\n3. Presioná el botón de búsqueda.\nEl sistema te mostrará la lista de animales con los litros registrados ese mes. Si un animal no tuvo control en ese mes, no aparecerá.',
        suggestedActions: [
          { label: '¿Qué es "Ver curva"?', type: 'query', text: '¿Qué es "Ver curva"?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_control_curva') {
      return res.status(200).json(resJson({
        intent: 'reporte_control_curva',
        responseText: '### Ver curva (Gráfico individual)\nEl botón **Ver curva** está disponible en cada fila del listado.\nAl presionarlo, se abre un gráfico que te muestra de forma visual cómo fue variando la producción de leche de *ese animal en particular* a lo largo de los distintos controles.\nEs muy útil para ver si su producción sube, baja o se mantiene estable.',
        suggestedActions: [
          { label: '¿Qué es "Ver gráfico"?', type: 'query', text: '¿Qué es "Ver gráfico"?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_control_grafico') {
      return res.status(200).json(resJson({
        intent: 'reporte_control_grafico',
        responseText: '### Ver gráfico (Promedio anual del tambo)\nEl botón general **Ver gráfico** te muestra un gráfico anual de todo el tambo.\nCalcula y muestra el promedio de producción mensual (usando solo los meses donde cargaste controles).\nSirve para tener una visión global y rápida de cómo evolucionó la producción general del rodeo durante el año.',
        suggestedActions: [
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // 0n. Reportes / Gral Animales
    if (intentResult.intent === 'gral_animales_info') {
      return res.status(200).json(resJson({
        intent: 'gral_animales_info',
        responseText: '### Información general del listado\nEn el listado general de animales podés consultar mucha información útil, como:\n\n- RP y ERP (identificadores)\n- Grupo, Categoría y Rodeo\n- Estados (Reproductivo y Productivo)\n- Lactancias (número y días)\n- Ración asignada\n- Eventos (servicios, parto, etc.)\n- Último control y anomalías.',
        suggestedActions: [
          { label: '¿Cómo entro a la ficha de un animal?', type: 'query', text: '¿Cómo entro a la ficha de un animal?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'gral_animales_busqueda') {
      return res.status(200).json(resJson({
        intent: 'gral_animales_busqueda',
        responseText: '### Búsqueda y filtros\nPara buscar una vaca en particular:\n1. Usá el **buscador** de arriba para ingresar el número de RP o ERP.\n2. Podés usar los **filtros** para achicar la lista por: Estado productivo, Estado reproductivo, Categoría, Rodeo o Grupo.\n3. Asegurate de tener seleccionado el Tambo correcto arriba a la izquierda.\n\nTambién podés **ordenar** la lista haciendo clic en el encabezado de cualquier columna.',
        suggestedActions: [
          { label: 'No veo ningún animal en el listado', type: 'query', text: 'No veo ningún animal en el listado' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'gral_animales_ficha') {
      return res.status(200).json(resJson({
        intent: 'gral_animales_ficha',
        responseText: '### Ficha del animal\nEn el listado, el número de **RP** de cada animal es interactivo (color azul).\nAl hacer clic sobre él, se abrirá un panel con la ficha individual detallada de ese animal. Ahí podrás ver su información organizada en pestañas y consultar su historial completo de eventos y crías asociadas.',
        suggestedActions: [
          { label: '¿Qué información puedo consultar?', type: 'query', text: '¿Qué información puedo consultar de un animal?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── PRODUCCIÓN INTENTS ──────────────────────────────────────────────────────
    if (intentResult.intent === 'produccion_que_es') {
      return res.status(200).json(resJson({
        intent: 'produccion_que_es',
        responseText: '### ¿Qué es la sección Producción?\n\nEs una herramienta de análisis y seguimiento que forma parte del apartado de **Reportes** de Farmerin.\n\nServís para visualizar, analizar y hacer un seguimiento detallado de todos los datos productivos que el tambero registra diariamente desde la aplicación móvil.\n\nSu objetivo es ofrecer información actualizada para:\n- Analizar la curva de producción del tambo.\n- Comparar jornadas productivas.\n- Identificar tendencias y tomar decisiones de manejo.\n\n**Importante**: La información de esta sección se alimenta exclusivamente de lo que se carga desde la app móvil de Farmerin. Si no se cargó nada desde el celular, la sección no tendrá datos para mostrar.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra la sección Producción?' },
          { label: '¿Cómo consulto la producción?', type: 'query', text: '¿Cómo consulto la información de producción?' },
          { label: '¿Cómo exporto a Excel?', type: 'query', text: '¿Cómo exporto los datos de producción a Excel?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'produccion_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'produccion_que_muestra',
        responseText: '### ¿Qué información muestra la sección Producción?\n\n**Indicadores por día:**\n- 🌅 **Turno Mañana (prodM)** y **Turno Tarde (prodT)**: Litros producidos en cada ordeñe.\n- 📦 **Producción Total**: Suma de litros del día.\n- 🗑️ **Descarte Mañana/Tarde y Total**: Litros de leche descartados.\n- 🍼 **Guachera Mañana/Tarde y Total**: Litros destinados a la alimentación de terneros.\n- 🚚 **Entregado**: Litros de leche entregados.\n- 🐄 **Vacas en Ordeñe**: Cantidad de animales que produjeron ese día.\n- 📊 **Promedio Individual**: Producción total ÷ vacas en ordeñe.\n- 🌡️ **Temperatura Máxima** y **Estado del Clima**.\n\n**Totales del período seleccionado** (producción, descarte, guachera y entregado acumulados).\n\n**Gráfico interactivo** "Producción Total y Vacas en Ordeñe" con tooltip de datos al pasar el cursor.',
        suggestedActions: [
          { label: '¿Cómo consulto la producción?', type: 'query', text: '¿Cómo consulto la información de producción?' },
          { label: '¿Cómo exporto a Excel?', type: 'query', text: '¿Cómo exporto los datos de producción a Excel?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'produccion_como_consultar') {
      return res.status(200).json(resJson({
        intent: 'produccion_como_consultar',
        responseText: '### ¿Cómo consulto la información de Producción?\n\n1. **Seleccioná el tambo** usando el selector en la parte superior de la pantalla.\n2. **Elegí el período de fechas** que querés ver:\n   - Hoy\n   - Mes actual\n   - Mes anterior\n   - Rango de fechas personalizado (desde/hasta)\n3. **Presioná el botón de búsqueda** para actualizar los datos en pantalla.\n4. Podés **activar o desactivar el gráfico** de producción diaria según lo necesites.\n\n**Importante**: Si no seleccionaste un tambo, la pantalla no mostrará datos.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra la sección Producción?' },
          { label: '¿Cómo exporto a Excel?', type: 'query', text: '¿Cómo exporto los datos de producción a Excel?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'produccion_exportar') {
      return res.status(200).json(resJson({
        intent: 'produccion_exportar',
        responseText: '### ¿Cómo exporto los datos de Producción a Excel?\n\nPodés descargar toda la información consultada haciendo clic en el **botón de exportación** que aparece en la pantalla.\n\nEl archivo se genera automáticamente con los datos del período y tambo que tengas seleccionados en ese momento.\n\n**Importante**: Si intentás exportar sin haber seleccionado un tambo, el sistema te mostrará una alerta indicando que no es posible generar el archivo.',
        suggestedActions: [
          { label: '¿Cómo consulto la producción?', type: 'query', text: '¿Cómo consulto la información de producción?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'produccion_grafico') {
      return res.status(200).json(resJson({
        intent: 'produccion_grafico',
        responseText: '### Gráfico de Producción Diaria\n\nEl gráfico se llama **"Producción Total y Vacas en Ordeñe"** y muestra de forma visual la evolución productiva a lo largo del tiempo.\n\n- Combina en una misma vista la **producción diaria**, las **vacas en ordeñe** y la **temperatura máxima**.\n- Al pasar el cursor sobre los puntos del gráfico, aparece un **tooltip** con los datos exactos de esa fecha.\n- El eje de fechas se adapta automáticamente: si es un solo año muestra día/mes; si abarca varios años, muestra el año completo.\n- Si no hay registros cargados para el período seleccionado, el gráfico muestra el mensaje **"No hay datos para mostrar."**\n\nPodés activar o desactivar su visualización desde la pantalla.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra la sección Producción?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── PARTE DIARIO INTENTS ────────────────────────────────────────────────────
    if (intentResult.intent === 'parte_diario_que_es') {
      return res.status(200).json(resJson({
        intent: 'parte_diario_que_es',
        responseText: '### ¿Qué es el Parte Diario?\n\nEl **Parte Diario** es una sección de Farmerin diseñada para visualizar, consultar y realizar un seguimiento de todos los **eventos registrados en el tambo**.\n\nServís para identificar y analizar rápidamente los movimientos y novedades de los animales en períodos de tiempo específicos.\n\nSe encuentra dentro de la sección general de **Reportes** de la plataforma.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra el Parte Diario?' },
          { label: '¿Cómo consulto los eventos?', type: 'query', text: '¿Cómo consulto los eventos del Parte Diario?' },
          { label: '¿Cómo exporto a Excel?', type: 'query', text: '¿Cómo exporto el Parte Diario a Excel?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'parte_diario_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'parte_diario_que_muestra',
        responseText: '### ¿Qué información muestra el Parte Diario?\n\nCada registro del listado incluye:\n\n- 📅 **Fecha del evento**: El día en que ocurrió.\n- 🐄 **Datos del animal**: Identificación del animal (RP o ERP).\n- 📋 **Tipo de evento**: El tipo de novedad registrada. Por ejemplo:\n  - Alta, Baja, Parto, Celo, Tacto, Servicio, Secado, Aborto, Tratamiento.\n- 📝 **Detalle**: Descripción o especificaciones del evento cargado.\n- 👁️ **Estado de lectura**: Indicador visual de si el evento ya fue marcado como visto.\n- 🍼 **Información de crías**: En eventos de parto, se pueden ver datos de la cría (RP, sexo, peso, tratamiento, foto y observaciones).',
        suggestedActions: [
          { label: '¿Cómo consulto los eventos?', type: 'query', text: '¿Cómo consulto los eventos del Parte Diario?' },
          { label: '¿Cómo exporto a Excel?', type: 'query', text: '¿Cómo exporto el Parte Diario a Excel?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'parte_diario_como_consultar') {
      return res.status(200).json(resJson({
        intent: 'parte_diario_como_consultar',
        responseText: '### ¿Cómo consulto los eventos del Parte Diario?\n\nPodés realizar las siguientes acciones para buscar y filtrar los eventos:\n\n1. **Seleccioná un período**: Definí un rango de fechas personalizado (desde/hasta) o elegí períodos determinados.\n2. **Filtrá por tipo de evento**: Limitá la búsqueda a un tipo en particular (Alta, Baja, Parto, etc.).\n3. **Filtrá por estado de visto**: Filtrá según si los eventos ya fueron leídos o no.\n4. **Ordená la lista**: Podés ordenar los resultados por RP del animal, fecha o tipo de evento.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra el Parte Diario?' },
          { label: '¿Cómo exporto a Excel?', type: 'query', text: '¿Cómo exporto el Parte Diario a Excel?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'parte_diario_exportar') {
      return res.status(200).json(resJson({
        intent: 'parte_diario_exportar',
        responseText: '### ¿Cómo exporto el Parte Diario a Excel?\n\nPodés exportar los eventos con un solo clic usando el **botón de exportación** disponible en la pantalla.\n\nEl archivo se genera automáticamente con un **nombre dinámico** según el período y los filtros que hayas seleccionado en ese momento.',
        suggestedActions: [
          { label: '¿Cómo consulto los eventos?', type: 'query', text: '¿Cómo consulto los eventos del Parte Diario?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'parte_diario_marcar_visto') {
      return res.status(200).json(resJson({
        intent: 'parte_diario_marcar_visto',
        responseText: '### Marcar un evento como visto\n\nEn el listado de eventos del Parte Diario, podés **marcar un evento como visto** para registrar que ya lo revisaste.\n\nEsto actualiza el **estado de lectura** del evento, visible en el indicador visual de cada fila.\n\nTambién podés filtrar los eventos según si ya fueron marcados como vistos o no, usando el filtro de **estado de visto**.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra el Parte Diario?' },
          { label: '¿Cómo consulto los eventos?', type: 'query', text: '¿Cómo consulto los eventos del Parte Diario?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }
    // ───────────────────────────────────────────────────────────────────────────

    // ── RECEPCIONES INTENTS ──────────────────────────────────────────────────────
    if (intentResult.intent === 'recepciones_que_es') {
      return res.status(200).json(resJson({
        intent: 'recepciones_que_es',
        responseText: '### ¿Qué es Recepciones y para qué sirve?\n\nLa sección Recepciones sirve para consultar todas las recepciones registradas en el tambo. Te permite visualizar la foto del remito, cambiar el estado de las recepciones y descargar la información cuando sea necesario.',
        suggestedActions: [
          { label: '¿Cómo acceder?', type: 'query', text: '¿Cómo acceder a Recepciones?' },
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra Recepciones?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'recepciones_como_acceder') {
      return res.status(200).json(resJson({
        intent: 'recepciones_como_acceder',
        responseText: '### ¿Cómo acceder?\n\nEsta sección se encuentra dentro del menú **Reportes** en la plataforma web de Farmerin.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra Recepciones?' },
          { label: '¿Cómo consulto la información?', type: 'query', text: '¿Cómo consulto la información de Recepciones?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'recepciones_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'recepciones_que_muestra',
        responseText: '### ¿Qué información muestra?\n\nDe cada recepción registrada, el sistema muestra la siguiente información confirmada:\n- ID de la recepción\n- Fecha de recepción\n- Fecha del remito\n- Tipo de recepción\n- Remito (número/código)\n- Observación\n- Usuario que registró la recepción\n- Foto del remito\n- Estado (visto o pendiente)\n- Eventos asociados',
        suggestedActions: [
          { label: '¿Cómo consulto la información?', type: 'query', text: '¿Cómo consulto la información de Recepciones?' },
          { label: '¿Qué acciones puedo realizar?', type: 'query', text: '¿Qué acciones puedo realizar en Recepciones?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'recepciones_como_consultar') {
      return res.status(200).json(resJson({
        intent: 'recepciones_como_consultar',
        responseText: '### ¿Cómo consultar la información?\n\nPara buscar y consultar las recepciones, podés usar los siguientes filtros y opciones:\n- **Rango de fechas o período**: Podés ingresar una fecha de inicio y una fecha de fin.\n- **Accesos rápidos de fechas**: Accesos directos para filtrar por "mes anterior", "mes actual" y "hoy".\n- **Filtro por estado**: Permite buscar recepciones según estén "pendientes" o "vistas".\n- **Filtro por tipo**: Permite filtrar según el tipo de recepción.',
        suggestedActions: [
          { label: '¿Qué acciones puedo realizar?', type: 'query', text: '¿Qué acciones puedo realizar en Recepciones?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'recepciones_acciones') {
      return res.status(200).json(resJson({
        intent: 'recepciones_acciones',
        responseText: '### ¿Qué acciones puede realizar el usuario?\n\nDentro de esta sección, podés realizar las siguientes acciones:\n- Consultar el listado histórico de las recepciones registradas.\n- Filtrar y buscar registros usando fechas, estados y tipos de recepción.\n- Ver el detalle de una recepción seleccionada.\n- Visualizar la foto del remito adjunta.\n- Cambiar el estado de una recepción (por ejemplo, marcarla como vista).\n- Descargar / Exportar la información a un archivo Excel.',
        suggestedActions: [
          { label: '¿Qué es Recepciones?', type: 'query', text: '¿Qué es Recepciones?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── GESTIÓN DE REMITOS INTENTS ──────────────────────────────────────────────
    if (intentResult.intent === 'gestion_remitos_que_es') {
      return res.status(200).json(resJson({
        intent: 'gestion_remitos_que_es',
        responseText: '### ¿Qué es Gestión de Remitos y para qué sirve?\n\nLa Gestión de Remitos es una sección de Farmerin que te permite consultar todos los remitos de ración cargados en el sistema.\nSirve para llevar un mejor control del consumo y los gastos de alimento del tambo. En este apartado podés visualizar la imagen del remito junto con la información que se obtiene automáticamente mediante la tecnología OCR (como observaciones, cantidad de ración recibida y fecha de emisión), lo que facilita su consulta y análisis.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra Gestión de Remitos?' },
          { label: '¿Cómo consulto la información?', type: 'query', text: '¿Cómo consulto la información de Gestión de Remitos?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'gestion_remitos_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'gestion_remitos_que_muestra',
        responseText: '### ¿Qué información muestra?\n\nLa sección muestra la siguiente información confirmada:\n- La imagen del remito.\n- Los datos obtenidos automáticamente mediante la tecnología OCR:\n  - La observación de la ración.\n  - La cantidad de ración recibida.\n  - La fecha de emisión del remito.',
        suggestedActions: [
          { label: '¿Cómo consulto la información?', type: 'query', text: '¿Cómo consulto la información de Gestión de Remitos?' },
          { label: '¿Qué acciones puedo realizar?', type: 'query', text: '¿Qué acciones puedo realizar en Gestión de Remitos?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'gestion_remitos_como_consultar') {
      return res.status(200).json(resJson({
        intent: 'gestion_remitos_como_consultar',
        responseText: '### ¿Cómo consultar la información?\n\nPara buscar y consultar la información, podés utilizar las siguientes opciones de búsqueda y filtrado por fechas confirmadas:\n- El botón "mes en curso".\n- El botón "mes anterior".\n- La opción de "rango" (donde podés seleccionar un período de fechas específico).',
        suggestedActions: [
          { label: '¿Qué acciones puedo realizar?', type: 'query', text: '¿Qué acciones puedo realizar en Gestión de Remitos?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'gestion_remitos_acciones') {
      return res.status(200).json(resJson({
        intent: 'gestion_remitos_acciones',
        responseText: '### ¿Qué acciones puede realizar el usuario?\n\nEl usuario puede realizar las siguientes acciones confirmadas:\n- Consultar todos los remitos de tipo ración cargados.\n- Visualizar la imagen del remito junto con los datos del OCR.\n- Buscar y filtrar la información utilizando los botones "mes en curso", "mes anterior" o seleccionando un rango de fechas específico.',
        suggestedActions: [
          { label: '¿Qué es Gestión de Remitos?', type: 'query', text: '¿Qué es Gestión de Remitos?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }
    // ───────────────────────────────────────────────────────────────────────────

    // ── HERRAMIENTAS: MONITOR DE INGRESO INTENTS ───────────────────────────────
    if (intentResult.intent === 'monitor_ingreso_que_es') {
      return res.status(200).json(resJson({
        intent: 'monitor_ingreso_que_es',
        responseText: '### ¿Qué es Monitor de Ingreso y para qué sirve?\n\nEs un apartado que sirve para llevar un control en tiempo real de los animales que van ingresando al tambo, tanto del lado izquierdo como del derecho.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra el Monitor de Ingreso?' },
          { label: '¿Qué significa N/A?', type: 'query', text: '¿Qué significa que un animal aparezca como N/A?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'monitor_ingreso_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'monitor_ingreso_que_muestra',
        responseText: '### ¿Qué información muestra?\n\nMuestra el orden de entrada de los animales (lado izquierdo y derecho), el RP (Caravana), el eRP o P (Botón electrónico) de cada uno, y si la tanda está completa o excedida.',
        suggestedActions: [
          { label: '¿Qué significa tanda completa o excedida?', type: 'query', text: '¿Qué significa que la tanda esté completa o excedida?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'monitor_ingreso_na') {
      return res.status(200).json(resJson({
        intent: 'monitor_ingreso_na',
        responseText: '### ¿Qué significa que un animal aparezca como N/A?\n\nSignifica que el animal está seco o no está registrado en el sistema.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra el Monitor de Ingreso?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'monitor_ingreso_tanda') {
      return res.status(200).json(resJson({
        intent: 'monitor_ingreso_tanda',
        responseText: '### ¿Qué significa que la tanda esté completa o excedida?\n\nEl monitor indica mediante un aviso o advertencia cuándo la tanda de animales en el tambo está completa. Esto ocurre cuando se ha leído la misma cantidad de animales que de tolvas configuradas en el tambo. Si se supera esa cantidad, el sistema mostrará el aviso “Límite excedido”.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra el Monitor de Ingreso?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'monitor_ingreso_orden') {
      return res.status(200).json(resJson({
        intent: 'monitor_ingreso_orden',
        responseText: '### ¿Se puede consultar el orden de ingreso de los animales?\n\nSí, el monitor muestra el orden en que los animales van entrando al tambo, tanto del lado izquierdo como del derecho.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra el Monitor de Ingreso?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── HERRAMIENTAS: CONTROL DE INGRESO INTENTS ───────────────────────────────
    if (intentResult.intent === 'control_ingreso_que_es') {
      return res.status(200).json(resJson({
        intent: 'control_ingreso_que_es',
        responseText: '### ¿Qué es Control de Ingreso y para qué sirve?\n\nEs una herramienta de Farmerin que te permite monitorear en tiempo real el ingreso de los animales al tambo. Sirve para visualizar de manera gráfica el estado de lectura de las caravanas y botones electrónicos para saber qué tan bien se están haciendo las lecturas durante cada turno de ordeñe.',
        suggestedActions: [
          { label: '¿Qué significa cada categoría?', type: 'query', text: '¿Qué significa cada categoría: Se Leyó, No Se Leyó, Ausentes...?' },
          { label: '¿Qué significa el porcentaje de eficacia?', type: 'query', text: '¿Qué significa el porcentaje de eficacia?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'control_ingreso_categorias') {
      return res.status(200).json(resJson({
        intent: 'control_ingreso_categorias',
        responseText: '### ¿Qué significa cada categoría: Se Leyó, No Se Leyó, Ausentes, Nunca Se Leyó/Nunca Pasó y Secas/NaN?\n\n- **Se Leyó (Verde)**: Animales en estado "En Ordeñe" que ingresaron al tambo y fueron leídos correctamente por el sistema.\n- **No Se Leyó (Rojo)**: Animales en estado "En Ordeñe" que no fueron leídos en el turno de ordeñe. Puede pasar si el sistema no capturó el botón electrónico, si el animal lo perdió o por algún problema de lectura.\n- **Ausentes (Azul)**: Animales en estado "En Ordeñe" que no pasaron por el tambo en 2 días o más.\n- **Nunca Se Leyó / Nunca Pasó (Naranja)**: Animales en estado "En Ordeñe" que nunca pasaron por el tambo.\n- **Secas/NaN (Negro)**: Animales leídos por el sistema que no están en condición de "En Ordeñe" (pueden ser animales secos o caravanas que todavía no se dieron de alta).',
        suggestedActions: [
          { label: '¿Qué información puedo ver de un animal?', type: 'query', text: '¿Qué información puedo ver de un animal?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'control_ingreso_eficacia') {
      return res.status(200).json(resJson({
        intent: 'control_ingreso_eficacia',
        responseText: '### ¿Qué significa el porcentaje de eficacia?\n\nEs un indicador porcentual que evalúa el rendimiento de las lecturas de caravanas realizadas sobre el total de animales registrados.',
        suggestedActions: [
          { label: '¿Qué significa cada categoría?', type: 'query', text: '¿Qué significa cada categoría: Se Leyó, No Se Leyó, Ausentes...?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'control_ingreso_info_animal') {
      return res.status(200).json(resJson({
        intent: 'control_ingreso_info_animal',
        responseText: '### ¿Qué información puedo ver de un animal?\n\nPodés ver su número de RP y su eRP (RFID formateado). Si corresponde, también podés ver los días que lleva ausente, o su estado productivo y reproductivo en la lista de Secas/NaN.',
        suggestedActions: [
          { label: '¿Qué significa cada categoría?', type: 'query', text: '¿Qué significa cada categoría: Se Leyó, No Se Leyó, Ausentes...?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── HERRAMIENTAS: CONTROL DE TURNOS INTENTS ────────────────────────────────
    if (intentResult.intent === 'control_turnos_que_es') {
      return res.status(200).json(resJson({
        intent: 'control_turnos_que_es',
        responseText: '### ¿Qué es Control de Turnos y para qué sirve?\n\nEs una sección de la plataforma que sirve para controlar los ingresos de los animales al tambo durante los turnos de la mañana y de la tarde. Te ayuda a hacer un seguimiento diario del rodeo y a supervisar de manera sencilla la actividad de cada jornada.',
        suggestedActions: [
          { label: '¿Cuándo se actualiza la información?', type: 'query', text: '¿Cuándo se actualiza la información de un turno?' },
          { label: '¿Qué es "Analizar Turno"?', type: 'query', text: '¿Qué es "Analizar Turno"?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'control_turnos_actualiza') {
      return res.status(200).json(resJson({
        intent: 'control_turnos_actualiza',
        responseText: '### ¿Cuándo se actualiza la información de un turno?\n\nLa información de cada turno se actualiza en el sistema recién una vez que ese turno está finalizado.',
        suggestedActions: [
          { label: '¿Qué es Control de Turnos?', type: 'query', text: '¿Qué es Control de Turnos y para qué sirve?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'control_turnos_analizar') {
      return res.status(200).json(resJson({
        intent: 'control_turnos_analizar',
        responseText: '### ¿Qué es "Analizar Turno"?\n\nEs una herramienta de control que sirve para detectar si existen registros duplicados o inconsistencias en los ingresos de los animales durante el día. Permite detectar si existen ERP duplicados (registrados más de una vez) dentro de un mismo turno, e identificar qué animales ingresaron únicamente en el turno de la mañana o únicamente en el de la tarde.',
        suggestedActions: [
          { label: '¿Puedo consultar los animales de cada turno?', type: 'query', text: '¿Puedo consultar los animales de cada turno?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'control_turnos_consultar') {
      return res.status(200).json(resJson({
        intent: 'control_turnos_consultar',
        responseText: '### ¿Puedo consultar los animales de cada turno?\n\nSí, en esta sección vas a poder visualizar qué animales ingresaron en cada turno. Muestra el RP, el ERP (botón electrónico) y la hora exacta de ingreso.',
        suggestedActions: [
          { label: '¿Qué es Control de Turnos?', type: 'query', text: '¿Qué es Control de Turnos y para qué sirve?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── CONFIGURACIÓN: ALTA MASIVA INTENTS ─────────────────────────────────────
    if (intentResult.intent === 'alta_masiva_que_es') {
      return res.status(200).json(resJson({
        intent: 'alta_masiva_que_es',
        responseText: '### ¿Qué es Alta Masiva y para qué sirve?\n\nLa herramienta Alta Masiva sirve para dar de alta una gran cantidad de animales de manera rápida dentro de Farmerin. Permite cargar un gran volumen de registros con toda su información a través de una sola importación. Su objetivo principal es agilizar el trabajo de carga de datos y garantizar la integridad, organización y consistencia de toda la información que se incorpora al sistema.',
        suggestedActions: [
          { label: '¿Cómo acceder?', type: 'query', text: '¿Cómo acceder a Alta Masiva?' },
          { label: '¿Cómo cargar animales?', type: 'query', text: '¿Cómo cargar animales y utilizar la sección?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'alta_masiva_acceso') {
      return res.status(200).json(resJson({
        intent: 'alta_masiva_acceso',
        responseText: '### ¿Cómo acceder?\n\nPara ingresar a esta sección, debés acceder desde la plataforma web de Farmerin y buscar la opción Alta Masiva que se encuentra dentro del menú de Configuración.',
        suggestedActions: [
          { label: '¿Qué planillas puedo descargar?', type: 'query', text: '¿Qué planillas puedo descargar?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'alta_masiva_uso') {
      return res.status(200).json(resJson({
        intent: 'alta_masiva_uso',
        responseText: '### ¿Cómo utilizar la sección?\n\n1. Entrá a la opción Alta Masiva dentro del menú de Configuración.\n2. Descargá la planilla modelo para revisar el formato adecuado o descargá la planilla vacía directamente.\n3. Completá la planilla de Excel con los datos de los animales que vas a incorporar al sistema.\n4. Cargá el archivo de Excel en la plataforma (podés seleccionar el archivo desde tu dispositivo o arrastrarlo y soltarlo directamente en la pantalla).\n5. Observá el resultado de la importación en tiempo real en la pantalla, donde el sistema te mostrará qué registros se procesaron con éxito y te señalará si existen errores para que puedas corregirlos fácilmente.',
        suggestedActions: [
          { label: '¿Qué planillas puedo descargar?', type: 'query', text: '¿Qué planillas puedo descargar?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'alta_masiva_planillas') {
      return res.status(200).json(resJson({
        intent: 'alta_masiva_planillas',
        responseText: '### Planillas de descarga\n\nEn la sección Alta Masiva vas a encontrar dos planillas:\n- **Planilla modelo**: Una planilla de ejemplo disponible para descargar, que sirve para conocer el formato correcto y ver cómo se debe completar la información antes de importarla.\n- **Planilla vacía**: Una planilla en blanco, lista para descargar y completar con los datos de los animales que quieras incorporar.\n\nRecordá que el formato de archivo permitido debe ser exclusivamente un archivo de Excel.',
        suggestedActions: [
          { label: '¿Cómo cargar animales?', type: 'query', text: '¿Cómo cargar animales y utilizar la sección?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── CONFIGURACIÓN: ACTUALIZACIÓN MASIVA INTENTS ────────────────────────────
    if (intentResult.intent === 'actualizacion_masiva_que_es') {
      return res.status(200).json(resJson({
        intent: 'actualizacion_masiva_que_es',
        responseText: '### ¿Qué es Actualización Masiva y para qué sirve?\n\nEs una herramienta de Farmerin que permite realizar la actualización de datos de una gran cantidad de animales de forma rápida y sencilla. Su objetivo es facilitar la edición en lote de la información ganadera sin necesidad de modificar cada animal uno por uno. Permite modificar la información general, el ERP (botón electrónico) y el grupo al que pertenecen los animales.',
        suggestedActions: [
          { label: '¿Cuáles son los pasos a seguir?', type: 'query', text: '¿Cuáles son los pasos para utilizar la sección?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'actualizacion_masiva_uso') {
      return res.status(200).json(resJson({
        intent: 'actualizacion_masiva_uso',
        responseText: '### ¿Cómo utilizar la sección?\n\n1. Ingresá al "Centro de Actualizaciones Masivas".\n2. Seleccioná el tambo sobre el cual vas a trabajar.\n3. Descargá la planilla modelo (para ver un ejemplo) o la planilla vacía (para utilizar como base limpia).\n4. Completá la planilla en tu computadora con los datos que querés modificar (grupo, RP, etc.).\n5. Cargá el archivo completado en la opción correspondiente ("Actualizar animales" o "Actualizar ERP / Grupo").\n6. El sistema validará el archivo y procesará los cambios. Vas a poder ver en pantalla los animales actualizados y los posibles errores detectados.',
        suggestedActions: [
          { label: '¿Qué planillas puedo descargar?', type: 'query', text: '¿Qué planillas puedo descargar?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'actualizacion_masiva_planillas') {
      return res.status(200).json(resJson({
        intent: 'actualizacion_masiva_planillas',
        responseText: '### Planillas de descarga\n\nDentro de Actualización Masiva vas a encontrar dos opciones para descargar:\n- **Planilla modelo**: Muestra de forma ilustrativa cómo deben cargarse los datos en cada columna para evitar errores.\n- **Planilla vacía**: Está lista para descargar, completar con la información que se desea modificar y luego volver a importar.\n\nAmbos archivos deben mantenerse en formato Excel para poder procesarlos en el sistema.',
        suggestedActions: [
          { label: '¿Cuáles son los pasos a seguir?', type: 'query', text: '¿Cuáles son los pasos para utilizar la sección?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── CONFIGURACIÓN: LISTADOS INTENTS ─────────────────────────────────────────
    if (intentResult.intent === 'listados_que_es') {
      return res.status(200).json(resJson({
        intent: 'listados_que_es',
        responseText: '### ¿Qué es Listados y para qué sirve?\n\nEn esta sección podés crear, ver y administrar tus listados (Servicios, Tratamientos, Enfermedades y Motivos de Baja). Su función principal es estandarizar la información que se registra en el sistema, lo que facilita la carga posterior de eventos y mejora notablemente la organización de los datos de tu tambo.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra la sección Listados?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'listados_acceso') {
      return res.status(200).json(resJson({
        intent: 'listados_acceso',
        responseText: '### ¿Cómo acceder?\n\nPara ingresar a este apartado, tenés que ir a Configuración y después seleccionar Listados.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra la sección Listados?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'listados_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'listados_que_muestra',
        responseText: '### ¿Qué información muestra?\n\nLa pantalla te muestra todos los listados creados en el sistema. Para cada uno vas a poder ver:\n- El **Tipo de listado** (Servicio, Tratamiento, Enfermedad o Motivo de Baja).\n- Un **Ícono** representativo según su tipo.\n- El **Nombre** o descripción del listado.\n- Los datos correspondientes de acuerdo al tambo que tengas seleccionado.',
        suggestedActions: [
          { label: '¿Qué acciones puedo realizar?', type: 'query', text: '¿Qué acciones puedo realizar en Listados?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'listados_acciones') {
      return res.status(200).json(resJson({
        intent: 'listados_acciones',
        responseText: '### ¿Qué acciones puede realizar el usuario?\n\nDentro de Listados, podés realizar las siguientes acciones:\n- **Crear un nuevo listado**: Presionando "nuevo listado", seleccionando el tipo, ingresando el nombre y guardando.\n- **Visualizar**: Consultar de manera organizada todos los listados de tu cuenta.\n- **Editar**: Modificar los datos de un listado existente.\n- **Eliminar**: Borrar definitivamente un listado de la base de datos.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra la sección Listados?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── DIRSA: CARGAR EVENTOS INTENTS ──────────────────────────────────────────
    if (intentResult.intent === 'cargar_eventos_que_es') {
      return res.status(200).json(resJson({
        intent: 'cargar_eventos_que_es',
        responseText: '### ¿Qué es Cargar Eventos?\n\nEs una sección específica dentro del apartado Dirsa en la plataforma Farmerin.\n\nSirve para importar y centralizar directamente en Farmerin los eventos registrados por los usuarios en el sistema Dirsa, además de permitir la carga de los controles lecheros.\n\nEsta funcionalidad permite que la información de los animales se mantenga totalmente actualizada entre ambos sistemas, evitando la necesidad de generar una nueva planilla de forma manual y dejándola lista para su consulta rápida dentro de Farmerin.\n\nPermite realizar lo siguiente:\n- Importar eventos de los animales registrados en Dirsa, tales como servicios, partos, secados y otros movimientos de la hacienda.\n- Registrar y subir directamente los controles lecheros de los rodeos.',
        suggestedActions: [
          { label: '¿Cómo acceder?', type: 'query', text: '¿Cómo acceder?' },
          { label: '¿Qué información permite cargar?', type: 'query', text: '¿Qué información permite cargar?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'cargar_eventos_como_acceder') {
      return res.status(200).json(resJson({
        intent: 'cargar_eventos_como_acceder',
        responseText: '### ¿Cómo acceder?\n\nLa ruta confirmada para ingresar a esta funcionalidad es la siguiente:\n\n1. Entrar al apartado principal Dirsa dentro de Farmerin.\n2. Seleccionar la opción Cargar Eventos.',
        suggestedActions: [
          { label: '¿Qué información permite cargar?', type: 'query', text: '¿Qué información permite cargar?' },
          { label: '¿Cómo utilizarlo?', type: 'query', text: '¿Cómo utilizarlo?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'cargar_eventos_info') {
      return res.status(200).json(resJson({
        intent: 'cargar_eventos_info',
        responseText: '### ¿Qué información permite cargar?\n\nLa sección permite procesar diferentes datos organizados en planillas de la siguiente manera:\n\n**Tipos de eventos confirmados para cargar:**\n- Servicios.\n- Partos.\n- Secados.\n- Otros movimientos de los animales.\n- Controles lecheros.\n\n**Campos y datos confirmados de eventos (Específico para Partos):**\nEl sistema es flexible y reconoce los datos del parto mediante distintas variantes de nombres en las columnas de la planilla:\n- RP de la madre: Identificación de la vaca madre.\n- Fecha del evento: Fecha en la que ocurrió el parto.\n- Tipo de parto: Tipo o categoría de parto registrado.\n- Observaciones: Anotaciones adicionales sobre el evento.\n- Sexo de la cría: Sexo del ternero nacido.\n- RP de la cría: Identificación asignada a la cría.\n- Inscribir cría / RP de la cría 2: Segunda cría o confirmación de inscripción.',
        suggestedActions: [
          { label: '¿Cómo utilizarlo?', type: 'query', text: '¿Cómo utilizarlo?' },
          { label: '¿Qué acciones puede realizar el usuario?', type: 'query', text: '¿Qué acciones puede realizar el usuario?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'cargar_eventos_como_usar') {
      return res.status(200).json(resJson({
        intent: 'cargar_eventos_como_usar',
        responseText: '### ¿Cómo utilizarlo?\n\nLos pasos confirmados en el sistema para realizar la carga de datos son:\n\n**Para cargar eventos de animales:**\n1. Obtené y descargá desde el sistema Dirsa la planilla que contiene los códigos de los eventos que querés cargar.\n2. Entrá a la sección Cargar Eventos en Farmerin.\n3. Seleccioná el archivo de la planilla correspondiente y subilo al sistema.\n4. Presioná el botón Actualizar.\n5. El sistema va a comenzar con la carga y te va a mostrar en pantalla el avance y resultado del proceso.\n\n**Para cargar un control lechero:**\n1. Obtené y descargá desde Dirsa la planilla de control lechero correspondiente.\n2. En la misma sección, cargá dicho archivo en la opción específica de Cargar Control Lechero.\n3. Presioná el botón Actualizar.\n4. El sistema va a procesar la planilla de producción y te va a mostrar en pantalla el resultado de la carga.',
        suggestedActions: [
          { label: '¿Qué requisitos existen?', type: 'query', text: '¿Qué requisitos existen?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'cargar_eventos_acciones') {
      return res.status(200).json(resJson({
        intent: 'cargar_eventos_acciones',
        responseText: '### ¿Qué acciones puede realizar el usuario?\n\nEl usuario cuenta con las siguientes acciones disponibles dentro de esta pantalla:\n\n- **Seleccionar archivo**: Permite buscar y elegir la planilla de eventos o la planilla de control lechero guardada en la computadora.\n- **Subir archivo de eventos**: Acción para subir la planilla general de eventos descargada de Dirsa.\n- **Subir archivo de control lechero**: Acción para cargar específicamente la planilla de control lechero de Dirsa.\n- **Actualizar**: Botón para confirmar e iniciar la importación de datos en Farmerin, procesando el archivo que acabás de subir.\n- **Visualizar resultados**: Ver en pantalla el reporte inmediato del proceso, que detalla si la carga fue exitosa o si se encontraron fallas en los registros.',
        suggestedActions: [
          { label: '¿Qué requisitos existen?', type: 'query', text: '¿Qué requisitos existen?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'cargar_eventos_requisitos') {
      return res.status(200).json(resJson({
        intent: 'cargar_eventos_requisitos',
        responseText: '### ¿Qué requisitos existen?\n\nPara que las cargas se procesen de manera exitosa, se deben cumplir los siguientes requisitos de formato y obligatoriedad:\n\n**Formatos de archivos aceptados:**\n- Planillas de cálculo Excel (.xlsx o similares).\n- Archivos separados por comas (.csv).\n\n**Requisitos y campos obligatorios para registrar Partos:**\n- **RP de la madre (Obligatorio)**: Es indispensable para identificar a qué animal se le asocia el parto. Si no viene en la planilla o está vacío, el sistema rechaza la fila.\n- **Fecha del evento (Obligatorio)**: Es fundamental. El sistema requiere que la fecha esté presente en el archivo en formato válido (día, mes y año).\n\n**Flexibilidad en los encabezados:**\nEl sistema no requiere que los nombres de las columnas en la planilla sean idénticos a un único patrón rígido. El procesador interno evalúa un listado de nombres alternativos para encontrar cada dato de forma inteligente.',
        suggestedActions: [
          { label: '¿Qué es Cargar Eventos?', type: 'query', text: '¿Qué es Cargar Eventos?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── DIRSA: REPORTE DE EVENTOS INTENTS ──────────────────────────────────────
    if (intentResult.intent === 'reporte_eventos_que_es') {
      return res.status(200).json(resJson({
        intent: 'reporte_eventos_que_es',
        responseText: '### ¿Qué es Reporte de Eventos y para qué sirve?\n\nEs una sección de Farmerin que sirve para visualizar todos los eventos que fueron cargados o importados desde el sistema Dirsa.\nSu objetivo es permitir la consulta del historial de eventos de los animales para realizar controles y seguimientos de manera sencilla.',
        suggestedActions: [
          { label: '¿Cómo acceder?', type: 'query', text: '¿Cómo acceder?' },
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_eventos_como_acceder') {
      return res.status(200).json(resJson({
        intent: 'reporte_eventos_como_acceder',
        responseText: '### ¿Cómo acceder?\n\nSe ingresa desde el menú de la plataforma siguiendo esta ruta:\n\nApartado Dirsa > sección Reporte de eventos.',
        suggestedActions: [
          { label: '¿Qué eventos se pueden consultar?', type: 'query', text: '¿Qué eventos se pueden consultar?' },
          { label: '¿Cómo consultar la información?', type: 'query', text: '¿Cómo consultar la información?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_eventos_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'reporte_eventos_que_muestra',
        responseText: '### ¿Qué información muestra?\n\nCuando se realiza una consulta, el sistema muestra una lista con los eventos encontrados y presenta los siguientes datos por cada registro:\n- Fecha: Fecha del evento (o fecha en la que se cargó).\n- Animal (RP): Identificación del animal al que se le realizó el evento.\n- Evento: El tipo de evento que se llevó a cabo.\n- Detalle: Descripción o detalles específicos del evento.\n- Usuario: El usuario que realizó la carga en el sistema.\n\nTambién calcula las siguientes métricas de control:\n- Total de eventos.\n- Eventos vistos.\n- Eventos pendientes.',
        suggestedActions: [
          { label: '¿Qué eventos se pueden consultar?', type: 'query', text: '¿Qué eventos se pueden consultar?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_eventos_que_eventos') {
      return res.status(200).json(resJson({
        intent: 'reporte_eventos_que_eventos',
        responseText: '### ¿Qué eventos se pueden consultar?\n\nLos únicos tipos de eventos que se pueden consultar en esta sección son:\n- Alta\n- Baja\n- Parto\n- Celo\n- Tacto\n- Servicio\n- Secado\n- Aborto\n- Tratamiento',
        suggestedActions: [
          { label: '¿Qué filtros o búsquedas permite?', type: 'query', text: '¿Qué filtros o búsquedas permite?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_eventos_filtros') {
      return res.status(200).json(resJson({
        intent: 'reporte_eventos_filtros',
        responseText: '### ¿Qué filtros o búsquedas permite?\n\nPara buscar y segmentar la información, la sección ofrece los siguientes filtros:\n- Mes actual\n- Mes anterior\n- Rango de fecha (permite definir una fecha de inicio y una fecha de fin)\n- Tipo de evento\n- Estado (visto o todos/pendientes)',
        suggestedActions: [
          { label: '¿Cómo consultar la información?', type: 'query', text: '¿Cómo consultar la información?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_eventos_como_consultar') {
      return res.status(200).json(resJson({
        intent: 'reporte_eventos_como_consultar',
        responseText: '### ¿Cómo consultar la información?\n\nPara realizar una consulta de eventos, debés seguir estos pasos sencillos:\n\n1. Seleccioná el filtro de tiempo que desees: Mes actual, Mes anterior o definí un Rango de fecha específico.\n2. Opcionalmente, filtrá la información seleccionando un Tipo de evento o un Estado en particular.\n3. Realizá la búsqueda para que el sistema procese y cargue la lista con todos los eventos que coincidan con los filtros seleccionados.',
        suggestedActions: [
          { label: '¿Qué acciones puede realizar el usuario?', type: 'query', text: '¿Qué acciones puede realizar el usuario?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_eventos_acciones') {
      return res.status(200).json(resJson({
        intent: 'reporte_eventos_acciones',
        responseText: '### ¿Qué acciones puede realizar el usuario?\n\nEl usuario tiene habilitadas las siguientes acciones dentro de la sección:\n- Filtrar y Buscar: Aplicar filtros de fecha, tipo de evento y estado.\n- Ordenar la lista: Hacer clic en los encabezados de la tabla para ordenar por RP, Fecha o Evento.\n- Marcar como visto: Marcar un evento para indicar que ya fue revisado.\n- Ver Ficha del Animal: Hacer clic sobre el número de RP del animal para abrir su ficha.\n- Ver detalle de cría: Si el evento cuenta con crías asociadas, se puede acceder a la información detallada.\n- Descargar planilla de Excel: Descargar un archivo con todos los resultados obtenidos.',
        suggestedActions: [
          { label: '¿Qué relación tiene con Dirsa y otras secciones?', type: 'query', text: '¿Qué relación tiene con Dirsa y otras secciones?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_eventos_relacion') {
      return res.status(200).json(resJson({
        intent: 'reporte_eventos_relacion',
        responseText: '### ¿Qué relación tiene con Dirsa y otras secciones?\n\nLa sección pertenece al apartado general Dirsa y se conecta directamente con:\n\n- **Cargar Eventos**: Sección donde se suben las planillas descargadas de Dirsa para registrar los eventos de los animales en Farmerin. Los eventos cargados ahí son los que luego se visualizan en el Reporte de Eventos.\n- **Reporte de Producción**: Sección donde se consultan los resultados de los controles lecheros cargados (cantidad de animales, producción total, gráfico comparativo, etc.).',
        suggestedActions: [
          { label: '¿Qué es Reporte de Eventos?', type: 'query', text: '¿Qué es Reporte de Eventos y para qué sirve?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── DIRSA: REPORTE DE PRODUCCIÓN INTENTS ───────────────────────────────────
    if (intentResult.intent === 'reporte_produccion_que_es') {
      return res.status(200).json(resJson({
        intent: 'reporte_produccion_que_es',
        responseText: '### ¿Qué es Reporte de Producción y para qué sirve?\n\nEs una sección dentro de Farmerin que te permite consultar de manera rápida y organizada la información de producción que proviene del control lechero cargado en Dirsa.\nSu objetivo principal es ayudarte a realizar un seguimiento detallado del rendimiento productivo de tus animales.',
        suggestedActions: [
          { label: '¿Cómo acceder?', type: 'query', text: '¿Cómo acceder?' },
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_produccion_como_acceder') {
      return res.status(200).json(resJson({
        intent: 'reporte_produccion_como_acceder',
        responseText: '### ¿Cómo acceder?\n\nSe accede desde el apartado Dirsa, dentro de la sección Cargar eventos.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra?' },
          { label: '¿Cómo utilizarlo?', type: 'query', text: '¿Cómo utilizarlo?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_produccion_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'reporte_produccion_que_muestra',
        responseText: '### ¿Qué información muestra?\n\nEl reporte muestra la siguiente información confirmada:\n- La cantidad de animales que participaron del control lechero.\n- La producción total de leche.\n- El promedio individual del mes.\n- Un gráfico anual para comparar la producción de los diferentes meses (botón "Ver gráfico").\n- El listado de las vacas fiscalizadas que participaron del control lechero.\n- Una lista con todos los animales a los que se les cargó el control lechero, indicando los litros producidos.\n- El rendimiento individual de un animal específico a lo largo de todos los controles lecheros (botón "Ver curva").',
        suggestedActions: [
          { label: '¿Qué acciones puede realizar el usuario?', type: 'query', text: '¿Qué acciones puede realizar el usuario?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_produccion_como_usar') {
      return res.status(200).json(resJson({
        intent: 'reporte_produccion_como_usar',
        responseText: '### ¿Cómo utilizarlo?\n\nPara consultar el reporte, debés seguir estos pasos:\n\n1. Cargá previamente el control lechero desde la opción "Cargar control lechero" utilizando la planilla que obtuviste de Dirsa.\n2. Presioná "Actualizar" para que el sistema procese la información y muestre el resultado de la carga.\n3. Una vez cargado, la información se podrá visualizar y analizar en esta sección.',
        suggestedActions: [
          { label: '¿Qué acciones puede realizar el usuario?', type: 'query', text: '¿Qué acciones puede realizar el usuario?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_produccion_acciones') {
      return res.status(200).json(resJson({
        intent: 'reporte_produccion_acciones',
        responseText: '### ¿Qué acciones puede realizar el usuario?\n\n- Consultar la información general de los controles lecheros.\n- Visualizar un gráfico anual comparativo de producción mensual (botón "Ver gráfico").\n- Consultar las vacas fiscalizadas que participaron del control.\n- Descargar toda la información de producción en una planilla de Excel.\n- Visualizar la lista detallada de los animales y sus litros producidos.\n- Visualizar el rendimiento individual histórico de un animal mediante el botón "Ver curva".',
        suggestedActions: [
          { label: '¿Qué relación tiene con otras secciones o con Dirsa?', type: 'query', text: '¿Qué relación tiene con otras secciones o con Dirsa?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'reporte_produccion_relacion') {
      return res.status(200).json(resJson({
        intent: 'reporte_produccion_relacion',
        responseText: '### ¿Qué relación tiene con otras secciones o con Dirsa?\n\n- **Relación con Dirsa**: La información de producción proviene directamente de los controles lecheros cargados en Dirsa mediante planillas.\n- **Relación con otras secciones**: Se encuentra dentro del apartado Dirsa, compartiendo espacio físico dentro de la sección de Cargar eventos (donde se cargan planillas) y relacionado con la sección de Reporte de eventos (donde se consultan eventos cargados).',
        suggestedActions: [
          { label: '¿Qué es Reporte de Producción?', type: 'query', text: '¿Qué es Reporte de Producción y para qué sirve?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── MI FARMERIN INTENTS ────────────────────────────────────────────────────
    if (intentResult.intent === 'mi_farmerin_que_es') {
      return res.status(200).json(resJson({
        intent: 'mi_farmerin_que_es',
        responseText: '### ¿Qué es Mi Farmerin y para qué sirve?\n\nEs la sección para ver tu información de usuario, recibir alertas del sistema y consultar datos generales del tambo y de los animales registrados.',
        suggestedActions: [
          { label: '¿Qué información muestra?', type: 'query', text: '¿Qué información muestra?' },
          { label: '¿Qué acciones puedo realizar?', type: 'query', text: '¿Qué acciones puedo realizar?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'mi_farmerin_que_muestra') {
      return res.status(200).json(resJson({
        intent: 'mi_farmerin_que_muestra',
        responseText: '### ¿Qué información muestra?\n\n- **Datos de usuario**: Información de tu cuenta.\n- **Alertas e historial**: Notificaciones del sistema e historial de cambios de ración hechos desde Parámetros.\n- **Datos del tambo**: Turnos, bajadas, horarios y kilos de tolva.\n- **Resumen de animales**: Total de animales, vacas y vaquillonas (en ordeñe o secas), vaquillonas de servicio y crías.',
        suggestedActions: [
          { label: '¿Qué acciones puedo realizar?', type: 'query', text: '¿Qué acciones puedo realizar?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'mi_farmerin_acciones') {
      return res.status(200).json(resJson({
        intent: 'mi_farmerin_acciones',
        responseText: '### ¿Qué acciones puede realizar el usuario?\n\n- **Ver historial**: Consultar cambios de ración y marcar avisos como leídos.\n- **Consultar tambo**: Presionar "Obtener Información del Tambo" para ver turnos, bajadas, horarios y tolva.\n- **Consultar animales**: Presionar "Obtener animales" para ver totales y acceder a las listas de vacas y vaquillonas.\n- **Cambiar contraseña**: Modificar tu clave ingresando la actual, la nueva y su confirmación.\n- **Eliminar tambo**: Borrar el tambo actual (solo si no tiene animales asociados).\n- **Cerrar sesión**: Salir de la plataforma.',
        suggestedActions: [
          { label: '¿Qué opciones están disponibles?', type: 'query', text: '¿Qué opciones o funcionalidades están disponibles?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'mi_farmerin_opciones') {
      return res.status(200).json(resJson({
        intent: 'mi_farmerin_opciones',
        responseText: '### ¿Qué opciones o funcionalidades están disponibles?\n\n- **Obtener Información**: Formulario para buscar turnos, bajadas, horarios y tolva de una fecha.\n- **Obtener animales**: Despliega listas de animales clasificados por estado reproductivo y productivo.\n- **Gestión de alertas**: Visualizar notificaciones y marcarlas como leídas.\n- **Seguridad**: Opción para actualizar la contraseña.\n- **Próximas funciones**: Cálculo de consumo de ración y modificación de ración estándar para pulsado manual.',
        suggestedActions: [
          { label: '¿Qué relación tiene con otras secciones?', type: 'query', text: '¿Qué relación tiene con otras secciones de Farmerin?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'mi_farmerin_relacion') {
      return res.status(200).json(resJson({
        intent: 'mi_farmerin_relacion',
        responseText: '### ¿Qué relación tiene con otras secciones de Farmerin?\n\n- **Parámetros**: Muestra alertas de los cambios de ración hechos en esa sección.\n- **Animales**: No podés eliminar un tambo si tiene animales asociados.',
        suggestedActions: [
          { label: '¿Qué es Mi Farmerin?', type: 'query', text: '¿Qué es Mi Farmerin y para qué sirve?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    // ── AYUDA INTENTS ──────────────────────────────────────────────────────────
    if (intentResult.intent === 'ayuda_que_es') {
      return res.status(200).json(resJson({
        intent: 'ayuda_que_es',
        responseText: '### ¿Qué es Ayuda y para qué sirve?\n\nEsta sección sirve como un **Centro de Contacto** para que los usuarios encuentren rápidamente las vías de comunicación de Farmerin (Teléfono, WhatsApp, Correo electrónico, Sitio Web y Redes Sociales). Además, permite acceder al canal oficial de YouTube para capacitarse en el uso de las aplicaciones web y móviles.',
        suggestedActions: [
          { label: '¿Qué medios de contacto ofrece Farmerin?', type: 'query', text: '¿Qué medios de contacto ofrece Farmerin?' },
          { label: '¿Qué información o herramientas ofrece?', type: 'query', text: '¿Qué información o herramientas ofrece?' },
          { label: '¿Qué puedo encontrar en el canal de YouTube?', type: 'query', text: '¿Qué puedo encontrar en el canal de YouTube?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'ayuda_medios_contacto') {
      return res.status(200).json(resJson({
        intent: 'ayuda_medios_contacto',
        responseText: '### Medios de contacto de Farmerin\n\nFarmerin ofrece los siguientes canales de atención:\n\n- 📞 **Teléfono**: Llamanos directamente al 2227623372.\n- 💬 **WhatsApp**: Escribinos al +54 9 2227 623372.\n- ✉️ **Correo electrónico**: Enviá un email a farmerin.navarro@gmail.com.\n- 🌐 **Sitio Web**: Visitá www.farmerin.com.ar.\n- 📲 **Redes Sociales**: YouTube, Instagram y Facebook.\n- 📍 **Oficinas**: Navarro, Buenos Aires.',
        offerSupport: true,
        suggestedActions: [
          { label: 'Hablar con soporte técnico', type: 'support' },
          { label: '¿Qué es Ayuda y para qué sirve?', type: 'query', text: '¿Qué es Ayuda y para qué sirve?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'ayuda_informacion_herramientas') {
      return res.status(200).json(resJson({
        intent: 'ayuda_informacion_herramientas',
        responseText: '### Información y herramientas en la sección Ayuda\n\nEn la pantalla de Ayuda contás con las siguientes herramientas:\n\n- 📞 **Contacto directo**: Accesos rápidos a teléfono, WhatsApp y correo.\n- 🌐 **Redes sociales y Sitio Web**: Accesos directos a YouTube, Instagram, Facebook y la web de Farmerin.\n- 🤖 **Farmerin T.I.O.**: Tarjeta interactiva para conocer todo sobre tu asistente inteligente.\n- 📍 **Mapa de Ubicación**: Dirección de nuestras oficinas centrales en Navarro y botón "Cómo llegar" con Google Maps.',
        suggestedActions: [
          { label: '¿Qué medios de contacto ofrece Farmerin?', type: 'query', text: '¿Qué medios de contacto ofrece Farmerin?' },
          { label: '¿Qué puedo encontrar en el canal de YouTube?', type: 'query', text: '¿Qué puedo encontrar en el canal de YouTube?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'ayuda_youtube') {
      return res.status(200).json(resJson({
        intent: 'ayuda_youtube',
        responseText: '### Canal oficial de YouTube\n\nEn el canal de YouTube de Farmerin podés encontrar:\n\n- 📹 **Tutoriales**: Videos explicativos para aprender a utilizar la aplicación web y las aplicaciones móviles.\n- 🤖 **Farmerin T.I.O.**: Contenido informativo sobre las funcionalidades y alcance de tu asistente virtual.',
        suggestedActions: [
          { label: '¿Qué es Ayuda y para qué sirve?', type: 'query', text: '¿Qué es Ayuda y para qué sirve?' },
          { label: '¿Qué medios de contacto ofrece Farmerin?', type: 'query', text: '¿Qué medios de contacto ofrece Farmerin?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context));
    }

    if (intentResult.intent === 'accion_mutacion') {
      return res.status(200).json(resJson({
        intent: 'accion_mutacion',
        responseText: intentResult.message,
        suggestedActions: [
          { label: '¿Cómo hacerlo manualmente?', type: 'query', text: `¿Cómo ${resolvedQuery.toLowerCase()} manualmente?` }
        ]
      }, context));
    }

    // 2. Navigation Intent
    if (intentResult.intent === 'navegacion') {
      const targetSec = intentResult.targetSection || 'tambos';
      const targetPath = targetSec === 'tambos' ? '/' : `/${targetSec}`;
      return res.status(200).json(resJson({
        intent: 'navegacion',
        responseText: `Podés acceder a la sección **${targetSec.charAt(0).toUpperCase() + targetSec.slice(1)}** desde el menú principal o hacer clic en el botón a continuación para ir directamente:`,
        suggestedActions: [
          { label: `Ir a ${targetSec.charAt(0).toUpperCase() + targetSec.slice(1)}`, type: 'navigate', path: targetPath }
        ]
      }, context));
    }

    // 3. Human Support Intent
    if (intentResult.intent === 'soporte_humano') {
      return res.status(200).json(resJson({
        intent: 'soporte_humano',
        responseText: 'Por supuesto. Puedo ayudarte a derivar tu consulta al equipo de soporte técnico de Farmerin. Hacé clic en el botón a continuación para completar los datos de tu consulta:',
        offerSupport: true
      }, context));
    }

    // 4. Section Availability Check
    const targetSectionName = (context.section || 'tambos').toLowerCase();
    const sectionInfo = sectionsAvailability[targetSectionName];

    // Out of scope queries check
    const qLower = (resolvedQuery || '').toLowerCase();
    const outOfScopeKeywords = ['receta', 'clima', 'fútbol', 'futbol', 'bitcoin', 'dólar', 'dolar', 'política', 'politica', 'cine', 'película'];
    if (outOfScopeKeywords.some(k => qLower.includes(k))) {
      return res.status(200).json({
        success: true,
        intent: 'fuera_de_alcance',
        section: targetSectionName,
        responseText: 'Esta consulta está fuera del alcance de mi conocimiento. Estoy especializado exclusivamente en la plataforma Farmerin para ayudarte con el uso, gestión y diagnóstico de la aplicación.'
      });
    }

    // Un-documented section handling
    if (!sectionInfo || !sectionInfo.isDocumented) {
      const displayName = targetSectionName.charAt(0).toUpperCase() + targetSectionName.slice(1);
      return res.status(200).json({
        success: true,
        intent: 'seccion_no_documentada',
        section: targetSectionName,
        responseText: `Todavía no tengo información disponible sobre la sección **${displayName}**. Estamos incorporando progresivamente la información de Farmerin a mi base de conocimiento. Cuando esta sección esté documentada, voy a poder ayudarte con tus consultas.`,
        suggestedActions: [
          { label: 'Ir a Tambos (Sección Documentada)', type: 'navigate', path: '/' },
          { label: 'Hablar con soporte humano', type: 'support' }
        ]
      });
    }

    // 5. Load Section Documentation (Grounding Source)
    const docs = loadSectionDocs(targetSectionName);
    if (!docs) {
      return res.status(200).json({
        success: true,
        intent: 'sin_informacion',
        section: targetSectionName,
        responseText: 'No tengo información suficiente sobre ese caso en mi base de conocimiento.',
        offerSupport: true
      });
    }

    // 6. Process Query against Documented Knowledge
    // Handle diagnostic steps if user responded to a diagnostic question
    if (diagnosticStep) {
      return res.status(200).json(handleDiagnosticStep(diagnosticStep, context, docs));
    }

    // Process problems & errors
    if (intentResult.intent === 'problema') {
      return res.status(200).json(handleProblemQuery(qLower, intentResult.topic, context, docs));
    }

    // Process informative / usage queries
    return res.status(200).json(handleInformativeQuery(resolvedQuery, qLower, context, docs));

  } catch (error) {
    console.error('Error in assistant API:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno en el asistente de Farmerin',
      responseText: 'Ocurrió un inconveniente al procesar tu consulta. Si el problema persiste, podés contactar a soporte técnico.'
    });
  }
}

/**
 * Handles diagnostic decision flow based on user selection
 */
function handleDiagnosticStep(step, context, docs) {
  const { topic, choice } = step;

  if (topic === 'horarios') {
    if (choice === 'solo_uno') {
      return {
        success: true,
        intent: 'diagnostico',
        responseText: 'Perfecto. Para ese tambo específico, ¿tenés configurado el campo **Link** en la ficha del tambo?',
        diagnosticOptions: [
          { label: 'Sí, tiene un Link configurado', step: { topic: 'horarios_link', choice: 'link_si' } },
          { label: 'No está configurado / No sé', step: { topic: 'horarios_link', choice: 'link_no' } }
        ]
      };
    } else if (choice === 'todos') {
      return {
        success: true,
        intent: 'diagnostico',
        responseText: 'Si no podés ver los horarios en ninguno de los tambos, asegurate de tener una conexión activa a internet y de seleccionar una fecha válida en el calendario. ¿El campo Link de los tambos está cargado?',
        diagnosticOptions: [
          { label: 'Revisar campo Link', step: { topic: 'horarios_link', choice: 'revisar_link' } }
        ]
      };
    }
  }

  if (topic === 'horarios_link') {
    if (choice === 'link_no' || choice === 'revisar_link') {
      return {
        success: true,
        intent: 'diagnostico_resultado',
        responseText: 'Para que la consulta de horarios de ordeñe funcione, el tambo debe tener configurado un **Link** válido que permita conectar con los equipos de medición. Podés editar el tambo (ícono del lápiz) e ingresar la dirección web correspondiente.',
        suggestedActions: [
          { label: 'Ir a Mis Tambos', type: 'navigate', path: '/' }
        ]
      };
    } else if (choice === 'link_si') {
      return {
        success: true,
        intent: 'diagnostico_resultado',
        responseText: 'Si el Link está cargado pero los horarios no aparecen, puede deberse a que el equipo externo del tambo esté fuera de línea en este momento o que no existan registros para la fecha elegida. Si el problema persiste, podés derivar la consulta a soporte.',
        offerSupport: true
      };
    }
  }

  if (topic === 'guardar_cambios') {
    if (choice === 'hay_alerta_roja') {
      return {
        success: true,
        intent: 'diagnostico_resultado',
        responseText: 'Farmerin valida los datos antes de guardar. Corregí el dato señalado en color rojo dentro del formulario y volvé a presionar el botón de guardar.'
      };
    } else {
      return {
        success: true,
        intent: 'diagnostico_resultado',
        responseText: 'Si no observás alertas rojas pero el sistema no responde al presionar guardar, verificá tu conexión a internet o intentá refrescar la página. Si continúa fallando, te sugerimos contactar a soporte.',
        offerSupport: true
      };
    }
  }

  return {
    success: true,
    intent: 'diagnostico_general',
    responseText: 'Gracias por la información. Si las comprobaciones anteriores no resuelven el inconveniente, podemos ayudarte a contactar con soporte técnico.',
    offerSupport: true
  };
}

/**
 * Handles troubleshooting problem queries using section error docs
 */
function handleProblemQuery(qLower, topic, context, docs) {
  const section = (context?.section || 'tambos').toLowerCase();

  if (section === 'login') {
    if (qLower.includes('incorrecto') || qLower.includes('contraseña') || qLower.includes('datos')) {
      return resJson({
        intent: 'credenciales_incorrectas',
        responseText: 'Si te aparece el mensaje **"Correo o contraseña incorrectos"**, te recomendamos realizar las siguientes verificaciones:\n\n### Correo electrónico\n1. Que el correo no tenga espacios antes o después de la dirección.\n2. Que el correo ingresado sea realmente el correo utilizado para acceder a la plataforma.\n3. Que la dirección esté escrita correctamente.\n\n### Contraseña\nPresioná el **ícono del ojo** ubicado en el campo de contraseña para visualizar los caracteres que estás ingresando y comprobar si efectivamente estás ingresando la contraseña correcta.\n\nSi después de estas verificaciones seguís sin poder ingresar, podés seleccionar **Olvidaste tu contraseña** para continuar con la recuperación y contactar al soporte técnico.',
        suggestedActions: [
          { label: 'Olvidaste tu contraseña', type: 'query', text: 'Olvidaste tu contraseña' }
        ]
      }, context);
    }

    if (qLower.includes('no llega') || qLower.includes('nunca') || qLower.includes('spam') || qLower.includes('mail') || qLower.includes('correo')) {
      return resJson({
        intent: 'correo_no_llegado',
        responseText: 'Si no recibiste el correo para recuperar tu contraseña:\n\n1. Revisá la carpeta de **Spam** o correo no deseado.\n2. Verificá que el correo electrónico ingresado sea exactamente el utilizado para registrarte en la plataforma.\n\nSi realizaste estas comprobaciones y seguís sin recibir el correo, por favor **contactate con el soporte técnico**.',
        offerSupport: true,
        suggestedActions: [
          { label: 'Hablar con soporte técnico', type: 'support' }
        ]
      }, context);
    }

    return resJson({
      intent: 'problema_general',
      responseText: 'Comprendo que tenés un inconveniente al ingresar. Si tenés dudas sobre tu correo, contraseña o la recepción de mails de recuperación, te recomendamos revisar tus datos o contactarte con el **soporte técnico**.',
      offerSupport: true
    }, context);
  }

  // Animales problems
  if (section === 'animales') {
    if (qLower.includes('no encuentro') || qLower.includes('no me aparece') || qLower.includes('desapareció') || qLower.includes('desaparecio') || qLower.includes('filtro') || qLower.includes('búsqueda') || qLower.includes('busqueda')) {
      return resJson({
        intent: 'problema_solucion',
        responseText: 'Si no encontrás un animal o no te aparece en el listado:\n\n1. Verificá que estés en el tambo correcto.\n2. Comprobá si tenés algún texto en la barra de búsqueda o un **Filtro Rápido** activo.\n3. Desactivá los filtros. Si el animal sigue sin aparecer, es probable que tenga una fecha de baja (por muerte, venta o descarte) o transferencia registrada.',
        suggestedActions: [
          { label: '¿Cómo doy de alta un animal?', type: 'query', text: '¿Cómo doy de alta un nuevo animal?' }
        ]
      }, context);
    }

    if (qLower.includes('baja') || qLower.includes('eliminar') || qLower.includes('transferir') || qLower.includes('revertir')) {
      return resJson({
        intent: 'problema_solucion',
        responseText: 'Por razones de seguridad y control de datos:\n\n- La IA no tiene permisos para crear, modificar, dar de baja ni revertir bajas de animales.\n- Si un animal fue dado de baja por error, debe ser gestionado directamente por un usuario administrador en la plataforma.',
        offerSupport: true
      }, context);
    }

    if (qLower.includes('validación') || qLower.includes('validacion') || qLower.includes('no me deja guardar') || qLower.includes('parto') || qLower.includes('servicio') || qLower.includes('grupo')) {
      return resJson({
        intent: 'problema_solucion',
        responseText: 'Al guardar o editar un animal, Farmerin valida que:\n\n- **En Ordeñe**: Se requiere obligatoriamente ingresar la **Fecha del último parto**.\n- **Preñada**: Se requiere obligatoriamente ingresar la **Fecha del último servicio**.\n- **Grupo**: No puede quedar vacío y debe ser un valor numérico.',
        suggestedActions: [
          { label: '¿Qué significan los estados?', type: 'query', text: '¿Qué significan los estados productivos y reproductivos?' }
        ]
      }, context);
    }

    return resJson({
      intent: 'problema_general',
      responseText: 'Comprendo que tenés una consulta o problema sobre la sección **Animales**. Si no encontrás un animal, tenés dudas sobre su ficha o sobre las validaciones al guardar, decime más detalles o podés contactar a soporte.',
      offerSupport: true
    }, context);
  }

  // Tambos problems
  if (section === 'tambos') {
    if (qLower.includes('horario') || qLower.includes('turnos')) {
      return resJson({
        intent: 'diagnostico',
        responseText: 'Para ayudarte con los horarios de ordeñe: ¿te pasa con todos los tambos o solamente con uno?',
        diagnosticOptions: [
          { label: 'Solo con un tambo', step: { topic: 'horarios', choice: 'solo_uno' } },
          { label: 'Con todos los tambos', step: { topic: 'horarios', choice: 'todos' } }
        ]
      }, context);
    }

    if (qLower.includes('guardar') || qLower.includes('crear') || qLower.includes('editar')) {
      return resJson({
        intent: 'diagnostico',
        responseText: 'Al intentar guardar los cambios: ¿aparece algún cartel o mensaje de error en color rojo en la ventana?',
        diagnosticOptions: [
          { label: 'Sí, aparece una alerta en rojo', step: { topic: 'guardar_cambios', choice: 'hay_alerta_roja' } },
          { label: 'No, la ventana no reacciona', step: { topic: 'guardar_cambios', choice: 'sin_reaccion' } }
        ]
      }, context);
    }

    if (qLower.includes('cargando') || qLower.includes('panel')) {
      return resJson({
        intent: 'problema_solucion',
        responseText: 'Si la pantalla muestra el mensaje "Cargando Panel..." de forma permanente, comprobá tu conexión a internet y probá recargar la página en el navegador. Si el problema persiste, contactá a soporte técnico.',
        offerSupport: true
      }, context);
    }

    if (qLower.includes('permisos') || qLower.includes('administrador')) {
      return resJson({
        intent: 'problema_solucion',
        responseText: 'El acceso a opciones avanzadas de administración depende de tu perfil para el tambo seleccionado. Si no podés ver estas opciones, consultá con el responsable de la cuenta para verificar tus permisos.',
        offerSupport: true
      }, context);
    }
  }

  // Reportes / Gral Animales problems
  if (section === 'reportes') {
    if (topic === 'gral_animales_vacio') {
      return resJson({
        intent: 'gral_animales_vacio',
        responseText: '## No veo un animal en la lista\n\nSi no encontrás un animal en la lista, primero verificá que los **filtros seleccionados sean los correctos**.\n\nTambién podés intentar buscarlo utilizando únicamente su **RP o ERP**, sin aplicar otros filtros.\n\nSi después de realizar estas comprobaciones el animal sigue sin aparecer, puede ser que **el animal todavía no esté dado de alta en el sistema**.\n\nEn ese caso, debés volver a la sección **Animales** y realizar el alta del animal para que pueda aparecer en la lista.',
        suggestedActions: [
          { label: '¿Cómo busco un animal?', type: 'query', text: '¿Cómo busco una vaca en particular?' },
          { label: 'Ir a Animales', type: 'navigate', path: '/animales' },
          { label: 'Hablar con soporte', type: 'support' }
        ]
      }, context);
    }
  }

  // Nutrición / Parámetros / Control problems
  if (section === 'nutricion' || section === 'parametros' || section === 'control') {
    if (qLower.includes('vacía') || qLower.includes('vacia') || qLower.includes('no veo nada') || qLower.includes('blanco') || qLower.includes('pantalla')) {
      return resJson({
        intent: 'pantalla_vacia_nutricion',
        responseText: 'Si la pantalla aparece vacía o no muestra información en Nutrición (Parámetros o Control):\n\n1. Verificá que tengas un **Tambo seleccionado** en el buscador de la parte superior del sistema.\n2. Si no hay un tambo elegido, la pantalla no cargará ninguna regla ni animal.\n3. Al seleccionar un tambo, los datos correspondientes se cargarán automáticamente.',
        suggestedActions: [
          { label: 'Ir a Tambos', type: 'navigate', path: '/' },
          { label: 'Hablar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    if (qLower.includes('0 kg') || qLower.includes('0kg') || qLower.includes('sin ración') || qLower.includes('sin racion') || qLower.includes('no recibe') || qLower.includes('fuera del cálculo') || qLower.includes('fuera del calculo')) {
      return resJson({
        intent: 'animal_sin_porcion',
        responseText: 'Si un animal no recibe ración (0 kg) o queda fuera del cálculo:\n\n1. Comprobá que sus Días de Lactancia o producción caigan dentro de los rangos (Mínimo y Máximo) configurados en **Parámetros**.\n2. Verificá que el número de Grupo del animal en su ficha coincida con el Grupo de Parámetros.\n3. Asegurate de que el animal esté en estado **"En Ordeñe"** y sin fecha de baja.',
        suggestedActions: [
          { label: '¿Cómo se determina la ración?', type: 'query', text: '¿Cómo se determina la ración de un animal en Parámetros?' },
          { label: 'Hablar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    return resJson({
      intent: 'problema_nutricion_general',
      responseText: 'Comprendo que tenés un inconveniente en la sección de **Nutrición**. Si la pantalla está vacía, asegurate de tener seleccionado un tambo. Si un animal no recibe ración o la regla no se aplica, podés indicarnos más detalles.',
      offerSupport: true,
      suggestedActions: [
        { label: 'Hablar con soporte', type: 'support' },
        { label: 'Reiniciar preguntas', type: 'reset_login' }
      ]
    }, context);
  }

  return resJson({
    intent: 'problema_general',
    responseText: 'Comprendo que estás experimentando un inconveniente. Para darte una respuesta precisa: ¿podrías indicarme qué mensaje de error o comportamiento observás en pantalla?',
    offerSupport: true
  }, context);
}

/**
 * Handles informative & usage queries using section docs
 */
function handleInformativeQuery(query, qLower, context, docs) {
  const section = (context?.section || 'tambos').toLowerCase();

  if (section === 'login') {
    if (qLower.includes('recuperar') || qLower.includes('olvidé') || qLower.includes('olvide') || qLower.includes('restablecer') || qLower.includes('contraseña')) {
      return resJson({
        intent: 'recuperacion_contrasena',
        responseText: 'Para gestionar la recuperación de tu contraseña y el acceso a la plataforma, debés **contactarte con el soporte técnico**.',
        offerSupport: true,
        suggestedActions: [
          { label: 'Hablar con soporte técnico', type: 'support' }
        ]
      }, context);
    }

    if (qLower.includes('crear cuenta') || qLower.includes('cuenta nueva') || qLower.includes('registra')) {
      return resJson({
        intent: 'consulta_de_uso',
        responseText: 'Para crear una cuenta nueva:\n\n1. En la pantalla de acceso de Farmerin, seleccioná la opción **Crear cuenta nueva**.\n2. Completá el formulario de registro con tus datos.',
        suggestedActions: [
          { label: 'Ir a Crear Cuenta', type: 'navigate', path: '/crear-cuenta' }
        ]
      }, context);
    }

    if (qLower.includes('ojo') || qLower.includes('ver contraseña') || qLower.includes('mostrar contraseña')) {
      return resJson({
        intent: 'consulta_informativa',
        responseText: 'En el campo de contraseña encontrarás un ícono con forma de **ojo** que podés presionar para mostrar u ocultar los caracteres que estás escribiendo y comprobar que la contraseña sea correcta.'
      }, context);
    }

    if (qLower.includes('ingreso') || qLower.includes('entrar') || qLower.includes('identifico') || qLower.includes('iniciar sesión') || qLower.includes('iniciar sesion') || qLower.includes('datos')) {
      return resJson({
        intent: 'consulta_de_uso',
        responseText: 'Para ingresar a Farmerin:\n\n1. Ingresá tu correo electrónico (**Email**) y tu contraseña (**Password**).\n2. Presioná **Iniciar sesión**.\n3. Mientras se procesan los datos, el sistema indicará *"Iniciando sesión..."*. Al ser validados, serás redirigido a la página principal.'
      }, context);
    }

    return resJson({
      intent: 'consulta_informativa',
      responseText: 'En la pantalla de **Inicio de Sesión** podés ingresar tu email y contraseña para acceder a Farmerin, seleccionar **Olvidaste tu contraseña** si necesitás recuperar tu acceso, o crear una cuenta nueva.',
      suggestedActions: [
        { label: '¿Cómo inicio sesión?', type: 'query', text: '¿Cómo me identifico e inicio sesión en Farmerin?' },
        { label: 'Olvidaste tu contraseña', type: 'query', text: 'Olvidaste tu contraseña' }
      ]
    }, context);
  }

  // Animales informative queries
  if (section === 'animales') {
    if (qLower.includes('alta') || qLower.includes('crear') || qLower.includes('agregar') || qLower.includes('nuevo animal')) {
      return resJson({
        intent: 'consulta_de_uso',
        responseText: 'Para dar de alta un nuevo animal en Farmerin:\n\n1. Ingresá a la sección **Animales**.\n2. Presioná el botón de **Alta de animal**.\n3. Completá los campos requeridos (RP, Categoría, Grupo obligatoriamente) y guardá los cambios.',
        suggestedActions: [
          { label: 'Ir a Animales', type: 'navigate', path: '/animales' }
        ]
      }, context);
    }

    if (qLower.includes('editar') || qLower.includes('modificar') || qLower.includes('ficha') || qLower.includes('ver ficha') || qLower.includes('ojo') || qLower.includes('lápiz') || qLower.includes('lapiz')) {
      return resJson({
        intent: 'consulta_de_uso',
        responseText: 'Para ver la ficha o editar un animal:\n\n1. En el listado de **Animales**, buscá el animal por su **RP**.\n2. Para ver la ficha técnica completa, hacé clic en el ícono del **ojo**.\n3. Para modificar sus datos (como rodeo, ración u observaciones), hacé clic en el ícono del **lápiz**.',
        suggestedActions: [
          { label: 'Ir a Animales', type: 'navigate', path: '/animales' }
        ]
      }, context);
    }

    if (qLower.includes('baja') || qLower.includes('eliminar') || qLower.includes('borrar') || qLower.includes('transferir')) {
      return resJson({
        intent: 'consulta_de_uso',
        responseText: 'Para dar de baja o transferir un animal:\n\n1. En la lista de animales, seleccioná la opción de **Baja / Eliminar**.\n2. Seleccioná el motivo de la baja (Muerte, Venta, Descarte o Transferencia).\n3. Si el motivo es **Transferencia**, elegí el Tambo Destino de tu lista para concretar el movimiento.',
        suggestedActions: [
          { label: 'Ir a Animales', type: 'navigate', path: '/animales' }
        ]
      }, context);
    }

    if (qLower.includes('estado') || qLower.includes('productivo') || qLower.includes('reproductivo') || qLower.includes('ordeñe') || qLower.includes('seca') || qLower.includes('preñada') || qLower.includes('vacía') || qLower.includes('vacia')) {
      return resJson({
        intent: 'consulta_informativa',
        responseText: 'En Farmerin, el estado de cada animal se representa con etiquetas de colores:\n\n- 🟢 **Verde ("En Ordeñe")**: El animal está produciendo leche.\n- 🟡 **Amarillo ("Seca")**: El animal está en período de descanso productivo.\n- 🔵 **Azul ("Preñada")**: Se ha confirmado la preñez del animal.\n- 🔴 **Rojo ("Vacía" / "Rechazo")**: El animal no está preñada o fue marcado para descarte.',
        suggestedActions: [
          { label: '¿Cómo edito la ficha?', type: 'query', text: '¿Cómo edito la ficha de un animal?' }
        ]
      }, context);
    }

    if (qLower.includes('campos') || qLower.includes('datos') || qLower.includes('rp') || qLower.includes('rodeo') || qLower.includes('grupo') || qLower.includes('lactancia')) {
      return resJson({
        intent: 'consulta_informativa',
        responseText: 'La ficha de un animal contiene la siguiente información:\n\n- **RP**: Registro Particular (identificador principal).\n- **Categoría**: Clasificación del animal (ej. Vaquillona).\n- **Estados**: Productivo (En Ordeñe/Seca) y Reproductivo (Preñada/Vacía).\n- **Grupo**: Sector de manejo (campo obligatorio numérico).\n- **Rodeo**: Ubicación física o lote asignado.\n- **Eventos**: Fechas de último Parto (fparto) y último Servicio (fservicio).\n- **Ración**: Cantidad de alimento asignado.'
      }, context);
    }

    if (qLower.includes('funciona') || qLower.includes('qué es') || qLower.includes('que es') || qLower.includes('para qué sirve')) {
      return resJson({
        intent: 'consulta_informativa',
        responseText: 'La sección **Animales** es el inventario de ganado activo del tambo seleccionado. Permite consultar la información técnica de cada ejemplar, realizar seguimiento del ciclo reproductivo/productivo y registrar altas, bajas o transferencias.',
        suggestedActions: [
          { label: '¿Cómo creo un nuevo animal?', type: 'query', text: '¿Cómo doy de alta un nuevo animal?' },
          { label: 'Ir a Animales', type: 'navigate', path: '/animales' }
        ]
      }, context);
    }

    return resJson({
      intent: 'consulta_informativa',
      responseText: 'En la sección **Animales** podés administrar el inventario de tu tambo, consultar la ficha de cada animal, cambiar sus estados o dar de alta nuevos ejemplares.',
      suggestedActions: [
        { label: '¿Cómo doy de alta un animal?', type: 'query', text: '¿Cómo doy de alta un nuevo animal?' },
        { label: '¿Qué significan los estados?', type: 'query', text: '¿Qué significan los estados productivos y reproductivos?' }
      ]
    }, context);
  }

  // Tambos informative queries
  if (section === 'tambos') {
    if (qLower.includes('link')) {
      return resJson({
        intent: 'consulta_informativa',
        responseText: 'El campo **Link** es la dirección web necesaria para que Farmerin pueda conectarse con los equipos de medición de tu establecimiento. Sin este dato, no se podrán consultar los horarios de ordeñe.',
        suggestedActions: [
          { label: '¿Cómo edito un tambo?', type: 'query', text: '¿Cómo edito un tambo?' }
        ]
      }, context);
    }

    if (qLower.includes('crear') || qLower.includes('nuevo tambo') || qLower.includes('agregar')) {
      return resJson({
        intent: 'consulta_de_uso',
        responseText: 'Para registrar un nuevo establecimiento en Farmerin:\n\n1. Ingresá a la sección **Tambos**.\n2. En la parte superior del tablero, hacé clic en el botón con el ícono de un cuadrado y signo más (**+**).\n3. Se abrirá la ventana "Crear nuevo Tambo". Completá la información requerida y guardá los cambios.',
        suggestedActions: [
          { label: 'Ir a Tambos', type: 'navigate', path: '/' }
        ]
      }, context);
    }

    if (qLower.includes('editar') || qLower.includes('modificar') || qLower.includes('cambiar')) {
      return resJson({
        intent: 'consulta_de_uso',
        responseText: 'Para actualizar la información de un tambo existente:\n\n1. Buscá la tarjeta del tambo que querés modificar.\n2. Hacé clic en el ícono del **lápiz**.\n3. Se abrirá la ventana "Editar Tambo" con la información actual para que realices los cambios y guardes.',
        suggestedActions: [
          { label: 'Ir a Tambos', type: 'navigate', path: '/' }
        ]
      }, context);
    }

    if (qLower.includes('eliminar') || qLower.includes('borrar')) {
      return resJson({
        intent: 'consulta_de_uso',
        responseText: 'Para eliminar un establecimiento:\n\n1. Seleccioná el ícono del **tacho de basura** en la tarjeta del tambo.\n\n⚠️ **ADVERTENCIA CRÍTICA**: Al eliminar un tambo, el sistema borrará automáticamente todos los animales vinculados a ese lugar. Esta acción es definitiva y no se puede deshacer.',
        suggestedActions: [
          { label: 'Ir a Tambos', type: 'navigate', path: '/' }
        ]
      }, context);
    }

    if (qLower.includes('campos') || qLower.includes('ficha')) {
      return resJson({
        intent: 'consulta_informativa',
        responseText: 'La ficha de un tambo contiene los siguientes campos principales:\n\n- **Nombre**: Nombre identificador del establecimiento.\n- **Ubicación**: Dirección o zona geográfica.\n- **Bajadas**: Cantidad de puntos de ordeñe (predeterminado: 1).\n- **Turnos**: Cantidad de ordeñes al día (predeterminado: 1).\n- **Tolvas**: Cantidad de depósitos de alimento (predeterminado: 10).\n- **Frec. Limpieza**: Días previstos entre limpiezas (predeterminado: 15).\n- **Link**: Dirección web para conectar con los equipos de medición.'
      }, context);
    }

    if (qLower.includes('funciona') || qLower.includes('qué es') || qLower.includes('que es')) {
      return resJson({
        intent: 'consulta_informativa',
        responseText: 'La sección **Tambos** es el panel principal donde administrás tus establecimientos registrados. Al seleccionar un tambo, establecés el entorno activo para operar con el resto de las herramientas de Farmerin (como Animales y Nutrición).'
      }, context);
    }

    return resJson({
      intent: 'consulta_informativa',
      responseText: 'En la sección **Tambos** podés administrar tus establecimientos, consultar horarios de ordeñe y configurar la conexión con tus equipos de medición.',
      suggestedActions: [
        { label: '¿Cómo creo un tambo?', type: 'query', text: '¿Cómo creo un tambo?' },
        { label: '¿Para qué sirve el Link?', type: 'query', text: '¿Para qué sirve el Link?' }
      ]
    }, context);
  }

  // Nutrición / Parámetros / Control informative queries
  if (section === 'nutricion' || section === 'parametros' || section === 'control') {
    // 1. Parámetros: Qué es / para qué sirve
    if (qLower.includes('parámetros') || qLower.includes('parametros') || qLower.includes('cerebro')) {
      return resJson({
        intent: 'parametros_que_es',
        responseText: '### Parámetros Nutricionales\n\nEs la sección donde se configura el "cerebro nutricional" del tambo. Permite definir automáticamente cuántos kilos de alimento (ración) le corresponden a cada animal según su estado productivo (por ejemplo, días de lactancia o litros producidos).\n\n**Estructura principal:**\n- **Grupos de Parámetros**: Conjuntos de reglas (ej. Grupo 0, Grupo 1) que coinciden con el grupo asignado en la ficha de cada animal.\n- **Categorías**: Clasificación interna entre *Vaca* y *Vaquillona*.\n- **Reglas de Ración**: Rangos (Mínimo y Máximo) con su ración base asignada en kg.\n- **Porcentaje de Ajuste**: Ajuste global para modificar las raciones de todo el tambo.',
        suggestedActions: [
          { label: '¿Cómo se determina la ración?', type: 'query', text: '¿Cómo se determina la ración de un animal en Parámetros?' },
          { label: '¿Para qué sirve el Porcentaje de Ajuste?', type: 'query', text: '¿Para qué sirve el Porcentaje de Ajuste?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    // 2. Parámetros: Cómo se determina la ración
    if (qLower.includes('determina la ración') || qLower.includes('determina la racion') || qLower.includes('calcula la ración') || qLower.includes('se determina la ración') || qLower.includes('se determina la racion') || qLower.includes('kilos de alimento') || qLower.includes('rango')) {
      return resJson({
        intent: 'parametros_calculo_racion',
        responseText: '### Determinación de la ración de un animal\n\nEl sistema realiza un cruce exacto de información:\n\n1. **Grupo**: Identifica el número de grupo que tiene la vaca en su ficha personal (ej: Grupo 1).\n2. **Categoría**: Detecta si es Vaca o Vaquillona.\n3. **Rango de Lactancia/Litros**: Busca en la tabla de ese grupo y categoría en qué rango caen sus Días de Lactancia (o litros producidos).\n4. **Asignación**: Si encuentra coincidencia en el rango, le asigna los kilos configurados en esa regla.\n\n*Si el animal no entra en ningún rango o su grupo/rodeo no tiene reglas cargadas, queda fuera del cálculo de ración.*',
        suggestedActions: [
          { label: '¿Para qué sirve el Porcentaje de Ajuste?', type: 'query', text: '¿Para qué sirve el Porcentaje de Ajuste?' },
          { label: '¿Por qué un animal no recibe ración (0 kg)?', type: 'query', text: 'Un animal no recibe ración (aparece con 0 kg)' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    // 3. Parámetros: Porcentaje de Ajuste
    if (qLower.includes('porcentaje de ajuste') || qLower.includes('ajuste global') || qLower.includes('perilla')) {
      return resJson({
        intent: 'parametros_porcentaje_ajuste',
        responseText: '### Porcentaje de Ajuste Global\n\nEs una perilla de ajuste masivo que permite subir o bajar la ración de todos los animales del tambo a la vez (desde -50% hasta +100%) sin necesidad de editar las reglas una por una.\n\n- **Cálculo Final**: La ración final se calcula aplicando este porcentaje sobre la ración base y redondeando el resultado individualmente por animal.\n- **Restablecer**: Se puede volver en cualquier momento al valor inicial del 0%.',
        suggestedActions: [
          { label: '¿Cómo se determina la ración?', type: 'query', text: '¿Cómo se determina la ración de un animal en Parámetros?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    // 4. Parámetros: Animal sin ración / 0 kg
    if (qLower.includes('no recibe ración') || qLower.includes('no recibe racion') || qLower.includes('0 kg') || qLower.includes('0kg') || qLower.includes('fuera del cálculo') || qLower.includes('fuera del calculo')) {
      return resJson({
        intent: 'parametros_animal_sin_porcion',
        responseText: '### ¿Por qué un animal no recibe ración?\n\nSi un animal figura con 0 kg o no se le asigna ración, puede deberse a:\n\n1. **Sin coincidencia de rango**: Sus Días de Lactancia o litros están fuera de los límites (Mínimo y Máximo) de las reglas.\n2. **Grupo o Rodeo no coincidente**: El grupo o rodeo asignado en su ficha no tiene reglas cargadas en la sección de Parámetros.\n3. **Categoría incorrecta**: Las reglas de Vaca o Vaquillona no cubren su situación.\n4. **Estado**: Solo reciben ración automática los animales en estado **"En Ordeñe"** y sin fecha de baja.\n\n**Solución**: Podés ampliar los rangos de las reglas en Parámetros o corregir el grupo/rodeo en la ficha del animal.',
        suggestedActions: [
          { label: '¿Cómo se determina la ración?', type: 'query', text: '¿Cómo se determina la ración de un animal en Parámetros?' },
          { label: 'Hablar con soporte', type: 'support' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    // 5. Control: Qué es la sección Control
    if (qLower.includes('sección control') || qLower.includes('seccion control') || qLower.includes('qué es control') || qLower.includes('que es control') || qLower.includes('control nutricional') || qLower.includes('la sección control')) {
      return resJson({
        intent: 'control_que_es',
        responseText: '### Sección Control Nutricional\n\nEs la herramienta para el seguimiento y gestión diaria de la alimentación del rodeo en ordeñe.\n\n**Principales elementos:**\n- **Ración Asignada (Rac)**: Los kilos de alimento que el animal está recibiendo actualmente.\n- **Ración Sugerida (Sug)**: La recomendación que calcula el sistema aplicando las reglas de Parámetros.\n- **Modos (Automático y Manual)**: Permite definir si la ración sigue los cálculos del sistema o queda fija por decisión del usuario.\n- **Resumen Nutricional**: Muestra promedios de raciones, días de lactancia y litros producidos.',
        suggestedActions: [
          { label: '¿Cómo calcula la ración sugerida?', type: 'query', text: '¿Cómo calcula Farmerin la ración sugerida?' },
          { label: '¿Diferencia entre Automático y Manual?', type: 'query', text: '¿Qué diferencia hay entre Automático y Manual?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    // 6. Control: Cómo calcula la ración sugerida
    if (qLower.includes('calcula la ración sugerida') || qLower.includes('calcula la racion sugerida') || qLower.includes('ración sugerida') || qLower.includes('racion sugerida')) {
      return resJson({
        intent: 'control_calculo_sugerida',
        responseText: '### Cálculo de la Ración Sugerida\n\nFarmerin evalúa al animal de la siguiente manera:\n\n1. **Criterio de Evaluación**: Revisa los datos de Días de Lactancia (DL) o Último Control (UC).\n2. **Cruce con Parámetros**: Busca la regla correspondiente al grupo y categoría del animal.\n3. **Recomendación**: Genera la Ración Sugerida (Sug).\n\n- Si el animal está en **Modo Automático**, consume la ración sugerida.\n- Si está en **Modo Manual**, consume el valor fijado manualmente por el usuario.',
        suggestedActions: [
          { label: '¿Diferencia entre Automático y Manual?', type: 'query', text: '¿Qué diferencia hay entre Automático y Manual?' },
          { label: '¿Cómo vuelvo a modo automático?', type: 'query', text: '¿Cómo vuelvo un animal a modo automático?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    // 7. Control: Modo Automático vs Manual
    if (qLower.includes('automático y manual') || qLower.includes('automatico y manual') || qLower.includes('modo manual') || qLower.includes('modo automático') || qLower.includes('modo automatico') || qLower.includes('diferencia entre')) {
      return resJson({
        intent: 'control_modo_auto_manual',
        responseText: '### Modo Automático vs Modo Manual\n\n- 🤖 **Modo Automático**: Farmerin actualiza automáticamente la ración asignada a medida que cambian los Días de Lactancia o producción del animal según las reglas de Parámetros.\n- ✋ **Modo Manual**: La ración queda fija en el valor ingresado por el usuario y no cambiará automáticamente hasta que se decida volverlo a Modo Automático.\n\n**Alertas de colores:**\n- 🔴 **Rojo**: Ración asignada mayor a la sugerida.\n- 🟢 **Verde**: Ración asignada menor a la sugerida.',
        suggestedActions: [
          { label: '¿Cómo vuelvo a modo automático?', type: 'query', text: '¿Cómo vuelvo un animal a modo automático?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    // 8. Control: Volver a modo automático
    if (qLower.includes('vuelvo un animal') || qLower.includes('vuelvo a modo') || qLower.includes('pasar a automático') || qLower.includes('pasar a automatico') || qLower.includes('cambiar de modo')) {
      return resJson({
        intent: 'control_volver_automatico',
        responseText: '### Volver un animal a Modo Automático\n\nPara que un animal vuelva a calcular su ración según las reglas generales del sistema:\n\n1. Ingresá a la sección **Control**.\n2. Ubicá al animal en la tabla.\n3. Presioná el botón **"Cambiar de modo"** en la fila del animal.\n4. El animal pasará de Modo Manual a Modo Automático y actualizará su ración sugerida.',
        suggestedActions: [
          { label: '¿Diferencia entre Automático y Manual?', type: 'query', text: '¿Qué diferencia hay entre Automático y Manual?' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      }, context);
    }

    // General fallback for Nutrición / Parámetros / Control
    return resJson({
      intent: 'nutricion_general',
      responseText: 'En el módulo de **Nutrición** podés administrar las reglas de alimentación en **Parámetros Nutricionales** (definir raciones por Días de Lactancia o producción y porcentaje de ajuste) y realizar el seguimiento diario del rodeo en **Control Nutricional** (gestión de raciones asignadas, sugeridas y modos automático/manual).',
      suggestedActions: [
        { label: '¿Qué es Parámetros?', type: 'query', text: '¿Qué es Parámetros Nutricionales y para qué sirve?' },
        { label: '¿Qué es Control?', type: 'query', text: '¿Qué es la sección Control y para qué sirve?' },
        { label: 'Reiniciar preguntas', type: 'reset_login' }
      ]
    }, context);
  }

  return resJson({
    intent: 'consulta_informativa',
    responseText: 'En la sección **Tambos** podés administrar tus establecimientos, consultar horarios de ordeñe y configurar la conexión con tus equipos de medición.',
    suggestedActions: [
      { label: '¿Cómo creo un tambo?', type: 'query', text: '¿Cómo creo un tambo?' },
      { label: '¿Para qué sirve el Link?', type: 'query', text: '¿Para qué sirve el Link?' }
    ]
  }, context);
}

async function executeAnimalSearch(searchMode, searchInput, context) {
  if (!context?.tamboId) {
    return {
      intent: 'busqueda_animal_sin_tambo',
      responseText: 'No tenés un tambo seleccionado actualmente. Por favor, seleccioná un tambo para poder realizar la búsqueda de un animal.',
      searchMode: null,
      suggestedActions: [
        { label: 'Reiniciar preguntas', type: 'reset_login' }
      ]
    };
  }

  const queryTerm = (searchInput || '').trim().toLowerCase();
  if (!queryTerm) {
    const isRp = searchMode === 'AWAITING_RP';
    return {
      intent: 'busqueda_animal_vacia',
      responseText: isRp
        ? 'No ingresaste ningún RP. Escribí el RP del animal que querés buscar.'
        : 'No ingresaste ningún eRP. Escribí el eRP del animal que querés buscar.',
      searchMode,
      suggestedActions: [
        { label: 'Reiniciar preguntas', type: 'reset_login' }
      ]
    };
  }

  try {
    const snapshot = await firebase.db.collection('animal')
      .where('idtambo', '==', context.tamboId)
      .where('fbaja', '==', '')
      .get();

    let animalEncontrado = null;

    snapshot.forEach(doc => {
      if (animalEncontrado) return;
      const data = doc.data();

      if (searchMode === 'AWAITING_RP') {
        const val = data.rp !== undefined && data.rp !== null ? String(data.rp).trim().toLowerCase() : '';
        if (val === queryTerm) {
          animalEncontrado = { id: doc.id, ...data };
        }
      } else if (searchMode === 'AWAITING_ERP') {
        const val = data.erp !== undefined && data.erp !== null ? String(data.erp).trim().toLowerCase() : '';
        if (val === queryTerm) {
          animalEncontrado = { id: doc.id, ...data };
        }
      }
    });

    if (!animalEncontrado) {
      const isRp = searchMode === 'AWAITING_RP';
      const mensajeNoEncontrado = isRp
        ? 'No encontré ningún animal con ese RP. ¿Querés intentarlo nuevamente?'
        : 'No encontré ningún animal con ese eRP. ¿Querés intentarlo nuevamente?';

      return {
        intent: 'busqueda_animal_no_encontrado',
        responseText: mensajeNoEncontrado,
        searchMode: null,
        suggestedActions: [
          { label: 'Buscar por RP (caravana)', type: 'query', text: 'Buscar por RP (caravana)' },
          { label: 'Buscar por eRP (botón electrónico)', type: 'query', text: 'Buscar por eRP (botón electrónico)' },
          { label: 'Reiniciar preguntas', type: 'reset_login' }
        ]
      };
    }

    const screen = (context.screen || '').toLowerCase();
    const section = (context.section || '').toLowerCase();
    const responseText = formatAnimalInfoForSection(animalEncontrado, screen, section);

    return {
      intent: 'busqueda_animal_exito',
      responseText,
      searchMode: null,
      suggestedActions: [
        { label: 'Buscar otro animal', type: 'query', text: '¿Deseás buscar un animal en específico?' },
        { label: 'Reiniciar preguntas', type: 'reset_login' }
      ]
    };
  } catch (err) {
    console.error('Error al buscar animal en Firestore:', err);
    return {
      intent: 'busqueda_animal_error',
      responseText: 'Ocurrió un error al consultar la base de datos para buscar el animal. Por favor, intentá nuevamente.',
      searchMode: null,
      suggestedActions: [
        { label: 'Reiniciar preguntas', type: 'reset_login' }
      ]
    };
  }
}

function formatAnimalInfoForSection(animal, screen, section) {
  // 1. Sección "Animales" (/animales -> screen 'listado_animales')
  // MOSTRAR EXCLUSIVAMENTE: RP, eRP, EstPro, EstRep, Categoría, Grupo
  if (screen === 'listado_animales' || section === 'animales') {
    return [
      '### Información del animal',
      '',
      `* **RP:** ${animal.rp ?? '—'}`,
      `* **eRP:** ${animal.erp ?? '—'}`,
      `* **EstPro:** ${animal.estpro ?? '—'}`,
      `* **EstRep:** ${animal.estrep ?? '—'}`,
      `* **Categoría:** ${animal.categoria ?? '—'}`,
      `* **Grupo:** ${animal.grupo ?? '—'}`
    ].join('\n');
  }

  // 2. Sección "Gral Animales" (/gralAnimales -> screen 'gral_animales')
  if (screen === 'gral_animales') {
    let diasLact = 0;
    if (animal.estpro === 'En Ordeñe' && animal.fparto) {
      try {
        diasLact = differenceInDays(Date.now(), new Date(animal.fparto));
      } catch (e) {
        diasLact = 0;
      }
    }
    let fserFormatted = '';
    if (animal.fservicio) {
      try {
        fserFormatted = format(new Date(animal.fservicio), 'dd/MM/yy');
      } catch (e) {
        fserFormatted = '';
      }
    }

    return [
      '### Información del animal',
      '',
      `* **RP:** ${animal.rp ?? '—'}`,
      `* **eRP:** ${animal.erp ?? '—'}`,
      `* **Grupo:** ${animal.grupo ?? '—'}`,
      `* **Categoría:** ${animal.categoria ?? '—'}`,
      `* **Rodeo:** ${animal.rodeo ?? '—'}`,
      `* **EstRep:** ${animal.estrep ?? '—'}`,
      `* **EstPro:** ${animal.estpro ?? '—'}`,
      `* **Lactancia:** ${animal.lactancia ?? '—'}`,
      `* **UC:** ${animal.uc ?? '—'}`,
      `* **CA:** ${animal.ca ?? '—'}`,
      `* **Días Lactancia:** ${diasLact}`,
      `* **Ración:** ${animal.racion ?? '—'}`,
      `* **N° Servicio:** ${animal.nservicio ?? '—'}`,
      `* **Fecha Servicio:** ${fserFormatted || '—'}`
    ].join('\n');
  }

  // 3. Cargar Control Lechero (/controlLechero -> screen 'cargar_control_lechero')
  if (screen === 'cargar_control_lechero') {
    return [
      '### Información del animal',
      '',
      `* **RP:** ${animal.rp ?? '—'}`,
      `* **eRP:** ${animal.erp ?? '—'}`,
      `* **EstPro:** ${animal.estpro ?? '—'}`,
      `* **Litros UC:** ${animal.uc ?? '—'}`
    ].join('\n');
  }

  // 4. Reporte Control Lechero (/ControlLecheroMensual -> screen 'reporte_control_lechero')
  if (screen === 'reporte_control_lechero') {
    return [
      '### Información del animal',
      '',
      `* **RP:** ${animal.rp ?? '—'}`,
      `* **eRP:** ${animal.erp ?? '—'}`,
      `* **Categoría:** ${animal.categoria ?? '—'}`,
      `* **EstPro:** ${animal.estpro ?? '—'}`,
      `* **EstRep:** ${animal.estrep ?? '—'}`,
      `* **Último Control:** ${animal.uc ?? '—'}`
    ].join('\n');
  }

  // 5. Control Nutricional (/control -> screen 'control_nutricion')
  if (screen === 'control_nutricion' || section === 'control') {
    return [
      '### Información del animal',
      '',
      `* **RP:** ${animal.rp ?? '—'}`,
      `* **Grupo:** ${animal.grupo ?? '—'}`,
      `* **Categoría:** ${animal.categoria ?? '—'}`,
      `* **Rodeo:** ${animal.rodeo ?? '—'}`,
      `* **Ración:** ${animal.racion ?? '—'} kg`,
      `* **Modo Ración:** ${animal.racionManual ? 'Manual' : 'Automático'}`
    ].join('\n');
  }

  // 6. Control de Turnos (/IngresosTurnos -> screen 'control_turnos')
  if (screen === 'control_turnos') {
    return [
      '### Información del animal',
      '',
      `* **RP:** ${animal.rp ?? '—'}`,
      `* **eRP:** ${animal.erp ?? '—'}`,
      `* **EstPro:** ${animal.estpro ?? '—'}`,
      `* **Grupo:** ${animal.grupo ?? '—'}`,
      `* **Rodeo:** ${animal.rodeo ?? '—'}`
    ].join('\n');
  }

  // 7. Parte Diario (/parteDiario -> screen 'parte_diario')
  if (screen === 'parte_diario') {
    return [
      '### Información del animal',
      '',
      `* **RP:** ${animal.rp ?? '—'}`,
      `* **eRP:** ${animal.erp ?? '—'}`,
      `* **EstPro:** ${animal.estpro ?? '—'}`,
      `* **EstRep:** ${animal.estrep ?? '—'}`,
      `* **Categoría:** ${animal.categoria ?? '—'}`
    ].join('\n');
  }

  // 8. Reportes DIRSA (reporte_produccion, reporte_eventos)
  if (screen === 'reporte_produccion' || screen === 'reporte_eventos' || section === 'dirsa') {
    return [
      '### Información del animal',
      '',
      `* **RP:** ${animal.rp ?? '—'}`,
      `* **eRP:** ${animal.erp ?? '—'}`,
      `* **EstPro:** ${animal.estpro ?? '—'}`,
      `* **Categoría:** ${animal.categoria ?? '—'}`
    ].join('\n');
  }

  // General fallback para cualquier otra sección permitida
  return [
    '### Información del animal',
    '',
    `* **RP:** ${animal.rp ?? '—'}`,
    `* **eRP:** ${animal.erp ?? '—'}`,
    `* **EstPro:** ${animal.estpro ?? '—'}`,
    `* **EstRep:** ${animal.estrep ?? '—'}`,
    `* **Categoría:** ${animal.categoria ?? '—'}`
  ].join('\n');
}

function resJson(data, context) {
  const section = (context?.section || 'tambos').toLowerCase();
  const suggestedActions = [...(data.suggestedActions || [])];

  // Regla global (Login, Tambos, Animales, Nutrición, Reportes, Ayuda y subsecciones): Toda respuesta incluye botón de reinicio
  if (section === 'login' || section === 'tambos' || section === 'animales' || section === 'nutricion' || section === 'parametros' || section === 'control' || section === 'reportes' || section === 'produccion' || section === 'parte_diario' || section === 'ayuda') {
    const resetLabel = section === 'login' ? 'Volver al inicio' : 'Reiniciar preguntas';
    const textLower = (data.responseText || '').toLowerCase();

    // En todas las respuestas donde el usuario pueda necesitar asistencia o se mencione soporte
    if (textLower.includes('soporte') || data.offerSupport) {
      const hasSupport = suggestedActions.some(a => a.type === 'support' || a.label.toLowerCase().includes('soporte'));
      if (!hasSupport) {
        const supportLabel = (section === 'animales' || section === 'nutricion' || section === 'parametros' || section === 'control') ? 'Hablar con soporte' : 'Contactar con soporte';
        suggestedActions.push({ label: supportLabel, type: 'support' });
      }
    }

    const hasReset = suggestedActions.some(a => a.type === 'reset_login' || a.label === resetLabel);
    if (!hasReset) {
      suggestedActions.push({ label: resetLabel, type: 'reset_login' });
    } else {
      // Garantizar que 'Reiniciar preguntas' siempre quede en la última posición
      const resetIndex = suggestedActions.findIndex(a => a.type === 'reset_login' || a.label === resetLabel);
      if (resetIndex !== -1 && resetIndex !== suggestedActions.length - 1) {
        const [resetItem] = suggestedActions.splice(resetIndex, 1);
        suggestedActions.push(resetItem);
      }
    }
  }

  return {
    success: true,
    section,
    ...data,
    suggestedActions
  };
}
