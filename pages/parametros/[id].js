import React, { useEffect, useContext, useState } from 'react';
import { FirebaseContext } from '../../firebase2';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/layout';
import useValidacion from '../../hook/useValidacion';
import validarCrearParam from '../../validacion/validarCrearParam';
import { Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Contenedor, Mensaje, ContenedorSpinner } from '../../components/ui/Elementos';
import styles from '../../styles/Parametro.module.scss'


const STATE_INICIAL = {
  orden: 0,
  categoria: "Vaca",
  condicion: "entre",
  min: 0,
  max: 0,
  um: "Dias Lactancia",
  racion: 8
};

const ParametroEdit = ({
  idParametro = null,
  onClose = null,
  isModal = false,
  onUpdate = null,
  onAddParam = null,
  onSuccess = null,
  categoriaFija = null,
  groupId = null
}) => {
  const router = useRouter();
  const idFromRouter = router?.query?.id;
  const id = idParametro || idFromRouter;

  const [exito, guardarExito] = useState(false);
  const [descExito, guardarDescExito] = useState('');
  const [error, guardarError] = useState(false);
  const [descError, guardarDescError] = useState('');
  const [procesando, guardarProcesando] = useState(false);
  const [tit, guardarTit] = useState("Nuevo Parámetro");
  const [parametros, guardarParametros] = useState([]);

  const { usuario, firebase, tamboSel } = useContext(FirebaseContext);

  const { valores, errores, handleSubmit, handleChange, handleBlur, guardarValores } = useValidacion(
    STATE_INICIAL,
    validarCrearParam,
    editParametro
  );

  const { condicion, min, max, um, racion, categoria } = valores;

  useEffect(() => {
    if (!id || !firebase || !tamboSel) return;

    if (id === "0") {
      obtenerParametros();
      guardarError(false);
      if (categoriaFija) {
        guardarValores(prev => ({ ...prev, categoria: categoriaFija }));
      }
    } else {
      guardarTit("Editar Parámetro");
      const obtenerParam = async () => {
        try {
          // id aquí representa un item "plano" de UI, no un doc de grupo. Leemos del doc del grupo
          if (!groupId) return;
          const groupDoc = await firebase.db.collection('parametro').doc(groupId).get();
          if (groupDoc.exists) {
            const data = groupDoc.data();
            const categorias = Array.isArray(data.parametros) ? data.parametros : [];
            const cat = categorias.find(c => c.categoria === (categoriaFija || 'Vaca')) || categorias[0];
            const ordenNum = typeof idParametro === 'string' && idParametro.includes('-') ? Number(idParametro.split('-')[1]) : null;
            const r = (cat?.rodeos || []).find(x => x.orden === ordenNum) || {};
            guardarValores({
              orden: r.orden || 0,
              categoria: cat?.categoria || categoriaFija || 'Vaca',
              condicion: r.cond || 'entre',
              min: r.min ?? 0,
              max: r.max ?? 0,
              um: r.um || 'Dias Lactancia',
              racion: r.racion ?? 8
            });
          } else {
            guardarDescError("El parámetro no existe");
            guardarError(true);
          }
        } catch (error) {
          guardarDescError(error.message);
          guardarError(true);
        }
      };
      obtenerParam();
    }
  }, [id]);

  const obtenerParametros = async () => {
    try {
      const snap = await firebase.db
        .collection('parametro')
        .where('idtambo', '==', tamboSel.id)
        .get();
      const grupos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      guardarParametros(grupos);
    } catch (error) {
      guardarDescError(error.message);
      guardarError(true);
    }
  };

  async function editParametro() {
    guardarProcesando(true);

    if (id === "0") {
      if (!usuario) return router.push('/login');

      try {
        // crear o actualizar en documento de grupo
        let ref = null;
        if (groupId) {
          ref = firebase.db.collection('parametro').doc(groupId);
        } else {
          // si no hay grupo especificado, usar/crear grupo 0
          const q = await firebase.db.collection('parametro')
            .where('idtambo', '==', tamboSel.id)
            .where('grupo', '==', 0)
            .limit(1)
            .get();
          if (q.empty) {
            const base = { idtambo: tamboSel.id, grupo: 0, parametros: [] };
            const created = await firebase.db.collection('parametro').add(base);
            ref = created;
          } else {
            ref = q.docs[0].ref;
          }
        }

        await firebase.db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const data = snap.data() || { idtambo: tamboSel.id, grupo: 0, parametros: [] };
          const categorias = Array.isArray(data.parametros) ? data.parametros.slice() : [];
          const idx = categorias.findIndex(c => c.categoria === categoria);
          const lista = idx >= 0 ? categorias[idx].rodeos.slice() : [];
          const nuevoOrden = lista.length + 1;
          const nuevo = { orden: nuevoOrden, cond: condicion, min, max, um, racion };
          if (idx >= 0) {
            categorias[idx] = { ...categorias[idx], rodeos: [...lista, nuevo] };
          } else {
            categorias.push({ categoria, rodeos: [nuevo] });
          }
          tx.set(ref, { idtambo: tamboSel.id, grupo: (snap.data()?.grupo ?? 0), parametros: categorias }, { merge: true });
        });

        if (onAddParam) onAddParam({
          id: `${categoria}-${Date.now()}`,
          categoria,
          orden: 0,
          condicion,
          min,
          max,
          um,
          racion
        });

        guardarExito(true);
        guardarDescExito("Parámetro creado con éxito!");
        guardarProcesando(false);

        // cerrar modal de edición
        if (onClose) onClose();

        // mostrar modal de éxito desde el padre, si existe
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 200);

      } catch (error) {
        guardarDescError(error.message);
        guardarError(true);
        guardarProcesando(false);
      }
    } else {
      try {
        // actualizar dentro del documento de grupo
        if (!groupId) return;
        const ref = firebase.db.collection('parametro').doc(groupId);
        await firebase.db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists) return;
          const data = snap.data();
          const categorias = Array.isArray(data.parametros) ? data.parametros.slice() : [];
          const idx = categorias.findIndex(c => c.categoria === categoria);
          if (idx === -1) return;
          const rodeos = (categorias[idx].rodeos || []).slice();
          const i = rodeos.findIndex(r => r.orden === valores.orden);
          const nuevo = {
            orden: valores.orden,
            cond: valores.condicion,
            min: valores.min,
            max: valores.max,
            um: valores.um,
            racion: valores.racion
          };
          if (i !== -1) {
            rodeos[i] = nuevo;
          }
          categorias[idx] = { ...categorias[idx], rodeos };
          tx.update(ref, { parametros: categorias });
        });

        if (onUpdate) onUpdate();

        // 👇 cerrar el modal de edición primero
        if (onClose) onClose();

        // 👇 después de un pequeño delay, mostrar modal de éxito
        setTimeout(() => {
          if (onSuccess) onSuccess(valores);
        }, 200);

        guardarProcesando(false);

      } catch (error) {
        guardarDescError(error.message);
        guardarError(true);
        guardarProcesando(false);
      }
    }
  }


  const contenidoFormulario = (
    <>
      {procesando ? (
        <div className={styles.overlayLoader}>
          <div className={styles.overlayContent}>
            <Spinner animation="border" variant="info" className={styles.overlaySpinner} />
            <p className={styles.loaderTexto}>
              Generando nuevo parámetro, espere... <br />
              <span className={styles.loaderSub}>(no salga de la sección)</span>
            </p>
          </div>
        </div>
      ) : (
        <>
          <Mensaje>
            <Alert variant="success" show={exito}>{descExito}</Alert>
            <Alert variant="danger" show={error}>
              <Alert.Heading>Oops! Se ha producido un error!</Alert.Heading>
              <p>{descError}</p>
            </Alert>
          </Mensaje>

          <Contenedor>
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col xs={12} md={4} className="mb-3">
                  <Form.Group>
                    <Form.Label>Categoría:</Form.Label>
                    <Form.Control
                      as="select"
                      name="categoria"
                      value={categoria}
                      onChange={handleChange}
                      disabled={!!categoriaFija} // 👈 deshabilita si viene fija
                    >
                      <option value="Vaca">Vaca</option>
                      <option value="Vaquillona">Vaquillona</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
                <Col xs={12} md={4} className="mb-3">
                  <Form.Group>
                    <Form.Label>Unidad de Medida:</Form.Label>
                    <Form.Control as="select" name="um" value={um} onChange={handleChange}>
                      <option value="Dias Lactancia">Días Lactancia</option>
                      <option value="Lts. Producidos">Lts. Producidos</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
                <Col xs={12} md={4} className="mb-3">
                  <Form.Group>
                    <Form.Label>Condición:</Form.Label>
                    <Form.Control as="select" name="condicion" value={condicion} onChange={handleChange}>
                      <option value="entre">Entre</option>
                      <option value="menor">Menor a</option>
                      <option value="mayor">Mayor a</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={12} md={4} className="mb-3">
                  <Form.Group>
                    <Form.Label>Mínimo:</Form.Label>
                    <Form.Control
                      type="number"
                      name="min"
                      min="0"
                      disabled={condicion === "mayor"}
                      value={min}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errores.min && <Alert variant="danger">{errores.min}</Alert>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={4} className="mb-3">
                  <Form.Group>
                    <Form.Label>Máximo:</Form.Label>
                    <Form.Control
                      type="number"
                      name="max"
                      min="0"
                      disabled={condicion === "menor"}
                      value={max}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errores.max && <Alert variant="danger">{errores.max}</Alert>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={4} className="mb-3">
                  <Form.Group>
                    <Form.Label>Kgs. Ración:</Form.Label>
                    <Form.Control
                      type="number"
                      name="racion"
                      min="1"
                      value={racion}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errores.racion && <Alert variant="danger">{errores.racion}</Alert>}
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mt-3">
                <Col xs={12} className="mb-2">
                  <Button variant="success" type="submit" block className="w-100">
                    Guardar
                  </Button>
                </Col>
                {!idParametro && (
                  <Col xs={12}>
                    <Button variant="info" block onClick={() => router.push('/parametros')} className="w-100">
                      Volver
                    </Button>
                  </Col>
                )}
              </Row>
            </Form>
          </Contenedor>
        </>
      )}
    </>
  );

  return isModal || idParametro ? contenidoFormulario : <Layout titulo={tit}>{contenidoFormulario}</Layout>;
};

export default ParametroEdit;
