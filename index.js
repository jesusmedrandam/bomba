// =======================================
// Servidor Render – Control ESP32 Tanque
// =======================================

const express = require("express");
const app = express();

// -------- CONFIGURACIÓN --------
const TOKEN = "A9F3K2X7";

// -------- ESTADO GLOBAL --------
let estadoActual = null;

let comandoPendiente = null; // ON / OFF
let modoPendiente = null;    // AUTO / MANUAL
let configPendiente = null;  // minPozo, minTanque, maxTanque

// -------- MIDDLEWARE --------
app.use(express.json());

function verificarToken(req, res, next) {
  const token = req.headers["x-auth-token"];
  if (!token || token !== TOKEN) {
    return res.status(401).json({ error: "Token inválido o ausente" });
  }
  next();
}

// -------- RUTAS --------

// Test
app.get("/", (req, res) => {
  res.send("Servidor ESP32 Tanque activo");
});

// ================= DATOS =================

// ESP32 → ENVÍA ESTADO
app.post("/api/datos", (req, res) => {
  const data = req.body;

  if (!data || data.auth !== TOKEN) {
    return res.status(401).json({ error: "Token inválido" });
  }

  estadoActual = {
    ...data,
    timestamp: Date.now()
  };

  res.json({ status: "ok" });
});

// APP → LEE ESTADO
app.get("/api/datos", verificarToken, (req, res) => {
  if (!estadoActual) {
    return res.status(404).json({ error: "Aún no hay datos" });
  }
  res.json(estadoActual);
});

// ================= COMANDO BOMBA =================

// APP → ENVÍA COMANDO
app.post("/api/comando", verificarToken, (req, res) => {
  const { cmd } = req.body;

  if (cmd !== "ON" && cmd !== "OFF") {
    return res.status(400).json({ error: "Comando inválido" });
  }

  comandoPendiente = cmd;
  res.json({ status: "comando guardado" });
});

// ESP32 → CONSULTA COMANDO
app.get("/api/comando", (req, res) => {
  if (!comandoPendiente) {
    return res.json({ cmd: "NONE" });
  }

  const cmd = comandoPendiente;
  comandoPendiente = null;
  res.json({ cmd });
});

// ================= MODO =================

app.post("/api/modo", verificarToken, (req, res) => {
  const { modo } = req.body;

  if (modo !== "AUTO" && modo !== "MANUAL") {
    return res.status(400).json({ error: "Modo inválido" });
  }

  modoPendiente = modo;
  res.json({ status: "modo guardado" });
});

app.get("/api/modo", (req, res) => {
  if (!modoPendiente) {
    return res.json({ modo: "NONE" });
  }

  const modo = modoPendiente;
  modoPendiente = null;
  res.json({ modo });
});

// ================= CONFIG =================

app.post("/api/config", verificarToken, (req, res) => {
  const { minPozo, minTanque, maxTanque } = req.body;

  if (
    typeof minPozo !== "number" ||
    typeof minTanque !== "number" ||
    typeof maxTanque !== "number"
  ) {
    return res.status(400).json({ error: "Configuración inválida" });
  }

  configPendiente = { minPozo, minTanque, maxTanque };
  res.json({ status: "config guardada" });
});

app.get("/api/config", (req, res) => {
  if (!configPendiente) {
    return res.json({ config: null });
  }

  const cfg = configPendiente;
  configPendiente = null;
  res.json(cfg);
});

// -------- INICIAR --------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor activo en puerto", PORT);
});

