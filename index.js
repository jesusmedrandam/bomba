const express = require('express');
const app = express();

app.use(express.json());

// Ruta raíz
app.get('/', (req, res) => {
  res.send('Servidor ESP32 Tanque activo');
});

// Ruta API
app.get('/api/datos', (req, res) => {
  res.json({
    nivel_tanque: 80,
    nivel_pozo: 65,
    modo_auto: true,
    bomba_on: false,
    conexion_pozo: true
  });
});

// Render usa ESTE puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Servidor escuchando en puerto', PORT);
});

