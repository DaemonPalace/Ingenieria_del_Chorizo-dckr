document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");

  if (!form) {
    console.error('⚠️ No se encontró el formulario con id "form-login"');
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Limpiar errores anteriores
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
      console.log("➡️ Enviando solicitud de login:", {
        correo,
        password: "[hidden]",
      });

      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      console.log("📡 Estado de respuesta:", response.status);
      const result = await response.json().catch(() => ({}));
      console.log("📩 Respuesta del backend:", result);

      // ✅ Login exitoso
      if (response.ok && result.user) {
        console.log("✅ Usuario autenticado:", result.user);
        if (result.user.rol === "admin" || "superadmin") {
          window.location.assign("/admin.html");
        } else {
          window.location.assign("/dashboard.html");
        }
        return;
      }

      // 🚫 Usuario no aprobado (403 o flag explícita)
      const notApproved =
        response.status === 403 ||
        result.approved === false ||
        (result.user && result.user.approved === false);

      if (notApproved) {
        console.warn(
          "🚫 Cuenta no aprobada — generando token de acceso temporal..."
        );
        // Guardar un token temporal en sessionStorage
        const token = btoa(`${correo}:${Date.now()}`); // cifrado base64 simple
        sessionStorage.setItem("noApprovedToken", token);
        window.location.assign("/NoApproved.html");
        return;
      }

      // ❌ Otro error
      console.error("❌ Error en login:", result);
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
