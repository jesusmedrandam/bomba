const express = require('express');
const app = express();

/* ================= CONFIG ================= */

// Token de autenticación (el mismo que usa el ESP32)
const AUTH_TOKEN = "A9F3K2X7";

// Últimos datos recibidos del ESP32
let ultimoEstado = {
  id: null,
  nivel_tanque: null,
  nivel_pozo: null,
  bomba: null,
  modo: null,
  timestamp: null
};

app.use(express.json());

/* ================= MIDDLEWARE AUTH ================= */

function verificarToken(req, res, next) {
  const token = req.headers['x-auth-token'];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  next();
}

/* ================= RUTAS ================= */

// Ruta raíz (solo para comprobar que el server está vivo)
app.get('/', (req, res) => {
  res.send('Servidor ESP32 Tanque activo');
});

/* -------- ESP32 → Render (POST) -------- */
app.post('/api/datos', verificarToken, (req, res) => {
  const {
    id,
    nivel_tanque,
    nivel_pozo,
    bomba,
    modo
  } = req.body;

  // Guardar último estado
  ultimoEstado = {
    id,
    nivel_tanque,
    nivel_pozo,
    bomba,
    modo,
    timestamp: Date.now()
  };

  console.log('Datos recibidos:', ultimoEstado);

  res.json({ status: 'ok' });
});

/* -------- App / Web → Render (GET) -------- */
app.get('/api/datos', verificarToken, (req, res) => {
  if (!ultimoEstado.timestamp) {
    return res.status(404).json({ error: 'Sin datos aún' });
  }

  res.json(ultimoEstado);
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Servidor escuchando en puerto', PORT);
});
