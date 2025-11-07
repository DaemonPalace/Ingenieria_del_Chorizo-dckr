document.addEventListener("DOMContentLoaded", () => {
  // 🚫 Evitar entrar a /login si ya hay sesión activa
  const token = sessionStorage.getItem("authToken");
  const expiresAt = parseInt(
    sessionStorage.getItem("tokenExpiresAt") || "0",
    10
  );

  if (token && Date.now() < expiresAt) {
    // Sesión vigente → mandamos al inicio
    window.location.replace("/index.html");
    return; // importante: no continúes cargando el script de login
  } else if (token && Date.now() >= expiresAt) {
    // Sesión expirada → limpiamos por si acaso
    sessionStorage.clear();
  }

  // ... (aquí ya va tu código actual de login)

  const form = document.getElementById("form-login");

  if (!form) {
    console.error('⚠️ No se encontró el formulario con id "form-login"');
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // 🧹 Limpiar mensajes de error anteriores
    document
      .querySelectorAll(".error-text")
      .forEach((el) => (el.textContent = ""));

    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;
    let hasError = false;

    // ✅ Validaciones básicas
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
      // 🚀 Petición al backend
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      const result = await response.json().catch(() => ({}));
      console.log("📩 Respuesta del backend:", result);

      // ✅ Login exitoso
      if (response.ok && result.user && result.token) {
        const expiration = Date.now() + 20 * 60 * 1000; // 20 minutos

        // 🔐 Guardar token JWT real
        sessionStorage.setItem("authToken", result.token);
        sessionStorage.setItem("tokenExpiresAt", expiration);
        sessionStorage.setItem("userRole", result.user.rol);
        sessionStorage.setItem("userEmail", result.user.correo);

        console.log("✅ Sesión iniciada correctamente:", {
          rol: result.user.rol,
          correo: result.user.correo,
        });

        // Redirección según rol
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
        console.warn("⚠️ Usuario no aprobado, redirigiendo...");
        window.location.assign("/NoApproved.html");
        return;
      }

      // ❌ Error de autenticación u otro fallo
      setError("form-login", result.error || "Error en el inicio de sesión");
    } catch (err) {
      console.error("🔥 Error en el frontend:", err);
      setError("form-login", `Error en el inicio de sesión: ${err.message}`);
    }
  });

  // 🧩 Función para mostrar errores
  function setError(fieldId, message) {
    const field =
      fieldId === "form-login"
        ? document.querySelector(".form-error")
        : document.getElementById(fieldId).parentElement;
    const errorText = field.querySelector(".error-text") || field;
    errorText.textContent = message;
  }

  // 🧠 Función auxiliar para futuras peticiones autenticadas
  // Usa el JWT guardado en sessionStorage
  window.apiFetch = async (url, options = {}) => {
    const token = sessionStorage.getItem("authToken");
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      console.warn(
        "⚠️ Sesión expirada o token inválido. Redirigiendo al login..."
      );
      sessionStorage.clear();
      window.location.assign("/login.html");
      return;
    }

    return res;
  };
});
