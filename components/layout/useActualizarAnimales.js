// hooks/useActualizarAnimales.js
import { useState, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import { format } from 'date-fns';
import readXlsxFile from 'read-excel-file';

export const useActualizarAnimales = (tamboSel) => {
  const { firebase } = useContext(FirebaseContext);
  const [errores, guardarErrores] = useState([]);
  const [actualizados, guardarActualizados] = useState([]);
  const [procesando, guardarProcesando] = useState(false);

  // --- Función principal: leer y procesar Excel ---
  const cargarExcel = async (file) => {
    if (!file) return;
    guardarProcesando(true);
    guardarErrores([]);
    guardarActualizados([]);

    await readXlsxFile(file).then((rows) => {
      const encabezado = rows[0].map(h => h?.toString().toLowerCase().trim());
      const esSoloGrupo =
        encabezado.includes("rp") &&
        encabezado.includes("grupo") &&
        encabezado.length <= 2;

      rows.forEach((r, index) => {
        if (index === 0) return;
        if (esSoloGrupo) {
          const a = { rp: r[0], grupo: r[1], fila: index + 1 };
          updateGrupoAnimal(a);
        } else {
          const a = {
            erp: r[0],
            lactancia: r[1],
            categoria: r[2],
            estpro: r[3],
            fparto: r[4],
            estrep: r[5],
            fservicio: r[6],
            observaciones: r[7],
            grupo: r[8],
            fila: index + 1,
          };
          updateAnimal(a);
        }
      });
    });

    guardarProcesando(false);
  };

  // --- Actualiza todos los campos del animal ---  
  const updateAnimal = async (a) => {
    let id;
    let erroresFlag = false;
    let e = '';
    let erp = '';
    let categoria;

    // === Validación del eRP ===
    if (a.erp && a.erp.length !== 0) {
      erp = a.erp.toString();
      let existeeRP = false;
      try {
        const snapshot = await firebase.db.collection('animal')
          .where('idtambo', '==', tamboSel.id)
          .where('erp', 'in', [erp, a.erp])
          .get();

        if (!snapshot.empty) {
          snapshot.forEach(doc => { id = doc.id; });
          existeeRP = true;
        }
      } catch (error) {
        e = `Fila N°: ${a.fila} / Error al consultar eRP: ${erp}`;
        guardarErrores(prev => [...prev, e]);
        erroresFlag = true;
      }

      if (!existeeRP) {
        e = `Fila N°: ${a.fila} / eRP: ${a.erp} - No existe en el tambo`;
        guardarErrores(prev => [...prev, e]);
        erroresFlag = true;
      }
    } else {
      e = `Fila N°: ${a.fila} / Se debe ingresar un eRP`;
      guardarErrores(prev => [...prev, e]);
      erroresFlag = true;
    }

    // === Validación categoría ===
    if (a.categoria) {
      categoria = a.categoria.trim().toLowerCase();
      categoria =
        categoria === 'vaca' ? 'Vaca' :
          categoria === 'vaquillona' ? 'Vaquillona' : null;

      if (!categoria) {
        e = `Fila N°: ${a.fila} / Categoria incorrecta`;
        guardarErrores(prev => [...prev, e]);
        erroresFlag = true;
      }
    }

    // === Conversión de fechas Excel SOLO si hay valor ===
    const convertirFecha = (valor) => {
      if (!valor || isNaN(valor)) return null;
      const f = new Date("1899-12-31");
      f.setDate(f.getDate() + valor);
      return format(f, 'yyyy-MM-dd');
    };

    const fparto = a.fparto ? convertirFecha(a.fparto) : null;
    const fservicio = a.fservicio ? convertirFecha(a.fservicio) : null;

    // === Grupo solo si trae valor ===
    let grupo = null;
    if (a.grupo !== undefined && a.grupo !== "" && a.grupo !== null) {
      const parsed = parseInt(a.grupo, 10);
      grupo = isNaN(parsed) ? null : parsed;
    }

    // Si hubo errores, no continuamos
    if (erroresFlag || !id) return;

    // ===============================
    // 🔥 Construcción dinámica del update
    // ===============================
    const updateData = {};

    if (a.lactancia !== undefined && a.lactancia !== null && a.lactancia !== "" && !isNaN(a.lactancia)) {
      updateData.lactancia = a.lactancia;
    }

    if (a.estpro) updateData.estpro = a.estpro;
    if (a.estrep) updateData.estrep = a.estrep;
    if (categoria) updateData.categoria = categoria;
    if (fparto) updateData.fparto = fparto;
    if (fservicio) updateData.fservicio = fservicio;
    if (grupo !== null) updateData.grupo = grupo;
    if (a.observaciones) updateData.observaciones = a.observaciones;
    updateData.erp = erp; // eRP siempre se mantiene

    try {
      await firebase.db.collection('animal').doc(id).update(updateData);

      const act = `Fila ${a.fila}: eRP ${erp} actualizado`;
      guardarActualizados(prev => [...prev, act]);
    } catch (error) {
      e = `Fila ${a.fila} / Error al actualizar: ${error}`;
      guardarErrores(prev => [...prev, e]);
    }
  };

  // --- Actualiza solo el grupo ---
  const updateGrupoAnimal = async (a) => {
    let e = '';
    let grupo = parseInt(a.grupo, 10) || 0;
    try {
      const snapshot = await firebase.db.collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .where('rp', 'in', [a.rp])
        .get();

      if (!snapshot.empty) {
        const id = snapshot.docs[0].id;
        await firebase.db.collection('animal').doc(id).update({ grupo });
        guardarActualizados(prev => [...prev, `Fila ${a.fila}: grupo ${grupo}`]);
      } else {
        e = `Fila ${a.fila}: RP ${a.rp} no encontrado`;
        guardarErrores(prev => [...prev, e]);
      }
    } catch (error) {
      e = `Error al actualizar grupo (fila ${a.fila}): ${error}`;
      guardarErrores(prev => [...prev, e]);
    }
  };

  return {
    cargarExcel,
    errores,
    actualizados,
    procesando,
    guardarErrores,
    guardarActualizados,
  };
};
