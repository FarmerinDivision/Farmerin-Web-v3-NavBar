# Control

## Objetivo

La sección **Control** permite analizar cómo están siendo alimentados los animales que se encuentran en ordeñe, utilizando los criterios de alimentación configurados previamente en la sección **Parámetros**.

Desde esta sección se puede consultar la información de los animales, analizar las raciones asignadas, conocer los criterios utilizados por Farmerin y cambiar el modo de alimentación de un animal entre **automático y manual**.

---

# Preguntas principales

Al ingresar al asistente de la sección **Control**, deben aparecer las siguientes preguntas:

1. **¿Qué es la sección Control?**
2. **¿Qué datos veo en el panel izquierdo?**
3. **¿Cómo analizo la información?**
4. **¿Cómo cambio el modo?**

En este menú inicial también debe aparecer el botón:

**Comunicarse con el soporte técnico**

El botón de soporte debe aparecer **únicamente en el menú inicial**.

---

# 1. ¿Qué es la sección Control?

### Respuesta

En la sección **Control** vamos a encontrar todo el análisis de cómo están comiendo nuestros animales mediante los criterios que usamos en la sección **Parámetros**.

Vamos a poder ver:

* Promedios de ración.
* Días de lactancia.
* Litros producidos.
* Cantidad de animales que ingresan a Control.
* Información relacionada con los criterios de alimentación configurados.

Recordá que en **Control solo se muestran los animales que están en ordeñe**.

La información de esta sección nos permite analizar si los animales están recibiendo la ración correspondiente según los parámetros establecidos.

---

# 2. ¿Qué datos veo en el panel izquierdo?

### Respuesta

En el **panel izquierdo** vamos a encontrar un resumen general de los animales que ingresan a Control.

Vamos a poder consultar:

* **Total de animales.**
* Cuántos animales están comiendo de forma **automática**.
* Cuántos animales están comiendo de forma **manual**.
* Promedio de **días de lactancia**.
* Promedio de **litros producidos**.
* Promedio de **ración**.

Además, vamos a encontrar diferentes **botones de acción**.

### Exportar

El botón **Exportar** permite generar una planilla con la información de los animales que aparecen en Control.

### Rodeos

El botón **Rodeos** permite conocer, de todos los animales que tenemos en Control, **cuántos ingresan a cada uno de los rodeos**.

De esta manera, el panel izquierdo nos permite tener una visión general de cómo están distribuidos y alimentándose los animales que se encuentran en Control.

---

# 3. ¿Cómo analizo la información?

### Respuesta

Para analizar correctamente la información de Control, podemos hacerlo de la siguiente manera.

### 1. Buscar un animal

Primero podemos buscar un animal específico utilizando su **RP**.

Una vez encontrado, podemos comenzar a analizar la información que aparece en las diferentes columnas.

### 2. Columna Animal

En la columna **Animal** vamos a encontrar información sobre:

* El grupo al que pertenece.
* Su categoría.
* El rodeo en el que ingresó.

Esto nos permite conocer cómo está clasificado el animal dentro de los criterios de alimentación.

### 3. Columna Ración

En la columna **Ración** vamos a poder ver **cuánto está comiendo el animal**.

Este es el resultado de la ración que tiene asignada actualmente.

### 4. Columna Decisión

En la columna **Decisión** podemos ver cómo calculó Farmerin la ración del animal.

Aquí podremos identificar:

* Qué criterio utilizó Farmerin: **días de lactancia o litros producidos**.
* Cuántos días de lactancia tiene el animal o cuántos litros produce.
* La regla o condición en la que ingresó el animal según sus días de lactancia o litros producidos.
* La ración resultante que se le asignó.

Esta información permite entender **por qué Farmerin le asignó determinada cantidad de ración al animal**.

### 5. Columna Estado

En la columna **Estado** podremos saber si el animal se encuentra en:

* **Automático**
* **Manual**

Cuando está en automático, Farmerin puede actualizar su ración de acuerdo con los parámetros configurados.

Cuando está en manual, la ración queda bajo el control manual hasta que el animal vuelva al modo automático.

### 6. Columna Acciones

En la columna **Acciones** encontraremos el botón:

**Cambiar modo**

