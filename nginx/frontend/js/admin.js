document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");

  // Esperar brevemente para que el loader sea visible
  document.body.style.visibility = "hidden";
  document.body.style.opacity = "0";

  const token = sessionStorage.getItem("authToken");
  const role = sessionStorage.getItem("userRole");
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");

  const now = Date.now();

  // Validación
  if (!token || !role || !expiresAt || now > parseInt(expiresAt, 10)) {
    console.warn("⛔ Sesión inválida o expirada.");
    sessionStorage.clear();
    window.location.replace("/login.html");
    return;
  }

  if (!["admin", "superadmin"].includes(role)) {
    console.warn("🚫 Rol no autorizado.");
    sessionStorage.clear();
    window.location.replace("/index.html");
    return;
  }

  // ✅ Mostrar el panel después de verificar
  setTimeout(() => {
    loader.classList.add("fade-out");
    document.body.style.visibility = "visible";
    document.body.style.opacity = "1";
  }, 600); // transición más natural

  // Mostrar info de usuario
  const email = sessionStorage.getItem("userEmail");
  const info = document.getElementById("user-info");
  if (info && email) {
    info.textContent = `👋 Bienvenido, ${email} (${role})`;
  }

  // Cerrar sesión
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.replace("/login.html");
    });
  }

  // Expiración automática
  setInterval(() => {
    const exp = parseInt(sessionStorage.getItem("tokenExpiresAt"), 10);
    if (Date.now() > exp) {
      alert("⚠️ Tu sesión ha expirado. Inicia sesión nuevamente.");
      sessionStorage.clear();
      window.location.replace("/login.html");
    }
  }, 60000);
});
