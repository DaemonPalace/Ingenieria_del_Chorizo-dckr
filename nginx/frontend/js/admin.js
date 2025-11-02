document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Panel de administrador cargado");

  // 🔒 Oculta el contenido por defecto (evita parpadeos)
  document.body.style.display = "none";

  // ==========================
  // 🌐 CONFIGURACIÓN AUTOMÁTICA DEL BACKEND
  // ==========================
  const API_BASE = `${window.location.origin}/api`;
  console.log("🔗 Conectando con API_BASE =", API_BASE);

  // ==========================
  // 🔐 VALIDACIÓN DE SESIÓN
  // ==========================
  const token = sessionStorage.getItem("authToken");
  const email = sessionStorage.getItem("userEmail");
  const role = sessionStorage.getItem("userRole");
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");
  const now = Date.now();

  // Si no hay token o expiró → redirigir inmediatamente
  if (!token || !role || !expiresAt || now > parseInt(expiresAt, 10)) {
    console.warn("⚠️ Sesión no válida o expirada. Redirigiendo a login...");
    sessionStorage.clear();
    window.location.replace("/login.html");
    return;
  }

  // Si el rol no es admin/superadmin → redirigir
  if (!["admin", "superadmin"].includes(role.toLowerCase())) {
    console.warn("⚠️ Rol no autorizado:", role);
    sessionStorage.clear();
    window.location.replace("/index.html");
    return;
  }

  // ✅ Si la sesión es válida → mostrar el panel
  document.body.style.display = "block";
  document.body.classList.add("loaded");
  console.log("✅ Sesión válida, mostrando panel...");

  // ==========================
  // 🔧 FUNCIONES AUXILIARES
  // ==========================
  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  });

  const logError = (msg, err) => {
    console.error(`❌ ${msg}`, err);
  };

  // ==========================
  // 👥 GESTIÓN DE CLIENTES
  // ==========================
  const tablaClientesBody = document.querySelector("#tablaClientes tbody");

  async function cargarUsuarios() {
    try {
      const res = await fetch(`${API_BASE}/users?rol=cliente`, {
        headers: headers(),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      const usuarios = await res.json();
      console.log(`✅ Usuarios cargados: ${usuarios.length}`);

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
          </td>`;
        tablaClientesBody.appendChild(tr);
      });
    } catch (err) {
      logError("Error cargando usuarios:", err);
    }
  }

  // Manejo de botones de usuario
  tablaClientesBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    let endpoint = "";
    let method = "PUT";
    let mensaje = "";

    if (btn.classList.contains("aprobar")) {
      if (!confirm("¿Aprobar este cliente?")) return;
      endpoint = `${API_BASE}/users/${id}/approve`;
      mensaje = "✅ Usuario aprobado correctamente.";
    } else if (btn.classList.contains("desactivar")) {
      if (!confirm("¿Desactivar este cliente?")) return;
      endpoint = `${API_BASE}/users/${id}/deactivate`;
      mensaje = "⚠️ Usuario desactivado correctamente.";
    } else if (btn.classList.contains("eliminar")) {
      if (!confirm("¿Eliminar este usuario?")) return;
      endpoint = `${API_BASE}/users/${id}`;
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
      logError("Error en operación de usuario:", err);
    }
  });

  // ==========================
  // 🛒 GESTIÓN DE PRODUCTOS
  // ==========================
  const tablaProductosBody = document.querySelector("#tablaProductos tbody");
  const formProducto = document.getElementById("formProducto");
  const previewImagen = document.getElementById("previewImagen");

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
    try {
      const res = await fetch(`${API_BASE}/products`, { headers: headers() });
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      const productos = await res.json();
      console.log(`✅ Productos cargados: ${productos.length}`);

      tablaProductosBody.innerHTML = "";
      productos.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.nombre}</td>
          <td><img src="${p.imagen_url}" alt="${p.nombre}" class="img-thumbnail"
              style="width:60px;height:60px;object-fit:cover;"></td>
          <td>$${parseFloat(p.precio).toFixed(2)}</td>
          <td>${p.descripcion}</td>
          <td>
            <button class="btn btn-sm btn-warning edit-btn" data-id="${
              p.id_producto
            }">Editar</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${
              p.id_producto
            }">Eliminar</button>
          </td>`;
        tablaProductosBody.appendChild(tr);
      });
    } catch (err) {
      logError("Error cargando productos:", err);
    }
  }

  // ==========================
  // 🚀 EJECUCIÓN DIRECTA
  // ==========================
  await cargarUsuarios();
  await cargarProductos();

  console.log("✅ Panel listo.");
});
