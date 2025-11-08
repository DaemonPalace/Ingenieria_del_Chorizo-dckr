document.addEventListener("DOMContentLoaded", async () => {
  console.log("📜 Historial de Compras cargado");

  document.body.style.display = "none";
  const API_BASE = `/api`;

  // =======================
  // 🔐 Validar sesión
  // =======================
  const token = sessionStorage.getItem("authToken");
  const email = sessionStorage.getItem("userEmail");
  const role = (sessionStorage.getItem("userRole") || "").toLowerCase();
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");
  const now = Date.now();

  if (!token || !email || now > parseInt(expiresAt || 0, 10)) {
    alert("⚠️ Debes iniciar sesión para ver tu historial.");
    window.location.href = "./login.html";
    return;
  }

  if (role !== "cliente") {
    alert("⚠️ Solo los clientes pueden ver esta sección.");
    window.location.href = "./index.html";
    return;
  }

  document.body.classList.add("loaded");
  document.body.style.display = "block";

  // =======================
  // 🚪 Logout
  // =======================
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("¿Deseas cerrar la sesión actual?")) {
        sessionStorage.clear();
        window.location.href = "./login.html";
      }
    });
  }

  // =======================
  // 🧾 Cargar historial
  // =======================
  const tablaBody = document.querySelector("#tablaHistorial tbody");

  async function cargarHistorial() {
    try {
      const res = await fetch(`${API_BASE}/orders/user/${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());
      const pedidos = await res.json();

      if (!pedidos.length) {
        tablaBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No tienes compras registradas.</td></tr>`;
        return;
      }

      tablaBody.innerHTML = "";
      pedidos.forEach((p) => {
        const productos = (p.productos || p.detalles || [])
          .map((d) => `${d.nombre || d.producto} x${d.cantidad}`)
          .join("<br>");

        const estado = p.estado?.toLowerCase() || "pendiente";
        const badge =
          estado === "exitoso"
            ? "badge exitoso"
            : estado === "cancelado"
            ? "badge cancelado"
            : "badge pendiente";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.id_pedido}</td>
          <td>${new Date(p.fecha_pedido).toLocaleDateString()}</td>
          <td>${productos || "—"}</td>
          <td>$${parseFloat(p.total).toLocaleString("es-CO")}</td>
          <td><span class="${badge}">${estado}</span></td>
        `;
        tablaBody.appendChild(tr);
      });
    } catch (err) {
      console.error("❌ Error cargando historial:", err);
      tablaBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error al cargar el historial.</td></tr>`;
    }
  }

  await cargarHistorial();
});
