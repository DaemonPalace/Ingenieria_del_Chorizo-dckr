/* --------------------------------------------------------------
   ADMIN PANEL – Adaptado al HTML con Bootstrap
   -------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  const API_BASE = "http://localhost:3000"; // mismo origen → rutas relativas
  let editingProductId = null;

  // === 1. Validación de sesión ===
  document.body.classList.remove("auth-verified");
  document.body.style.visibility = "hidden";
  document.body.style.opacity = "0";

  const token = sessionStorage.getItem("authToken");
  const role = sessionStorage.getItem("userRole");
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");
  const email = sessionStorage.getItem("userEmail");
  console.log("Token actual:", sessionStorage.getItem("authToken"));

  if (!token || !role || !expiresAt || Date.now() > +expiresAt) {
    sessionStorage.clear();
    window.location.replace("/login.html");
    return;
  }

  if (!["admin", "superadmin"].includes(role)) {
    sessionStorage.clear();
    window.location.replace("/index.html");
    return;
  }

  // Mostrar contenido
  setTimeout(() => {
    loader.classList.add("fade-out");
    document.body.style.visibility = "visible";
    document.body.style.opacity = "1";
    document.body.classList.add("auth-verified");
  }, 600);

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.clear();
    window.location.replace("/login.html");
  });

  // Auto-logout
  setInterval(() => {
    if (Date.now() > +sessionStorage.getItem("tokenExpiresAt")) {
      alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
      sessionStorage.clear();
      window.location.replace("/login.html");
    }
  }, 60_000);

  // === 2. Cabeceras con JWT ===
  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  });

  // === 3. CARGAR USUARIOS (CLIENTES) ===
  const tablaClientesBody = document.querySelector("#tablaClientes tbody");

  async function cargarUsuarios() {
    try {
      const res = await fetch(`${API_BASE}/api/users`, { headers: headers() });
      if (!res.ok) throw new Error(await res.text());
      const usuarios = await res.json();

      tablaClientesBody.innerHTML = "";
      usuarios.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${u.nombre}</td>
          <td>${u.correo}</td>
          <td><span class="badge bg-${u.rol === 'superadmin' ? 'danger' : u.rol === 'admin' ? 'warning' : 'secondary'}">${u.rol}</span></td>
          <td>
            ${!u.aprobado ? `<button class="btn btn-sm btn-success approve-btn" data-id="${u.id_usuario}">Aprobar</button>` : ''}
            <button class="btn btn-sm btn-danger delete-btn" data-id="${u.id_usuario}">Eliminar</button>
          </td>
        `;
        tablaClientesBody.appendChild(tr);
      });

      // Aprobar
      document.querySelectorAll(".approve-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          try {
            const r = await fetch(`${API_BASE}/api/users/${id}/approve`, {
              method: "PUT",
              headers: headers()
            });
            if (!r.ok) throw new Error(await r.text());
            alert("Usuario aprobado");
            cargarUsuarios();
          } catch (err) {
            alert("Error: " + err.message);
          }
        });
      });

      // Eliminar
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!confirm("¿Eliminar este usuario?")) return;
          const id = btn.dataset.id;
          try {
            const r = await fetch(`${API_BASE}/api/users/${id}`, {
              method: "DELETE",
              headers: headers()
            });
            if (!r.ok) throw new Error(await r.text());
            alert("Usuario eliminado");
            cargarUsuarios();
          } catch (err) {
            alert("Error: " + err.message);
          }
        });
      });

    } catch (err) {
      console.error(err);
      alert("Error cargando usuarios: " + err.message);
    }
  }

  cargarUsuarios();

  // === 4. GESTIÓN DE PRODUCTOS ===
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

  // Cargar productos
  async function cargarProductos() {
    try {
      const res = await fetch(`${API_BASE}/api/products`, { headers: headers() });
      if (!res.ok) throw new Error(await res.text());
      const productos = await res.json();

      tablaProductosBody.innerHTML = "";
      productos.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.nombre}</td>
          <td><img src="${p.imagen_url}" alt="${p.nombre}" class="img-thumbnail" style="width:60px;height:60px;object-fit:cover;"></td>
          <td>$${parseFloat(p.precio).toFixed(2)}</td>
          <td>${p.descripcion}</td>
          <td>
            <button class="btn btn-sm btn-warning edit-btn" data-id="${p.id_producto}">Editar</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${p.id_producto}">Eliminar</button>
          </td>
        `;
        tablaProductosBody.appendChild(tr);
      });

      // Editar
      document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          const prod = productos.find(p => p.id_producto == id);
          document.getElementById("nombreProducto").value = prod.nombre;
          document.getElementById("precioProducto").value = prod.precio;
          document.getElementById("descripcionProducto").value = prod.descripcion;
          previewImagen.src = prod.imagen_url;
          previewImagen.classList.remove("d-none");
          editingProductId = id;
          formProducto.scrollIntoView({ behavior: "smooth" });
        });
      });

      // Eliminar
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!confirm("¿Eliminar este producto?")) return;
          const id = btn.dataset.id;
          try {
            const r = await fetch(`${API_BASE}/api/products/${id}`, {
              method: "DELETE",
              headers: headers()
            });
            if (!r.ok) throw new Error(await r.text());
            alert("Producto eliminado");
            cargarProductos();
          } catch (err) {
            alert("Error: " + err.message);
          }
        });
      });

    } catch (err) {
      console.error(err);
      alert("Error cargando productos: " + err.message);
    }
  }

  cargarProductos();

  // === 5. ENVIAR FORMULARIO (Crear / Actualizar) ===
  formProducto.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("nombre", document.getElementById("nombreProducto").value.trim());
    formData.append("precio", document.getElementById("precioProducto").value);
    formData.append("descripcion", document.getElementById("descripcionProducto").value.trim());

    const imgFile = document.getElementById("imagenProducto").files[0];
    if (imgFile) formData.append("imagen", imgFile);

    const method = editingProductId ? "PUT" : "POST";
    const url = editingProductId
      ? `${API_BASE}/api/products/${editingProductId}`
      : `${API_BASE}/api/products`;

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error(await res.text());

      alert(editingProductId ? "Producto actualizado" : "Producto creado");
      formProducto.reset();
      previewImagen.src = "";
      previewImagen.classList.add("d-none");
      editingProductId = null;
      cargarProductos();
    } catch (err) {
      alert("Error: " + err.message);
    }
  });

  // === 6. CANCELAR EDICIÓN (opcional) ===
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-secondary mt-3 ms-2";
  cancelBtn.textContent = "Cancelar";
  cancelBtn.style.display = "none";
  cancelBtn.onclick = () => {
    formProducto.reset();
    previewImagen.src = "";
    previewImagen.classList.add("d-none");
    editingProductId = null;
    cancelBtn.style.display = "none";
  };

  // Insertar botón cancelar después del botón "Guardar"
  document.querySelector("#formProducto button[type='submit']").after(cancelBtn);

  // Mostrar botón cancelar solo en edición
  const originalSubmit = formProducto.onsubmit;
  formProducto.onsubmit = (e) => {
    if (editingProductId) cancelBtn.style.display = "inline-block";
    return originalSubmit.call(formProducto, e);
  };

  // Al cargar edición, mostrar cancelar
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("edit-btn")) {
      cancelBtn.style.display = "inline-block";
    }
  });
});