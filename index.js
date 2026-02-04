import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

/* ============================================================
   ALMACENAMIENTO DEL ÚLTIMO ESTADO RECIBIDO DEL ESP32
   ============================================================ */
let ultimoEstado = {
    recibido: false,
    fecha: null,
    datos: {}
};

/* ============================================================
   1) RECIBE ESTADO DEL ESP32
   ============================================================ */
app.post("/api/render/update", (req, res) => {
    ultimoEstado = {
        recibido: true,
        fecha: new Date().toISOString(),
        datos: req.body
    };

    console.log(" → Estado recibido del ESP32:");
    console.log(JSON.stringify(req.body, null, 2));

    res.json({ ok: true });
});

/* ============================================================
   2) CONSULTAR ESTADO GUARDADO (TU COMANDO GET)
   ============================================================ */
app.get("/api/render/status", (req, res) => {
    if (!ultimoEstado.recibido) {
        return res.status(404).json({ error: "Aún no hay datos del ESP32" });
    }

    res.json(ultimoEstado);
});

/* ============================================================
   3) TEST → LEER DATOS DIRECTO DEL ESP32
   ============================================================ */
app.post("/test/datos", async (req, res) => {
    const { ip } = req.body;

    const r = await fetch(`http://${ip}/api/datos?auth=A9F3K2X7`);
    const j = await r.json();

    res.json(j);
});

/* ============================================================
   4) TEST → ENCENDER / APAGAR
   ============================================================ */
app.post("/test/comando", async (req, res) => {
    const { ip, cmd } = req.body;

    const r = await fetch(`http://${ip}/api/comando?auth=A9F3K2X7`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd })
    });

    const j = await r.json();
    res.json(j);
});

/* ============================================================
   5) TEST → CAMBIAR MODO
   ============================================================ */
app.post("/test/modo", async (req, res) => {
    const { ip, modo } = req.body;

    const r = await fetch(`http://${ip}/api/modo?auth=A9F3K2X7`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo })
    });

    const j = await r.json();
    res.json(j);
});

/* ============================================================
   6) TEST → MODIFICAR CONFIG (min, max, etc.)
   ============================================================ */
app.post("/test/config", async (req, res) => {
    const { ip, config } = req.body;

    const r = await fetch(`http://${ip}/api/config?auth=A9F3K2X7`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
    });

    const j = await r.json();
    res.json(j);
});

/* ============================================================
   INICIAR SERVIDOR RENDER
   ============================================================ */
app.listen(3000, () => {
    console.log("Servidor Render escuchando en puerto 3000");
});

