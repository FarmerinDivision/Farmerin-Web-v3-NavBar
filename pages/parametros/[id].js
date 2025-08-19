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
  categoriaFija = null
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
          const paramDoc = await firebase.db.collection('parametro').doc(id).get();
          if (paramDoc.exists) {
            guardarValores(paramDoc.data());
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
      const snapshot = await firebase.db
        .collection('parametro')
        .where('idtambo', '==', tamboSel.id)
        .orderBy('orden')
        .get();
      const param = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      guardarParametros(param);
    } catch (error) {
      guardarDescError(error.message);
      guardarError(true);
    }
  };

  async function editParametro() {
    guardarProcesando(true);

    if (id === "0") {
      if (!usuario) return router.push('/login');

      const contarParametrosCategoria = async () => {
        try {
          const snapshot = await firebase.db
            .collection('parametro')
            .where('idtambo', '==', tamboSel.id)
            .where('categoria', '==', categoria)
            .get();

          return snapshot.size;
        } catch (error) {
          guardarDescError(error.message);
          guardarError(true);
          return 0;
        }
      };

      const cantParam = (await contarParametrosCategoria()) + 1;

      const param = {
        idtambo: tamboSel.id,
        categoria,
        orden: cantParam,
        condicion,
        min,
        max,
        um,
        racion
      };

      try {
        const nuevoDoc = await firebase.db.collection('parametro').add(param);
        const nuevoParam = { id: nuevoDoc.id, ...param };

        if (onAddParam) onAddParam(nuevoParam);

        guardarExito(true);
        guardarDescExito("Parámetro creado con éxito!");

        guardarProcesando(false); // ✅ detener spinner antes de cerrar

        if (onClose) onClose(); // ✅ cerrar modal después

      } catch (error) {
        guardarDescError(error.message);
        guardarError(true);
        guardarProcesando(false);
      }
    } else {
      try {
        await firebase.db.collection('parametro').doc(id).update(valores);

        if (onUpdate) onUpdate();
        if (onSuccess) onSuccess(valores);

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
                <Col>
                  <Form.Group>
                    Categoría:
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
                <Col>
                  <Form.Group>
                    Unidad de Medida:
                    <Form.Control as="select" name="um" value={um} onChange={handleChange}>
                      <option value="Dias Lactancia">Días Lactancia</option>
                      <option value="Lts. Producidos">Lts. Producidos</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    Condición:
                    <Form.Control as="select" name="condicion" value={condicion} onChange={handleChange}>
                      <option value="entre">Entre</option>
                      <option value="menor">Menor a</option>
                      <option value="mayor">Mayor a</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Group>
                    Mínimo:
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
                <Col>
                  <Form.Group>
                    Máximo:
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
                <Col>
                  <Form.Group>
                    Kgs. Ración:
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
                <Col>
                  <Button variant="success" type="submit" block>
                    Guardar
                  </Button>
                </Col>
                {!idParametro && (
                  <Col>
                    <Button variant="info" block onClick={() => router.push('/parametros')}>
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
