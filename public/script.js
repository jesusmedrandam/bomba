const token = sessionStorage.getItem("auth");
if (!token) location.href = "/";

function salir() {
  sessionStorage.removeItem("auth");
  location.href = "/";
}

const API = "/api/render/status?auth=" + token;

function setCircle(id, percent) {
  const circle = document.getElementById(id);
  const radius = circle.r.baseVal.value;
  const circ = 2 * Math.PI * radius;

  circle.style.strokeDasharray = `${circ}`;
  circle.style.strokeDashoffset = `${circ - (percent / 100) * circ}`;
}

function cargarEstado() {
  fetch(API)
    .then(r => r.json())
    .then(data => {
      if (!data.recibido) return;

      const d = data.datos;

      document.getElementById("bombaEstado").innerText = d.bomba ? "Encendida" : "Apagada";
      document.getElementById("modoEstado").innerText = d.modo === "AUTO" ? "Automático" : "Manual";
      document.getElementById("pozoEstado").innerText = d.conexion_pozo ? "Conectado" : "Desconectado";
      document.getElementById("fechaServ").innerText = new Date(data.fecha).toLocaleString();

      setCircle("pozoCircle", d.nivel_pozo);
      setCircle("tanqueCircle", d.nivel_tanque);

      pozoText.textContent = d.nivel_pozo + "%";
      tanqueText.textContent = d.nivel_tanque + "%";

      minPozo.textContent = d.min_pozo + "%";
      profPozo.textContent = d.prof_pozo + " m";
      minTanque.textContent = d.min_tanque + "%";
      maxTanque.textContent = d.max_tanque + "%";
      altTanque.textContent = d.alt_tanque + " m";
    });
}

cargarEstado();
setInterval(cargarEstado, 4000);
