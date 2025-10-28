// hooks/useActualizarErpGrupo.js
import { useState, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import readXlsxFile from 'read-excel-file';

export const useActualizarErpGrupo = (tamboSel) => {
    const { firebase } = useContext(FirebaseContext);
    const [errores, guardarErrores] = useState([]);
    const [actualizados, guardarActualizados] = useState([]);
    const [procesando, guardarProcesando] = useState(false);

    // 📘 Leer planilla y procesar cada fila
    const cargarExcel = async (file) => {
        if (!file) return;
        guardarProcesando(true);
        guardarErrores([]);
        guardarActualizados([]);

        await readXlsxFile(file).then(async (rows) => {
            const encabezado = rows[0].map(h => h?.toString().toLowerCase().trim());
            const colRP = encabezado.findIndex(c => c.includes('rp'));
            const colNuevoErp = encabezado.findIndex(c => c.includes('nuevo') && c.includes('erp'));
            const colGrupo = encabezado.findIndex(c => c.includes('grupo'));

            if (colRP === -1) {
                guardarErrores(prev => [...prev, "❌ No se encontró la columna RP"]);
                guardarProcesando(false);
                return;
            }

            for (let i = 1; i < rows.length; i++) {
                const rp = rows[i][colRP];
                const nuevoErp = colNuevoErp !== -1 ? rows[i][colNuevoErp] : null;
                const grupo = colGrupo !== -1 ? rows[i][colGrupo] : null;

                if (!rp) {
                    guardarErrores(prev => [...prev, `Fila ${i + 1}: falta RP`]);
                    continue;
                }

                await updateErpGrupo({ rp, nuevoErp, grupo, fila: i + 1 });
            }
        });

        guardarProcesando(false);
    };

    // 🧩 Actualiza eRP, Grupo o ambos
    const updateErpGrupo = async ({ rp, nuevoErp, grupo, fila }) => {
        let e = '';
        try {
            // 🧹 Normalizamos el RP para evitar problemas de espacios, mayúsculas y tipos
            const cleanRp = rp.toString().trim().toUpperCase();

            console.log(`Buscando RP [${cleanRp}] para tambo ${tamboSel.id}`);

            // 🔍 Buscamos como string primero
            let snapshot = await firebase.db.collection('animal')
                .where('idtambo', '==', tamboSel.id)
                .where('rp', '==', cleanRp)
                .get();

            // 🔍 Si no encontró y es numérico, probamos como number
            if (snapshot.empty && !isNaN(cleanRp)) {
                snapshot = await firebase.db.collection('animal')
                    .where('idtambo', '==', tamboSel.id)
                    .where('rp', '==', Number(cleanRp))
                    .get();
            }

            if (snapshot.empty) {
                e = `Fila ${fila}: RP ${cleanRp} no encontrado`;
                guardarErrores(prev => [...prev, e]);
                return;
            }

            const docRef = snapshot.docs[0].ref;
            const updates = {};

            // 📌 Actualización de ERP
            if (nuevoErp && nuevoErp.toString().trim() !== '') {
                updates.erp = nuevoErp.toString().trim();
            }

            // 📌 Actualización de grupo
            if (grupo !== undefined && grupo !== null && grupo !== '') {
                const parsedGrupo = parseInt(grupo, 10);
                if (isNaN(parsedGrupo)) {
                    e = `Fila ${fila}: grupo inválido (${grupo})`;
                    guardarErrores(prev => [...prev, e]);
                    return;
                } else {
                    updates.grupo = parsedGrupo;
                }
            }

            // ⚠️ Si no hay nada para actualizar, error
            if (Object.keys(updates).length === 0) {
                e = `Fila ${fila}: no se ingresó ni eRP nuevo ni grupo`;
                guardarErrores(prev => [...prev, e]);
                return;
            }

            // ✅ Actualización en Firestore
            await docRef.update(updates);

            guardarActualizados(prev => [
                ...prev,
                `Fila ${fila}: RP ${cleanRp} actualizado ${updates.erp ? `→ eRP ${updates.erp}` : ''
                } ${updates.grupo !== undefined ? `→ Grupo ${updates.grupo}` : ''
                }`
            ]);

        } catch (error) {
            e = `Fila ${fila}: Error al actualizar ${rp} (${error.message})`;
            guardarErrores(prev => [...prev, e]);
            console.error('Error en updateErpGrupo:', error);
        }
    };


    return {
        cargarExcel,
        errores,
        actualizados,
        procesando,
    };
};
