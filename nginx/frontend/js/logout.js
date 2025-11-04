document.addEventListener("DOMContentLoaded", () => {
  console.log("🔐 Sistema de logout inicializado.");

  // Identifica el botón de logout (puede tener id o clase)
  const logoutBtn =
    document.getElementById("logoutBtn") ||
    document.querySelector(".logout-btn") ||
    document.querySelector("[data-logout]");

  if (!logoutBtn) {
    console.warn("⚠️ No se encontró ningún botón de logout en esta página.");
    return;
  }

  // Evento de clic para cerrar sesión
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const confirmLogout = confirm("¿Deseas cerrar la sesión actual?");
    if (!confirmLogout) return;

    console.log("👋 Cerrando sesión y limpiando sessionStorage...");

    // 🧹 Limpia todos los datos de sesión
    sessionStorage.clear();

    // Opción: limpiar localStorage del carrito si lo deseas
    // localStorage.removeItem("cart");

    // Redirige al login (ajusta si tu ruta cambia)
    window.location.href = "/login.html";
  });
});
