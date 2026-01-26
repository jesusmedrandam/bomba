// ================================
// Servidor Render - ESP32 Tanque
// ================================

const express = require('express');
const app = express();

// ---------- CONFIGURACIÓN ----------
const TOKEN = "A9F3K2X7";   // MISMO token que usa el ESP32
let ultimoEstado = {};      // último estado recibido del ESP32

// ---------- MIDDLEWARE ----------
app.use(express.json());

// ---------- TOKEN MIDDLEWARE ----------
function verificarToken(req, res, next) {
  const token = req.headers['x-auth-token'];

  if (!token || token !== TOKEN) {
    return res.status(401).json({ error: "Token inválido o ausente" });
  }
  next();
}

// ---------- RUTAS ----------

// 🔹 RUTA DE PRUEBA (MUY IMPORTANTE)
app.get('/api/test', (req, res) => {
  res.json({
    ok: true,
    msg: "Este index.js SI está corriendo en Render"
  });
});

// 🔹 RUTA BASE
app.get('/', (req, res) => {
  res.send("Servidor ESP32 Tanque activo");
});

// 🔹 ESP32 → ENVÍA DATOS
app.post('/api/datos', (req, res) => {
  const data = req.body;

  // Validación mínima
  if (!data || data.auth !== TOKEN) {
    return res.status(401).json({ error: "Token inválido" });
  }

  ultimoEstado = {
    ...data,
    timestamp: Date.now()
  };

  console.log("Datos recibidos del ESP32:", ultimoEstado);

  res.json({ status: "ok" });
});

// 🔹 CLIENTES → LEEN DATOS (PROTEGIDO)
app.get('/api/datos', verificarToken, (req, res) => {
  if (!ultimoEstado || Object.keys(ultimoEstado).length === 0) {
    return res.status(404).json({ error: "Aún no hay datos del ESP32" });
  }

  res.json(ultimoEstado);
});

// ---------- INICIAR SERVIDOR ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor activo en puerto", PORT);
});

