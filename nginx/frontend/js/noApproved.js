document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("DOMContentLoaded", () => {
    console.warn("Usuario no aprobado — limpiando sesión temporal");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("tokenExpiresAt");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("userName");
  });

  const token = sessionStorage.getItem("noApprovedToken");

  if (!token) {
    console.warn("⛔ Acceso denegado — redirigiendo al inicio.");
    window.location.replace("/index.html");
    return;
  }

  console.log("✅ Token detectado. Acceso permitido a NoApproved.html.");

  // Opción: eliminar el token para que no pueda volver sin logearse de nuevo
  sessionStorage.removeItem("noApprovedToken");
});
