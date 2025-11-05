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
  // 🛒 CARGAR CARRITO
  // =====================================================
  const cartData = JSON.parse(localStorage.getItem("cart") || "{}");
  const cart = cartData.items || [];
  let subtotal = 0;

  $resumen.innerHTML = "";
  cart.forEach((item) => {
    const line = document.createElement("div");
    const itemTotal = item.price * item.quantity;
    line.innerHTML = `<span>${item.name} x${item.quantity}</span><span>$${itemTotal.toLocaleString()}</span>`;
    $resumen.appendChild(line);
    subtotal += itemTotal;
  });

  $subtotal.textContent = `$${subtotal.toLocaleString()}`;
  let descuento = 0;

  // =====================================================
  // 💸 DESCUENTO DE PRIMERA COMPRA
  // =====================================================
  if (token && email) {
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
  }

  const total = subtotal - descuento;
  $total.textContent = `$${total.toLocaleString()}`;

  // =====================================================
  // 💳 VALIDACIONES DE FORMULARIO
  // =====================================================
  const form = document.getElementById("formPago");
  const correo = form.correo;
  const nombre = form.nombre;
  const apellido = form.apellido;
  const telefono = form.telefono;
  const titular = form.titular; // ← nombre en la tarjeta
  const tarjeta = form.tarjeta;
  const fecha = form.fecha;
  const cvv = form.cvv;

  // 🔧 Helpers visuales
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

  // Solo letras y espacios (máx 30)
  const soloLetras = (input) => {
    input.value = input.value
      .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, "")
      .replace(/\s{2,}/g, " ");
    if (input.value.length > 30) input.value = input.value.slice(0, 30);
  };

  nombre.addEventListener("input", () => soloLetras(nombre));
  apellido.addEventListener("input", () => soloLetras(apellido));

  // Solo números en teléfono (máx 10)
  telefono.addEventListener("input", () => {
    telefono.value = telefono.value.replace(/\D/g, "");
    if (telefono.value.length > 10) telefono.value = telefono.value.slice(0, 10);
  });

  // Solo letras y espacios, sin tildes, TODO en mayúsculas
  titular.addEventListener("input", () => {
    titular.value = titular.value
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .replace(/\s{2,}/g, " ");
    if (titular.value.length > 40)
      titular.value = titular.value.slice(0, 40);
  });

  // Solo 16 dígitos en tarjeta
  tarjeta.addEventListener("input", () => {
    tarjeta.value = tarjeta.value.replace(/\D/g, "");
    if (tarjeta.value.length > 16) tarjeta.value = tarjeta.value.slice(0, 16);
  });

  // Formato MM/YY
  fecha.addEventListener("input", () => {
    let val = fecha.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 3) val = `${val.slice(0, 2)}/${val.slice(2)}`;
    fecha.value = val;
  });

  // CVV solo 3-4 dígitos
  cvv.addEventListener("input", () => {
    cvv.value = cvv.value.replace(/\D/g, "");
    if (cvv.value.length > 4) cvv.value = cvv.value.slice(0, 4);
  });

  // =====================================================
  // ✅ VALIDACIÓN FINAL
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
      showError(titular, "Nombre del titular inválido (solo letras y mayúsculas).");
      valid = false;
    }

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
      metodo: form.metodo.value,
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
