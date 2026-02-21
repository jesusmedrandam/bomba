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
async function enviarPush(mensaje) {
  if (!mensaje) return;

  if (deviceTokens.length === 0) {
    console.log("⚠ No hay dispositivos registrados");
    return;
  }

  const message = {
    tokens: deviceTokens,
    notification: {
      title: "Bomba",
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

    console.log("✅ Push enviado:", mensaje);
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

  // ===============================
  //  DETECTAR CAMBIOS EN CONFIG
  // ===============================
  const configCambios = [
    ["min_pozo", "Se actualizó el nivel mínimo del pozo: ahora es " + min_pozo + "%"],
    ["min_tanque", "Se actualizó el nivel mínimo del tanque: ahora es " + min_tanque + "%"],
    ["max_tanque", "Se actualizó el nivel máximo del tanque: ahora es " + max_tanque + "%"],
    ["prof_pozo", "Se actualizó la profundidad del pozo: ahora es " + prof_pozo + " metro(s)"],
    ["alt_tanque", "Se actualizó la altura del tanque: ahora es " + alt_tanque + " metro(s)"],
  ];

  for (const [campo, mensaje] of configCambios) {
    if (memoria[campo] !== null && memoria[campo] !== datos[campo]) {
      await enviarPush(mensaje);
    }
  }

  // ===============================
  //  ALERTAS DE POZO
  // ===============================

  if (nivel_pozo === min_pozo) {
    if (!alertas.pozo_min) {
      const estadoBomba = bomba ? "encendida" : "apagada";
      await enviarPush(`El pozo alcanzó su nivel mínimo. ${min_pozo} La bomba está ${estadoBomba}`);
      alertas.pozo_min = true;
    }
  } else alertas.pozo_min = false;

  if (nivel_pozo < min_pozo) {
    if (!alertas.pozo_muy_bajo) {
      const estadoBomba = bomba ? "encendida" : "apagada";
      await enviarPush(
        `ALERTA! El pozo está por debajo de su nivel mínimo: ${min_pozo}. La bomba está ${estadoBomba}`
      );
      alertas.pozo_muy_bajo = true;
    }
  } else alertas.pozo_muy_bajo = false;

  if (nivel_pozo === 0) {
    if (!alertas.pozo_cero) {
      await enviarPush(`Posible error sensor del pozo Nivel actual: ${nivel_pozo} %`);
      alertas.pozo_cero = true;
    }
  } else alertas.pozo_cero = false;

  // ===============================
  //  ALERTAS DE TANQUE
  // ===============================

  if (nivel_tanque === min_tanque) {
    if (!alertas.tanque_min) {
      const estadoBomba = bomba ? "encendida" : "apagada";
      await enviarPush(`El tanque alcanzó su nivel mínimo. ${min_tanque} La bomba está ${estadoBomba}`);
      alertas.tanque_min = true;
    }
  } else alertas.tanque_min = false;

  if (nivel_tanque < min_tanque) {
    if (!alertas.tanque_muy_bajo) {
      const estadoBomba = bomba ? "encendida" : "apagada";
      await enviarPush(`El tanque está por debajo de su nivel mínimo. ${min_tanque} La bomba está ${estadoBomba}`);
      alertas.tanque_muy_bajo = true;
    }
  } else alertas.tanque_muy_bajo = false;

  if (nivel_tanque <= 0) {
    if (!alertas.tanque_cero) {
      await enviarPush(`Posible error en sensor del tanque. Nivel actual: ${nivel_tanque} %`);
      alertas.tanque_cero = true;
    }
  } else alertas.tanque_cero = false;

  if (nivel_tanque >= max_tanque) {
    if (!alertas.tanque_lleno) {
      await enviarPush("Tanque lleno");
      alertas.tanque_lleno = true;
    }
  } else alertas.tanque_lleno = false;

  // ===============================
  //  ALERTAS DE CONEXIÓN
  // ===============================
  if (!conexion_pozo) {
    if (!alertas.conexion) {
      await enviarPush("🚨 Se ha perdido la conexión con el pozo. Por seguridad la bomba se mantendrá apagada");
      alertas.conexion = true;
    }
  } else alertas.conexion = false;

  // ===============================
  //  MODO MANUAL
  // ===============================
  if (modo === "MANUAL" && bomba) {
    if (!alertas.manual_on) {
      await enviarPush("🔔 Bomba encendida en modo manual");
      alertas.manual_on = true;
    }
  } else alertas.manual_on = false;

  if (modo === "MANUAL" && !bomba) {
    if (!alertas.manual_off) {
      await enviarPush("🔔 Bomba apagada en modo manual");
      alertas.manual_off = true;
    }
  } else alertas.manual_off = false;

  // ===============================
  //  ALERTA DE 5 MINUTOS (MODO AUTOMÁTICO)
  // ===============================
  if (modo === "AUTO" && bomba) {
    if (nivelInicialAuto === null) {
      nivelInicialAuto = nivel_tanque;
      tiempoInicioAuto = Date.now();
    }

    const diff = Date.now() - tiempoInicioAuto;

    if (diff >= 5 * 60 * 1000) {
      if (nivel_tanque <= nivelInicialAuto) {
        if (!alertas.auto_bomba_estancada) {
          await enviarPush(
            `La bomba lleva 5 minutos encendida y el nivel del tanque se mantiene en ${nivel_tanque}%. Revisa posible falla o fugas.`
          );
          alertas.auto_bomba_estancada = true;
        }
      } else {
        alertas.auto_bomba_estancada = false;
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
  //  ACTUALIZAR MEMORIA
  // ===============================
  for (const key of Object.keys(memoria)) {
    if (datos[key] !== undefined) {
      memoria[key] = datos[key];
    }
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
— FIN DEL MENSAJE —  
Tu archivo es demasiado largo para un solo envío.  
Responde **“Siguiente parte”** y te envío el resto (cmd, tokens y NUEVA FUNCIÓN).
