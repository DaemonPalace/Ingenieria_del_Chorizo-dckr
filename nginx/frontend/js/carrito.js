document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Cargando carrito...");

  const API_BASE = `${window.location.origin}/api`;
  const $container = document.getElementById("carrito-container");
  const $total = document.getElementById("total-precio");
  const $btnPagar = document.getElementById("btnPagar");
  const $perfilNombre = document.getElementById("perfil-nombre");
  const $perfilRol = document.getElementById("perfil-rol");
  const $perfilFoto = document.querySelector(".perfil-foto");

  // ============================================================
  // 🔐 Validar sesión
  // ============================================================
  const token = sessionStorage.getItem("authToken");
  const nombre = sessionStorage.getItem("userName");
  const rol = sessionStorage.getItem("userRole");
  const foto = sessionStorage.getItem("userPhoto");
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");
  const now = Date.now();

  let sesionActiva = false;

  if (!token || !expiresAt || now > parseInt(expiresAt, 10)) {
    console.warn("⚠️ Usuario sin sesión activa. Mostrando perfil genérico.");
    $perfilNombre.textContent = "Usuario";
    $perfilRol.textContent = "Rol: visitante";
    $perfilFoto.src = "../img/nouser.png";
  } else {
    sesionActiva = true;
    console.log("✅ Sesión activa detectada.");
    $perfilNombre.textContent = nombre || "Usuario";
    $perfilRol.textContent = `Rol: ${rol || "cliente"}`;
    $perfilFoto.src = foto || "../img/nouser.png";
  }

  // ============================================================
  // 🛒 Carrito local con expiración
  // ============================================================
  const CART_KEY = "cart";
  const CART_TTL_MS = 20 * 60 * 1000; // 20 minutos

  const getCart = () => {
    try {
      const data = JSON.parse(localStorage.getItem(CART_KEY) || "null");
      if (!data || !Array.isArray(data.items)) return [];
      if (Date.now() - data.createdAt > CART_TTL_MS) {
        console.warn("🕒 Carrito expirado — limpiando.");
        localStorage.removeItem(CART_KEY);
        return [];
      }
      return data.items;
    } catch {
      console.warn("⚠️ Carrito corrupto. Reiniciando...");
      return [];
    }
  };

  const setCart = (items) => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({ createdAt: Date.now(), items })
    );
  };

  // ============================================================
  // 💰 Formato COP
  // ============================================================
  const formatCOP = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  // ============================================================
  // 🎨 Renderizar carrito
  // ============================================================
  function renderCarrito() {
    const carrito = getCart();

    if (!carrito.length) {
      console.warn("🛒 Carrito vacío");
      $container.innerHTML = `<p style="text-align:center;padding:20px;">🛒 Tu carrito está vacío.</p>`;
      if ($btnPagar) $btnPagar.style.display = "none";
      if ($total) $total.textContent = "$0";
      return;
    }

    console.log(`🎨 Renderizando ${carrito.length} productos...`);

    $container.innerHTML = carrito
      .map(
        (p) => `
        <div class="carrito-item" data-id="${p.id}">
          <img src="${p.image}" alt="${p.name}">
          <div class="item-info">
            <h3>${p.name}</h3>
            <p>${formatCOP(p.price)}</p>
          </div>
          <div class="item-cantidad">
            <button class="btn-restar">-</button>
            <span>${p.quantity}</span>
            <button class="btn-sumar">+</button>
          </div>
        </div>`
      )
      .join("");

    actualizarTotal(carrito);
    if ($btnPagar) $btnPagar.style.display = "block";
  }

  // ============================================================
  // 🧮 Calcular total
  // ============================================================
  function actualizarTotal(carrito) {
    const total = carrito.reduce((acc, p) => acc + p.price * p.quantity, 0);
    if ($total) {
      $total.textContent = formatCOP(total);
      console.log("💰 Total actualizado:", total);
    } else {
      console.error("❌ Elemento #total-precio no encontrado en el DOM.");
    }
    setCart(carrito);
  }

  // ============================================================
  // ➕➖ Cambiar cantidad
  // ============================================================
  $container.addEventListener("click", (e) => {
    const carrito = getCart();
    const item = e.target.closest(".carrito-item");
    if (!item) return;
    const id = parseInt(item.dataset.id);
    const producto = carrito.find((p) => p.id === id);
    if (!producto) return;

    if (e.target.classList.contains("btn-sumar")) producto.quantity++;
    if (e.target.classList.contains("btn-restar")) {
      producto.quantity--;
      if (producto.quantity <= 0) carrito.splice(carrito.indexOf(producto), 1);
    }

    setCart(carrito);
    renderCarrito();
  });

  // ============================================================
  // 💳 Proceder al pago
  // ============================================================
  if ($btnPagar) {
    $btnPagar.addEventListener("click", () => {
      const carrito = getCart();
      if (!carrito.length) return alert("Tu carrito está vacío 😢");

      if (!sesionActiva) {
        alert("Debes iniciar sesión antes de continuar 🧾");
        window.location.href = "./login.html";
        return;
      }

      console.log("💳 Iniciando flujo de pago...");
      window.location.href = "./pago.html";
    });
  } else {
    console.error("❌ No se encontró el botón de pagar (#btnPagar) en el DOM.");
  }

  // ============================================================
  // 🚀 Inicialización
  // ============================================================
  setTimeout(() => {
    renderCarrito();
    console.log("✅ Carrito inicializado correctamente.");
  }, 300);
});
