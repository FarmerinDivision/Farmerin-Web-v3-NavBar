import React, { useEffect, useState } from 'react';
import styles from '../../styles/perfilFarmerin.module.scss';

const CardInfoClimaHora = ({ ubicacion }) => {
  const [horaActual, setHoraActual] = useState('');
  const [clima, setClima] = useState(null);
  const [error, setError] = useState('');

  // Actualizar hora cada segundo
  useEffect(() => {
    const actualizarHora = () => {
      const ahora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHoraActual(ahora);
    };

    actualizarHora(); // inicial
    const interval = setInterval(actualizarHora, 1000);
    return () => clearInterval(interval);
  }, []);

  // Obtener clima actual
  useEffect(() => {
    if (!ubicacion) return;

    const API_KEY = 'AIzaSyATYDND7IQvZV6_2EqKDCX3xHzgSVr51qo'; // ⬅️ Reemplazá esto
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${ubicacion},AR&appid=${API_KEY}&units=metric&lang=es`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.cod !== 200) {
          setError(data.message);
          return;
        }
        setClima({
          temp: Math.round(data.main.temp),
          descripcion: data.weather[0].description,
          icono: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        });
      })
      .catch(err => setError('No se pudo obtener el clima.'));
  }, [ubicacion]);

  return (
    <div className={styles.cardClimaHora}>
      <div className={styles.horaSection}>
        <h4>Hora actual</h4>
        <p>{horaActual}</p>
      </div>
      <div className={styles.climaSection}>
        <h4>Clima en {ubicacion}</h4>
        {clima ? (
          <>
            <img src={clima.icono} alt="icono clima" />
            <p>{clima.descripcion}</p>
            <strong>{clima.temp}°C</strong>
          </>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : (
          <p>Cargando clima...</p>
        )}
      </div>
    </div>
  );
};

export default CardInfoClimaHora;
