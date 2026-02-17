// ===============================
//  SERVIDOR RENDER — APP BOMBA
// ===============================

import express from "express";
import cors from "cors";
import admin from "firebase-admin";

// 🔥 Leer credenciales Firebase desde variable de entorno
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ===============================
//  CONFIG EXPRESS
// ===============================
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ===============================
//  VARIABLES GLOBALES
// ===============================
let ultimoEstado = null;
let ultimoComando = null;
let deviceTokens = [];
let ultimaAlerta = null;

const AUTH = "A9F3K2X7";

// ===============================
//  VALIDAR TOKEN
// ===============================
function validarAuth(req) {
  return (
    req.query.auth === AUTH ||
    req.headers["x-auth-token"] === AUTH ||
    (req.body && req.body.auth === AUTH)
  );
}

// ===============================
//  FUNCIÓN: ENVIAR PUSH
// ===============================
async function enviarPush(mensaje) {

  if (deviceTokens.length === 0) {
    console.log("⚠ No hay dispositivos registrados");
    return;
  }

  if (mensaje === ultimaAlerta) return;

  ultimaAlerta = mensaje;

  const message = {
    notification: {
      title: "Bomba",
      body: mensaje,
    },
    tokens: deviceTokens,
  };

  try {

    const response = await admin.messaging().sendEachForMulticast(message);

    // 🔥 eliminar tokens inválidos
    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        console.log("❌ Token inválido eliminado:", deviceTokens[index]);
        deviceTokens.splice(index, 1);
      }
    });

    console.log("✅ Push enviado:", mensaje);

  } catch (error) {
    console.log("❌ Error enviando push:", error);
  }
}

// ===============================
//  ESP32 → Render : enviar estado
// ===============================
app.post("/api/render/update", async (req, res) => {

  if (!validarAuth(req)) {
    return res.status(401).json({ error: "token" });
  }

  const datos = req.body;

  ultimoEstado = {
    fecha: new Date().toISOString(),
    datos,
  };

  console.log("📩 Estado recibido:", datos);

  try {

    if (datos.nivel_tanque <= datos.min_tanque) {
      await enviarPush("⚠ Tanque en nivel mínimo");
    }

    if (!datos.conexion_pozo) {
      await enviarPush("🚨 Conexión perdida con el pozo");
    }

    if (datos.nivel_tanque >= datos.max_tanque) {
      await enviarPush("✅ Tanque lleno");
    }

    if (datos.modo === "MANUAL" && datos.bomba === true) {
      await enviarPush("🔔 Bomba encendida en modo manual");
    }

    if (datos.modo === "MANUAL" && datos.bomba === false) {
      await enviarPush("🔔 Bomba apagada en modo manual");
    }

  } catch (e) {
    console.log("❌ Error evaluando alertas:", e);
  }

  return res.json({ ok: true });
});

// ===============================
//  Cliente → Render : leer estado
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
//  APP → Render : enviar comando
// ===============================
app.post("/api/render/cmd", (req, res) => {

  if (!validarAuth(req)) {
    return res.status(401).json({ error: "token" });
  }

  if (!req.body.cmd) {
    return res.status(400).json({ error: "falta cmd" });
  }

  ultimoComando = String(req.body.cmd).trim();

  return res.json({ ok: true, cmd: ultimoComando });
});

// ===============================
//  ESP32 → Render : leer comando
// ===============================
app.get("/api/render/cmd", (req, res) => {

  if (!validarAuth(req)) {
    return res.status(401).json({ error: "token" });
  }

  if (!ultimoComando) {
    return res.json({ cmd: null });
  }

  const cmdTemp = ultimoComando;
  ultimoComando = null;

  return res.json({ cmd: cmdTemp });
});

// ===============================
//  APP → Render : registrar token
// ===============================
app.post("/api/render/register-token", (req, res) => {

  if (!validarAuth(req)) {
    return res.status(401).json({ error: "token" });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "falta token" });
  }

  if (!deviceTokens.includes(token)) {
    deviceTokens.push(token);
    console.log("📲 Token registrado:", token);
  }

  return res.json({ ok: true });
});

// ===============================
//  TEST PUSH MANUAL
// ===============================
app.get("/test-push", async (req, res) => {

  await enviarPush("🔥 Notificación de prueba desde servidor");
  res.send("Push enviada correctamente");
});

// ===============================
//  INICIO SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor Render escuchando en puerto " + PORT);
});
