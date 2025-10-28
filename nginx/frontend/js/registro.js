// ===============================
// 🔐 Conexión con Supabase
// ===============================
const SUPABASE_URL = "https://zqypgiuuoxckvngxsugt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeXBnaXV1b3hja3ZuZ3hzdWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwODUwMDUsImV4cCI6MjA3NjY2MTAwNX0.7HhmphPoBvbj2tIJOY_gYkA_GwUHQ1x9YcehdAuVM04";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===============================
// 🧠 Lógica principal
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-registro");
  const nombre = document.getElementById("nombre");
  const correo = document.getElementById("correo");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const foto = document.getElementById("foto");
  const imgPreview = document.getElementById("img-preview");
  const togglePassword = document.getElementById("togglePassword");
  const toggleConfirm = document.getElementById("toggleConfirm");

  // ===============================
  // 👁️ Mostrar / ocultar contraseñas
  // ===============================
  [togglePassword, toggleConfirm].forEach((btn) => {
    btn?.addEventListener("click", () => {
      const input = btn === togglePassword ? password : confirmPassword;
      const type = input.type === "password" ? "text" : "password";
      input.type = type;
      btn.textContent = type === "password" ? "👁️" : "🙈";
    });
  });

  // ===============================
  // 🖼️ Vista previa imagen
  // ===============================
  foto.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      showError(foto, "La foto no puede superar los 10 MB.");
      foto.value = "";
      imgPreview.style.display = "none";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      imgPreview.style.display = "block";
    };
    reader.readAsDataURL(file);
    clearError(foto);
  });

  // ===============================
  // 💡 Validaciones
  // ===============================
  const validations = {
    nombre: {
      check: (val) => val.length >= 4 && val.length <= 20,
      msg: "Debe tener entre 4 y 20 caracteres.",
    },
    correo: {
      check: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      msg: "Correo inválido (ejemplo@correo.com).",
    },
    password: {
      check: (val) =>
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/.test(val),
      msg: "Debe tener 10+ caracteres, mayúsculas, minúsculas, número y símbolo.",
    },
  };

  function showError(input, message) {
    const small = input.parentElement.querySelector(".error-text");
    input.classList.add("invalid");
    input.classList.remove("valid");
    if (small) {
      small.textContent = message;
      small.style.display = "block";
    }
  }

  function clearError(input) {
    const small = input.parentElement.querySelector(".error-text");
    input.classList.add("valid");
    input.classList.remove("invalid");
    if (small) {
      small.textContent = "";
      small.style.display = "none";
    }
  }

  // ===============================
  // ✅ Enviar formulario a Supabase
  // ===============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let valid = true;
    [nombre, correo, password].forEach((input) => {
      const val = input.value.trim();
      const rule = validations[input.id];
      if (!rule.check(val)) {
        showError(input, rule.msg);
        valid = false;
      }
    });

    if (confirmPassword.value !== password.value) {
      showError(confirmPassword, "Las contraseñas no coinciden.");
      valid = false;
    }

    if (!foto.files.length) {
      showError(foto, "Debes seleccionar una foto de perfil.");
      valid = false;
    }

    if (!valid) {
      alert("❌ Corrige los errores antes de continuar.");
      return;
    }

    try {
      console.log("🚀 Registrando usuario en Supabase Auth...");

      // 1️⃣ Crear usuario en Auth
      const { data, error } = await supabase.auth.signUp({
        email: correo.value.trim(),
        password: password.value.trim(),
        options: {
          data: {
            nombre: nombre.value.trim(),
            rol: "cliente",
          },
        },
      });

      if (error) throw new Error(error.message);
      const user = data.user;
      if (!user) throw new Error("No se obtuvo el usuario tras el registro.");

      console.log("✅ Usuario Auth creado:", user.id);

      // 2️⃣ Subir foto (solo si hay sesión activa)
      const file = foto.files[0];
      const fileName = `${user.id}-${file.name}`;

      const session = (await supabase.auth.getSession()).data.session;

      if (!session) {
        console.warn(
          "⚠️ No hay sesión activa, se omitirá la subida de foto por RLS."
        );
        alert(
          "📩 Registro exitoso. Revisa tu correo para confirmar tu cuenta antes de subir la foto."
        );
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from("fotos-usuarios")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("❌ Storage error:", uploadError);
        throw new Error("Error al subir la foto: " + uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("fotos-usuarios")
        .getPublicUrl(fileName);

      const fotoUrl = publicUrlData.publicUrl;

      // 3️⃣ Actualizar metadata con URL
      await supabase.auth.updateUser({
        data: { foto_url: fotoUrl },
      });

      alert(
        "✅ Registro y carga de foto exitosos. Revisa tu correo para confirmar tu cuenta."
      );
      form.reset();
      imgPreview.style.display = "none";
    } catch (err) {
      console.error("⛔ Error completo:", err);
      alert("❌ Error al registrar usuario: " + err.message);
    }
  });
});
