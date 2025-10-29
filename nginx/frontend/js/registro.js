document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-registro");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const togglePassword = document.getElementById("togglePassword");
  const toggleConfirm = document.getElementById("toggleConfirm");
  const fotoInput = document.getElementById("foto");
  const imgPreview = document.getElementById("img-preview");
  const requirementsBox = document.getElementById("password-requirements");
  const nombreInput = document.getElementById("nombre");
  const correoInput = document.getElementById("correo");

  // 👁️ Mostrar / ocultar contraseñas
  [togglePassword, toggleConfirm].forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn === togglePassword ? password : confirmPassword;
      const type = input.type === "password" ? "text" : "password";
      input.type = type;
      btn.textContent = type === "password" ? "👁️" : "🙈";
    });
  });

  // 📸 Vista previa y validación de imagen PNG
  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar tipo y extensión
    const isPNG =
      file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

    if (!isPNG) {
      setInvalid(fotoInput, "Solo se permiten imágenes en formato PNG.");
      fotoInput.value = "";
      imgPreview.style.display = "none";
      return;
    }

    // Mostrar vista previa si es válida
    const reader = new FileReader();
    reader.onload = (ev) => {
      imgPreview.src = ev.target.result;
      imgPreview.style.display = "block";
      clearError(fotoInput);
    };
    reader.readAsDataURL(file);
  });

  // 💡 Validación visual de contraseña
  const reqList = {
    length: document.getElementById("req-length"),
    upper: document.getElementById("req-uppercase"),
    lower: document.getElementById("req-lowercase"),
    number: document.getElementById("req-number"),
    symbol: document.getElementById("req-symbol"),
  };

  password.addEventListener("input", () => {
    const val = password.value;
    requirementsBox.style.display = val ? "block" : "none";

    const numCount = (val.match(/\d/g) || []).length;
    const symCount = (val.match(/[^A-Za-z0-9]/g) || []).length;

    check(reqList.length, val.length >= 10);
    check(reqList.upper, /[A-Z]/.test(val));
    check(reqList.lower, /[a-z]/.test(val));
    check(reqList.number, numCount >= 2);
    check(reqList.symbol, symCount >= 2);

    if (
      val &&
      (val.length < 10 ||
        !/[A-Z]/.test(val) ||
        !/[a-z]/.test(val) ||
        numCount < 2 ||
        symCount < 2)
    ) {
      setInvalid(password, "La contraseña no cumple los requisitos.");
    } else if (val) {
      clearError(password);
    }
  });

  function check(el, ok) {
    el.classList.toggle("met", ok);
  }

  // 🧩 Validación en tiempo real: nombre, correo, confirmación
  nombreInput.addEventListener("input", () => {
    const val = nombreInput.value.trim();
    if (!val) setInvalid(nombreInput, "El nombre es obligatorio");
    else if (val.length < 3)
      setInvalid(nombreInput, "Debe tener al menos 3 caracteres");
    else clearError(nombreInput);
  });

  correoInput.addEventListener("input", () => {
    const val = correoInput.value.trim();
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!val) setInvalid(correoInput, "El correo es obligatorio");
    else if (!emailRegex.test(val)) setInvalid(correoInput, "Correo inválido");
    else clearError(correoInput);
  });

  confirmPassword.addEventListener("input", () => {
    if (confirmPassword.value && confirmPassword.value !== password.value)
      setInvalid(confirmPassword, "Las contraseñas no coinciden");
    else clearError(confirmPassword);
  });

  // 🧠 Envío del formulario
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    document
      .querySelectorAll(".error-text")
      .forEach((el) => (el.textContent = ""));
    const nombre = nombreInput.value.trim();
    const correo = correoInput.value.trim();
    const foto = fotoInput.files[0];
    const pass = password.value;
    const pass2 = confirmPassword.value;
    const numCount = (pass.match(/\d/g) || []).length;
    const symCount = (pass.match(/[^A-Za-z0-9]/g) || []).length;

    let error = false;

    if (!nombre || nombre.length < 3)
      setInvalid(nombreInput, "Nombre inválido"), (error = true);
    if (!correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo))
      setInvalid(correoInput, "Correo inválido"), (error = true);
    if (
      pass.length < 10 ||
      !/[A-Z]/.test(pass) ||
      !/[a-z]/.test(pass) ||
      numCount < 2 ||
      symCount < 2
    )
      setInvalid(password, "La contraseña no cumple los requisitos."),
        (error = true);
    if (pass !== pass2)
      setInvalid(confirmPassword, "Las contraseñas no coinciden"),
        (error = true);
    if (!foto) {
      setInvalid(fotoInput, "Selecciona una imagen PNG.");
      error = true;
    }
    if (error) return;

    try {
      const data = new FormData();
      data.append("nombre", nombre);
      data.append("correo", correo);
      data.append("password", pass);
      data.append("foto", foto);

      const res = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error en el registro");

      alert("✅ Registro exitoso. Inicia sesión.");
      window.location.href = "Login.html";
    } catch (e) {
      console.error(e);
      alert("❌ Error: " + e.message);
    }
  });

  // ⚙️ Helpers
  function setInvalid(input, msg) {
    const errorText = input.parentElement.querySelector(".error-text");
    input.classList.add("invalid");
    input.classList.remove("valid");
    if (errorText) {
      errorText.textContent = msg;
      errorText.style.display = "block";
    }
  }

  function clearError(input) {
    const errorText = input.parentElement.querySelector(".error-text");
    input.classList.remove("invalid");
    input.classList.add("valid");
    if (errorText) {
      errorText.textContent = "";
      errorText.style.display = "none";
    }
  }
});
