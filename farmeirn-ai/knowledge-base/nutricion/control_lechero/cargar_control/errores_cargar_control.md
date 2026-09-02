Guía de Errores: Cargar Control - Farmerin
Esta guía contiene los problemas más comunes que pueden surgir al utilizar la sección de carga de control lechero, sus posibles causas y cómo solucionarlos de manera simple.
1. Problemas de Acceso y Pantalla
Problema: No puedo acceder a Cargar Control o la pantalla aparece vacía.
Qué puede estar pasando: No tenés seleccionado un tambo en el sistema.
Qué puede revisar el usuario: Si en el selector de tambos (ubicado generalmente en la parte superior de la pantalla) tenés un tambo activo seleccionado.
Cómo solucionarlo: Seleccioná un tambo activo en el sistema. Al hacerlo, se habilitarán y visualizarán correctamente las opciones de la pantalla de carga.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿Tenés seleccionado un tambo actualmente en la parte superior del sistema?
¿Podés visualizar las demás opciones del menú Nutrición y Control Lechero?
2. Problemas con el Archivo y la Planilla
Problema: El archivo de la planilla no es aceptado o no puedo cargar la planilla.
Qué puede estar pasando: Es posible que el archivo seleccionado no tenga el formato correcto (debe ser una planilla de tipo Excel) o que estés intentando cargar una planilla correspondiente al formato de Dirsa en lugar del de Farmerin.
Qué puede revisar el usuario: Si el archivo que estás seleccionando es un documento Excel (.xlsx) y si la información corresponde a controles lecheros realizados de manera directa con Farmerin.
Cómo solucionarlo: Asegurate de que tu archivo esté en formato Excel (.xlsx). Podés descargar la planilla vacía o la planilla modelo que ofrece la pantalla para verificar la estructura correcta, copiar tus datos allí y subir ese archivo. Si tu planilla es de Dirsa, no la subas en esta pantalla; debés ir a la sección Dirsa y elegir Cargar eventos.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿El archivo que estás intentando cargar termina en .xlsx?
¿Se trata de una planilla de control lechero oficial de Dirsa o de un control directo de Farmerin?
Problema: No puedo iniciar la carga o el botón para cargar no funciona.
Qué puede estar pasando: No seleccionaste ningún archivo Excel o el arrastre (drag and drop) no se completó de manera correcta, por lo que el sistema no reconoce que haya una planilla lista para ser procesada.
Qué puede revisar el usuario: Si el nombre del archivo seleccionado se visualiza en la pantalla de carga o si la zona de subida sigue vacía.
Cómo solucionarlo: Volvé a seleccionar tu planilla Excel desde tu dispositivo o arrastrala directamente a la zona indicada de la pantalla para asegurarte de que quede vinculada. Una vez que figure cargada, presioná el botón Cargar control lechero.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿Pudiste arrastrar o seleccionar el archivo correctamente de modo que se visualice su nombre en la pantalla?
¿El botón "Cargar control lechero" aparece habilitado para hacer clic o se muestra de forma inactiva?
3. Errores en los Datos del Animal
Problema: Un animal da error en ERP/RP (identificación).
Qué puede estar pasando: El sistema no puede identificar al animal porque el identificador (sea el ERP o botón electrónico, o el RP) ingresado en la fila está vacío, tiene un error tipográfico o tiene un formato que el sistema no puede convertir a texto.
Qué puede revisar el usuario: El reporte de errores de la carga para ver la fila exacta que falló y comprobar si el eRP/RP ingresado en tu planilla coincide con la identificación real cargada en Farmerin.
Cómo solucionarlo: Buscá la fila fallida en tu planilla Excel y verificá el identificador del animal. Corregí cualquier error de escritura, guardá el archivo y volvé a importarlo.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿Qué número de fila y qué identificador de animal te reporta el sistema con error?
¿Ese número de ERP o RP está registrado y escrito exactamente igual en la ficha del animal en Farmerin?
Problema: Error en los litros o problema con el formato de litros.
Qué puede estar pasando: Los litros ingresados para el animal tienen un problema de formato, como contener letras, símbolos no numéricos o espacios vacíos que impiden su procesamiento como número.
Qué puede revisar el usuario: Si la columna de litros de la fila con error contiene datos que no son numéricos.
Cómo solucionarlo: Farmerin convierte de forma automática las comas en puntos (por ejemplo, si pusiste "12,5" lo procesa como "12.5"), pero no puede resolver letras o caracteres extraños. Buscá la fila indicada en tu planilla Excel, asegurate de que solo haya números en los litros, guardá el archivo y volvé a cargarlo.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿La columna de litros de la fila con error contiene letras o caracteres que no sean números?
¿El mensaje de error que te muestra el sistema dice específicamente "Error de formato en Lts."?
Problema: Error en una fila específica de la planilla.
Qué puede estar pasando: Hay un dato incorrecto (sea el ERP/RP del animal o el formato de los litros) en esa fila exacta del archivo Excel que impide que el sistema lo procese correctamente.
Qué puede revisar el usuario: El listado de resultados de la carga que genera Farmerin en tiempo real, el cual te informa con precisión el número de fila con inconvenientes.
Cómo solucionarlo: Abrí tu archivo Excel, buscá el número de fila indicado en el reporte del sistema y verificá qué dato (el ERP/RP o los litros) está mal cargado. Corregilo, guardá el archivo y volvé a subirlo.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿Qué número de fila te marca el sistema con error?
¿Qué información de ERP/RP y de litros tiene cargada esa fila en tu archivo de Excel?
4. Problemas durante el Procesamiento
Problema: Algunos animales se cargaron correctamente y otros dieron error.
Qué puede estar pasando: Los animales que se procesaron con éxito tenían sus datos en orden, mientras que las filas con error contenían datos inválidos de ERP/RP o formatos incorrectos de litros.
Qué puede revisar el usuario: La lista de progreso en tiempo real para separar los registros que se cargaron con éxito de los que fallaron.
Cómo solucionarlo: No necesitás volver a cargar la planilla completa. Lo ideal es que crees un archivo nuevo en Excel con únicamente las filas de los animales que dieron error, corrijas sus datos (ERP/RP o formato de litros) y subas solamente esa planilla reducida. Así el sistema procesará los datos pendientes sin duplicar la información que ya se cargó bien.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿Identificaste cuáles animales se cargaron de forma correcta y cuáles fallaron con ayuda del reporte en pantalla?
¿Armaste una planilla nueva con solo los registros que dieron error para reintentar la carga?
Problema: La carga no termina o parece detenida.
Qué puede estar pasando: [INFORMACIÓN NO ENCONTRADA]
Qué puede revisar el usuario: Si tenés conexión a internet estable y si el sistema muestra actividad (como el indicador de progreso en tiempo real procesando animales).
Cómo solucionarlo: [INFORMACIÓN NO ENCONTRADA] / [POR VERIFICAR]
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿El indicador de progreso en tiempo real de la carga se detuvo por completo o se muestra algún movimiento?
¿Se procesó correctamente algún animal de la lista antes de que pareciera detenerse?
5. Visualización y Resultados de la Carga
Problema: No encuentro un control que cargué o los datos cargados no aparecen en el reporte.
Qué puede estar pasando: Puede ser que estés consultando un mes incorrecto en los filtros del reporte o que los datos cargados correspondan a una planilla de Dirsa, los cuales no se muestran en el reporte general de Farmerin.
Qué puede revisar el usuario: Qué mes tenés seleccionado para filtrar en el Reporte de Control Lechero y si el origen de la planilla que subiste corresponde a Farmerin o a Dirsa.
Cómo solucionarlo: Andá a Nutrición, luego a Control Lechero y seleccioná Reporte de control lechero. Verificá que estés seleccionando el mes correspondiente en el que cargaste el control. Si se trataba de una planilla de Dirsa, recordá que esos controles no aparecen en este reporte; debés consultarlos en la sección Dirsa, dentro del apartado Reporte de producción.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿Qué mes tenés seleccionado actualmente en los filtros de tu Reporte de Control Lechero?
¿La planilla que subiste contenía controles directos de Farmerin o se trataba de un archivo proveniente de Dirsa?
Problema: La fecha del control no es la esperada.
Qué puede estar pasando: No se seleccionó la fecha correspondiente en la pantalla antes de iniciar la carga, por lo que el sistema asignó automáticamente la fecha del día de hoy por defecto.
Qué puede revisar el usuario: La fecha que figura registrada en el Reporte de Control Lechero para los datos cargados.
Cómo solucionarlo: Cuando vayas a realizar una carga, antes de apretar el botón "Cargar control lechero", tenés que asegurarte de revisar el campo de fecha en la pantalla y seleccionar manualmente el día correcto si no querés que se use la fecha del día actual por defecto.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿La fecha que figura en el reporte es la del día en que hiciste la carga o la del control real?
¿Cambiaste el campo de fecha sugerido en la pantalla antes de iniciar la carga?
6. Procedimientos de Corrección y Cargas de Terceros
Problema: Estoy intentando cargar una planilla de Dirsa.
Qué puede estar pasando: Estás queriendo subir datos de Dirsa en la pantalla "Cargar Control", la cual solo admite controles directos hechos con Farmerin.
Qué puede revisar el usuario: El origen y encabezado de la planilla que querés subir.
Cómo solucionarlo: No intentes cargar esta planilla en la sección "Cargar Control". Debés dirigirte directamente a la sección Dirsa y seleccionar la opción Cargar eventos para procesar la información de Dirsa de forma correcta.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿Tu archivo corresponde a un control oficial emitido por Dirsa?
¿Estás intentando realizar la carga desde la opción "Cargar Control" dentro de Control Lechero?
Problema: No sé cómo corregir un error de la planilla o no puedo volver a cargar un registro corregido.
Qué puede estar pasando: Puede haber confusión sobre cómo editar el archivo o temor a duplicar la información de los animales que ya se subieron correctamente.
Qué puede revisar el usuario: El reporte de errores generado por el sistema para identificar los animales y las filas con problemas.
Cómo solucionarlo: Abrí tu planilla Excel original, buscá las filas con problemas, corregí el dato correspondiente (asegurándote de que el ERP/RP sea correcto y que en litros solo haya números) y guardá el archivo. Alternativamente, armá una planilla nueva que contenga únicamente esos animales corregidos. Subí el archivo corregido a la plataforma y hacé clic en Cargar control lechero. El sistema actualizará la información sin duplicar los registros anteriores.
Si continúa: [INFORMACIÓN NO ENCONTRADA]
Preguntas para diagnosticar:
¿Pudiste encontrar en tu planilla Excel las filas que el sistema te reportó con error?
¿Armaste un nuevo archivo Excel exclusivamente con los registros corregidos o estás intentando subir la misma planilla original modificada?