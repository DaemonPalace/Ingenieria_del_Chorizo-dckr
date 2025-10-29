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
      const payload = { correo, password };
      console.log("➡️ Login payload:", { correo, password: "[hidden]" });

      const resp = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📡 HTTP status:", resp.status);

      // Intenta parsear JSON, pero tolera respuestas vacías
      let data = null;
      try {
        data = await resp.json();
      } catch {
        data = {};
      }

      console.log("📩 Backend data:", data);

      // ------- REGLAS DE NO APROBADO (robustas) -------
      const text = (data?.error || data?.message || data?.detail || "")
        .toString()
        .toLowerCase();

      const notApprovedByText = text.includes("no ha sido aprob");
      const notApprovedFlag = data?.user?.aprobado === false;
      const noUserButOK = resp.ok && !data?.user; // 200 sin user = backend devolvió mensaje, no sesión

      if (
        resp.status === 403 ||
        notApprovedByText ||
        notApprovedFlag ||
        noUserButOK
      ) {
        console.warn(
          "🚫 Cuenta NO aprobada. Redirigiendo a NoApproved.html …",
          {
            status: resp.status,
            notApprovedByText,
            notApprovedFlag,
            noUserButOK,
          }
        );
        // Ruta absoluta para evitar problemas de path
        window.location.assign("/NoApproved.html");
        return;
      }
      // -------------------------------------------------

      // ✅ Login correcto
      if (resp.ok && data?.user) {
        console.log("✅ Login OK. Usuario:", data.user);
        if (data.user.rol === "admin") {
          window.location.assign("/admin.html");
        } else {
          window.location.assign("/dashboard.html");
        }
        return;
      }

      // ❌ Cualquier otro error
      console.error("❌ Error en login:", data);
      setError(
        "form-login",
        data?.error || data?.message || "Error en el inicio de sesión"
      );
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
    const el = field.querySelector(".error-text") || field;
    el.textContent = message;
  }
});
