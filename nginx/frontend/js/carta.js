// carta.js — carga productos reales desde /api/products (sin productos de prueba locales)

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = `${window.location.origin}/api`;
  const $list = document.getElementById("menu-list");

  // ---------- Utils ----------
  const formatCOP = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  // Normaliza URL de imagen (corrige http/https y rutas relativas)
  const fixImageURL = (url) => {
    try {
      if (!url) return "/img/no-image.png";
      const u = new URL(url, window.location.origin);
      if (u.protocol === "http:" && window.location.protocol === "https:") {
        u.protocol = "https:";
      }
      return u.href;
    } catch {
      return "/img/no-image.png";
    }
  };

  // --- Carrito local ---
  const getCart = () => JSON.parse(localStorage.getItem("cart") || "[]");
  const setCart = (cart) => localStorage.setItem("cart", JSON.stringify(cart));

  const addToCart = (product) => {
    const cart = getCart();
    const idx = cart.findIndex((i) => i.name === product.name);
    if (idx >= 0) {
      cart[idx].quantity = (cart[idx].quantity || 1) + 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    setCart(cart);
  };

  // --- Renderizado de productos ---
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
               onerror="this.src='/img/no-image.png'">
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
  };

  // --- Adaptar campos del backend al formato del front ---
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
      "/img/no-image.png",
  });

  // --- Fetch de productos reales desde el backend ---
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Respuesta inválida");
      return data.map(mapBackendProduct);
    } catch (err) {
      console.error("❌ Error cargando productos:", err);
      return []; // No devuelve productos locales, solo lista vacía
    }
  };

  // --- Delegación de eventos para botón "Añadir al carrito" ---
  document.body.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-add");
    if (!btn) return;
    const product = JSON.parse(btn.getAttribute("data-product"));
    addToCart(product);

    // Pequeña animación de feedback
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = "✔ Añadido";
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = original;
    }, 700);
  });

  // --- Inicialización ---
  (async () => {
    const products = await fetchProducts();
    render(products);
  })();
});
