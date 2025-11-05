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

document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = `${window.location.origin}/api`;
  const token = sessionStorage.getItem("authToken");
  const role = sessionStorage.getItem("userRole");
  const id = new URLSearchParams(window.location.search).get("id");
  const $container = document.getElementById("product-container");

  if (!id) {
    $container.innerHTML = "<p>❌ Producto no especificado.</p>";
    return;
  }

  // 📦 Cargar producto
  try {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error("Producto no encontrado");
    const p = await res.json();

    $container.innerHTML = `
      <div class="product-detail">
        <img src="${p.imagen_url}" alt="${p.nombre}">
        <div class="info">
          <h1>${p.nombre}</h1>
          <p>${p.descripcion}</p>
          <p class="price">$${p.precio}</p>
        </div>
      </div>
      <section class="comments-section">
        <h2>Comentarios</h2>
        <div id="comments-container"></div>
        ${
          token && role === "cliente"
            ? `
          <form id="commentForm">
            <textarea id="comentario" placeholder="Escribe tu comentario..." required></textarea>
            <label>Calificación:
              <select id="calificacion">
                <option value="5">⭐️⭐️⭐️⭐️⭐️</option>
                <option value="4">⭐️⭐️⭐️⭐️</option>
                <option value="3">⭐️⭐️⭐️</option>
                <option value="2">⭐️⭐️</option>
                <option value="1">⭐️</option>
              </select>
            </label>
            <button type="submit">Publicar</button>
          </form>`
            : `<p>🔐 <a href="./login.html">Inicia sesión</a> para comentar.</p>`
        }
      </section>
    `;

    // Cargar comentarios existentes
    loadComments(id);
  } catch (err) {
    $container.innerHTML = `<p>❌ Error: ${err.message}</p>`;
  }

  // 📩 Enviar comentario
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "commentForm") {
      e.preventDefault();
      const comentario = document.getElementById("comentario").value.trim();
      const calificacion = parseInt(document.getElementById("calificacion").value);

      try {
        const res = await fetch(`${API_BASE}/products/${id}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comentario, calificacion }),
        });

        if (!res.ok) throw new Error("Error al enviar comentario");
        alert("✅ Comentario publicado");
        loadComments(id);
        e.target.reset();
      } catch (err) {
        alert("❌ Error: " + err.message);
      }
    }
  });

  // 🔁 Función para recargar comentarios
  async function loadComments(id) {
    const $comments = document.getElementById("comments-container");
    const res = await fetch(`${API_BASE}/products/${id}/comments`);
    const comments = await res.json();

    if (!comments.length) {
      $comments.innerHTML = "<p>Sin comentarios aún. Sé el primero 🍽️</p>";
      return;
    }

    $comments.innerHTML = comments
      .map(
        (c) => `
        <div class="comment">
          <p><strong>${c.usuario}</strong> — ${"⭐".repeat(c.calificacion)}</p>
          <p>${c.comentario}</p>
          <small>${new Date(c.fecha).toLocaleString("es-CO")}</small>
        </div>`
      )
      .join("");
  }
});
