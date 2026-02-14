const token = sessionStorage.getItem("auth");

if (!token) {
  window.location.href = "/";
}

function cargarEstado() {
  fetch("/api/render/status?auth=" + token)
    .then(res => {
      if (!res.ok) throw new Error("Token inválido");
      return res.json();
    })
    .then(data => {

      if (!data.recibido) {
        document.getElementById("estado").innerHTML = "Sin datos aún...";
        return;
      }

      const d = data.datos;

      document.getElementById("estado").innerHTML = `
        <p><strong>Fecha:</strong> ${data.fecha}</p>
        <p><strong>Tanque:</strong> ${d.tanque}%</p>
        <p><strong>Pozo:</strong> ${d.pozo}%</p>
        <p><strong>Bomba:</strong> ${d.bomba}</p>
        <p><strong>Modo:</strong> ${d.modo}</p>
      `;
    })
    .catch(err => {
      document.getElementById("estado").innerHTML = err.message;
    });
}

function salir() {
  sessionStorage.removeItem("auth");
  window.location.href = "/";
}

cargarEstado();
setInterval(cargarEstado, 5000);
