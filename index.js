import express from "express";
const app = express();
app.use(express.json());

/* ============================================================
   VARIABLES EN MEMORIA (estado y último comando)
   ============================================================ */

let ultimoEstado = {
    recibido: false,
    fecha: null,
    datos: {}
};

let ultimoComando = {
    fecha: null,
    cmd: null
};


/* ============================================================
   1) RECIBIR ESTADO DEL ESP32 (TANQUE)
   ============================================================ */

app.post("/api/render/update", (req, res) => {
    ultimoEstado = {
        recibido: true,
        fecha: new Date().toISOString(),
        datos: req.body
    };

    console.log("→ Estado recibido del ESP32:");
    console.log(JSON.stringify(req.body, null, 2));

    res.json({ ok: true });
});


/* ============================================================
   2) CONSULTAR ESTADO (APP / PC / TEST)
   ============================================================ */

app.get("/api/render/status", (req, res) => {
    if (!ultimoEstado.recibido) {
        return res.status(404).json({ error: "Aún no hay datos" });
    }

    res.json(ultimoEstado);
});


/* ============================================================
   3) RECIBIR COMANDO DESDE ANDROID / PC / TEST
   ============================================================ */

app.post("/api/render/cmd", (req, res) => {
    const token = req.body.auth;
    if (token !== "A9F3K2X7") {
        return res.status(401).json({ error: "token" });
    }

    ultimoComando = {
        fecha: new Date().toISOString(),
        cmd: req.body.cmd
    };

    console.log("→ Nuevo comando recibido:", req.body.cmd);

    res.json({ ok: true });
});


/* ============================================================
   4) ESP32 CONSULTA EL COMANDO
   ============================================================ */

app.get("/api/render/cmd", (req, res) => {
    const token = req.query.auth;
    if (token !== "A9F3K2X7") {
        return res.status(401).json({ error: "token" });
    }

    res.json({
        cmd: ultimoComando.cmd
    });

    // Una vez leído, borramos para evitar loops
    ultimoComando.cmd = null;
});


/* ============================================================
   INICIO SERVIDOR
   ============================================================ */

app.listen(3000, () => {
    console.log("Servidor Render escuchando en puerto 3000");
});
