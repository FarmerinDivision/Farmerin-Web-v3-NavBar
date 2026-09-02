# Módulo de Nutrición - Farmerin

El módulo de Nutrición de Farmerin es el núcleo de gestión y automatización alimentaria del rodeo. Se divide en dos secciones principales: **Parámetros Nutricionales** y **Control Nutricional**.

---

## 1. Parámetros Nutricionales (`/parametros`)

Es la sección donde se configura el "cerebro nutricional" del tambo. Permite definir reglas automáticas para asignar kilos de ración según el estado del animal (ej. Días de Lactancia o Litros producidos).

- **Grupos de Parámetros**: Conjuntos de reglas (ej. Grupo 0, Grupo 1) que se corresponden con el Grupo asignado en la ficha personal de cada animal.
- **Categorías**: Clasificación interna por Vaca y Vaquillona.
- **Reglas de Ración**: Rangos de Mínimo y Máximo con Unidad de Medida (Días de Lactancia / Litros producidos) y Ración Base (kg).
- **Porcentaje de Ajuste**: Perilla global (-50% a +100%) para ajustar la ración de todo el establecimiento de forma masiva sin modificar regla por regla.

---

## 2. Control  (`/control`)

Es la sección de seguimiento diario y gestión directa de la alimentación de los animales activos "En Ordeñe".

- **Ración Asignada (Rac)**: Cantidad de alimento que el animal está consumiendo actualmente.
- **Ración Sugerida (Sug)**: Recomendación calculada por el sistema según los Parámetros.
- **Modo Automático vs Manual**:
  - *Automático*: Farmerin actualiza la ración solo cuando cambian los datos del animal.
  - *Manual*: La ración queda fija en el valor definido manualmente por el usuario.
- **Alertas de Colores**:
  - 🔴 **Rojo**: Ración Manual.
  - 🟢 **Verde**: Ración Automatica.
- **Exportación**: Botón para descargar los datos en formato Excel.

---

## 3. Comportamiento y Permisos de la IA

- **Consultas**: La IA puede consultar y explicar las reglas de ración, raciones asignadas/sugeridas por RP, promedios del rodeo y estado del porcentaje de ajuste.
- **Acciones**: La IA **NO** puede crear, editar o eliminar parámetros ni cambiar raciones, modos (manual/automático) o fichas de animales. Esas acciones deben ser realizadas manualmente por el usuario.
