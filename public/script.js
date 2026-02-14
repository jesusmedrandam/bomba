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
        return;
      }

      const d = data.datos;

      // TANQUE
      document.getElementById("tanqueBar").style.width = d.tanque + "%";
      document.getElementById("tanqueText").innerText = d.tanque + "%";

      // POZO
      document.getElementById("pozoBar").style.width = d.pozo + "%";
      document.getElementById("pozoText").innerText = d.pozo + "%";

      // BOMBA
      const bomba = document.getElementById("bombaEstado");

      if (d.bomba === "ON" || d.bomba === true) {
        bomba.classList.remove("off");
        bomba.classList.add("on");
        bomba.innerText = "ENCENDIDA";
      } else {
        bomba.classList.remove("on");
        bomba.classList.add("off");
        bomba.innerText = "APAGADA";
      }

      // MODO
      document.getElementById("modoText").innerText = "Modo: " + d.modo;

      // FECHA
      document.getElementById("fechaText").innerText = new Date(data.fecha).toLocaleString();

    })
    .catch(err => {
      console.log(err.message);
    });
}

function salir() {
  sessionStorage.removeItem("auth");
  window.location.href = "/";
}

cargarEstado();
setInterval(cargarEstado, 5000);
