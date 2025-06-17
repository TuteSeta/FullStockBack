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

module.exports = { calcularModeloLoteFijo };