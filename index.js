import express from "express";
import cors from "cors";
import admin from "firebase-admin";

// Leer credenciales Firebase desde variable de entorno
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

const AUTH = "A9F3K2X7";

// Guardar último dato para detectar cambios
let memoria = {
  nivel_pozo: null,
  nivel_tanque: null,
  conexion_pozo: null,
  bomba: null,
  modo: null,
  min_pozo: null,
  min_tanque: null,
  max_tanque: null,
  prof_pozo: null,
  alt_tanque: null,
};

// Mantener alertas activas para no repetir
let alertas = {
  pozo_min: false,
  pozo_muy_bajo: false,
  pozo_cero: false,
  tanque_min: false,
  tanque_muy_bajo: false,
  tanque_cero: false,
  conexion: false,
  tanque_lleno: false,
  manual_on: false,
  manual_off: false,
  auto_bomba_estancada: false,
};

// Para alerta de 5 minutos sin aumento
let nivelInicialAuto = null;
let tiempoInicioAuto = null;

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
async function enviarPush(titulo, mensaje) {
  if (!mensaje) return;

  if (deviceTokens.length === 0) {
    console.log("⚠ No hay dispositivos registrados");
    return;
  }

  const message = {
    tokens: deviceTokens,
    notification: {
      title: titulo,
      body: mensaje,
    },
    android: {
      priority: "high",
      notification: {
        channelId: "push_channel",
        sound: "default",
        priority: "max",
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        console.log("❌ Token inválido eliminado:", deviceTokens[index]);
        deviceTokens.splice(index, 1);
      }
    });

    console.log(`✅ Push enviado (${titulo}):`, mensaje);
  } catch (error) {
    console.log("❌ Error enviando push:", error);
  }
}

