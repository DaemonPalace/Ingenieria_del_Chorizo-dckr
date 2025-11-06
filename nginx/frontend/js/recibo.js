// js/recibo.js
document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE = `${window.location.origin}/api`;
  const token = sessionStorage.getItem('authToken');
  const email = sessionStorage.getItem('userEmail');

  // 1) Recuperar la última orden del flujo de pago
  const last = JSON.parse(sessionStorage.getItem('lastOrder') || 'null');

  // Si no hay datos en sessionStorage, redirige a la carta
  if (!last) {
    window.location.href = './carta.html';
    return;
  }

  // Utilidad para COP
  const fmt = v => '$' + Number(v||0).toLocaleString('es-CO');

  // 2) Render básico con lo que viene del front (si quieres, abajo hay verificación opcional con backend)
  const $orderId = document.getElementById('orderId');
  const $fecha   = document.getElementById('fecha');
  const $cliente = document.getElementById('cliente');
  const $metodo  = document.getElementById('metodo');
  const $items   = document.getElementById('items');
  const $subtotal= document.getElementById('subtotal');
  const $rowDesc = document.getElementById('rowDesc');
  const $descuento = document.getElementById('descuento');
  const $total   = document.getElementById('total');
  const $tagDesc = document.getElementById('tagDesc');

  $orderId.textContent = last.orderId ? ('#' + last.orderId) : '—';
  $fecha.textContent   = new Date(last.fecha || Date.now()).toLocaleString('es-CO');
  $cliente.textContent = `${last.nombre || ''} ${last.apellido || ''}`.trim() || last.correo || email || '—';
  $metodo.textContent  = (last.metodo || 'tarjeta').toUpperCase();

  // Items del carrito
  (last.carrito || []).forEach(it => {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `<span>${it.name} x${it.quantity}</span><span>${fmt(it.price*it.quantity)}</span>`;
    $items.appendChild(row);
  });

  // Totales
  $subtotal.textContent = fmt(last.subtotal);
  if ((last.descuento || 0) > 0){
    $descuento.textContent = '- ' + fmt(last.descuento);
    $rowDesc.style.display = '';
    $tagDesc.style.display = 'inline-block';
  }
  $total.textContent = fmt(last.total);

  // 3) Botón imprimir
  document.getElementById('btnImprimir')?.addEventListener('click', () => window.print());
});
