// ===============================
//  SERVIDOR RENDER — APP BOMBA
// ===============================

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
//  VARIABLE GLOBAL : ESTADO + COMANDO
// ===============================
let ultimoEstado = null;
let ultimoComando = null;
const AUTH = "A9F3K2X7";

// ===============================
//  MID: VALIDAR TOKEN
// ===============================
function validarAuth(req) {
  return (
    req.query.auth === AUTH ||
    req.headers["x-auth-token"] === AUTH ||
    (req.body && req.body.auth === AUTH)
  );
}

// ===============================
//  1) ESP32 → Render : enviar estado
// ===============================
app.post("/api/render/update", (req, res) => {
  if (!validarAuth(req)) {
    return res.status(401).json({ error: "token" });
  }

  ultimoEstado = {
    fecha: new Date().toISOString(),
    datos: req.body,
  };

  return res.json({ ok: true });
});

// ===============================
//  2) Cliente → Render : leer estado
// ===============================
app.get("/api/render/status", (req, res) => {
  if (!validarAuth(req)) {
    return res.status(401).json({ error: "token" });
  }

  if (!ultimoEstado) {
    return res.json({ recibido: false });
  }

  return res.json({
    recibido: true,
    fecha: ultimoEstado.fecha,
    datos: ultimoEstado.datos,
  });
});

// ===============================
//  3) APP → Render : enviar comando
// ===============================
app.post("/api/render/cmd", (req, res) => {
  if (!validarAuth(req)) {
    return res.status(401).json({ error: "token" });
  }

  if (!req.body.cmd) {
    return res.status(400).json({ error: "falta cmd" });
  }

  ultimoComando = String(req.body.cmd).trim(); // Ej: ON / OFF / AUTO / MANUAL

  return res.json({ ok: true, cmd: ultimoComando });
});

// ===============================
//  4) ESP32 → Render : leer comando
// ===============================
app.get("/api/render/cmd", (req, res) => {
  if (!validarAuth(req)) {
    return res.status(401).json({ error: "token" });
  }

  if (!ultimoComando) {
    return res.json({ cmd: null });
  }

  const cmdTemp = ultimoComando;
  ultimoComando = null; // Se borra después de entregar

  return res.json({ cmd: cmdTemp });
});

// ===============================
//  INICIO SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor Render escuchando en puerto " + PORT);
});