// ===============================
//  FUNCION EVALUAR ALERTAS
// ===============================
async function evaluarAlertas(datos) {
  const {
    nivel_pozo,
    nivel_tanque,
    conexion_pozo,
    modo,
    bomba,
    min_pozo,
    min_tanque,
    max_tanque,
    prof_pozo,
    alt_tanque,
  } = datos;

  const estadoBomba = bomba ? "encendida" : "apagada";
  // ===============================
//     DETECTAR CAMBIOS EN CONFIG
// ===============================
const configuraciones = [
  ["min_pozo",   "Nuevo nivel mínimo del pozo: " + min_pozo + "%"],
  ["min_tanque", "Nuevo nivel mínimo del tanque: " + min_tanque + "%"],
  ["max_tanque", "Nuevo nivel máximo del tanque: " + max_tanque + "%"],
  ["prof_pozo",  "Nueva profundidad del pozo: " + prof_pozo + " m"],
  ["alt_tanque", "Nueva altura del tanque: " + alt_tanque + " m"],
];

for (const [campo, mensaje] of configuraciones) {
  if (memoria[campo] !== null && memoria[campo] !== datos[campo]) {
    await enviarPush("Configuración actualizada", mensaje);
  }
}

  // ===============================
  //       CAMBIO DE MODO
  // ===============================
  if (memoria.modo !== null && memoria.modo !== modo) {
    const titulo = "Modo cambiado";
    const cuerpo = modo === "AUTO"
      ? "El sistema cambió a modo AUTOMÁTICO"
      : "El sistema cambió a modo MANUAL";

    await enviarPush(titulo, cuerpo);
  }

  // ===============================
  //      POZO - Alertas
  // ===============================

  if (nivel_pozo === min_pozo && !alertas.pozo_min) {
    await enviarPush("Pozo bajo",
      `El pozo alcanzó su nivel mínimo (${min_pozo}%). La bomba está ${estadoBomba}.`);
    alertas.pozo_min = true;
  } else if (nivel_pozo !== min_pozo) alertas.pozo_min = false;

  if (nivel_pozo > 0 && nivel_pozo < min_pozo && !alertas.pozo_muy_bajo) {
    await enviarPush("Pozo muy bajo",
      `El pozo está por debajo del mínimo (${min_pozo}%). La bomba está ${estadoBomba}.`);
    alertas.pozo_muy_bajo = true;
  } else if (nivel_pozo >= min_pozo) alertas.pozo_muy_bajo = false;

  if (nivel_pozo === 0 && !alertas.pozo_cero) {
    await enviarPush("Error de Sensor",
      `El sensor del pozo podría estar fallando, nivel actual: ${nivel_pozo}%`);
    alertas.pozo_cero = true;
  } else if (nivel_pozo > 0) alertas.pozo_cero = false;

  // ===============================
  //      TANQUE - Alertas
  // ===============================

  if (nivel_tanque === min_tanque && !alertas.tanque_min) {
    await enviarPush("Tanque bajo",
      `El tanque alcanzó su nivel mínimo (${min_tanque}%). La bomba está ${estadoBomba}.`);
    alertas.tanque_min = true;
  } else if (nivel_tanque !== min_tanque) alertas.tanque_min = false;

  if (nivel_tanque > 0 && nivel_tanque < min_tanque && !alertas.tanque_muy_bajo) {
    await enviarPush("Tanque muy Bajo",
      `El tanque está por debajo del nivel mínimo (${min_tanque}%). La bomba está ${estadoBomba}.`);
    alertas.tanque_muy_bajo = true;
  } else if (nivel_tanque >= min_tanque) alertas.tanque_muy_bajo = false;

  if (nivel_tanque <= 0 && !alertas.tanque_cero) {
    await enviarPush("Error de Sensor",
      `El sensor del tanque podría estar fallando, nivel actual: ${nivel_tanque}%.`);
    alertas.tanque_cero = true;
  } else if (nivel_tanque > 0) alertas.tanque_cero = false;

  if (nivel_tanque >= max_tanque && !alertas.tanque_lleno) {
    await enviarPush("Tanque lleno", "El tanque alcanzó su capacidad máxima.");
    alertas.tanque_lleno = true;
  } else if (nivel_tanque < max_tanque) alertas.tanque_lleno = false;

  // ===============================
  //     CONEXIÓN
  // ===============================
  if (!conexion_pozo && !alertas.conexion) {
    await enviarPush("Sin conexión",
      "Se ha perdido la conexión con el pozo. La bomba se apagará por seguridad.");
    alertas.conexion = true;
  } else if (conexion_pozo) alertas.conexion = false;

  // ===============================
  //     MODO MANUAL
  // ===============================
  if (modo === "MANUAL" && bomba && !alertas.manual_on) {
    await enviarPush("Bomba Encendida", "La bomba fue encendida desde modo manual.");
    alertas.manual_on = true;
  } else if (!(modo === "MANUAL" && bomba)) alertas.manual_on = false;

  if (modo === "MANUAL" && !bomba && !alertas.manual_off) {
    await enviarPush("Bomba Apagada", "La bomba fue apagada desde modo manual");
    alertas.manual_off = true;
  } else if (!(modo === "MANUAL" && !bomba)) alertas.manual_off = false;

  // ===============================
  //    5 MIN ENCENDIDA SIN SUBIR
  // ===============================
  if (modo === "AUTO" && bomba) {
    if (nivelInicialAuto === null) {
      nivelInicialAuto = nivel_tanque;
      tiempoInicioAuto = Date.now();
    }

    const diff = Date.now() - tiempoInicioAuto;

    if (diff >= 5 * 60 * 1000) {
      if (nivel_tanque <= nivelInicialAuto && !alertas.auto_bomba_estancada) {
        await enviarPush(
          "Posible Falla",
          `La bomba lleva 5 minutos encendida y el nivel del tanque sigue en ${nivel_tanque}%. Revisa fugas o fallas.`
        );
        alertas.auto_bomba_estancada = true;
      }

      nivelInicialAuto = nivel_tanque;
      tiempoInicioAuto = Date.now();
    }
  } else {
    nivelInicialAuto = null;
    tiempoInicioAuto = null;
    alertas.auto_bomba_estancada = false;
  }

  // ===============================
  //      ACTUALIZAR MEMORIA
  // ===============================
  for (const key of Object.keys(memoria)) {
    if (datos[key] !== undefined) memoria[key] = datos[key];
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
    await evaluarAlertas(datos);
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

  console.log("👉 Comando recibido:", ultimoComando);

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

  console.log("📤 Comando entregado al ESP32:", cmdTemp);

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
//  404 — Ruta no encontrada
// ===============================
app.use((req, res) => {
  return res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl
  });
});

// ===============================
//  INICIO SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor Render escuchando en puerto " + PORT);
});
