// js/pago.js — Integrado a /api/coupons/check y /api/payments (con crédito/débito)
document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = `${window.location.origin}/api`;
  const token = sessionStorage.getItem("authToken");
  const email = sessionStorage.getItem("userEmail");
  // helpers seguros
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));


  const $subtotal = document.getElementById("subtotal");
  const $descuento = document.getElementById("descuento");
  const $total = document.getElementById("total");
  const $resumen = document.getElementById("resumenProductos");
  const $descuentoRow = document.getElementById("descuentoRow");

  // ===== Sesión obligatoria =====
  if (!token || !email) {
    alert("⚠️ Debes iniciar sesión para acceder al pago.");
    window.location.href = "./login.html";
    return;
  }

  // ===== Cargar carrito (aceptamos 2 formas: [] o {items: []}) =====
  let rawCart;
  try {
    rawCart = JSON.parse(localStorage.getItem("cart") || "[]");
  } catch { rawCart = []; }

  const cart = Array.isArray(rawCart) ? rawCart : (rawCart.items || []);
  if (!cart.length) {
    alert("🛒 Tu carrito está vacío. Añade productos antes de pagar.");
    window.location.href = "./carta.html";
    return;
  }

  // ===== Render resumen + subtotal (para UI) =====
  let subtotal = 0;
  $resumen.innerHTML = "";
  cart.forEach((item) => {
    const qty = Number(item.quantity ?? 1);
    const price = Number(item.price ?? 0);
    const lineTotal = qty * price;
    subtotal += lineTotal;

    const line = document.createElement("div");
    line.innerHTML = `<span>${item.name ?? item.nombre ?? "Producto"} x${qty}</span>
                      <span>$${lineTotal.toLocaleString("es-CO")}</span>`;
    $resumen.appendChild(line);
  });
  $subtotal.textContent = `$${subtotal.toLocaleString("es-CO")}`;

  // ===== Cupón (primera compra) =====
  let descuento = 0;
  let couponApplied = false;
  try {
    const res = await fetch(`${API_BASE}/coupons/check`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.hasCoupon) {
        descuento = subtotal * 0.10;
        couponApplied = true;
      }
    }
  } catch (e) {
    console.warn("No se pudo verificar cupón:", e);
  }
  if (descuento > 0) {
    $descuento.textContent = `- $${descuento.toLocaleString("es-CO")}`;
    $descuentoRow.classList.remove("hidden");
  }

  const totalUI = subtotal - descuento;
  $total.textContent = `$${totalUI.toLocaleString("es-CO")}`;

  // ===== Mapear carrito al formato del backend: [{id_producto, cantidad}] =====
  const carritoBack = cart
    .map((i) => ({
      id_producto: Number(i.id_producto ?? i.id ?? i.productId),
      cantidad: Number(i.quantity ?? 1),
    }))
    .filter((i) => Number.isFinite(i.id_producto) && i.id_producto > 0 && Number.isFinite(i.cantidad) && i.cantidad > 0);

  if (!carritoBack.length) {
    alert("⚠️ No se pudo preparar el carrito para el pago.");
    return;
  }
  
// ===== Form y campos (según TU HTML) =====
const form = document.querySelector("#formPago");
if (!form) {
  console.error("[pago.js] No se encontró #formPago. Revisa el id en el HTML.");
  return; // evita que el script siga y lance errores
}

const correo   = form.querySelector("#correo");
const nombre   = form.querySelector("#nombre");
const apellido = form.querySelector("#apellido");
const telefono = form.querySelector("#telefono");
const titular  = form.querySelector("#titular");
const tarjeta  = form.querySelector("#tarjeta"); // número de tarjeta
const fecha    = form.querySelector("#fecha");   // MM/YY
const cvv      = form.querySelector("#cvv");
  
  const modeBtns   = $$(".tarjeta-btn");
let tarjetaModo  = "credito"; // default

const activateModeBtn = (btn) => {
  modeBtns.forEach(b => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
    tarjetaModo = (btn?.dataset?.type === "debito") ? "debito" : "credito";
  };

  const initial = modeBtns.find(b => b.classList.contains("active")) || modeBtns[0];
  if (initial) activateModeBtn(initial);

  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => activateModeBtn(btn));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateModeBtn(btn); }
    });
  });


  // ===== Helpers de error =====
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

  // ===== Restricciones y máscaras =====
  const soloLetras = (input) => {
    input.value = input.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, "").replace(/\s{2,}/g, " ");
    if (input.value.length > 30) input.value = input.value.slice(0, 30);
  };
  nombre.addEventListener("input", () => soloLetras(nombre));
  apellido.addEventListener("input", () => soloLetras(apellido));

  telefono.addEventListener("input", () => {
    telefono.value = telefono.value.replace(/\D/g, "").slice(0, 10);
  });

  titular.addEventListener("input", () => {
    titular.value = titular.value.toUpperCase().replace(/[^A-Z\s]/g, "").replace(/\s{2,}/g, " ").slice(0, 40);
  });

  tarjeta.addEventListener("input", () => {
    tarjeta.value = tarjeta.value.replace(/\D/g, "").slice(0, 16);
  });

  fecha.addEventListener("input", () => {
    let v = fecha.value.replace(/\D/g, "").slice(0, 4);   // MMYY
    if (v.length >= 3) v = `${v.slice(0,2)}/${v.slice(2)}`;
    fecha.value = v;
  });

  cvv.addEventListener("input", () => {
    cvv.value = cvv.value.replace(/\D/g, "").slice(0, 4);
  });


