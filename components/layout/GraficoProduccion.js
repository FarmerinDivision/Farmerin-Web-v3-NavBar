import React from 'react';
import {
  ComposedChart, Line, Bar,
  XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from 'recharts';

// 🔢 Formato con miles
const formatNumber = (num) => {
  const numberValue = Number(num);
  if (isNaN(numberValue)) return 0;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(numberValue);
};

// 🔢 Decimal: 22,3
const formatProdIndv = (num) => {
  const numberValue = parseFloat(num);
  if (isNaN(numberValue)) return 0;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(numberValue);
};

// 📊 Tooltip personalizado
const TooltipGeneral = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const prod = payload.find(p => p.dataKey === 'produccion')?.value;
    const vacas = payload.find(p => p.dataKey === 'animales')?.value;
    const temperatura = payload.find(p => p.dataKey === 'temperatura')?.value;
    return (
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10, borderRadius: 6 }}>
        <p><strong>{label}</strong></p>
        <p>🍼 Producción: <strong>{formatNumber(prod)} lts</strong></p>
        <p>🐄 Vacas en ordeñe: <strong>{formatNumber(vacas)}</strong></p>
        <p>🌡️ Temperatura: <strong>{formatNumber(temperatura)} °C</strong></p>
      </div>
    );
  }
  return null;
};

const GraficoProduccion = ({ data, promedioTotal }) => {
  // ✅ Asegurar que data esté presente
  if (!Array.isArray(data) || data.length === 0) {
    return <p style={{ textAlign: 'center', marginTop: 20 }}>No hay datos para mostrar.</p>;
  }

  // 🧱 Convertimos las fechas y formateamos los datos
  const formattedData = data.map(item => {
    const fechaObj = item.fecha.toDate ? item.fecha.toDate() : new Date(item.fecha);
    return {
      fecha: fechaObj.toISOString().split('T')[0], // YYYY-MM-DD
      produccion: item.produccion,
      animales: item.animalesEnOrd,
      temperatura: item.tempMax
    };
  });

  // 📅 Detectamos si hay más de un año
  const years = new Set(formattedData.map(item => new Date(item.fecha).getFullYear()));
  const multipleYears = years.size > 1;

  // 🏷️ Formato condicional de fecha para el eje X
  const formatXAxisLabel = (dateStr) => {
    const date = new Date(dateStr);
    return multipleYears
      ? date.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : date.toLocaleDateString('es-AR', { month: '2-digit', day: '2-digit' });
  };

  return (
    <div style={{ width: '100%', marginTop: 40 }}>
      <h3 style={{ textAlign: 'center', marginBottom: 5 }}>
        Producción Total y Vacas en Ordeñe
      </h3>

      {typeof promedioTotal === 'number' && (
        <p style={{
          textAlign: 'center',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          color: '#d32f2f',
          marginBottom: 20
        }}>
          Prom. Individual Total: {formatProdIndv(promedioTotal)} lts/vaca
        </p>
      )}

      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={formattedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tickFormatter={formatXAxisLabel} />
            <YAxis
              yAxisId="produccion"
              tickFormatter={formatNumber}
              label={{ value: 'Producción (lts)', angle: -90, position: 'insideLeft' }}
            />

            <YAxis
              yAxisId="vacas"
              orientation="right"
              tickFormatter={formatNumber}
              label={{ value: 'Vacas en ordeñe', angle: -90, position: 'insideRight' }}
            />

            <YAxis
              yAxisId="temp"
              orientation="right"
              tickFormatter={(v) => `${v}°`}
              hide
            />
            <Tooltip content={<TooltipGeneral />} />
            <Legend verticalAlign="top" height={36} />
            <Bar
              dataKey="produccion"
              barSize={30}
              fill="#81d4fa"
              name="🍼 Producción"
              yAxisId="produccion"
            />

            <Line
              type="monotone"
              dataKey="animales"
              stroke="#43a047"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="🐄 Vacas en ordeñe"
              yAxisId="vacas"
            />

            {/* <Line
              type="monotone"
              dataKey="temperatura"
              stroke="#ffa726"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="🌡️ Temperatura"
              yAxisId="temp"
            /> */}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GraficoProduccion;
