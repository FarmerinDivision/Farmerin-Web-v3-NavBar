# Parámetros Nutricionales - Farmerin

Este documento es la fuente de verdad oficial para el funcionamiento de la sección **Parámetros**. El asistente de IA debe utilizar esta información para responder consultas de manera precisa, sin inventar funcionalidades ni reglas.

---

## Objetivo

La sección **Parámetros** permite configurar y administrar los criterios de alimentación de los animales del tambo.

Desde esta sección se pueden crear **grupos de alimentación**, establecer los criterios que determinan qué ración corresponde a cada grupo y realizar aumentos o reducciones proporcionales de la ración.

Como configuración estándar, Farmerin cuenta con el **Grupo 0**.

---

## 1. Grupos de Alimentación y Criterios

### Creación de un Grupo
Para crear un nuevo grupo de alimentación:
1. Dirigirse al botón **Nuevo grupo**.
2. Al presionarlo, se desplegará un formulario para crear y configurar los parámetros o criterios de alimentación para vacas y vaquillonas.

### Creación de Criterios de Alimentación
Dentro del formulario de configuración del grupo:
1. Presionar el botón **Nueva**, ubicado en el lado derecho del título, para comenzar a crear un nuevo criterio de alimentación.
2. Se mostrará un formulario donde se parametrizará la alimentación según:
   - **Días de lactancia.**
   - **Litros producidos.**
   - Un **rango de días**.
   - Un **rango de litros**.
   - Una cantidad **menor o mayor** a determinada cantidad de días o litros.
   - Los **kg de ración** que recibirán los animales que ingresen dentro de ese criterio.

De esta manera, se establecen diferentes criterios para determinar qué cantidad de ración corresponde a cada rodeo u orden de alimentación (por ejemplo, asignar ración a animales con determinada cantidad de días de lactancia y determinada producción de litros).

---

## 2. Botones de Aumento y Reducción de Ración

Los botones de **Aumento** y **Reducción** sirven para modificar proporcionalmente la ración que se está dosificando a los animales.

- **Aumento de ración**: Se puede aplicar desde un **10 % hasta un 100 %**.
- **Reducción de ración**: Se puede aplicar desde un **10 % hasta un 50 %**.

### Procedimiento
1. Seleccionar la opción y el porcentaje correspondiente.
2. Presionar el botón **Aplicar**. El sistema notificará que el aumento o reducción de ración fue aplicado.
3. Para eliminar el aumento o reducción aplicado, presionar el botón **Restablecer**.

### Uso recomendable
Estas opciones se utilizan cuando exista algún problema con el suministro de la ración o cuando sea necesario modificar proporcionalmente la cantidad de ración suministrada a los animales del tambo.

---

## 3. Promedio Global

- El **promedio global** permite obtener un promedio tomando como referencia los valores de los diferentes grupos de alimentación.
- Si existen **más de 2 grupos**, se puede obtener un promedio global de los mismos a partir de los valores configurados.
- Cada grupo cuenta de todas formas con su propio promedio individual.
- También se puede consultar el **promedio de ración** desde el apartado **Control**.

---

## 4. Ejecución Nocturna de Parámetros

Farmerin ejecuta los parámetros asignados **todas las noches**:
1. Durante la noche, el sistema realiza un control del rodeo y revisa los animales del tambo para determinar a qué criterio de alimentación corresponde cada uno.
2. Según los parámetros configurados, Farmerin ajusta la ración correspondiente a cada animal.
3. Esto permite llevar un control de las raciones para que cada animal reciba la cantidad exacta asignada.
4. El objetivo es mantener las raciones actualizadas y que los animales queden preparados para el **turno del tambo del día siguiente**.

---

## 5. Reglas y Restricciones del Asistente IA

- **Sin invención de funcionalidades**: El asistente no debe inventar botones, funcionalidades, porcentajes o procedimientos no documentados.
- **Respuestas específicas**: Responder utilizando la información concreta de la pregunta realizada (sin mezclar ni responder de forma genérica).
- **Derivación a soporte**: Cuando una consulta no pueda responderse con la información disponible, debe indicarse al usuario que se comunique con el soporte técnico.
