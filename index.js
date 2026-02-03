// Servidor Render – Control ESP32 Tanque
// Version unificada con API LOCAL
// =======================================

const express = require("express");
const app = express();

// -------- CONFIGURACIÓN --------
const TOKEN = "A9F3K2X7";

// -------- ESTADO GLOBAL --------
let estadoActual = null;

let controlPendiente = null;  // { modo_auto, bomba }
let configPendiente = null;   // { min_pozo, min_tanque, max_tanque, prof_pozo, alt_tanque }

// -------- MIDDLEWARE --------
app.use(express.json());

function verificarToken(req, res, next) {
  const token = req.headers["x-auth-token"];
  if (!token || token !== TOKEN) {
    return res.status(401).json({ error: "Token inválido o ausente" });
  }
  next();
}

// TEST
app.get("/", (req, res) => {
  res.send("Servidor ESP32 Tanque activo");
});

// =====================================================
// ================= TELEMETRIA ========================
// =====================================================

// ESP32 → ENVIA ESTADO
app.post("/api/datos", (req, res) => {
  const data = req.body;

  if (!data || data.auth !== TOKEN) {
    return res.status(401).json({ error: "Token inválido" });
  }

  estadoActual = { ...data, timestamp: Date.now() };
  res.json({ status: "ok" });
});

// APP / PC → LEE ESTADO  (CORREGIDO)
app.get("/api/datos", (req, res) => {
  // Token desde query o header
  const token =
    req.headers["x-auth-token"] ||
    req.query.auth;

  if (!token || token !== TOKEN) {
    return res.status(401).json({ error: "Token inválido" });
  }

  if (!estadoActual) {
    return res.status(404).json({ error: "aún no hay datos" });
  }

  res.json(estadoActual);
});

// =====================================================
// ================= CONTROL ===========================
// =====================================================

// APP → ENVIA CONTROL
app.post("/api/control", verificarToken, (req, res) => {
  const payload = req.body;

  if (
    !payload ||
    (!payload.hasOwnProperty("modo_auto") &&
     !payload.hasOwnProperty("bomba"))
  ) {
    return res.status(400).json({ error: "payload inválido" });
  }

  controlPendiente = payload;

  res.json({ status: "control guardado" });
});

// ESP32 → LEE CONTROL PENDIENTE
app.get("/api/control", (req, res) => {
  if (!controlPendiente) {
    return res.json({ control: null });
  }

  const ctrl = controlPendiente;
  controlPendiente = null;

  res.json({ control: ctrl });
});

// =====================================================
// ================= CONFIGURACIÓN ======================
// =====================================================

// APP → ENVIA CONFIG
app.post("/api/config", verificarToken, (req, res) => {
  const cfg = req.body;

  if (!cfg || Object.keys(cfg).length === 0) {
    return res.status(400).json({ error: "config vacía" });
  }

  configPendiente = cfg;

  res.json({ status: "config guardada" });
});

// ESP32 → LEE CONFIG PENDIENTE
app.get("/api/config", (req, res) => {
  if (!configPendiente) {
    return res.json({ config: null });
  }

  const cfg = configPendiente;
  configPendiente = null;

  res.json({ config: cfg });
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor activo en puerto", PORT);
});

