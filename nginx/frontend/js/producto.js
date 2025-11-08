document.addEventListener("DOMContentLoaded", async () => {
  // ==========================
  // 🔐 SESIÓN
  // ==========================
  const token = sessionStorage.getItem("authToken");
  const API_BASE = `/api`;
  const productId = localStorage.getItem("productoSeleccionado");
  const $container = document.getElementById("product-container");

  // ---------- Utils ----------
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
      if (u.protocol === "http:" && window.location.protocol === "https:")
        u.protocol = "https:";
      return u.href;
    } catch {
      return "./img/no-image.png";
    }
  };

  const starsHTML = (n = 0) => {
    const filled = "★".repeat(Number(n || 0));
    const empty = "☆".repeat(Math.max(0, 5 - Number(n || 0)));
    return `<span class="stars" aria-label="${n} de 5">${filled}${empty}</span>`;
  };

  // =====================================================
  // 🧠 Fetch del producto y comentarios
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

  const getComments = async (id) => {
    const res = await fetch(`${API_BASE}/public/products/${id}/comments`);
    if (!res.ok) throw new Error("Error al obtener comentarios");
    return await res.json();
  };

  const addComment = async (id, comentario, calificacion) => {
    const token = sessionStorage.getItem("authToken");
    if (!token) throw new Error("Debes iniciar sesión para comentar.");
    const res = await fetch(`${API_BASE}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id_producto: id, comentario, calificacion }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al agregar comentario");
    }
  };

  // =====================================================
  // 🎨 Render
  // =====================================================
  const renderProduct = async () => {
    try {
      if (!productId) {
        $container.innerHTML = "<p>No se seleccionó producto.</p>";
        return;
      }

      const p = await fetchProduct(productId);
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
                      (c) => `
                    <li class="comment-item">
                      <strong>${c.usuario_nombre || "Cliente"}</strong>
                      ${starsHTML(c.calificacion)}
                      <div>${c.comentario}</div>
                      <small>${new Date(c.fecha).toLocaleString()}</small>
                    </li>
                  `
                    )
                    .join("")
                : "<li>No hay comentarios todavía. ¡Sé el primero!</li>"
            }
          </ul>

          <form class="comment-form" id="commentForm">
            <label for="commentText" class="sr-only">Comentario</label>
            <textarea id="commentText" placeholder="Escribe tu comentario..." rows="3"></textarea>

            <!-- ⭐⭐ Control de estrellas accesible (radios) -->
            <div class="rating" aria-label="Calificación">
              <input type="radio" id="star5" name="rating" value="5" />
              <label for="star5" title="5 estrellas">★</label>

              <input type="radio" id="star4" name="rating" value="4" />
              <label for="star4" title="4 estrellas">★</label>

              <input type="radio" id="star3" name="rating" value="3" />
              <label for="star3" title="3 estrellas">★</label>

              <input type="radio" id="star2" name="rating" value="2" />
              <label for="star2" title="2 estrellas">★</label>

              <input type="radio" id="star1" name="rating" value="1" />
              <label for="star1" title="1 estrella">★</label>
            </div>

            <button type="submit">Enviar</button>
          </form>
          ${
            !token
              ? '<p style="margin-top:8px;color:#a05">Inicia sesión para poder comentar.</p>'
              : ""
          }
        </section>
      `;

      // Envío de comentario (usar referencia directa al form)
      const form = document.getElementById("commentForm");
      if (!form) return;

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const text = document.getElementById("commentText").value.trim();
        const ratingInput = form.querySelector('input[name="rating"]:checked');
        const rating = ratingInput ? Number(ratingInput.value) : 0;

        if (!text || !rating) {
          alert(
            "Por favor escribe un comentario y selecciona una calificación."
          );
          return;
        }

        try {
          // opcional: deshabilitar botón para evitar doble submit
          const btn = form.querySelector('button[type="submit"]');
          if (btn) btn.disabled = true;

          await addComment(p.id, text, rating);

          // limpiar
          document.getElementById("commentText").value = "";
          if (ratingInput) ratingInput.checked = false;

          // refrescar comentarios
          await renderProduct();
        } catch (err) {
          alert(err.message);
        } finally {
          const btn = form.querySelector('button[type="submit"]');
          if (btn) btn.disabled = false;
        }
      });
    } catch (err) {
      $container.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  };

  renderProduct();
});
