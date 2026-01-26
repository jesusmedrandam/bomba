const express = require('express');
const app = express();

app.use(express.json());

// Ruta raíz (para probar que el server vive)
app.get('/', (req, res) => {
  res.send('Servidor ESP32 Tanque activo');
});

// 👉 ESTA ES LA RUTA QUE TE FALTA
app.get('/api/datos', (req, res) => {
  res.json({
    nivel_tanque: 75,
    nivel_pozo: 60,
    modo_auto: true,
    bomba_on: false,
    conexion_pozo: true
  });
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

