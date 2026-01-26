// ================================
// Servidor Render - ESP32 Tanque
// ================================

const express = require('express');
const app = express();

// ---------- CONFIGURACIÓN ----------
const TOKEN = "A9F3K2X7";   // mismo token que el ESP32
let ultimoEstado = {};      // aquí se guardan los últimos datos

// ---------- MIDDLEWARE ----------
app.use(express.json());

// Verificación de token
function verificarToken(req, res, next) {
  const token = req.headers['x-auth-token'];

  if (!token || token !== TOKEN) {
    return res.status(401).json({ error: "Token inválido o ausente" });
  }
  next();
}

// ---------- RUTAS ----------

// Ruta base (prueba rápida)
app.get('/', (req, res) => {
  res.send("Servidor ESP32 Tanque activo");
});

// ESP32 → ENVÍA DATOS
// (NO requiere token aquí porque el ESP32 YA lo manda en el body)
app.post('/api/datos', (req, res) => {
  const data = req.body;

  // Validación mínima
  if (!data || !data.id || data.auth !== TOKEN) {
    return res.status(401).json({ error: "Datos o token inválidos" });
  }

  ultimoEstado = {
    ...data,
    timestamp: Date.now()
  };

  console.log("Datos recibidos del ESP32:", ultimoEstado);

  res.json({ status: "ok" });
});

// CLIENTES → LEEN DATOS (PROTEGIDO)
app.get('/api/datos', verificarToken, (req, res) => {
  if (!ultimoEstado.id) {
    return res.status(404).json({ error: "Aún no hay datos del ESP32" });
  }

  res.json(ultimoEstado);
});

// ---------- INICIAR SERVIDOR ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
