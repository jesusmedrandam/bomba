const token = sessionStorage.getItem("auth");
if (!token) window.location.href = "/";

function salir() {
  sessionStorage.removeItem("auth");
  window.location.href = "/";
}

const API = "/api/render/status?auth=" + token;

// Función para actualizar un gauge circular
function setCircle(circle, percent) {
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
}

// Cargar estado
function cargarEstado() {
  fetch(API)
    .then(res => res.json())
    .then(data => {
      if (!data.recibido) return;

      const d = data.datos;

      // Fecha
      document.getElementById("fechaServ").innerText =
        "Fecha servidor: " + new Date(data.fecha).toLocaleString();

      // Estados simples
      document.getElementById("bombaEstado").innerText = d.bomba ? "Encendida" : "Apagada";
      document.getElementById("modoEstado").innerText = d.modo;
      document.getElementById("pozoEstado").innerText = d.conexion_pozo ? "Conectado" : "Desconectado";

      // Niveles
      setCircle(document.getElementById("pozoCircle"), d.nivel_pozo);
      setCircle(document.getElementById("tanqueCircle"), d.nivel_tanque);

      document.getElementById("pozoText").innerText = d.nivel_pozo + "%";
      document.getElementById("tanqueText").innerText = d.nivel_tanque + "%";
    })
    .catch(err => console.log("Error:", err));
}

cargarEstado();
setInterval(cargarEstado, 4000);