Este botón permite modificar el modo de alimentación del animal entre **automático y manual**.

---

# 4. ¿Cómo cambio el modo?

### Respuesta

Para cambiar el modo de alimentación de un animal debemos presionar el botón:

**Cambiar modo**

Al hacerlo, se abrirá un formulario donde podremos cambiar el animal de **modo automático a modo manual**.

Cuando seleccionamos el modo manual, podremos colocar la ración que queremos asignarle al animal o mantener la misma ración que ya tenía.

El sistema también informará que, mientras el animal permanezca en **modo manual**, su ración **no se actualizará automáticamente**.

Además, el sistema indicará cuál sería la ración que debería comer el animal si volviera al **modo automático**.

### ¿Qué sucede cuando vuelvo a automático?

Cuando volvemos a colocar el animal en **modo automático**, Farmerin volverá a encargarse de calcular y actualizar su ración.

La actualización se realizará durante la **ejecución nocturna de Farmerin**, utilizando nuevamente los parámetros y criterios de alimentación correspondientes al animal.

Por lo tanto:

**Manual → la ración no se actualiza automáticamente.**

**Automático → Farmerin vuelve a controlar y actualizar la ración según los parámetros configurados.**

---

# Navegación del asistente

## Después de responder una pregunta

Cada vez que el usuario seleccione una pregunta y el asistente responda, deben aparecer nuevamente las **otras preguntas disponibles** de Control.

También debe aparecer el botón:

**Reiniciar preguntas**

Por ejemplo:

**Usuario:** ¿Cómo analizo la información?

**Asistente:**
[Respuesta correspondiente a cómo analizar la información]

Luego deben aparecer las opciones restantes:

* ¿Qué es la sección Control?
* ¿Qué datos veo en el panel izquierdo?
* ¿Cómo cambio el modo?
* **Reiniciar preguntas**

---

# Botón "Reiniciar preguntas"

El botón:

**Reiniciar preguntas**

debe aparecer después de **cada respuesta**.

Su función es permitir que el usuario vuelva al menú inicial de preguntas de Control.

Al presionarlo debe:

1. Finalizar la consulta actual.
2. Limpiar el contexto de la consulta.
3. Volver a las preguntas principales.
4. Mostrar nuevamente las cuatro preguntas iniciales.
5. Mostrar nuevamente el botón **Comunicarse con el soporte técnico**.

El flujo debe funcionar de esta manera:

**Preguntas principales → Respuesta → Otras preguntas + Reiniciar preguntas**

Al presionar:

**Reiniciar preguntas**

se debe volver a:

**Preguntas principales + Comunicarse con el soporte técnico**

---

# Botón "Comunicarse con el soporte técnico"

El botón:

**Comunicarse con el soporte técnico**

debe aparecer **solamente en el menú inicial de Control**.

No debe aparecer automáticamente después de cada respuesta.

Si el usuario presiona **Reiniciar preguntas**, vuelve al menú inicial y el botón de soporte debe aparecer nuevamente.

---

# Regla de comportamiento

El asistente debe identificar la intención específica de la consulta y responder utilizando la información correspondiente.

No debe mezclar las explicaciones de las diferentes preguntas.

Por ejemplo:

* **¿Qué es Control?** → explicar el objetivo de la sección y que solo muestra animales en ordeñe.
* **¿Qué datos veo en el panel izquierdo?** → explicar los indicadores y botones disponibles.
* **¿Cómo analizo la información?** → explicar las columnas y cómo interpretar la decisión de Farmerin.
* **¿Cómo cambio el modo?** → explicar el cambio entre automático y manual y cómo funciona la actualización nocturna.

Las respuestas deben ser claras, sencillas y comprensibles para un usuario que no tenga conocimientos técnicos.

---

# Restricciones

El asistente no debe inventar:

* columnas que no existan,
* botones que no estén documentados,
* criterios de alimentación,
* porcentajes,
* procesos de actualización,
* funcionalidades,
* información de los animales,
* datos de contacto.

Debe utilizar únicamente la información disponible en la documentación oficial de Control y del resto de módulos de Farmerin.

Cuando una consulta no pueda responderse con la información disponible, debe derivar al usuario al soporte técnico mediante el mecanismo correspondiente.