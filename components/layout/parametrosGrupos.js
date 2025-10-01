import React, { useEffect, useState, useContext } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { RiAddBoxLine, RiSave2Line, RiDownload2Line } from 'react-icons/ri';
import { FirebaseContext } from '../../firebase2';

const defaultValor = () => ({
  max: 0,
  min: 0,
  orden: 1,
  porcentaje: 0,
  racion: 0,
  um: 'Lts.Producidos'
});

const buildEmptyGroup = (grupoNumero) => ({
  grupo: grupoNumero,
  parametros: [
    { categoria: 'Vaca', valor: { ...defaultValor() } },
    { categoria: 'Vaquillona', valor: { ...defaultValor() } }
  ]
});

const CategoriaEditor = ({ categoria, valor, onChange }) => {
  return (
    <Card className="mb-3">
      <Card.Header>
        <strong>{categoria}</strong>
      </Card.Header>
      <Card.Body>
        <Row className="g-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>UM</Form.Label>
              <Form.Control
                value={valor.um}
                onChange={(e) => onChange({ ...valor, um: e.target.value })}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Ración (kg)</Form.Label>
              <Form.Control
                type="number"
                value={valor.racion}
                onChange={(e) => onChange({ ...valor, racion: Number(e.target.value) })}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Porcentaje</Form.Label>
              <Form.Control
                type="number"
                value={valor.porcentaje}
                onChange={(e) => onChange({ ...valor, porcentaje: Number(e.target.value) })}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Orden</Form.Label>
              <Form.Control
                type="number"
                value={valor.orden}
                onChange={(e) => onChange({ ...valor, orden: Number(e.target.value) })}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Mínimo</Form.Label>
              <Form.Control
                type="number"
                value={valor.min}
                onChange={(e) => onChange({ ...valor, min: Number(e.target.value) })}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Máximo</Form.Label>
              <Form.Control
                type="number"
                value={valor.max}
                onChange={(e) => onChange({ ...valor, max: Number(e.target.value) })}
              />
            </Form.Group>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

const ParametrosGrupos = ({ idtambo }) => {
  const { firebase } = useContext(FirebaseContext);
  const [grupos, setGrupos] = useState([buildEmptyGroup(0)]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (idtambo) {
      importarDesdeParametros(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idtambo]);

  const addGroup = () => {
    const nextNumero = grupos.length === 0 ? 0 : Math.max(...grupos.map(g => g.grupo)) + 1;
    setGrupos([...grupos, buildEmptyGroup(nextNumero)]);
  };

  const updateValor = (grupoNumero, categoria, nuevoValor) => {
    setGrupos(prev => prev.map(g => {
      if (g.grupo !== grupoNumero) return g;
      return {
        ...g,
        parametros: g.parametros.map(p => p.categoria === categoria ? { ...p, valor: { ...nuevoValor } } : p)
      };
    }));
  };

  const guardar = async () => {
    if (!idtambo) return;
    setSaving(true);
    try {
      // Eliminar existentes para que queden exactamente iguales
      const existentes = await firebase.db
        .collection('parametrosGrupo')
        .where('idtambo', '==', idtambo)
        .get();

      const batch = firebase.db.batch();
      existentes.docs.forEach(d => batch.delete(d.ref));

      grupos.forEach(g => {
        const payload = {
          grupo: g.grupo,
          idtambo,
          parametros: g.parametros.map(p => ({ categoria: p.categoria, valor: { ...p.valor } }))
        };
        const ref = firebase.db.collection('parametrosGrupo').doc(`${idtambo}_${g.grupo}`);
        batch.set(ref, payload, { merge: true });
      });
      await batch.commit();
      alert('Parámetros guardados correctamente');
    } catch (err) {
      console.error(err);
      alert('Error al guardar parámetros');
    } finally {
      setSaving(false);
    }
  };

  const importarDesdeParametros = async (silent = false) => {
    if (!idtambo) return;
    try {
      const snap = await firebase.db
        .collection('parametro')
        .where('idtambo', '==', idtambo)
        .get();

      const porOrden = {};
      snap.docs.forEach(doc => {
        const d = doc.data();
        const orden = Number(d.orden) || 0;
        if (!porOrden[orden]) porOrden[orden] = {};
        const valor = {
          max: Number(d.max) || 0,
          min: Number(d.min) || 0,
          orden: orden,
          porcentaje: Number(d.porcentaje) || 0,
          racion: Number(d.racion) || 0,
          um: d.um || 'Lts.Producidos'
        };
        if (d.categoria === 'Vaca' || d.categoria === 'Vaquillona') {
          porOrden[orden][d.categoria] = valor;
        }
      });

      const ordenes = Object.keys(porOrden)
        .map(n => Number(n))
        .sort((a, b) => a - b);

      const gruposConstruidos = ordenes.map((ord) => ({
        grupo: Math.max(0, Number(ord) - 1),
        parametros: [
          { categoria: 'Vaca', valor: porOrden[ord]['Vaca'] || { ...defaultValor(), orden: ord } },
          { categoria: 'Vaquillona', valor: porOrden[ord]['Vaquillona'] || { ...defaultValor(), orden: ord } }
        ]
      }));

      if (gruposConstruidos.length > 0) setGrupos(gruposConstruidos);
      else if (!silent) alert('No se encontraron parámetros existentes para importar.');
    } catch (err) {
      console.error(err);
      if (!silent) alert('Error al importar parámetros existentes');
    }
  };

  return (
    <div>
      {grupos.map((g) => (
        <Card className="mb-4" key={g.grupo}>
          <Card.Header>
            <Row className="align-items-center">
              <Col>
                <h5 className="mb-0">GRUPO {g.grupo}</h5>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body>
            {g.parametros.map((p) => (
              <CategoriaEditor
                key={`${g.grupo}_${p.categoria}`}
                categoria={p.categoria}
                valor={p.valor}
                onChange={(nv) => updateValor(g.grupo, p.categoria, nv)}
              />
            ))}
          </Card.Body>
        </Card>
      ))}

      <div className="d-flex gap-2">
        <Button variant="outline-secondary" onClick={importarDesdeParametros}>
          <RiDownload2Line />&nbsp;Importar actuales
        </Button>
        <Button variant="success" onClick={addGroup}>
          <RiAddBoxLine />&nbsp;Nuevo Grupo
        </Button>
        <Button variant="primary" onClick={guardar} disabled={saving}>
          <RiSave2Line />&nbsp;{saving ? 'Guardando...' : 'Guardar Todo'}
        </Button>
      </div>
    </div>
  );
};

export default ParametrosGrupos;


