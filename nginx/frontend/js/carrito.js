document.addEventListener("DOMContentLoaded", async () => {
  console.log("🛒 Cargando carrito...");

  const API_BASE = `${window.location.origin}/api`;
  const CART_KEY = "cart";
  const CART_TTL_MS = 20 * 60 * 1000; // 20 minutos

  // ==========================
  // 🔐 SESIÓN Y PERFIL DE USUARIO
  // ==========================
  const token = sessionStorage.getItem("authToken");
  const email = sessionStorage.getItem("userEmail");
  const role = sessionStorage.getItem("userRole");
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");
  const now = Date.now();

  const $perfilNombre = document.getElementById("perfil-nombre");
  const $perfilRol = document.getElementById("perfil-rol");
  const $perfilFoto = document.querySelector(".perfil-foto");

  // Perfil genérico por defecto
  const perfilGenerico = {
    nombre: "Usuario",
    rol: "visitante",
    foto: "./img/nouser.png",
  };

  let perfil = { ...perfilGenerico };

  // ✅ Función que mantiene la URL HTTP de MinIO (sin forzar HTTPS)
  const fixImageURL = (url) => {
    if (!url) return "./img/nouser.png";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${window.location.origin}${url}`;
  };

  // Verifica si hay sesión activa
  if (!token || !role || !expiresAt || now > parseInt(expiresAt, 10)) {
    console.warn("⚠️ Usuario sin sesión activa. Mostrando perfil genérico.");
  } else {
    try {
      console.log("📡 Cargando datos del usuario...");
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      const userData = await res.json();

      perfil = {
        nombre: userData.nombre || perfilGenerico.nombre,
        rol: userData.rol || perfilGenerico.rol,
        foto: fixImageURL(userData.foto_url) || perfilGenerico.foto,
      };

      console.log("✅ Perfil cargado:", perfil);
    } catch (err) {
      console.error("❌ Error obteniendo perfil del usuario:", err);
    }
  }

  // Renderiza el perfil (real o genérico)
  $perfilNombre.textContent = perfil.nombre;
  $perfilRol.textContent = `Rol: ${perfil.rol}`;
  $perfilFoto.src = perfil.foto;
  $perfilFoto.onerror = () => ($perfilFoto.src = "./img/nouser.png");

  // ==========================
  // 💾 UTILIDADES DEL CARRITO
  // ==========================
  const getCart = () => {
    const data = JSON.parse(localStorage.getItem(CART_KEY) || "null");
    if (!data) return [];
    const { createdAt, items } = data;
    if (Date.now() - createdAt > CART_TTL_MS) {
      console.warn("🕒 Carrito expirado — limpiando.");
      localStorage.removeItem(CART_KEY);
      return [];
    }
    return items;
  };

  const setCart = (items) => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({ createdAt: Date.now(), items })
    );
  };

  const formatCOP = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  // ==========================
  // 🧾 RENDERIZAR CARRITO
  // ==========================
  const $container = document.getElementById("carrito-container");
  const $btnPagar = document.getElementById("btnPagar");
  const $total = document.getElementById("total-precio");

  function actualizarTotal(carrito) {
    const total = carrito.reduce((acc, p) => acc + p.price * p.quantity, 0);
    if ($total) $total.textContent = formatCOP(total);
    setCart(carrito);
  }

  function renderCarrito() {
    const carrito = getCart();

    if (!carrito.length) {
      $container.innerHTML = `<p style="text-align:center;padding:20px;">🛒 Tu carrito está vacío.</p>`;
      if ($total) $total.textContent = "$0";
      if ($btnPagar) $btnPagar.style.display = "none";
      return;
    }

    $container.innerHTML = carrito
      .map(
        (p) => `
      <div class="carrito-item" data-id="${p.id}">
        <img src="${fixImageURL(p.image)}" alt="${
          p.name
        }" onerror="this.src='./img/no-image.png'">
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

    // Solo muestra el botón de pago si hay productos
    if ($btnPagar) $btnPagar.style.display = "block";
  }

  // ==========================
  // ➕➖ MODIFICAR CANTIDAD
  // ==========================
  document
    .getElementById("carrito-container")
    .addEventListener("click", (e) => {
      const carrito = getCart();
      const item = e.target.closest(".carrito-item");
      if (!item) return;
      const id = parseInt(item.dataset.id);
      const producto = carrito.find((p) => p.id === id);

      if (e.target.classList.contains("btn-sumar")) {
        if(producto.quantity<10){
          producto.quantity++;
        }
      } else if (e.target.classList.contains("btn-restar")) {
        producto.quantity--;
        if (producto.quantity <= 0) {
          const idx = carrito.indexOf(producto);
          carrito.splice(idx, 1);
        }
      }
      setCart(carrito);
      renderCarrito();
    });

  // ==========================
  // 💰 PAGAR
  // ==========================
  if ($btnPagar) {
    $btnPagar.addEventListener("click", () => {
      const carrito = getCart();
      if (!carrito.length) return alert("Tu carrito está vacío 😢");

      if (!token) {
        alert("⚠️ Debes iniciar sesión para proceder con el pago.");
        window.location.href = "./login.html";
        return;
      }

      alert("✅ Redirigiendo al pago...");
      window.location.href = "./pago.html";
    });
  } else {
    console.warn("⚠️ No se encontró el botón de pagar en el DOM.");
  }

  // ==========================
  // 🚀 INICIALIZACIÓN
  // ==========================
  renderCarrito();
  console.log("✅ Carrito inicializado correctamente.");
});
