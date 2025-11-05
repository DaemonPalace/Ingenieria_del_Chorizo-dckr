// carta.js — carga productos reales desde /api/public/products (sin token requerido)
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Carta cargada correctamente");

  const API_BASE = `${window.location.origin}/api`;
  const $list = document.getElementById("menu-list");

  // ==========================================================
  // 🧮 Utilidades
  // ==========================================================
  const formatCOP = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const fixImageURL = (url) => {
    try {
      if (!url) return "./img/no-image.png";
      const u = new URL(url, window.location.origin);
      if (u.protocol === "http:" && window.location.protocol === "https:") {
        u.protocol = "https:";
      }
      return u.href;
    } catch {
      return "./img/no-image.png";
    }
  };

  // ==========================================================
  // 🛒 Carrito local con expiración (20 min)
  // ==========================================================
  const CART_KEY = "cart";
  const CART_TTL_MS = 20 * 60 * 1000; // 20 minutos

  const getCart = () => {
    try {
      const data = JSON.parse(localStorage.getItem(CART_KEY) || "null");

      // Si no hay datos o no es un formato válido
      if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
        console.warn("⚠️ Carrito vacío o corrupto. Reiniciando...");
        return [];
      }

      const { createdAt, items } = data;

      // Expira el carrito después de 20 minutos
      if (Date.now() - createdAt > CART_TTL_MS) {
        console.warn("🕒 Carrito expirado — limpiando.");
        localStorage.removeItem(CART_KEY);
        return [];
      }

      return items;
    } catch (err) {
      console.error("❌ Error leyendo carrito del localStorage:", err);
      return [];
    }
  };

  const setCart = (items) => {
    try {
      localStorage.setItem(
        CART_KEY,
        JSON.stringify({ createdAt: Date.now(), items })
      );
      console.log("💾 Carrito actualizado:", items);
    } catch (err) {
      console.error("❌ Error guardando carrito:", err);
    }
  };

  const addToCart = (product) => {
    let cart = getCart();

    // Garantiza que siempre sea un arreglo
    if (!Array.isArray(cart)) {
      console.warn("⚠️ Reiniciando carrito dañado...");
      cart = [];
    }

    const idx = cart.findIndex((i) => i.id === product.id);

    if (idx >= 0) {
      cart[idx].quantity = (cart[idx].quantity || 1) + 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });
    }

    setCart(cart);
    console.log(`🛒 Producto añadido: ${product.name}`);
    showToast(`${product.name} añadido al carrito 🧺`);
  };

  // ==========================================================
  // 🎨 Renderizado de productos
  // ==========================================================
  const render = (items) => {
    if (!$list) return;

    if (!items.length) {
      $list.innerHTML = `
        <p style="color:#fff;text-align:center;margin-top:2rem">
          No hay productos disponibles en este momento 🍽️
        </p>`;
      return;
    }

    const tpl = items
      .map((p) => {
        const img = fixImageURL(p.image);
        return `
        <article class="card" role="group" aria-label="${p.name}">
          <img class="card__img" src="${img}" alt="${p.name}"
               onerror="this.src='./img/no-image.png'">
          <div class="card__body">
            <h3 class="card__title">${p.name}</h3>
            <p class="card__desc">${p.description || ""}</p>
            <div class="card__price">${formatCOP(p.price)}</div>
            <div class="card__actions">
              <button class="btn-add" type="button"
                data-product='${JSON.stringify(p)}'
                aria-label="Añadir ${p.name} al carrito">
                <img src="./img/carritoIcono.png" alt="" aria-hidden="true">
                Añadir al carrito
              </button>
            </div>
          </div>
        </article>`;
      })
      .join("");

    $list.innerHTML = tpl;
    console.log(`✅ Renderizados ${items.length} productos.`);
  };

  // ==========================================================
  // 🔄 Mapeo del backend
  // ==========================================================
  const mapBackendProduct = (p) => ({
    id: p.id_producto ?? p.id ?? null,
    name: p.nombre ?? p.name ?? "Producto",
    price: Number(p.precio ?? p.price ?? 0),
    description: p.descripcion ?? p.description ?? "",
    image:
      p.imagen_url ??
      p.image_url ??
      p.imagen ??
      p.image ??
      "./img/no-image.png",
  });

  // ==========================================================
  // 🌐 Fetch de productos desde API pública
  // ==========================================================
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/public/products`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      const data = await res.json();

      if (!Array.isArray(data))
        throw new Error("Respuesta inválida del backend");

      console.log(`📦 Productos recibidos: ${data.length}`);
      return data.map(mapBackendProduct);
    } catch (err) {
      console.error("❌ Error cargando productos:", err);
      return [];
    }
  };

  // ==========================================================
  // 🧠 Delegación de eventos (Añadir al carrito)
  // ==========================================================
  document.body.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-add");
    if (!btn) return;

    try {
      const product = JSON.parse(btn.getAttribute("data-product"));
      addToCart(product);

      // Feedback visual temporal
      btn.disabled = true;
      const original = btn.innerHTML;
      btn.innerHTML = "✔ Añadido";
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = original;
      }, 800);
    } catch (err) {
      console.error("❌ Error añadiendo producto:", err);
    }
  });

  // ==========================================================
  // 🔔 Pequeña notificación visual (toast)
  // ==========================================================
  const showToast = (msg) => {
    let toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("visible"), 100);
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 500);
    }, 2500);
  };

  // CSS dinámico para el toast
  const style = document.createElement("style");
  style.textContent = `
    .toast-msg {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #3C2E26;
      color: #FFF8E7;
      padding: 10px 16px;
      border-radius: 12px;
      font-family: 'Questrial', sans-serif;
      font-size: 14px;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.4s ease;
      z-index: 9999;
    }
    .toast-msg.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // ==========================================================
  // 🚀 Inicialización
  // ==========================================================
  (async () => {
    const products = await fetchProducts();
    render(products);
  })();
});

document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = `${window.location.origin}/api`;
  const $list = document.getElementById("menu-list");

  const formatCOP = (value) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(value);

  try {
    const res = await fetch(`${API_BASE}/public/products`);
    const products = await res.json();

    $list.innerHTML = products
      .map(
        (p) => `
        <div class="menu-item">
          <img src="${p.imagen_url}" alt="${p.nombre}" class="menu-img" data-id="${p.id_producto}">
          <h3>${p.nombre}</h3>
          <p>${formatCOP(p.precio)}</p>
        </div>`
      )
      .join("");

    // 🖱️ Evento click en imagen
    document.querySelectorAll(".menu-img").forEach((img) => {
      img.addEventListener("click", () => {
        const id = img.getAttribute("data-id");
        window.location.href = `producto.html?id=${id}`;
      });
    });
  } catch (err) {
    console.error("Error al cargar productos:", err);
  }
});
