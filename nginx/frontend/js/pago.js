document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = `${window.location.origin}/api`;
  const token = sessionStorage.getItem("authToken");
  const email = sessionStorage.getItem("userEmail");

  const $subtotal = document.getElementById("subtotal");
  const $descuento = document.getElementById("descuento");
  const $total = document.getElementById("total");
  const $resumen = document.getElementById("resumenProductos");
  const $descuentoRow = document.getElementById("descuentoRow");

  // =====================================================
  // 🛡️ RESTRICCIÓN DE ACCESO
  // =====================================================
  // 1️⃣ Verifica sesión
  if (!token || !email) {
    alert("⚠️ Debes iniciar sesión para acceder al pago.");
    window.location.href = "./login.html";
    return;
  }

  // 2️⃣ Verifica carrito
  const cartData = JSON.parse(localStorage.getItem("cart") || "{}");
  const cart = cartData.items || [];
  if (!cart.length) {
    alert("🛒 Tu carrito está vacío. Añade productos antes de pagar.");
    window.location.href = "./carta.html";
    return;
  }

  // =====================================================
  // 🧾 CARGAR CARRITO Y CALCULAR SUBTOTAL
  // =====================================================
  let subtotal = 0;
  $resumen.innerHTML = "";
  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const line = document.createElement("div");
    line.innerHTML = `
      <span>${item.name} x${item.quantity}</span>
      <span>$${itemTotal.toLocaleString()}</span>
    `;
    $resumen.appendChild(line);
  });

  $subtotal.textContent = `$${subtotal.toLocaleString()}`;
  let descuento = 0;

  // =====================================================
  // 💸 DESCUENTO DE PRIMERA COMPRA (10%)
  // =====================================================
  try {
    const res = await fetch(`${API_BASE}/orders/user/${email}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const orders = await res.json();
      if (!orders || orders.length === 0) {
        descuento = subtotal * 0.1;
        $descuento.textContent = `- $${descuento.toLocaleString()}`;
        $descuentoRow.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.warn("⚠️ No se pudo verificar historial de compras:", err);
  }

  const total = subtotal - descuento;
  $total.textContent = `$${total.toLocaleString()}`;

  if (total <= 0) {
    alert("⚠️ No se puede procesar un pago de $0.");
    window.location.href = "./carta.html";
    return;
  }

  // =====================================================
  // 💳 VALIDACIONES DE FORMULARIO
  // =====================================================
  const form = document.getElementById("formPago");
  const correo = form.correo;
  const nombre = form.nombre;
  const apellido = form.apellido;
  const telefono = form.telefono;
  const titular = form.titular;
  const tarjeta = form.tarjeta;
  const fecha = form.fecha;
  const cvv = form.cvv;
  const metodo = form.metodo;
  const cuotasSelect = document.createElement("select");

  // =====================================================
  // 📆 Campo de cuotas (solo si método = tarjeta)
  // =====================================================
  cuotasSelect.id = "cuotas";
  cuotasSelect.name = "cuotas";
  cuotasSelect.innerHTML = `
    <option value="1">1 cuota</option>
    <option value="2">2 cuotas</option>
    <option value="3">3 cuotas</option>
    <option value="6">6 cuotas</option>
    <option value="12">12 cuotas</option>
  `;
  cuotasSelect.style.display = "none";
  cuotasSelect.style.marginTop = "10px";
  cuotasSelect.classList.add("form-control");
  metodo.parentElement.appendChild(cuotasSelect);

  metodo.addEventListener("change", () => {
    cuotasSelect.style.display =
      metodo.value === "tarjeta" ? "block" : "none";
  });

  // =====================================================
  // 🧹 Helpers visuales
  // =====================================================
  const showError = (input, msg) => {
    input.classList.add("invalid");
    input.classList.remove("valid");
    let err = input.parentElement.querySelector(".error-text");
    if (!err) {
      err = document.createElement("small");
      err.className = "error-text";
      input.parentElement.appendChild(err);
    }
    err.textContent = msg;
  };

  const clearError = (input) => {
    input.classList.remove("invalid");
    input.classList.add("valid");
    const err = input.parentElement.querySelector(".error-text");
    if (err) err.textContent = "";
  };

  // =====================================================
  // ✏️ Restricciones de formato
  // =====================================================
  const soloLetras = (input) => {
    input.value = input.value
      .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, "")
      .replace(/\s{2,}/g, " ");
    if (input.value.length > 30) input.value = input.value.slice(0, 30);
  };

  nombre.addEventListener("input", () => soloLetras(nombre));
  apellido.addEventListener("input", () => soloLetras(apellido));

  telefono.addEventListener("input", () => {
    telefono.value = telefono.value.replace(/\D/g, "");
    if (telefono.value.length > 10) telefono.value = telefono.value.slice(0, 10);
  });

  titular.addEventListener("input", () => {
    titular.value = titular.value
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .replace(/\s{2,}/g, " ");
    if (titular.value.length > 40)
      titular.value = titular.value.slice(0, 40);
  });

  tarjeta.addEventListener("input", () => {
    tarjeta.value = tarjeta.value.replace(/\D/g, "");
    if (tarjeta.value.length > 16) tarjeta.value = tarjeta.value.slice(0, 16);
  });

  fecha.addEventListener("input", () => {
    let val = fecha.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 3) val = `${val.slice(0, 2)}/${val.slice(2)}`;
    fecha.value = val;
  });

  cvv.addEventListener("input", () => {
    cvv.value = cvv.value.replace(/\D/g, "");
    if (cvv.value.length > 4) cvv.value = cvv.value.slice(0, 4);
  });

  // =====================================================
  // ✅ VALIDACIÓN FINAL Y ENVÍO
  // =====================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let valid = true;

    form.querySelectorAll("input").forEach(clearError);

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.value.trim())) {
      showError(correo, "Correo inválido.");
      valid = false;
    }

    if (nombre.value.trim().length < 3) {
      showError(nombre, "Debe tener al menos 3 letras.");
      valid = false;
    }

    if (apellido.value.trim().length < 3) {
      showError(apellido, "Debe tener al menos 3 letras.");
      valid = false;
    }

    if (telefono.value.trim().length < 7 || telefono.value.trim().length > 10) {
      showError(telefono, "Debe tener entre 7 y 10 dígitos.");
      valid = false;
    }

    if (titular.value.trim().length < 5) {
      showError(titular, "Nombre del titular inválido.");
      valid = false;
    }

    if (metodo.value === "tarjeta") {
      if (tarjeta.value.trim().length !== 16) {
        showError(tarjeta, "Debe tener 16 dígitos numéricos.");
        valid = false;
      }

      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(fecha.value.trim())) {
        showError(fecha, "Usa formato MM/YY.");
        valid = false;
      } else {
        const [mes, año] = fecha.value.trim().split("/").map(Number);
        const expDate = new Date(2000 + año, mes);
        const now = new Date();
        if (expDate < now) {
          showError(fecha, "Tarjeta vencida.");
          valid = false;
        }
      }

      if (cvv.value.trim().length < 3 || cvv.value.trim().length > 4) {
        showError(cvv, "Debe tener 3 o 4 dígitos.");
        valid = false;
      }
    }

    if (!valid) {
      alert("⚠️ Corrige los campos marcados antes de continuar.");
      return;
    }

    // =====================================================
    // 🧾 Enviar pedido
    // =====================================================
    const pedido = {
      correo: correo.value.trim(),
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      telefono: telefono.value.trim(),
      titular: titular.value.trim(),
      metodo: metodo.value,
      cuotas: cuotasSelect.value || 1,
      carrito: cart,
      subtotal,
      descuento,
      total,
    };

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(pedido),
      });

      if (!res.ok) throw new Error(await res.text());
      alert("✅ ¡Compra registrada con éxito!");
      localStorage.removeItem("cart");
      window.location.href = "./index.html";
    } catch (err) {
      console.error("❌ Error registrando pedido:", err);
      alert("⚠️ Error al procesar el pago.");
    }
  });

  // =====================================================
  // 🎨 ESTILO VISUAL DE ERRORES
  // =====================================================
  const style = document.createElement("style");
  style.textContent = `
    input.invalid { border: 2px solid #c0392b; background-color: #fbeaea; }
    input.valid { border: 2px solid #27ae60; background-color: #ecfdf3; }
    .error-text {
      color: #c0392b;
      font-size: 13px;
      margin-top: 2px;
      font-family: 'Questrial', sans-serif;
      display: block;
    }
  `;
  document.head.appendChild(style);
});
