// js/recibo.js
document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE = `${window.location.origin}/api`;
  const token = sessionStorage.getItem('authToken');
  const email = sessionStorage.getItem('userEmail');

  // 1) Recuperar lo que guardó pago.js
  const lastRaw = sessionStorage.getItem('lastOrder');
  console.log('[recibo] lastOrder raw:', lastRaw);
  const last = JSON.parse(lastRaw || 'null');

  if (!last || !last.orderId) {
    console.warn('[recibo] No hay lastOrder/orderId. Redirigiendo a carta…');
    window.location.href = './carta.html';
    return;
  }

  // --- refs DOM (todos existen en tu HTML)
  const $orderId   = document.getElementById('orderId');
  const $fecha     = document.getElementById('fecha');
  const $cliente   = document.getElementById('cliente');
  const $metodo    = document.getElementById('metodo');
  const $items     = document.getElementById('items');
  const $subtotal  = document.getElementById('subtotal');
  const $rowDesc   = document.getElementById('rowDesc');
  const $descuento = document.getElementById('descuento');
  const $total     = document.getElementById('total');
  const $tagDesc   = document.getElementById('tagDesc');

  const fmtCOP = v => '$' + Number(v || 0).toLocaleString('es-CO');

  function renderFromSession(o) {
    console.log('[recibo] Render (session)', o);

    // --- cabecera
    if ($orderId) $orderId.textContent = `#${o.orderId}`;
    if ($fecha)   $fecha.textContent   = new Date(o.fecha || Date.now()).toLocaleString('es-CO');
    if ($cliente) $cliente.textContent = o.usuario || email || '—';
    if ($metodo)  $metodo.textContent  = (o.tarjeta?.modo || 'TARJETA').toString().toUpperCase();

    // --- items
    if ($items) {
      $items.innerHTML = '';
      (o.items || []).forEach(it => {
        const qty   = Number(it.quantity ?? it.cantidad ?? 1);
        const price = Number(it.price ?? it.precio ?? 0);
        const sub   = qty * price;

        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `
          <span>${it.name ?? it.nombre ?? 'Producto'} x${qty}</span>
          <span>${fmtCOP(sub)}</span>
        `;
        $items.appendChild(row);
      });
    }

    // --- totales (tú ya los guardas listos)
    const subtotalCalc = Number(o.subtotalUI ?? 0);
    const totalCalc    = Number(o.totalUI ?? o.totalBackend ?? subtotalCalc);
    const descCalc     = Math.max(0, subtotalCalc - totalCalc);

    if ($subtotal) $subtotal.textContent = fmtCOP(subtotalCalc);

    if (descCalc > 0) {
      if ($descuento) $descuento.textContent = `- ${fmtCOP(descCalc)}`;
      if ($rowDesc)   $rowDesc.style.display = '';
      if ($tagDesc)   $tagDesc.style.display = 'inline-block';
    } else {
      if ($rowDesc)   $rowDesc.style.display = 'none';
      if ($tagDesc)   $tagDesc.style.display = 'none';
    }

    if ($total) $total.textContent = fmtCOP(totalCalc);
  }

  let rendered = false;

  // 2) Intentar sacar info del backend (por si quieres que el estado final venga de allá)
  if (token) {
    try {
      const url = `${API_BASE}/pedidos/${last.orderId}`;
      console.log('[recibo] Fetch:', url);
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      console.log('[recibo] Fetch status:', r.status);

      if (r.ok) {
        const pedido = await r.json();
        // aquí podrías mapear lo que venga del backend, pero como tu recibo ya está completo en sessionStorage
        // pintamos lo tuyo para que quede igual a lo que pagó el cliente
        renderFromSession(last);
        rendered = true;
      } else {
        console.warn('[recibo] Backend no OK:', r.status, await r.text());
      }
    } catch (e) {
      console.warn('[recibo] Error fetch backend:', e);
    }
  } else {
    console.warn('[recibo] No token, uso fallback.');
  }

  // 3) Fallback obligatorio
  if (!rendered) {
    renderFromSession(last);
  }
});
