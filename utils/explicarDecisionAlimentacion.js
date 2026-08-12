/**

 * Utilidad de presentación — explica por qué un animal tiene su ración objetivo.

 * Reutiliza la lógica de asignación de utils/alimentacionControl.js.

 */



import {

  esPorLactancia,

  encontrarParametroAplicado,

  normalizarParametrosControl,

  flattenParametrosAlimentacion,

} from './alimentacionControl';



export { normalizarParametrosControl, flattenParametrosAlimentacion };



function formatRegla(condicion, min, max, um) {

  const minVal = parseInt(min, 10);

  const maxVal = parseInt(max, 10);



  if (esPorLactancia(um)) {

    if (condicion === 'entre') return `${minVal}–${maxVal} días`;

    if (condicion === 'menor') return `≤ ${minVal} días`;

    if (condicion === 'mayor') return `≥ ${maxVal} días`;

    return `${minVal}–${maxVal} días`;

  }



  if (condicion === 'entre') return `${minVal}–${maxVal} litros`;

  if (condicion === 'menor') return `≤ ${minVal} litros`;

  if (condicion === 'mayor') return `≥ ${maxVal} litros`;

  return `${minVal}–${maxVal} litros`;

}



function criterioLabel(um) {

  if (esPorLactancia(um)) return 'Días de Lactancia';

  return 'Producción (Último Control)';

}



function valorLabel(um, diasLact, litrosUC) {

  if (esPorLactancia(um)) return `${diasLact} días`;

  return `${litrosUC} litros`;

}



function parametroAResultado(param, animal, diasLact, litrosUC) {

  const condicion = param.condicion ?? param.cond ?? 'entre';

  const racionParametro = parseInt(param.racion, 10) || 0;

  const sugerido = parseInt(animal.sugerido, 10) || racionParametro;



  return {

    criterio: criterioLabel(param.um),

    valor: valorLabel(param.um, diasLact, litrosUC),

    regla: formatRegla(condicion, param.min, param.max, param.um),

    resultado: racionParametro || sugerido,

    um: param.um,

    diasLact,

    litrosUC,

  };

}



function resultadoSinParametro(animal, diasLact, litrosUC) {

  const sugerido = parseInt(animal.sugerido, 10) || 0;



  return {

    criterio: null,

    valor: `${diasLact} días · ${litrosUC} litros`,

    regla: null,

    resultado: sugerido,

    um: null,

    diasLact,

    litrosUC,

  };

}



export function encontrarReglaAplicada(animal, parametrosFlat = []) {

  const { parametro, diasLact, litrosUC } = encontrarParametroAplicado(animal, parametrosFlat);



  if (parametro) {

    return parametroAResultado(parametro, animal, diasLact, litrosUC);

  }



  return resultadoSinParametro(animal, diasLact, litrosUC);

}



function buildDecisionAutomatica(regla, sugerido) {

  return {

    criterio: regla.criterio,

    valor: regla.valor,

    regla: regla.regla,

    resultado: regla.criterio ? regla.resultado : sugerido,

  };

}



export function explicarDecisionAlimentacion(animal, parametrosFlat = []) {

  const regla = encontrarReglaAplicada(animal, parametrosFlat);

  const sugerido = parseInt(animal.sugerido, 10) || regla.resultado;

  const decision = buildDecisionAutomatica(regla, sugerido);



  if (animal.racionManual) {

    return {

      modo: 'manual',

      titulo: 'Ración asignada manualmente.',

      subtitulo: 'Mientras permanezca en modo Manual el sistema no modificará esta ración.',

      racionAutomatica: sugerido,

      ...decision,

      sinParametro: !regla.criterio,

    };

  }



  if (!regla.criterio) {

    return {

      modo: 'automatico',

      titulo: 'El sistema calculó esta ración.',

      criterio: '—',

      valor: regla.valor,

      regla: 'No se encontró un parámetro que coincida con las condiciones actuales',

      resultado: sugerido,

      sinParametro: true,

    };

  }



  return {

    modo: 'automatico',

    titulo: 'El sistema calculó esta ración.',

    ...decision,

    sinParametro: false,

  };

}


