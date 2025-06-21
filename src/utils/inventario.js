function calcularModeloLoteFijo(articulo, proveedor) {
  const D = articulo.demanda;
  const S = proveedor.cargoPedidoAP;
  const H = articulo.costoMantenimiento;
  const sigma = articulo.desviacionDemandaLArticulo;
  const z = articulo.nivelServicioDeseado;
  const L = proveedor.demoraEntregaAP;

  if (D <= 0 || S <= 0 || H <= 0 || L <= 0) {
    throw new Error('Datos insuficientes para calcular el modelo de lote fijo');
  }

  const loteOptimo = Math.sqrt((2 * D * S) / H);
  const d = D / 365;
  const sigmaL = sigma * Math.sqrt(L);
  const puntoPedido = d * L + z * sigmaL;
  const stockSeguridadLF = z * sigmaL;

  return {
    loteOptimo: Math.round(loteOptimo),
    puntoPedido: Math.round(puntoPedido),
    stockSeguridadLF: Math.round(stockSeguridadLF),
  };
}

function calcularModeloIntervaloFijo({
  demanda,                // d: Demanda diaria promedio pronosticada
  desviacionDemanda,      // σ: Desviación estándar de la demanda diaria
  nivelServicioDeseado,   // z: Número de desviaciones estándar para el nivel de servicio
  intervaloTiempo,        // T: Número de días entre revisiones
  demoraEntrega,          // L: Tiempo de entrega en días
  inventarioActual    // I: Nivel de inventario actual (incluye piezas pedidas)
}) {
  const T = intervaloTiempo;
  const L = demoraEntrega;
  const d = demanda;
  const sigma = desviacionDemanda;
  const z = nivelServicioDeseado;
  const I = inventarioActual;

  // Desviación estándar durante el periodo vulnerable (T + L)
  const sigmaTL = sigma * Math.sqrt(T + L);

  // Stock de seguridad
  const stockSeguridadIF = Math.round(z * sigmaTL);

  // Demanda promedio durante el periodo vulnerable
  const demandaPeriodoVulnerable = d * (T + L);

  // Cantidad a pedir (fórmula de la imagen)
  const cantidadPedido = Math.round(demandaPeriodoVulnerable + stockSeguridadIF - I);

  // Inventario máximo (opcional, si lo usás)
  const inventarioMaximo = Math.round(demandaPeriodoVulnerable + stockSeguridadIF);

  return { stockSeguridadIF, inventarioMaximo, cantidadPedido };
}

function calcularCGI({ demanda, costoUnidad, loteOptimo, costoPedido, costoMantenimiento }) {
  const D = demanda;
  const C = costoUnidad;
  const Q = loteOptimo;
  const S = costoPedido;
  const H = costoMantenimiento;

  if (D <= 0 || C <= 0 || Q <= 0 || S <= 0 || H <= 0) {
    throw new Error('Datos insuficientes para calcular el CGI');
  }

  const CT = D * C + (D / Q) * S + (Q / 2) * H;
  return Math.round(CT * 100) / 100; // Redondea a 2 decimales
}

module.exports = {
  calcularModeloLoteFijo,
  calcularModeloIntervaloFijo,
  calcularCGI,
};