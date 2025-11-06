document.addEventListener("DOMContentLoaded", async () => {
  // ==========================
  // 🔐 SESIÓN Y PERFIL DE USUARIO
  // ==========================
  const token = sessionStorage.getItem("authToken");
  const email = sessionStorage.getItem("userEmail");
  const role = sessionStorage.getItem("userRole");
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");
  const now = Date.now();


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
    const res = await fetch(`${API_BASE}/public/products/${id}`);
    if (!res.ok) throw new Error("Producto no encontrado");
    const p = await res.json();
    return {
      id: p.id_producto ?? p.id,
      name: p.nombre ?? p.name,
      price: p.precio ?? p.price,
      description: p.descripcion ?? p.description,
      image: p.imagen_url ?? p.image_url ?? "./img/no-image.png",
    };
  };
  // =====================================================
  // 💬 Fetch y guardado de comentarios (usando API)
  // =====================================================
  const getComments = async (id) => {
    const res = await fetch(`${API_BASE}/public/products/${id}/comments`);
    if (!res.ok) throw new Error("Error al obtener comentarios");
    return await res.json();
  };
  const addComment = async (id, comentario, calificacion) => {
    const token = sessionStorage.getItem("authToken");
    if (!token) {
      throw new Error("Debes iniciar sesión para comentar.");
    }
    const res = await fetch(`${API_BASE}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id_producto: id, comentario, calificacion }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al agregar comentario");
    }
  };
  // =====================================================
  // 🎨 Render del producto + comentarios
  // =====================================================
  const renderProduct = async () => {
    try {
      const p = await fetchProduct(productId);
      if (!p) {
        $container.innerHTML = "<p>Producto no encontrado.</p>";
        return;
      }
      const comments = await getComments(p.id);
      const img = fixImageURL(p.image);
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
                        `<li class="comment-item"><strong>${c.usuario_nombre} (${c.calificacion} ⭐):</strong> ${c.comentario}<br><small>${new Date(c.fecha).toLocaleString()}</small></li>`
                    )
                    .join("")
                : "<li>No hay comentarios todavía. ¡Sé el primero!</li>"
            }
          </ul>
          <form class="comment-form" id="commentForm">
            <textarea id="commentText" placeholder="Escribe tu comentario..."></textarea>
            <select id="rating">
              <option value="">Selecciona calificación</option>
              <option value="1">1 ⭐</option>
              <option value="2">2 ⭐</option>
              <option value="3">3 ⭐</option>
              <option value="4">4 ⭐</option>
              <option value="5">5 ⭐</option>
            </select>
            <button type="submit">Enviar</button>
          </form>
        </section>
      `;
      // Evento para enviar comentario
      document.getElementById("commentForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = document.getElementById("commentText").value.trim();
        const rating = document.getElementById("rating").value;
        if (!text || !rating) return alert("Por favor escribe un comentario y selecciona una calificación.");
        try {
          await addComment(p.id, text, rating);
          document.getElementById("commentText").value = "";
          document.getElementById("rating").value = "";
          renderProduct(); // refresca comentarios
        } catch (err) {
          alert(err.message);
        }
      });
    } catch (err) {
      $container.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  };
  renderProduct();
});