/*******************************************************
 * Servidor Render - Control remoto para ESP32 Maestro
 * Compatible 100% con los mismos endpoint del maestro
 * No maneja WiFi
 *******************************************************/

const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");

app.use(cors());
app.use(express.json());

// TOKEN único
const AUTH_CODE = "A9F3K2X7";

// Última IP del maestro reportada
let MASTER_IP = null;

// Último estado recibido del ESP32
let lastState = {
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

// ==========================================
//        VALIDAR TOKEN
// ==========================================

function validarToken(req, res) {
    const token =
        req.headers["x-auth-token"] ||
        req.query.auth ||
        req.body.auth ||
        null;

    return token === AUTH_CODE;
}

// ==========================================
//  1) Endpoint para recibir datos desde ESP32
// ==========================================

app.post("/api/render/update", (req, res) => {
    if (!validarToken(req, res))
        return res.status(401).json({ error: "token invalido" });

    // Datos enviados por el maestro
    const data = req.body;

    if (data.ip) MASTER_IP = data.ip;

    lastState = { ...lastState, ...data };

    console.log("✔ Datos actualizados desde ESP32:", lastState);

    res.json({ ok: true });
});

// ==========================================
//           2) GET /api/datos
// ==========================================

app.get("/api/datos", async (req, res) => {
    if (!validarToken(req, res))
        return res.status(401).json({ error: "token invalido" });

    // Si tenemos IP del maestro, consultamos directamente
    if (MASTER_IP) {
        try {
            const resp = await axios.get(
                `http://${MASTER_IP}/api/datos?auth=${AUTH_CODE}`,
                { timeout: 2000 }
            );
            lastState = resp.data;
            return res.json(lastState);
        } catch (err) {
            console.log("Maestro no responde, devolviendo último estado");
        }
    }

    res.json(lastState);
});

// ==========================================
//         3) POST /api/config
// ==========================================

app.post("/api/config", async (req, res) => {
    if (!validarToken(req, res))
        return res.status(401).json({ error: "token invalido" });

    if (!MASTER_IP)
        return res.status(500).json({ error: "maestro no conectado" });

    try {
        const resp = await axios.post(
            `http://${MASTER_IP}/api/config?auth=${AUTH_CODE}`,
            req.body,
            { timeout: 3000 }
        );

        return res.json(resp.data);

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "no se pudo enviar config al maestro" });
    }
});

// ==========================================
//         4) POST /api/modo
// ==========================================

app.post("/api/modo", async (req, res) => {
    if (!validarToken(req, res))
        return res.status(401).json({ error: "token invalido" });

    if (!MASTER_IP)
        return res.status(500).json({ error: "maestro no conectado" });

    try {
        const resp = await axios.post(
            `http://${MASTER_IP}/api/modo?auth=${AUTH_CODE}`,
            req.body,
            { timeout: 3000 }
        );

        return res.json(resp.data);

    } catch (err) {
        return res.status(500).json({ error: "no se pudo cambiar modo" });
    }
});

// ==========================================
//         5) POST /api/comando
// ==========================================

app.post("/api/comando", async (req, res) => {
    if (!validarToken(req, res))
        return res.status(401).json({ error: "token invalido" });

    if (!MASTER_IP)
        return res.status(500).json({ error: "maestro no conectado" });

    try {
        const resp = await axios.post(
            `http://${MASTER_IP}/api/comando?auth=${AUTH_CODE}`,
            req.body,
            { timeout: 3000 }
        );

        return res.json(resp.data);

    } catch (err) {
        return res.status(500).json({ error: "no se pudo ejecutar comando" });
    }
});

// ==========================================
//      RAÍZ DEL SERVIDOR (Render)
// ==========================================

app.get("/", (req, res) => {
    res.send("Servidor ESP32 Tanque activo");
});

// ==========================================
//            INICIAR SERVIDOR
// ==========================================

app.listen(3000, () => {
    console.log("Servidor Render escuchando en puerto 3000");
});
