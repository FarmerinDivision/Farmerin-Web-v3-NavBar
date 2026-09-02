# Cargar Control - Farmerin

## 1. ¿Qué es Cargar Control y para qué sirve?
Esta sección te permite cargar la producción mensual de tus animales de una manera rápida y sencilla. Sirve para actualizar la información productiva que utiliza Farmerin para realizar el seguimiento del rodeo. Es importante tener en cuenta que en esta sección solo se cargan los controles lecheros realizados con Farmerin; si contás con una planilla de Dirsa, debés dirigirte a la sección Dirsa.

## 2. ¿Cómo acceder?
Para ingresar, tenés que ir a la sección **Nutrición**, luego seleccionar **Control Lechero** y finalmente elegir la opción **Cargar Control**. Como requisito para poder operar en esta pantalla y visualizar su contenido, tenés que tener seleccionado un tambo. Cualquier otro requisito: [INFORMACIÓN NO ENCONTRADA].

## 3. ¿Qué información se carga?
La carga se realiza completando una planilla (de tipo Excel) con la siguiente información:
*   **Identificación del animal:** Se debe completar el **ERP** (botón electrónico) o el **RP** de cada animal para identificarlo y relacionar los datos con su ficha correspondiente en el sistema.
*   **Litros producidos:** Los litros producidos por cada animal durante ese mes.
*   **Anomalía:** En caso de que corresponda o sea necesario, podés indicar una anomalía.
*   **Fecha del control:** Se registra la fecha del control (por defecto, el sistema sugiere la fecha del día actual).
*   **Días de lactancia u otros campos:** [INFORMACIÓN NO ENCONTRADA].

## 4. ¿Cómo se realiza una carga?
El procedimiento confirmado para realizar la carga de los datos es el siguiente:
1.  **Descargar la planilla:** En la pantalla de "Cargar Control", podés descargar una planilla vacía para completarla con tus propios datos. También tenés la opción de descargar una planilla modelo que sirve como ejemplo para ver cómo debe estar armada la información antes de subirla.
2.  **Completar la planilla:** Llená la planilla ingresando el ERP o RP de cada animal, los litros producidos en el mes y, de ser necesario, la anomalía.
3.  **Seleccionar la fecha:** Podés cambiar o confirmar la fecha del control en la pantalla.
4.  **Subir el archivo:** Seleccioná tu planilla completa. Podés arrastrar y soltar el archivo directamente en la pantalla (drag and drop) o seleccionarlo desde tu dispositivo.
5.  **Ejecutar la carga:** Presioná el botón "Cargar control lechero". Durante el proceso, el sistema te mostrará el progreso en tiempo real indicando qué animales se van procesando correctamente.
6.  **Revisar los resultados:** Al finalizar, el sistema detallará qué animales se cargaron correctamente y cuáles tuvieron algún error (indicando la fila y el eRP/RP con problemas) para que puedas corregir la información de ese registro y volver a cargarlo únicamente a él.

## 5. Validaciones y reglas importantes
*   **Selección de Tambo obligatorio:** Tenés que tener un tambo seleccionado para poder usar la sección.
*   **Planilla obligatoria:** Es necesario haber seleccionado o arrastrado una planilla válida para poder iniciar el proceso.
*   **Formato de Litros:** Los litros producidos deben tener un formato correcto. Si los ingresás con coma (por ejemplo, "12,5"), el sistema automáticamente reemplazará la coma por un punto ("12.5") para procesarlo. Si ocurre un error de formato en los litros, el sistema generará un mensaje de error indicando la fila y el eRP/RP del animal.
*   **Formato de ERP/RP:** El identificador debe ser válido y convertible a texto por el sistema. Si hay un problema con este dato, se registrará un error indicando la fila.
*   **Controles de Farmerin exclusivamente:** Esta sección solo admite controles lecheros hechos con Farmerin. Si contás con una planilla de Dirsa, debés gestionar la carga desde la sección Dirsa, seleccionando "Cargar eventos".
*   **Otras validaciones adicionales:** [INFORMACIÓN NO ENCONTRADA].

## 6. Relación con otras secciones
*   **Nutrición / Control Lechero:** Esta funcionalidad se encuentra dentro del módulo de Control Lechero de la sección Nutrición.
*   **Reporte de Control Lechero:** Una vez realizada la carga, podés ir al "Reporte de control lechero", seleccionar el mes y ver la lista completa de todos los animales que participaron en el control junto con sus respectivos datos.
*   **Ficha del animal:** Desde el Reporte de Control Lechero, podés hacer clic para ingresar directamente a la ficha individual del animal.
*   **Gráficos y Curvas:** En el Reporte de Control Lechero, cada animal cuenta con un botón "Ver curva" para visualizar un gráfico con la evolución de su producción en sus controles lecheros. También hay un botón "Ver gráfico" que muestra un gráfico anual de la producción mes a mes.
*   **Sección Dirsa:** Funciona de manera independiente. Si necesitás consultar los controles de Dirsa, debés ir a la sección Dirsa en el apartado de "Reporte de producción".
*   **Relación con Animales, Control y Parámetros:** La información se asocia automáticamente a la ficha de los animales utilizando su ERP o RP. Respecto a la sección Control y Parámetros: [INFORMACIÓN NO ENCONTRADA].

## 7. ¿Qué pasa después de cargar un control?
*   Se actualizan los registros de producción mensual de los animales en el sistema de Farmerin.
*   Los datos quedan disponibles para ser consultados en el Reporte de Control Lechero según el mes correspondiente.
*   Se actualizan los gráficos de las curvas de producción individual e histórica de cada animal, así como el gráfico de evolución anual de producción.

## 8. ¿Qué puede consultar la IA?
El asistente de IA puede ayudarte a:
*   Explicarte qué es la sección, para qué sirve y cómo tenés que realizar la carga paso a paso.
*   Indicarte qué datos son obligatorios y cómo deben estructurarse en la planilla (ERP/RP, litros, anomalías).
*   Guiarte en la interpretación de los mensajes de error (por ejemplo, indicándote en qué fila del archivo está el problema de formato).
*   Explicarte dónde ver los reportes, gráficos de curvas o cómo acceder a la ficha del animal una vez cargados los datos.
*   Recordarte a qué sección debés ir si tus controles provienen de Dirsa en lugar de Farmerin.

## 9. ¿Qué NO puede hacer la IA?
*   La IA no tiene permisos para subir planillas, guardar o modificar datos en el sistema en tu lugar.
*   No puede conectarse a tu cuenta de Farmerin ni interactuar de forma directa con la base de datos para corregir archivos.
*   No puede solucionar los errores de tu archivo Excel directamente; solo puede guiarte para que sepas qué fila y qué dato debés corregir vos mismo en tu planilla antes de volver a subirla.