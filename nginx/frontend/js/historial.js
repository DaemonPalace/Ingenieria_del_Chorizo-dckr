document.addEventListener("DOMContentLoaded", async () => {
  console.log("📜 Historial de compras — init");

  // Config
  const API_BASE = `${window.location.origin}/api`;
  const token = sessionStorage.getItem("authToken");
  const role  = (sessionStorage.getItem("userRole") || "").toLowerCase();
  const expiresAt = sessionStorage.getItem("tokenExpiresAt");
  const now = Date.now();

  // Validación de sesión (simple)
  if (!token || !role || !expiresAt || now > parseInt(expiresAt, 10)) {
    sessionStorage.clear();
    window.location.replace("/login.html");
    return;
  }
  if (!["admin","superadmin"].includes(role)) {
    sessionStorage.clear();
    window.location.replace("/index.html");
    return;
  }

  // Mostrar UI
  document.body.classList.add("loaded");

  // Logout
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

  // Helpers
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const $tbody = document.querySelector("#tablaHistorial tbody");
  const $filtroTexto = document.getElementById("filtroTexto");
  const $filtroFecha = document.getElementById("filtroFecha");
  const $btnLimpiar   = document.getElementById("btnLimpiar");

  let DATA = [];

  const fmtCOP = (n) =>
    Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

  const fmtFecha = (d) => d ? new Date(d).toLocaleString("es-CO") : "—";

  const productosTxt = (arr=[]) =>
    arr.map(p => `${p.nombre} (x${p.cantidad})`).join(", ");

  function render(items){
    if (!items || !items.length) {
      $tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No hay compras registradas.</td></tr>`;
      return;
    }
    $tbody.innerHTML = items.map(c => `
      <tr>
        <td>${c.correo || "—"}</td>
        <td>${c.nombre || "—"}</td>
        <td>${c.telefono || "—"}</td>
        <td>${productosTxt(c.productos)}</td>
        <td class="text-end">${fmtCOP(c.total)}</td>
        <td>${fmtFecha(c.fecha)}</td>
      </tr>
    `).join("");
  }

  function aplicarFiltros(){
    const q = ($filtroTexto.value || "").toLowerCase().trim();
    const f = $filtroFecha.value || ""; // yyyy-mm-dd
    const out = DATA.filter(c => {
      const okText = !q ||
        (c.correo || "").toLowerCase().includes(q) ||
        (c.nombre || "").toLowerCase().includes(q);
      const okDate = !f || (c.fecha && new Date(c.fecha).toISOString().slice(0,10) === f);
      return okText && okDate;
    });
    render(out);
  }

  $filtroTexto.addEventListener("input", aplicarFiltros);
  $filtroFecha.addEventListener("change", aplicarFiltros);
  $btnLimpiar.addEventListener("click", () => {
    $filtroTexto.value = "";
    $filtroFecha.value = "";
    render(DATA);
  });

  // Carga de datos
  async function cargar(){
    try{
      const res = await fetch(`${API_BASE}/historial-compras`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      DATA = await res.json();
      // Orden descendente por fecha si viene
      DATA.sort((a,b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
      render(DATA);
    }catch(err){
      console.error("❌ Error al cargar historial:", err);
      $tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error al cargar el historial.</td></tr>`;
    }
  }

  await cargar();
});
