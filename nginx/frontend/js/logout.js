document.addEventListener("DOMContentLoaded", () => {
  const loginLink = document.querySelector('a[href$="login.html"]');
  const logoutLink = document.getElementById("logoutBtn");
  const historialLink = document.querySelector('a[href$="historialcliente.html"]');

  if (!logoutLink || !loginLink) {
    console.warn("⚠️ No se encontraron los botones Login/Logout en el DOM.");
    return;
  }

  if (!historialLink) {
    console.warn("⚠️ No se encontro el boton Historial en el DOM.");
    return;
  }

  const token = sessionStorage.getItem("authToken");
  const role = sessionStorage.getItem("userRole");
  const email = sessionStorage.getItem("userEmail");

  // --- Control visual de botones ---
  if (token) {
    console.log(
      `✅ Sesión activa detectada (${role || "sin rol"}: ${email || "usuario"})`
    );
    loginLink.style.display = "none";
    logoutLink.style.display = "block";
    if (role === "cliente") {
      historialLink.style.display = "block";
    } else {
      historialLink.style.display = "none";
    }
  } else {
    console.log("🚪 Sin sesión activa. Mostrando botón de login.");
    loginLink.style.display = "block";
    logoutLink.style.display = "none";

    historialLink.style.display = "none";
  }

  // --- Acción de logout ---
  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();

    const confirmar = confirm("¿Deseas cerrar la sesión actual?");
    if (!confirmar) return;

    console.log("👋 Cerrando sesión y limpiando datos...");
    sessionStorage.clear();
    localStorage.removeItem("cart");

    // Actualiza visibilidad inmediata
    loginLink.style.display = "block";
    logoutLink.style.display = "none";
    historialLink.style.display = "none";

    alert("✅ Sesión cerrada con éxito.");
    window.location.href = "../login.html";
  });
});
