document.addEventListener("DOMContentLoaded", async () => {
  const loader = document.getElementById("loader");
  const loaderText = document.getElementById("loader-text");
  const API_BASE = "http://localhost:3000";
  let editingProductId = null;

  // Mostrar mensaje en loader
  const showLoaderMsg = (msg) => {
    loaderText.textContent = msg;
  };

  // ==========================
  // 🔐 VALIDACIÓN DE SESIÓN
  // ==========================
  document.body.style.visibility = "hidden";
  document.body.style.opacity = "0";
  showLoaderMsg("Verificando sesión...");

  const token = sessionStorage.getItem("authToken");
  const role = sessionStorage.getItem("userRole");
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");
  const email = sessionStorage.getItem("userEmail");
  const now = Date.now();

  if (!token || !role || !expiresAt || now > parseInt(expiresAt, 10)) {
    sessionStorage.clear();
    window.location.replace("/login.html");
    return;
  }

  if (!["admin", "superadmin"].includes(role)) {
    sessionStorage.clear();
    window.location.replace("/index.html");
    return;
  }

  // Mostrar panel tras validación
  setTimeout(() => {
    loader.classList.add("fade-out");
    document.body.style.visibility = "visible";
    document.body.style.opacity = "1";
  }, 500);

  const info = document.getElementById("user-info");
  if (info && email) info.textContent = `👋 Bienvenido, ${email} (${role})`;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.replace("/login.html");
    });
  }

  // Expiración automática
  setInterval(() => {
    const exp = parseInt(sessionStorage.getItem("tokenExpiresAt"), 10);
    if (Date.now() > exp) {
      alert("⚠️ Tu sesión ha expirado. Inicia sesión nuevamente.");
      sessionStorage.clear();
      window.location.replace("/login.html");
    }
  }, 60000);

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  // ==========================
  // 👥 GESTIÓN DE CLIENTES
  // ==========================
  const tablaClientesBody = document.querySelector("#tablaClientes tbody");

  async function cargarUsuarios() {
    showLoaderMsg("Cargando usuarios...");
    try {
      const res = await fetch(`${API_BASE}/api/users?rol=cliente`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error(await res.text());
      const usuarios = await res.json();

      tablaClientesBody.innerHTML = "";
      usuarios.sort((a, b) => a.aprobado - b.aprobado);

      usuarios.forEach((u) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${u.nombre}</td>
          <td>${u.correo}</td>
          <td><span class="badge bg-${
            u.rol === "admin" ? "warning" : "secondary"
          }">${u.rol}</span></td>
          <td class="text-center">
            ${
              u.aprobado
                ? `<button class="btn btn-warning btn-sm desactivar" data-id="${u.id_usuario}">
                     <i class="fas fa-user-slash"></i> Desactivar
                   </button>`
                : `<button class="btn btn-success btn-sm aprobar" data-id="${u.id_usuario}">
                     <i class="fas fa-user-check"></i> Aprobar
                   </button>`
            }
            <button class="btn btn-danger btn-sm eliminar" data-id="${
              u.id_usuario
            }">
              <i class="fas fa-trash"></i> Eliminar
            </button>
          </td>
        `;
        tablaClientesBody.appendChild(tr);
      });

      showLoaderMsg("Cargando productos...");
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      showLoaderMsg("❌ Error al cargar usuarios");
    }
  }

  tablaClientesBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    let endpoint = "";
    let method = "PUT";
    let mensaje = "";

    if (btn.classList.contains("aprobar")) {
      if (!confirm("¿Aprobar este cliente?")) return;
      endpoint = `${API_BASE}/api/users/${id}/approve`;
      mensaje = "✅ Usuario aprobado correctamente.";
    } else if (btn.classList.contains("desactivar")) {
      if (!confirm("¿Desactivar este cliente?")) return;
      endpoint = `${API_BASE}/api/users/${id}/deactivate`;
      mensaje = "⚠️ Usuario desactivado correctamente.";
    } else if (btn.classList.contains("eliminar")) {
      if (!confirm("¿Eliminar este usuario?")) return;
      endpoint = `${API_BASE}/api/users/${id}`;
      method = "DELETE";
      mensaje = "🗑️ Usuario eliminado correctamente.";
    }

    try {
      await fetch(endpoint, {
        method,
        headers: headers(),
        body:
          method === "PUT"
            ? JSON.stringify({ aprobado_por_email: email })
            : undefined,
      });
      alert(mensaje);
      cargarUsuarios();
    } catch (err) {
      alert("❌ Error procesando la solicitud.");
    }
  });

  await cargarUsuarios();

  // ==========================
  // 🛒 GESTIÓN DE PRODUCTOS
  // ==========================
  const formProducto = document.getElementById("formProducto");
  const tablaProductosBody = document.querySelector("#tablaProductos tbody");
  const previewImagen = document.getElementById("previewImagen");

  // Vista previa de imagen
  document.getElementById("imagenProducto").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImagen.src = ev.target.result;
        previewImagen.classList.remove("d-none");
      };
      reader.readAsDataURL(file);
    } else {
      previewImagen.src = "";
      previewImagen.classList.add("d-none");
    }
  });

  async function cargarProductos() {
    showLoaderMsg("Cargando productos...");
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error(await res.text());
      const productos = await res.json();

      tablaProductosBody.innerHTML = "";
      productos.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.nombre}</td>
          <td><img src="${p.imagen_url}" alt="${
          p.nombre
        }" class="img-thumbnail" style="width:60px;height:60px;object-fit:cover;"></td>
          <td>$${parseFloat(p.precio).toFixed(2)}</td>
          <td>${p.descripcion}</td>
          <td>
            <button class="btn btn-sm btn-warning edit-btn" data-id="${
              p.id_producto
            }">Editar</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${
              p.id_producto
            }">Eliminar</button>
          </td>
        `;
        tablaProductosBody.appendChild(tr);
      });

      loader.classList.add("fade-out");
    } catch (err) {
      console.error("Error cargando productos:", err);
      showLoaderMsg("❌ Error al cargar productos");
    }
  }

  await cargarProductos();
});
