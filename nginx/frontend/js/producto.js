document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = `${window.location.origin}/api`;
  const productId = localStorage.getItem("productoSeleccionado");
  const $container = document.getElementById("product-container");

  // 🔧 Utilidad para formato de precio
  const formatCOP = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  // 🔧 Normalizar URLs de imagen
  const fixImageURL = (url) => {
    try {
      if (!url) return "./img/no-image.png";
      const u = new URL(url, window.location.origin);
      if (u.protocol === "http:" && window.location.protocol === "https:") u.protocol = "https:";
      return u.href;
    } catch {
      return "./img/no-image.png";
    }
  };

  // =====================================================
  // 🧠 Fetch del producto desde el backend
  // =====================================================
  const fetchProduct = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`);
      if (!res.ok) throw new Error("No encontrado");
      const p = await res.json();
      return {
        id: p.id_producto ?? p.id,
        name: p.nombre ?? p.name,
        price: p.precio ?? p.price,
        description: p.descripcion ?? p.description,
        image: p.imagen_url ?? p.image_url ?? "./img/no-image.png",
      };
    } catch {
      console.warn("⚠️ Sin conexión al backend, usando simulación local");
      // Simulación local (si no hay backend)
      const mock = JSON.parse(localStorage.getItem("mockProducts") || "[]");
      return mock.find((x) => x.id == id) || null;
    }
  };

  // =====================================================
  // 💬 Fetch y guardado de comentarios (simulación local)
  // =====================================================
  const getComments = (id) => {
    const db = JSON.parse(localStorage.getItem("commentsDB") || "{}");
    return db[id] || [];
  };

  const addComment = (id, text) => {
    const db = JSON.parse(localStorage.getItem("commentsDB") || "{}");
    db[id] = db[id] || [];
    db[id].push({
      user: "Anónimo",
      text,
      date: new Date().toLocaleString(),
    });
    localStorage.setItem("commentsDB", JSON.stringify(db));
  };

  // =====================================================
  // 🎨 Render del producto + comentarios
  // =====================================================
  const renderProduct = async () => {
    const p = await fetchProduct(productId);
    if (!p) {
      $container.innerHTML = "<p>Producto no encontrado.</p>";
      return;
    }

    const img = fixImageURL(p.image);
    const comments = getComments(p.id);

    $container.innerHTML = `
      <section class="product-header">
        <img src="${img}" alt="${p.name}">
        <h2>${p.name}</h2>
        <p>${p.description || "Sin descripción"}</p>
        <div class="price">${formatCOP(p.price)}</div>
      </section>

      <section class="comments-section">
        <h3>Comentarios</h3>
        <ul class="comment-list">
          ${
            comments.length
              ? comments
                  .map(
                    (c) =>
                      `<li class="comment-item"><strong>${c.user}:</strong> ${c.text}<br><small>${c.date}</small></li>`
                  )
                  .join("")
              : "<li>No hay comentarios todavía. ¡Sé el primero!</li>"
          }
        </ul>

        <form class="comment-form" id="commentForm">
          <textarea id="commentText" placeholder="Escribe tu comentario..."></textarea>
          <button type="submit">Enviar</button>
        </form>
      </section>
    `;

    // Evento para enviar comentario
    document.getElementById("commentForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const text = document.getElementById("commentText").value.trim();
      if (!text) return alert("Por favor escribe un comentario.");
      addComment(p.id, text);
      document.getElementById("commentText").value = "";
      renderProduct(); // refresca comentarios
    });
  };

  renderProduct();
});
