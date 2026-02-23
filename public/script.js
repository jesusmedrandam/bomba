const token = sessionStorage.getItem("auth");
if (!token) location.href = "/";

function salir() {
  sessionStorage.removeItem("auth");
  location.href = "/";
}

const API = "/api/render/status?auth=" + token;

function setCircle(circle, percent) {
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference - percent / 100 * circumference;
}

function cargarEstado() {
  fetch(API)
    .then(r => r.json())
    .then(data => {
      if (!data.recibido) {
        alert("Token inválido");
        salir();
        return;
      }

      const d = data.datos;

      document.getElementById("fechaServ").innerText =
        "Fecha servidor: " + new Date(data.fecha).toLocaleString();

      document.getElementById("bombaEstado").innerText =
        d.bomba ? "Encendida" : "Apagada";

      document.getElementById("modoEstado").innerText =
        d.modo === "AUTO" ? "Automático" : "Manual";

      document.getElementById("pozoEstado").innerText =
        d.conexion_pozo ? "Conectado" : "Desconectado";

      setCircle(pozoCircle, d.nivel_pozo);
      setCircle(tanqueCircle, d.nivel_tanque);

      pozoText.innerText = d.nivel_pozo + "%";
      tanqueText.innerText = d.nivel_tanque + "%";

      minPozo.innerText = d.min_pozo + "%";
      profPozo.innerText = d.prof_pozo + " m";
      minTanque.innerText = d.min_tanque + "%";
      maxTanque.innerText = d.max_tanque + "%";
      altTanque.innerText = d.alt_tanque + " m";
    })
    .catch(() => {
      alert("Error de conexión");
    });
}

cargarEstado();
setInterval(cargarEstado, 4000);
