document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = `${window.location.origin}/api`;
  const token = sessionStorage.getItem("authToken");
  const email = sessionStorage.getItem("userEmail");

  const $subtotal = document.getElementById("subtotal");
  const $descuento = document.getElementById("descuento");
  const $total = document.getElementById("total");
  const $resumen = document.getElementById("resumenProductos");
  const $descuentoRow = document.getElementById("descuentoRow");

  // Cargar carrito
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  let subtotal = 0;

  $resumen.innerHTML = "";
  cart.forEach(item => {
    const line = document.createElement("div");
    const itemTotal = item.price * item.quantity;
    line.innerHTML = `<span>${item.name} x${item.quantity}</span><span>$${itemTotal.toLocaleString()}</span>`;
    $resumen.appendChild(line);
    subtotal += itemTotal;
  });

  $subtotal.textContent = `$${subtotal.toLocaleString()}`;
  let descuento = 0;

  // Comprobar si el usuario tiene compras previas (solo si hay token)
  if (token && email) {
    try {
      const res = await fetch(`${API_BASE}/orders/user/${email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const orders = await res.json();
        if (!orders || orders.length === 0) {
          // Primera compra → 10% descuento
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

  // Enviar pedido
  document.getElementById("formPago").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;

    const pedido = {
      correo: form.correo.value,
      nombre: form.nombre.value,
      apellido: form.apellido.value,
      telefono: form.telefono.value,
      metodo: form.metodo.value,
      carrito: cart,
      subtotal,
      descuento,
      total
    };

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(pedido)
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
});
