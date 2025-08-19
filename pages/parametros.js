// src/components/Parametros.js
import React, { useState, useEffect, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleParametro from '../components/layout/detalleParametro';
import SelectTambo from '../components/layout/selectTambo';
import { Button, DropdownButton, Dropdown, Row, Col } from 'react-bootstrap';
import { format } from 'date-fns';
import { addNotification } from '../redux/notificacionSlice';
import styles from '../styles/Parametro.module.scss';

const Parametros = () => {
  const [valor, setValor] = useState(0);
  const { firebase, setPorc, tamboSel } = useContext(FirebaseContext);
  const [selectedChange, setSelectedChange] = useState(null);
  const [isIncrease, setIsIncrease] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    if (tamboSel) {
      obtenerPorcentaje();
    }
  }, [tamboSel]);

  const obtenerPorcentaje = async () => {
    try {
      const snapshot = await firebase.db.collection('tambo').doc(tamboSel.id).get();
      snapshotParametros(snapshot);
    } catch (error) {
      console.log(error);
    }
  };

  function snapshotParametros(snapshot) {
    setValor(snapshot.data().porcentaje);
  }

  const handleApplyChange = async () => {
    if (selectedChange === null || !tamboSel) return;

    let nuevoPorcentaje = selectedChange;
    if (nuevoPorcentaje > 100) nuevoPorcentaje = 100;
    if (nuevoPorcentaje < -50) nuevoPorcentaje = -50;

    const porcentajeAnimal = { porcentaje: 1 + nuevoPorcentaje / 100 };
    const p = { porcentaje: nuevoPorcentaje };

    // ✅ Cambio instantáneo en pantalla
    setValor(nuevoPorcentaje);
    setPorc(nuevoPorcentaje);
    setSelectedChange(null);

    try {
      // ✅ Actualiza el porcentaje general en el tambo
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);

      // ✅ Batch update para animales (más rápido)
      const snapshot = await firebase.db
        .collection('animal')
        .where('tamboId', '==', tamboSel.id)
        .get();

      const batch = firebase.db.batch();
      snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return !data.fbaja && !data.mbaja;
        })
        .forEach(doc => {
          const ref = firebase.db.collection('animal').doc(doc.id);
          batch.update(ref, porcentajeAnimal);
        });

      await batch.commit();

      // ✅ Notificación
      const noti = {
        mensaje: isIncrease
          ? `AUMENTO DEL ${nuevoPorcentaje} %`
          : `REDUCCIÓN DEL ${nuevoPorcentaje} %`,
        fecha: firebase.nowTimeStamp(),
      };

      await firebase.db
        .collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .add(noti);

      dispatch(addNotification({
        ...noti,
        id: Date.now(),
      }));

    } catch (error) {
      console.error("Error al aplicar cambio:", error);
    }
  };


  const restablecer = async () => {
    if (!tamboSel) return;

    const p = { porcentaje: 0 };
    const pAnimal = { porcentaje: 1 };

    // ✅ Cambio instantáneo en pantalla
    setValor(0);
    setSelectedChange(null);
    setIsIncrease(true);

    try {
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);

      const snapshot = await firebase.db
        .collection('animal')
        .where('tamboId', '==', tamboSel.id)
        .get();

      const batch = firebase.db.batch();
      snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return !data.fbaja && !data.mbaja;
        })
        .forEach(doc => {
          const ref = firebase.db.collection('animal').doc(doc.id);
          batch.update(ref, pAnimal);
        });

      await batch.commit();

      const noti = {
        mensaje: 'SE VOLVIÓ AL VALOR ORIGINAL DE LA RACIÓN.',
        fecha: firebase.nowTimeStamp(),
      };

      await firebase.db
        .collection('tambo')
        .doc(tamboSel.id)
        .collection('notificaciones')
        .add(noti);

      dispatch(addNotification({
        ...noti,
        id: Date.now(),
      }));

    } catch (error) {
      console.error("Error al restablecer:", error);
    }
  };



  let porcentaje;
  if (valor >= -50 && valor <= 100 && valor % 10 === 0) {
    porcentaje = 1 + valor / 100;
  }

  return (
    <Layout titulo="Parámetros Nutricionales">
      <div className={styles.container}>
        <h1 className={styles.titulo}>🥩 Parametros de Alimentación</h1>

        <div className={styles.estadoActual}>
          <span className={styles.estadoLabel}>Estado actual:</span>
          <span className={styles.estadoValor}>
            {valor === 0
              ? "Por defecto"
              : valor < 0
                ? `Reducción del ${valor}%`
                : `Aumento del ${valor}%`}
          </span>
        </div>

        <div className={styles.bloqueBotones}>
          <DropdownButton
            id="dropdown-aumentar-button"
            title={
              isIncrease && selectedChange !== null
                ? `Aumento: ${selectedChange}%`
                : "Seleccionar Aumento"
            }
            className={`${styles.dropdownAumentarButton} ${styles.dropdownEstilo}`}
            variant=""
            onSelect={(e) => {
              setSelectedChange(parseInt(e));
              setIsIncrease(true);
            }}
          >
            {["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"].map(
              (p) => (
                <Dropdown.Item key={p} eventKey={p}>
                  {p}%
                </Dropdown.Item>
              )
            )}
          </DropdownButton>

          <Button className={styles.botonRestablecer} onClick={restablecer}>
            Restablecer
          </Button>

          <DropdownButton
            id="dropdown-reducir-button"
            title={
              !isIncrease && selectedChange !== null
                ? `Reducción: ${selectedChange}%`
                : "Seleccionar Reducción"
            }
            className={`${styles.dropdownReducirButton} ${styles.dropdownEstilo}`}
            variant=""
            onSelect={(e) => {
              setSelectedChange(parseInt(e));
              setIsIncrease(false);
            }}
          >
            {["-10", "-20", "-30", "-40", "-50"].map((p) => (
              <Dropdown.Item key={p} eventKey={p}>
                {p}%
              </Dropdown.Item>
            ))}
          </DropdownButton>
        </div>

        {selectedChange !== null && (
          <div className={styles.botonAplicarWrapper}>
            <Button className={styles.botonAplicar} onClick={handleApplyChange}>
              Aplicar cambio
            </Button>
          </div>
        )}

        {tamboSel ? (
          <>
            <Row className="gx-4 gy-4 mt-3">
              <Col md={6}>
                <DetalleParametro
                  idTambo={tamboSel.id}
                  categoria="Vaquillona"
                  porcentaje={porcentaje}
                />
              </Col>
              <Col md={6}>
                <DetalleParametro
                  idTambo={tamboSel.id}
                  categoria="Vaca"
                  porcentaje={porcentaje}
                />
              </Col>
            </Row>
          </>
        ) : (
          <SelectTambo />
        )}
      </div>
    </Layout>
  );
};

export default Parametros;