// pequeñas utilidades seguras
const onInput = (el, fn) => el && el.addEventListener("input", fn);

onInput(nombre,   () => soloLetras(nombre));
onInput(apellido, () => soloLetras(apellido));

onInput(telefono, () => {
  telefono.value = telefono.value.replace(/\D/g, "").slice(0, 10);
});

onInput(titular, () => {
  titular.value = titular.value
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 40);
});

// 👇 Número de tarjeta (16 dígitos)
onInput(tarjeta, () => {
  tarjeta.value = tarjeta.value.replace(/\D/g, "").slice(0, 16);
});

// 👇 Fecha MM/YY en un solo input
onInput(fecha, () => {
  let v = fecha.value.replace(/\D/g, "").slice(0, 4); // MMYY
  if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
  fecha.value = v;
});

// 👇 CVV 3–4 dígitos
onInput(cvv, () => {
  cvv.value = cvv.value.replace(/\D/g, "").slice(0, 4);
});

  // ===== Overlay de carga (si existe en tu HTML) =====
  const overlay = document.getElementById("loadingOverlay");
  const setLoading = (v) => { overlay?.classList.toggle("show", !!v); };

// ===== Submit =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validaciones
  let valid = true;
  [correo, nombre, apellido, telefono, titular, tarjeta, fecha, cvv].forEach(clearError);

  const _correo  = correo.value.trim();
  const _nombre  = nombre.value.trim();
  const _ape     = apellido.value.trim();
  const _tel     = telefono.value.trim();
  const _titular = titular.value.trim();
  const _numTar  = tarjeta.value.replace(/\s/g, "").trim();  // solo dígitos
  const _fecha   = fecha.value.trim();                       // MM/YY
  const _cvv     = cvv.value.trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(_correo)) { showError(correo, "Correo inválido."); valid = false; }
  if (_nombre.length < 3) { showError(nombre, "Debe tener al menos 3 letras."); valid = false; }
  if (_ape.length < 3)    { showError(apellido, "Debe tener al menos 3 letras."); valid = false; }
  if (_tel.length < 7 || _tel.length > 10) { showError(telefono, "Debe tener entre 7 y 10 dígitos."); valid = false; }
  if (_titular.length < 5) { showError(titular, "Nombre del titular inválido."); valid = false; }

  if (!/^\d{16}$/.test(_numTar)) {
    showError(tarjeta, "Debe tener 16 dígitos numéricos.");
    valid = false;
  }

  // Validar MM/YY
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(_fecha)) {
    showError(fecha, "Usa formato MM/YY.");
    valid = false;
  } else {
    const [mmStr, yyStr] = _fecha.split("/");
    const mm = Number(mmStr);            // 1..12
    const yy = Number(yyStr);            // 00..99
    const expDate = new Date(2000 + yy, mm); // primer día del mes siguiente
    if (expDate <= new Date()) {
      showError(fecha, "Tarjeta vencida.");
      valid = false;
    }
  }

  if (_cvv.length < 3 || _cvv.length > 4 || !/^\d+$/.test(_cvv)) {
    showError(cvv, "Debe tener 3 o 4 dígitos.");
    valid = false;
  }

  if (!valid) {
    alert("⚠️ Corrige los campos marcados antes de continuar.");
    return;
  }

  setLoading(true);
  const btn = form.querySelector(".btn-pagar");
  btn?.setAttribute("disabled", "true");

  // === ÚNICO POST: /api/payments (crea pedido y registra pago) ===
  try {
    const payRes = await fetch(`${API_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        correo: _correo,
        titular: _titular,
        numero_tarjeta: _numTar,
        tipo: tarjetaModo,      // "credito" | "debito" (del toggle)
        carrito: carritoBack,   // [{ id_producto, cantidad }]
      }),
    });

    if (!payRes.ok) {
      const t = await payRes.text();
      throw new Error(t || "Fallo al procesar pago");
    }

    const data = await payRes.json(); // { id_pedido, total, id_tarjeta, referencia, ... }

    // Guardar datos para recibo.html
    const recibo = {
      orderId: data?.id_pedido,
      referencia: data?.referencia,
      totalBackend: data?.total,
      fecha: new Date().toISOString(),
      usuario: email,
      couponApplied,
      subtotalUI: subtotal,
      descuentoUI: descuento,
      totalUI,
      tarjeta: {
        modo: tarjetaModo,
        ult4: _numTar.slice(-4),
        titular: _titular,
      },
      items: cart,
    };
    sessionStorage.setItem("lastOrder", JSON.stringify(recibo));

    localStorage.removeItem("cart");
    window.location.href = "./recibo.html";
  } catch (err) {
    console.error("❌ Error en /payments:", err);
    alert("⚠️ No se pudo procesar el pago u ordenar la compra.");
  } finally {
    setLoading(false);
    btn?.removeAttribute("disabled");
  }
});

  // Estilos de errores por si faltan
  const style = document.createElement("style");
  style.textContent = `
    input.invalid { border: 2px solid #c0392b; background-color: #fbeaea; }
    input.valid { border: 2px solid #27ae60; background-color: #ecfdf3; }
    .error-text { color:#c0392b; font-size:13px; margin-top:2px; font-family:'Questrial',sans-serif; display:block; }
    .tarjeta-btn{ user-select:none; }
    .tarjeta-btn.active{ outline:2px solid #3C2E26; }
  `;
  document.head.appendChild(style);
});
