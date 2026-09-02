Documentación de la Sección: Control (Farmerin)
Este documento detalla el funcionamiento de la sección Control, el área del sistema dedicada al seguimiento y gestión de la alimentación de los animales en ordeñe
.
1. Qué es Control y para qué sirve
La sección de Control permite realizar el seguimiento de la alimentación del rodeo mediante herramientas de visualización y análisis
. Su propósito principal es asegurar que cada animal reciba la ración adecuada, permitiendo que el sistema calcule sugerencias automáticas o que el administrador realice ajustes manuales según sea necesario
.
2. Cómo acceder y selección del usuario
Para utilizar esta sección, el usuario debe:
Ingresar al módulo de Control en la plataforma.
Seleccionar el Tambo específico a consultar mediante el componente de selección
.
Una vez seleccionado el tambo, se carga la información de los animales y los parámetros de nutrición asociados
.
3. Qué información muestra la pantalla
La pantalla se divide en dos áreas principales:
Resumen Nutricional (Parte superior): Muestra indicadores generales como el total de animales, cantidad en modo automático y manual, y promedios de raciones, días de lactancia y producción
.
Listado de Animales (Tabla): Una lista detallada con la situación individual de cada animal
.
Botones de Acción: Acceso a la consulta por rodeos y la opción de Descargar Excel
.
4. Cómo se organizan los animales y grupos
Los animales se presentan en una tabla y pueden organizarse según:
Identificación: Por su número de RP
.
Clasificación: Por el Grupo de alimentación, el Rodeo de ingreso y su Categoría (ej. vaca, vaquillona)
.
5. Qué significan los principales datos y columnas
RP: Identificador único del animal
.
Ración Asignada (Rac): La cantidad de alimento que el animal está consumiendo actualmente
.
Ración Sugerida (Sug): El valor calculado por el sistema basándose en las reglas de nutrición
.
Decisión/Criterio: Indica qué regla se usó para calcular la ración (Días de Lactancia o Producción)
.
Modo: Indica si el animal está en Automático (Farmerin actualiza la ración solo) o Manual (el valor queda fijo hasta que el usuario lo cambie)
.
Días de Lactancia (DL): Días transcurridos desde el último parto
.
Producción (UC): Litros producidos registrados en el Último Control
.
6. Cómo se calcula la ración de cada animal
El sistema determina la ración siguiendo estos pasos:
Criterio de Evaluación: Según lo configurado en la sección "Parámetros", el sistema evalúa al animal por sus Días de Lactancia o por su Producción (Último Control)
.
Cálculo Automático: Farmerin cruza el dato del animal con la tabla de nutrición configurada y genera la Ración Sugerida
.
Asignación:
Si está en Modo Automático, la ración asignada es igual a la sugerida
.
Si está en Modo Manual, el animal consume lo que el administrador definió, ignorando los cambios automáticos del sistema
.
7. Cómo funcionan los promedios y totales
El sistema calcula automáticamente promedios para facilitar el análisis del rodeo:
Promedio Actual: Media de las raciones que se están entregando efectivamente
.
Promedio Sugerido: Media de lo que el sistema recomienda entregar
.
Promedio Lactancia: Media de los días de lactancia del rodeo
.
Promedio Ración Modificada: [POR VERIFICAR] (Parece indicar el promedio de las raciones que han sido editadas manualmente)
.
Indicadores de Cantidad: Total de animales en el sistema y desglose de cuántos están bajo control manual o automático
.
8. Qué relación tiene Control con Parámetros y Animales
Animales: Es la fuente de datos básicos (RP, categoría, grupo, rodeo, producción y fecha de parto)
.
Parámetros (Nutrición): Es donde se definen las reglas. Control aplica esas reglas para mostrar la ración sugerida y explicar la "Decisión"
.
9. Qué filtros, búsquedas u opciones de consulta existen
Ordenamiento: Se puede ordenar la tabla por columnas como RP, DL, UC, Grupo, Rodeo y Ración
.
Consulta por Rodeo: Botones específicos para ver la distribución de animales según su rodeo
.
Filtros: Existe una opción de filtrado general
. [INFORMACIÓN NO ENCONTRADA sobre los campos específicos del filtro].
Búsqueda: [POR VERIFICAR] (Es probable que exista búsqueda por RP, pero no se detalla su funcionamiento exacto en las fuentes).
10. Qué acciones puede realizar el usuario
Modificar Ración: Editar manualmente la cantidad de alimento de un animal
.
Cambiar Modo: Pasar a un animal de Automático a Manual y viceversa
.
Exportar Datos: Descargar la planilla en formato Excel
.
Consultar Detalles: Ver la explicación de por qué el sistema sugiere una ración determinada
.
11. Qué validaciones o reglas importantes existen
Validación de Modo Manual: Si el usuario edita la ración y el valor es diferente al sugerido, el sistema marca automáticamente al animal como Ración Manual
.
Alertas Visuales (Colores):
Rojo: La ración asignada es mayor que la sugerida por el sistema
.
Verde: La ración asignada es menor que la sugerida
.
Azul/Info: La ración es igual a la sugerida o es un valor de referencia inicial
.
Notificaciones: Al entrar a Control, el sistema avisa qué animales están en modo manual para que el administrador no los pierda de vista
.
12. Qué información puede consultar la IA
La IA puede informar al usuario sobre:
Raciones asignadas y sugeridas para cualquier animal por su RP
.
El motivo o criterio (DL o UC) por el cual un animal tiene esa sugerencia
.
Estado del rodeo (cuántos animales hay, cuántos manuales/automáticos y promedios)
.
Diferencias entre lo que el animal consume y lo que debería consumir según los parámetros
.
13. Qué acciones NO puede realizar la IA
Modificar datos: La IA no puede cambiar raciones, pasar animales a manual o editar parámetros [IA Policy].
Descargar archivos: No puede ejecutar la descarga del Excel por el usuario [IA Policy].
Eliminar registros: No puede borrar animales ni historiales de alimentación [IA Policy].