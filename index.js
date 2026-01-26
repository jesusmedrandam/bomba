const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===== CONFIG =====
const AUTH_CODE = "A9F3K2X7";   // el mismo que en el ESP32

// Estado en memoria (luego puede ser DB)
let ultimoEstado = {
  online: false,
  lastUpdate: 0,
  data: {}
};

// ===== ENDPOINT ESP32 → RENDER =====
app.post("/api/datos", (req, res) => {
  const { auth, id } = req.body;

  if (auth !== AUTH_CODE) {
    return res.status(401).json({ error: "No autorizado" });
  }

  ultimoEstado = {
    online: true,
    lastUpdate: Date.now(),
    data: req.body
  };

  console.log("Datos recibidos:", req.body);
  res.json({ status: "ok" });
});

// ===== ENDPOINT CLIENTES (WEB / APP) =====
app.get("/api/estado", (req, res) => {
  const now = Date.now();
  const timeout = 30000;

  const online = now - ultimoEstado.lastUpdate < timeout;

  res.json({
    online,
    lastUpdate: ultimoEstado.lastUpdate,
    data: ultimoEstado.data
  });
});

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.send("Servidor ESP32 Tanque activo");
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto", PORT);
});
