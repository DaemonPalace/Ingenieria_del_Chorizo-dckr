document.addEventListener("DOMContentLoaded", () => {
  const $container = document.getElementById("carrito-container");
  const $total = document.getElementById("total-precio");
  const $btnPagar = document.getElementById("btnPagar");

  // --- Perfil simulado ---
  const perfil = {
    nombre: "Camila Arepabuela",
    rol: "Cliente"
  };
  document.getElementById("perfil-nombre").textContent = perfil.nombre;
  document.getElementById("perfil-rol").textContent = `Rol: ${perfil.rol}`;

  // --- Datos simulados del carrito ---
  const carrito = JSON.parse(localStorage.getItem("carritoSimulado")) || [
    {
      id: 1,
      nombre: "Arepa de Queso",
      precio: 3500,
      cantidad: 2,
      imagen: "./img/arepa_queso.jpg"
    },
    {
      id: 2,
      nombre: "Chocolate Caliente",
      precio: 2500,
      cantidad: 1,
      imagen: "./img/chocolate.jpg"
    }
  ];

  const formatCOP = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  // --- Renderizar carrito ---
  function renderCarrito() {
    if (!carrito.length) {
      $container.innerHTML = `<p style="text-align:center;padding:20px;">🛒 Tu carrito está vacío.</p>`;
      $total.textContent = "$0";
      return;
    }

    $container.innerHTML = carrito
      .map(
        (p) => `
        <div class="carrito-item" data-id="${p.id}">
          <img src="${p.imagen}" alt="${p.nombre}">
          <div class="item-info">
            <h3>${p.nombre}</h3>
            <p>${formatCOP(p.precio)}</p>
          </div>
          <div class="item-cantidad">
            <button class="btn-restar">-</button>
            <span>${p.cantidad}</span>
            <button class="btn-sumar">+</button>
          </div>
        </div>`
      )
      .join("");

    actualizarTotal();
  }

  // --- Actualizar total ---
  function actualizarTotal() {
    const total = carrito.reduce(
      (acc, p) => acc + p.precio * p.cantidad,
      0
    );
    $total.textContent = formatCOP(total);
    localStorage.setItem("carritoSimulado", JSON.stringify(carrito));
  }

  // --- Sumar/restar cantidad ---
  $container.addEventListener("click", (e) => {
    const item = e.target.closest(".carrito-item");
    if (!item) return;
    const id = parseInt(item.dataset.id);
    const producto = carrito.find((p) => p.id === id);

    if (e.target.classList.contains("btn-sumar")) {
      producto.cantidad++;
    }
    if (e.target.classList.contains("btn-restar")) {
      producto.cantidad--;
      if (producto.cantidad <= 0) {
        const idx = carrito.indexOf(producto);
        carrito.splice(idx, 1);
      }
    }
    renderCarrito();
  });

  // --- Botón de pagar ---
  $btnPagar.addEventListener("click", () => {
    if (!carrito.length) return alert("Tu carrito está vacío 😢");
    alert("Redirigiendo a pago...");
    window.location.href = "./pago.html";
  });

  renderCarrito();
});
