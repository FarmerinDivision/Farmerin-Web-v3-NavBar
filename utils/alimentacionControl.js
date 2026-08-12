/**
 * Lógica compartida de asignación de parámetros de alimentación para Control.
 * Basada en controlarAnimal (pages/testFuncion.js): recorre parámetros en orden
 * y devuelve el primero cuya categoría, grupo y condición aplican al animal.
 */

export function esPorLactancia(um) {
  if (!um) return false;
  const normalizado = String(um).trim();
  return normalizado === 'Dias Lactancia' || normalizado === 'Días Lactancia';
}

function parseFechaParto(fparto) {
  if (!fparto) return null;

  if (fparto instanceof Date && !Number.isNaN(fparto.getTime())) return fparto;

  if (typeof fparto === 'object' && fparto.seconds) {
    return new Date(fparto.seconds * 1000);
  }

  if (typeof fparto === 'string') {
    const normalizada = fparto.trim();

    if (normalizada.includes('/')) {
      const partes = normalizada.split('/');
      if (partes[0]?.length === 2 && partes[1]?.length === 2 && partes[2]?.length === 4) {
        const [dia, mes, anio] = partes;
        return new Date(`${anio}-${mes}-${dia}`);
      }
      if (partes[0]?.length === 4) {
        return new Date(normalizada.replace(/\//g, '-'));
      }
    }

    if (normalizada.includes('-')) {
      return new Date(normalizada);
    }
  }

  return null;
}

/** Mismo criterio de cálculo que controlarAnimal (testFuncion): días desde fparto. */
export function calcularDiasLactancia(animal) {
  const partoDate = parseFechaParto(animal.fparto);
  if (partoDate && !Number.isNaN(partoDate.getTime())) {
    return Math.floor((Date.now() - partoDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  return parseInt(animal.diasLact, 10) || 0;
}

export function calcularLitrosUC(animal) {
  let litrosUC = Math.round(parseFloat(animal.uc));
  if (Number.isNaN(litrosUC)) litrosUC = 5;
  return litrosUC;
}

export function normalizarCondicion(param) {
  return param.condicion ?? param.cond ?? 'entre';
}

export function reglaCumpleCondicion(param, diasLact, litrosUC) {
  const condicion = normalizarCondicion(param);
  const minVal = parseInt(param.min, 10);
  const maxVal = parseInt(param.max, 10);
  const um = param.um;

  if (esPorLactancia(um)) {
    if (condicion === 'entre') return diasLact >= minVal && diasLact <= maxVal;
    if (condicion === 'menor') return diasLact <= minVal;
    if (condicion === 'mayor') return diasLact >= maxVal;
    return false;
  }

  if (condicion === 'entre') return litrosUC >= minVal && litrosUC <= maxVal;
  if (condicion === 'menor') return litrosUC <= minVal;
  if (condicion === 'mayor') return litrosUC >= maxVal;
  return false;
}

export function parametroCorrespondeAlAnimal(param, animal) {
  if (param.categoria !== animal.categoria) return false;

  const grupoAnimal = animal.grupo ?? 0;
  if (
    param.grupo !== undefined &&
    param.grupo !== null &&
    Number(param.grupo) !== Number(grupoAnimal)
  ) {
    return false;
  }

  return true;
}

/**
 * Normaliza documentos de la colección `parametros`.
 * Acepta documentos planos o anidados (compatibilidad).
 */
export function normalizarParametrosControl(docs) {
  const flat = [];

  docs.forEach((doc) => {
    const data = doc.data ? doc.data() : doc;

    if (data.control === false) return;

    if (Array.isArray(data.parametros)) {
      const grupo = data.grupo ?? 0;
      data.parametros.forEach((cat) => {
        (cat.rodeos || []).forEach((r) => {
          flat.push({
            grupo,
            categoria: cat.categoria,
            orden: r.orden ?? 0,
            rodeo: r.rodeo ?? r.orden,
            condicion: r.condicion ?? r.cond ?? 'entre',
            min: r.min,
            max: r.max,
            um: r.um,
            racion: r.racion,
          });
        });
      });
      return;
    }

    if (data.categoria && data.um) {
      flat.push({
        grupo: data.grupo ?? 0,
        categoria: data.categoria,
        orden: data.orden ?? 0,
        rodeo: data.rodeo ?? data.orden,
        condicion: data.condicion ?? data.cond ?? 'entre',
        min: data.min,
        max: data.max,
        um: data.um,
        racion: data.racion,
      });
    }
  });

  return flat.sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/** @deprecated Usar normalizarParametrosControl */
export const flattenParametrosAlimentacion = normalizarParametrosControl;

/**
 * Recorre parámetros en orden y devuelve el primero que aplica al animal
 * (mismo criterio de recorrido que controlarAnimal en testFuncion).
 */
export function encontrarParametroAplicado(animal, parametrosFlat = []) {
  const diasLact = calcularDiasLactancia(animal);
  const litrosUC = calcularLitrosUC(animal);

  const candidatos = parametrosFlat
    .filter((p) => parametroCorrespondeAlAnimal(p, animal))
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  for (let i = 0; i < candidatos.length; i += 1) {
    const p = candidatos[i];
    if (reglaCumpleCondicion(p, diasLact, litrosUC)) {
      return { parametro: p, diasLact, litrosUC };
    }
  }

  return { parametro: null, diasLact, litrosUC };
}
