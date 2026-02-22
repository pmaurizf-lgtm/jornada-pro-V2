// core/bank.js

/** Parsea "YYYY-MM-DD" como fecha local (evita desfase por UTC). */
function parseFechaLocal(isoStr) {
  const [y, m, d] = isoStr.split("-").map(Number);
  if (!y || m == null || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function calcularSaldoDia(registro) {
  if (!registro || registro.vacaciones) {
    return 0;
  }

  const generadas = registro.extraGeneradaMin || 0;
  const exceso = registro.excesoJornadaMin || 0;
  const negativas = registro.negativaMin || 0;
  const disfrutadas = registro.disfrutadasManualMin || 0;

  return generadas + exceso - negativas - disfrutadas;
}

export function calcularResumenPeriodo(registros, filtroFn) {
  let generadas = 0;
  let exceso = 0;
  let negativas = 0;
  let disfrutadas = 0;
  let saldo = 0;

  Object.entries(registros)
    .filter(([fecha]) => filtroFn(parseFechaLocal(fecha)))
    .forEach(([_, r]) => {
      if (r.vacaciones) return;

      const g = r.extraGeneradaMin || 0;
      const e = r.excesoJornadaMin || 0;
      const n = r.negativaMin || 0;
      const d = r.disfrutadasManualMin || 0;

      generadas += g;
      exceso += e;
      negativas += n;
      disfrutadas += d;
      saldo += g + e - n - d;
    });

  return {
    generadas,
    exceso,
    negativas,
    disfrutadas,
    saldo
  };
}

export function calcularResumenAnual(registros, año) {
  return calcularResumenPeriodo(
    registros,
    d => d.getFullYear() === año
  );
}

export function calcularResumenMensual(registros, mes, año) {
  return calcularResumenPeriodo(
    registros,
    d => d.getFullYear() === año && d.getMonth() === mes
  );
}

/** Resumen de todo el histórico (extra + exceso - negativas - disfrutadas). */
export function calcularResumenTotal(registros) {
  return calcularResumenPeriodo(registros, () => true);
}
