document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");

  if (!form) {
    console.error('⚠️ No se encontró el formulario con id "form-login"');
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    document
      .querySelectorAll(".error-text")
      .forEach((el) => (el.textContent = ""));

    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;
    let hasError = false;

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError("correo", "Ingresa un correo válido");
      hasError = true;
    }
    if (!password) {
      setError("password", "La contraseña es obligatoria");
      hasError = true;
    }
    if (hasError) return;

    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      const result = await response.json().catch(() => ({}));
      console.log("📩 Respuesta del backend:", result);

      // ✅ Login exitoso
      if (response.ok && result.user) {
        const token = btoa(`${correo}:${Date.now()}:${Math.random()}`);
        const expiration = Date.now() + 20 * 60 * 1000; // 20 minutos

        sessionStorage.setItem("authToken", token);
        sessionStorage.setItem("tokenExpiresAt", expiration);
        sessionStorage.setItem("userRole", result.user.rol);
        sessionStorage.setItem("userEmail", result.user.correo);

        if (["admin", "superadmin"].includes(result.user.rol)) {
          window.location.assign("/admin.html");
        } else {
          window.location.assign("/dashboard.html");
        }
        return;
      }

      // 🚫 Usuario no aprobado
      if (
        response.status === 403 ||
        result.approved === false ||
        (result.user && result.user.approved === false)
      ) {
        const tempToken = btoa(`${correo}:${Date.now()}`);
        sessionStorage.setItem("noApprovedToken", tempToken);
        window.location.assign("/NoApproved.html");
        return;
      }

      // ❌ Otro error
      setError("form-login", result.error || "Error en el inicio de sesión");
    } catch (err) {
      console.error("🔥 Error en el frontend:", err);
      setError("form-login", `Error en el inicio de sesión: ${err.message}`);
    }
  });

  function setError(fieldId, message) {
    const field =
      fieldId === "form-login"
        ? document.querySelector(".form-error")
        : document.getElementById(fieldId).parentElement;
    const errorText = field.querySelector(".error-text") || field;
    errorText.textContent = message;
  }
});
