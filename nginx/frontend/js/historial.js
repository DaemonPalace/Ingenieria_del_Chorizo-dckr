document.addEventListener("DOMContentLoaded", async () => {
  console.log("Historial de compras — init");
  // ==========================
  // Sesión
  // ==========================
  const API_BASE = `/api`;
  const token = sessionStorage.getItem("authToken");
  const role = (sessionStorage.getItem("userRole") || "").toLowerCase();
  const expiresAt = parseInt(sessionStorage.getItem("tokenExpiresAt") || "0", 10);
  const now = Date.now();

  if (!token || !role || !expiresAt || now > expiresAt) {
    sessionStorage.clear();
    window.location.replace("/login.html");
    return;
  }
  if (!["admin", "superadmin"].includes(role)) {
    sessionStorage.clear();
    window.location.replace("/index.html");
    return;
  }

  document.body.classList.add("loaded");

  // ==========================
  // Logout
  // ==========================
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("¿Deseas cerrar la sesión?")) {
        sessionStorage.clear();
        window.location.href = "/login.html";
      }
    });
  }

  // ==========================
  // Helpers
  // ==========================
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const $tbody = document.querySelector("#tablaHistorial tbody");

  const fmtCOP = (n) =>
    Number(n || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });

  const fmtFecha = (d) => (d ? new Date(d).toLocaleString("es-CO") : "—");

  /** -------------------------------------------------
   *  Renderiza una fila con la lista de productos
   *  -------------------------------------------------
   *  El backend ahora envía:
   *    - STRING_AGG → "Patacones Gratinados x1"
   *    - (opcional) JSON_AGG → [{nombre, cantidad}]
   *  ------------------------------------------------- */
  function render(items = []) {
    if (!items.length) {
      $tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No hay compras registradas.</td></tr>`;
      return;
    }

    $tbody.innerHTML = items
      .map((c) => {
        const id = c.id_pedido ?? c.id ?? "—";
        const correo = c.correo ?? "—";
        const nombre = c.nombre ?? "—";
        const total = fmtCOP(c.total);
        const fecha = fmtFecha(c.fecha);

        // ---------- Productos ----------
        let productosTexto = "—";

        if (c.productos) {
          if (typeof c.productos === "string") {
            // Caso 1: STRING_AGG → ya está listo
            productosTexto = c.productos;
          } else if (Array.isArray(c.productos)) {
            // Caso 2: JSON_AGG (por si el backend vuelve a cambiar)
            productosTexto = c.productos
              .map((p) => `${p.nombre} x${p.cantidad}`)
              .join("<br>");
          }
        }

        return `
          <tr>
            <td>${id}</td>
            <td>${correo}</td>
            <td>${nombre}</td>
            <td>${productosTexto}</td>   <!-- NUEVA COLUMNA -->
            <td class="text-end">${total}</td>
            <td>${fecha}</td>
          </tr>`;
      })
      .join("");
  }

  // ==========================
  // Carga de datos
  // ==========================
  async function cargar() {
    try {
      $tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">Cargando…</td></tr>`;

      const res = await fetch(`${API_BASE}/historial-compras`, { headers });

      if (res.status === 401) {
        sessionStorage.clear();
        window.location.replace("/login.html");
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      let data = await res.json();
      if (!Array.isArray(data)) data = [];

      // Ordenar por fecha descendente
      data.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

      render(data);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      $tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error al cargar el historial.</td></tr>`;
    }
  }

  await cargar();
});