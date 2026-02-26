// ===============================
// IMPORTS CORE
// ===============================

import { loadState, saveState, exportBackup, importBackup } from "./core/storage.js";
import { createInitialState } from "./core/state.js";
import { calcularJornada, minutesToTime, timeToMinutes, extraEnBloques15, calcularTxTFinDeSemanaYFestivos } from "./core/calculations.js";
import { calcularResumenAnual, calcularResumenMensual, calcularResumenTotal } from "./core/bank.js";
import { obtenerFestivos } from "./core/holidays.js";
import { solicitarPermisoNotificaciones, notificarUnaVez } from "./core/notifications.js";
import {
  getTotalDiasDisponibles,
  getDiasDisponiblesAnio,
  descontarDiaVacacion,
  devolverDiaVacacion,
  ensureAnioActual
} from "./core/vacaciones.js";
import { getLDDisponiblesAnio, descontarDiaLD, devolverDiaLD } from "./core/ld.js";

// ===============================
// IMPORTS UI
// ===============================

import { aplicarTheme, inicializarSelectorTheme } from "./ui/theme.js";
import { renderGrafico } from "./ui/charts.js";

document.addEventListener("DOMContentLoaded", () => {

  let state = loadState();
  ensureAnioActual(state, new Date().getFullYear());
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  let bankYear = currentYear;

  // ===============================
  // NOTIFICACIONES (solo con la app abierta; sin servicios externos)
  // ===============================

  const EXTEND_PROMPT_KEY = "jornadaPro_extendPrompt";
  const GP_ELIGIDO_KEY = "jornadaPro_modalGPShown";

  function getHoyISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  setTimeout(() => {
    if (state.config.notificationsEnabled) solicitarPermisoNotificaciones();
  }, 1500);

  // ===============================
  // DOM
  // ===============================

  const fecha = document.getElementById("fecha");
  const entrada = document.getElementById("entrada");
  const salida = document.getElementById("salida");
  const minAntes = document.getElementById("minAntes");
  const disfrutadas = document.getElementById("disfrutadas");

  const salidaTeorica = document.getElementById("salidaTeorica");
  const salidaAjustada = document.getElementById("salidaAjustada");

  const barra = document.getElementById("barra");
  const progresoTxt = document.getElementById("progresoTxt");

  // 🔥 RESUMEN
  const resumenDia = document.getElementById("resumenDia");
  const rTrabajado = document.getElementById("rTrabajado");
  const rExtra = document.getElementById("rExtra");
  const rExceso = document.getElementById("rExceso");
  const resumenExcesoWrap = document.getElementById("resumenExcesoWrap");
  const rNegativa = document.getElementById("rNegativa");

  const calendarGrid = document.getElementById("calendarGrid");
  const mesAnioLabel = document.getElementById("mesAnioLabel");
  const prevMes = document.getElementById("prevMes");
  const nextMes = document.getElementById("nextMes");

  const selectBankYear = document.getElementById("selectBankYear");
  const bTotalDisponible = document.getElementById("bTotalDisponible");
  const bGeneradas = document.getElementById("bGeneradas");
  const bExceso = document.getElementById("bExceso");
  const bNegativas = document.getElementById("bNegativas");
  const bDisfrutadas = document.getElementById("bDisfrutadas");
  const bDisfruteHorasExtra = document.getElementById("bDisfruteHorasExtra");
  const bSaldoAnual = document.getElementById("bSaldoAnual");
  const bSaldo = document.getElementById("bSaldo");

  const bankTabHoras = document.getElementById("bankTabHoras");
  const bankTabVacaciones = document.getElementById("bankTabVacaciones");
  const bankPanelHoras = document.getElementById("bankPanelHoras");
  const bankPanelHorasTxT = document.getElementById("bankPanelHorasTxT");
  const bankPanelMinutosSemana = document.getElementById("bankPanelMinutosSemana");
  const bBancoMinutosSemana = document.getElementById("bBancoMinutosSemana");
  const bankPanelVacaciones = document.getElementById("bankPanelVacaciones");
  const configSaldoHorasExtraWrap = document.getElementById("configSaldoHorasExtraWrap");
  const configResetSaldoWrap = document.getElementById("configResetSaldoWrap");
  const wrapMinAntes = document.getElementById("wrapMinAntes");
  const wrapDisfrutadas = document.getElementById("wrapDisfrutadas");
  const resumenDiaHorasWrap = document.getElementById("resumenDiaHorasWrap");
  const resumenDiaMinutosWrap = document.getElementById("resumenDiaMinutosWrap");
  const rTrabajadoMin = document.getElementById("rTrabajadoMin");
  const rBancoMinutosSemana = document.getElementById("rBancoMinutosSemana");
  const rHoyDelta = document.getElementById("rHoyDelta");
  const chartCard = document.getElementById("chartCard");
  const bVacacionesTotal = document.getElementById("bVacacionesTotal");
  const bVacacionesAnioCursoLabel = document.getElementById("bVacacionesAnioCursoLabel");
  const bVacacionesAnioCurso = document.getElementById("bVacacionesAnioCurso");
  const bVacacionesAnioAnteriorLabel = document.getElementById("bVacacionesAnioAnteriorLabel");
  const bVacacionesAnioAnterior = document.getElementById("bVacacionesAnioAnterior");
  const leyendaCaducidadVacaciones = document.getElementById("leyendaCaducidadVacaciones");
  const labelVacacionesDiasPrevio = document.getElementById("labelVacacionesDiasPrevio");
  const bLDAnioCursoLabel = document.getElementById("bLDAnioCursoLabel");
  const bLDAnioCurso = document.getElementById("bLDAnioCurso");
  const modalLDAnio = document.getElementById("modalLDAnio");
  const modalLDAnioLabel = document.getElementById("modalLDAnioLabel");
  const inputLDAnio = document.getElementById("inputLDAnio");
  const modalLDAceptar = document.getElementById("modalLDAceptar");

  const btnEliminar = document.getElementById("eliminar");
  const btnGuardar = document.getElementById("guardar");
  const btnVacaciones = document.getElementById("vacaciones");
  const btnLD = document.getElementById("ld");
  const btnDisfruteHorasExtra = document.getElementById("disfruteHorasExtra");
  const btnIniciarJornada = document.getElementById("iniciarJornada");
  const btnExcel = document.getElementById("excel");
  const btnBackup = document.getElementById("backup");
  const btnRestore = document.getElementById("restore");

  const cfgNombreCompleto = document.getElementById("cfgNombreCompleto");
  const cfgNumeroSAP = document.getElementById("cfgNumeroSAP");
  const cfgCentroCoste = document.getElementById("cfgCentroCoste");
  const cfgGrupoProfesional = document.getElementById("cfgGrupoProfesional");
  const cfgJornada = document.getElementById("cfgJornada");
  const cfgAviso = document.getElementById("cfgAviso");
  const cfgTheme = document.getElementById("cfgTheme");
  const cfgNotificaciones = document.getElementById("cfgNotificaciones");
  const cfgTrabajoTurnos = document.getElementById("cfgTrabajoTurnos");
  const cfgTurno = document.getElementById("cfgTurno");
  const cfgHorasExtraPrevias = document.getElementById("cfgHorasExtraPrevias");
  const cfgExcesoJornadaPrevias = document.getElementById("cfgExcesoJornadaPrevias");
  const cfgVacacionesDiasPrevio = document.getElementById("cfgVacacionesDiasPrevio");
  const btnResetSaldoPrevio = document.getElementById("resetSaldoPrevio");
  const configTurnoWrap = document.getElementById("configTurnoWrap");
  const guardarConfig = document.getElementById("guardarConfig");
  const finalizarJornadaWrap = document.getElementById("finalizarJornadaWrap");
  const finalizarSliderTrack = document.getElementById("finalizarSliderTrack");
  const finalizarSliderThumb = document.getElementById("finalizarSliderThumb");
  const modalExtenderJornada = document.getElementById("modalExtenderJornada");
  const modalExtenderNo = document.getElementById("modalExtenderNo");
  const modalExtenderSi = document.getElementById("modalExtenderSi");
  const modalPaseSalida = document.getElementById("modalPaseSalida");
  const modalPaseJustificado = document.getElementById("modalPaseJustificado");
  const modalPaseSinJustificar = document.getElementById("modalPaseSinJustificar");
  const modalPaseFinJornada = document.getElementById("modalPaseFinJornada");
  const modalConfirmarEliminar = document.getElementById("modalConfirmarEliminar");
  const modalEliminarSi = document.getElementById("modalEliminarSi");
  const modalEliminarCancelar = document.getElementById("modalEliminarCancelar");
  const modalConfirmarFabrica = document.getElementById("modalConfirmarFabrica");
  const modalFabricaSi = document.getElementById("modalFabricaSi");
  const modalFabricaCancelar = document.getElementById("modalFabricaCancelar");
  const modalElegirGP = document.getElementById("modalElegirGP");
  const modalElegirGP1 = document.getElementById("modalElegirGP1");
  const modalElegirGP2 = document.getElementById("modalElegirGP2");
  const modalElegirGP3 = document.getElementById("modalElegirGP3");
  const modalElegirGP4 = document.getElementById("modalElegirGP4");
  const btnRestaurarFabrica = document.getElementById("restaurarFabrica");
  const configAuthorTapTarget = document.getElementById("configAuthorTapTarget");
  const configDevMenu = document.getElementById("configDevMenu");
  const btnResetDiaCurso = document.getElementById("btnResetDiaCurso");

  const chartCanvas = document.getElementById("chart");

// ===============================
// CONFIGURACIÓN
// ===============================

function aplicarEstadoConfigAUI() {
  if (cfgNombreCompleto) cfgNombreCompleto.value = state.config.nombreCompleto || "";
  if (cfgNumeroSAP) cfgNumeroSAP.value = state.config.numeroSAP || "";
  if (cfgCentroCoste) cfgCentroCoste.value = state.config.centroCoste || "";
  if (cfgGrupoProfesional) cfgGrupoProfesional.value = state.config.grupoProfesional || "GP1";
  if (cfgJornada) cfgJornada.value = state.config.jornadaMin;
  if (cfgAviso) cfgAviso.value = state.config.avisoMin;
  if (cfgTheme) cfgTheme.value = state.config.theme;
  if (cfgNotificaciones) cfgNotificaciones.checked = state.config.notificationsEnabled !== false;
  if (cfgTrabajoTurnos) cfgTrabajoTurnos.checked = state.config.trabajoATurnos === true;
  if (cfgTurno) cfgTurno.value = state.config.turno || "06-14";
  if (cfgHorasExtraPrevias) cfgHorasExtraPrevias.value = ((state.config.horasExtraInicialMin || 0) / 60).toFixed(2).replace(/\.?0+$/, "") || "0";
  if (cfgExcesoJornadaPrevias) cfgExcesoJornadaPrevias.value = ((state.config.excesoJornadaInicialMin || 0) / 60).toFixed(2).replace(/\.?0+$/, "") || "0";
  if (cfgVacacionesDiasPrevio) cfgVacacionesDiasPrevio.value = String(state.config.vacacionesDiasPrevio ?? 0);
  if (labelVacacionesDiasPrevio) labelVacacionesDiasPrevio.textContent = "Días de vacaciones previos (" + (new Date().getFullYear() - 1) + ")";
  if (configTurnoWrap) configTurnoWrap.hidden = !state.config.trabajoATurnos;
}

aplicarEstadoConfigAUI();

// Toggle visibilidad selector turno
if (cfgTrabajoTurnos && configTurnoWrap) {
  cfgTrabajoTurnos.addEventListener("change", () => {
    configTurnoWrap.hidden = !cfgTrabajoTurnos.checked;
  });
}

// Aplicar tema al iniciar
aplicarTheme(state.config.theme);

// Guardar configuración
if (guardarConfig) {
  guardarConfig.addEventListener("click", () => {

    state.config.nombreCompleto = (cfgNombreCompleto && cfgNombreCompleto.value) ? cfgNombreCompleto.value.trim() : "";
    let sap = (cfgNumeroSAP && cfgNumeroSAP.value) ? String(cfgNumeroSAP.value).replace(/\D/g, "").slice(0, 8) : "";
    if (sap.length > 0 && sap.length !== 8) {
      alert("El número SAP debe tener exactamente 8 cifras.");
      return;
    }
    state.config.numeroSAP = sap;

    state.config.centroCoste = (cfgCentroCoste && cfgCentroCoste.value) ? cfgCentroCoste.value.trim() : "";
    state.config.grupoProfesional = (cfgGrupoProfesional && cfgGrupoProfesional.value && ["GP1", "GP2", "GP3", "GP4"].includes(cfgGrupoProfesional.value)) ? cfgGrupoProfesional.value : "GP1";

    state.config.jornadaMin = Number(cfgJornada.value);
    state.config.avisoMin = Number(cfgAviso.value);
    state.config.theme = cfgTheme.value;
    state.config.notificationsEnabled = cfgNotificaciones ? cfgNotificaciones.checked : true;
    state.config.trabajoATurnos = cfgTrabajoTurnos ? cfgTrabajoTurnos.checked : false;
    state.config.turno = cfgTurno ? cfgTurno.value : "06-14";
    state.config.horasExtraInicialMin = Math.round((parseFloat(cfgHorasExtraPrevias?.value) || 0) * 60);
    state.config.excesoJornadaInicialMin = Math.round((parseFloat(cfgExcesoJornadaPrevias?.value) || 0) * 60);
    state.config.vacacionesDiasPrevio = Math.max(0, parseInt(cfgVacacionesDiasPrevio?.value, 10) || 0);
    if (state.vacacionesDiasPorAnio) {
      state.vacacionesDiasPorAnio = { ...state.vacacionesDiasPorAnio, "2025": state.config.vacacionesDiasPrevio };
    } else {
      state.vacacionesDiasPorAnio = { "2025": state.config.vacacionesDiasPrevio };
    }

    saveState(state);

    aplicarTheme(state.config.theme);
    aplicarModoGrupoProfesional();

    recalcularEnVivo();
    actualizarProgreso();
    actualizarBanco();
    actualizarGrafico();
    renderCalendario();
    actualizarResumenDia();
    actualizarEstadoIniciarJornada();
    closeConfigPanel();
  });
}

  if (btnResetSaldoPrevio) {
    btnResetSaldoPrevio.addEventListener("click", () => {
      state.config.horasExtraInicialMin = 0;
      state.config.excesoJornadaInicialMin = 0;
      saveState(state);
      if (cfgHorasExtraPrevias) cfgHorasExtraPrevias.value = "0";
      if (cfgExcesoJornadaPrevias) cfgExcesoJornadaPrevias.value = "0";
      actualizarBanco();
    });
  }

// Menú hamburguesa: abrir/cerrar panel de configuración
const btnMenuConfig = document.getElementById("btnMenuConfig");
const configPanel = document.getElementById("configPanel");
const configPanelBackdrop = document.getElementById("configPanelBackdrop");

function toggleConfigPanel() {
  if (configPanel) configPanel.classList.toggle("is-open", !configPanel.classList.contains("is-open"));
  if (configPanelBackdrop) configPanelBackdrop.setAttribute("aria-hidden", configPanel && configPanel.classList.contains("is-open") ? "false" : "true");
}

function closeConfigPanel() {
  if (configPanel) configPanel.classList.remove("is-open");
  if (configPanelBackdrop) configPanelBackdrop.setAttribute("aria-hidden", "true");
}

if (btnMenuConfig) btnMenuConfig.addEventListener("click", toggleConfigPanel);
if (configPanelBackdrop) configPanelBackdrop.addEventListener("click", closeConfigPanel);

const btnCerrarConfig = document.getElementById("btnCerrarConfig");
if (btnCerrarConfig) btnCerrarConfig.addEventListener("click", closeConfigPanel);

const btnAbrirGuia = document.getElementById("btnAbrirGuia");
if (btnAbrirGuia) btnAbrirGuia.addEventListener("click", function () {
  window.open("./docs/GUIA-JORNADA-PRO.html", "_blank", "noopener,noreferrer");
});
  
  // ===============================
  // RESUMEN DEL DÍA
  // ===============================

  /** Formato para resumen: horas y minutos + decimal, separados para fácil lectura. Devuelve HTML con span para la parte decimal. */
  function formatoResumenTiempo(min) {
    const m = Math.abs(min);
    const h = Math.floor(m / 60);
    const minResto = Math.round(m % 60);
    const decimal = (m / 60).toFixed(2).replace(".", ",") + "h";
    if (h === 0 && minResto === 0) return "0h 00m <span class=\"resumen-decimal\">· 0,00h</span>";
    const hm = h + "h " + String(minResto).padStart(2, "0") + "m";
    return hm + " <span class=\"resumen-decimal\">· " + decimal + "</span>";
  }

  function actualizarResumenDia() {

    if (!resumenDia) return;

    const registro = state.registros[fecha.value];

    if (!fecha.value || !registro) {
      resumenDia.style.display = "none";
      return;
    }

    resumenDia.style.display = "grid";

    if (esModoMinutosSemanal()) {
      if (resumenDiaHorasWrap) resumenDiaHorasWrap.style.display = "none";
      if (resumenDiaMinutosWrap) resumenDiaMinutosWrap.hidden = false;
      if (rTrabajadoMin) rTrabajadoMin.innerHTML = formatoResumenTiempo(registro.trabajadosMin || 0);
      var bancoSem = calcularBancoMinutosSemana(fecha.value);
      if (rBancoMinutosSemana) {
        rBancoMinutosSemana.innerText = (bancoSem >= 0 ? "+" : "") + minutosAHorasMinutos(bancoSem);
        rBancoMinutosSemana.style.color = bancoSem >= 0 ? "var(--positive)" : "var(--negative)";
      }
      var delta = (registro.extraGeneradaMin || 0) - (registro.negativaMin || 0);
      if (rHoyDelta) {
        rHoyDelta.innerText = delta === 0 ? "0m" : (delta > 0 ? "+" : "") + delta + "m";
        rHoyDelta.style.color = delta >= 0 ? "var(--positive)" : "var(--negative)";
      }
      return;
    }

    if (resumenDiaMinutosWrap) resumenDiaMinutosWrap.hidden = true;
    if (resumenDiaHorasWrap) resumenDiaHorasWrap.style.display = "";
    if (!rTrabajado || !rExtra || !rNegativa) return;

    rTrabajado.innerHTML = formatoResumenTiempo(registro.trabajadosMin);

    rExtra.innerHTML = formatoResumenTiempo(registro.extraGeneradaMin || 0);
    rExtra.classList.toggle("positive", (registro.extraGeneradaMin || 0) > 0);
    rExtra.classList.remove("negative");

    const excesoMin = registro.excesoJornadaMin || 0;
    if (rExceso) rExceso.innerHTML = formatoResumenTiempo(excesoMin);
    if (resumenExcesoWrap) resumenExcesoWrap.style.display = excesoMin > 0 ? "" : "none";

    rNegativa.innerHTML = formatoResumenTiempo(registro.negativaMin || 0);
    rNegativa.classList.toggle("negative", (registro.negativaMin || 0) > 0);
    rNegativa.classList.remove("positive");
  }

  // ===============================
  // BANCO
  // ===============================

  function minutosAHorasMinutos(totalMin) {
    const h = Math.floor(Math.abs(totalMin) / 60);
    const m = Math.round(Math.abs(totalMin) % 60);
    const sign = totalMin < 0 ? "−" : "";
    if (h === 0) return sign + m + "m";
    if (m === 0) return sign + h + "h";
    return sign + h + "h " + m + "m";
  }

  function esModoMinutosSemanal() {
    const gp = state.config.grupoProfesional || "";
    return gp === "GP1" || gp === "GP2";
  }

  /** Aplica reglas TxT fin de semana/festivo (solo GP3/GP4). Si el día es sábado, domingo o festivo, sustituye extra/exceso por el TxT calculado. */
  function aplicarTxTSiFinDeSemanaOFestivo(registro, fechaISO) {
    if (esModoMinutosSemanal()) return registro;
    const festivos = obtenerFestivos(fechaISO.slice(0, 4));
    const esFestivo = !!(festivos && festivos[fechaISO]);
    const [y, mo, d] = fechaISO.split("-").map(Number);
    const dow = new Date(y, mo - 1, d).getDay();
    if (dow !== 0 && dow !== 6 && !esFestivo) return registro;
    const entrada = registro.entrada;
    const salidaReal = registro.salidaReal;
    const trabajadosMin = registro.trabajadosMin || 0;
    if (!entrada || !salidaReal || trabajadosMin <= 0) return registro;
    const txTMin = calcularTxTFinDeSemanaYFestivos(fechaISO, entrada, salidaReal, trabajadosMin, esFestivo);
    if (txTMin == null) return registro;
    return { ...registro, extraGeneradaMin: txTMin, excesoJornadaMin: 0 };
  }

  /** Para GP1/GP2: lunes (1) a domingo (7). Devuelve [lunesISO, domingoISO] de la semana que contiene fechaISO. */
  function getLunesDomingoSemana(fechaISO) {
    const [y, m, d] = fechaISO.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diffLunes = day === 0 ? -6 : 1 - day;
    const lunes = new Date(date);
    lunes.setDate(date.getDate() + diffLunes);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    const toISO = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    return [toISO(lunes), toISO(domingo)];
  }

  /** Banco de minutos de la semana (lunes a domingo) que contiene fechaISO. Solo días con jornada (extra - negativa). */
  function calcularBancoMinutosSemana(fechaISO) {
    const [lunesStr, domingoStr] = getLunesDomingoSemana(fechaISO);
    let total = 0;
    const regs = state.registros || {};
    const [ly, lm, ld] = lunesStr.split("-").map(Number);
    const [dy, dm, dd] = domingoStr.split("-").map(Number);
    const start = new Date(ly, lm - 1, ld);
    const end = new Date(dy, dm - 1, dd);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const r = regs[iso];
      if (!r || r.vacaciones || r.libreDisposicion || r.disfruteHorasExtra) continue;
      total += (r.extraGeneradaMin || 0) - (r.negativaMin || 0);
    }
    return total;
  }

  const mainGrid = document.getElementById("mainGrid");

  function aplicarModoGrupoProfesional() {
    const modoMin = esModoMinutosSemanal();
    if (bankPanelMinutosSemana) bankPanelMinutosSemana.hidden = !modoMin;
    if (bankPanelHorasTxT) bankPanelHorasTxT.style.display = modoMin ? "none" : "";
    if (configSaldoHorasExtraWrap) configSaldoHorasExtraWrap.style.display = modoMin ? "none" : "";
    if (configResetSaldoWrap) configResetSaldoWrap.style.display = modoMin ? "none" : "";
    if (wrapMinAntes) wrapMinAntes.style.display = modoMin ? "none" : "";
    if (wrapDisfrutadas) wrapDisfrutadas.style.display = modoMin ? "none" : "";
    if (btnDisfruteHorasExtra) btnDisfruteHorasExtra.style.display = modoMin ? "none" : "";
    if (chartCard) chartCard.style.display = modoMin ? "none" : "";
    if (mainGrid) mainGrid.classList.toggle("main-grid--full", modoMin);
    if (bankTabHoras) bankTabHoras.textContent = modoMin ? "Tiempo Exceso Jornada" : "Horas TxT";
    if (modoMin && minAntes) minAntes.value = "0";
    if (modoMin && disfrutadas) disfrutadas.value = "0";
  }

  function obtenerAniosBanco() {
    const anios = new Set();
    Object.keys(state.registros || {}).forEach((f) => {
      const y = parseInt(f.slice(0, 4), 10);
      if (!Number.isNaN(y)) anios.add(y);
    });
    anios.add(currentYear);
    return Array.from(anios).sort((a, b) => a - b);
  }

  function actualizarBanco() {
    aplicarModoGrupoProfesional();
    if (esModoMinutosSemanal()) {
      const hoy = getHoyISO();
      const bancoMin = calcularBancoMinutosSemana(hoy);
      if (bBancoMinutosSemana) {
        bBancoMinutosSemana.innerText = (bancoMin >= 0 ? "" : "\u2212") + minutosAHorasMinutos(bancoMin >= 0 ? bancoMin : -bancoMin);
        bBancoMinutosSemana.style.color = bancoMin >= 0 ? "var(--positive)" : "var(--negative)";
      }
      actualizarBancoVacaciones();
      return;
    }
    const anios = obtenerAniosBanco();
    if (selectBankYear) {
      const value = selectBankYear.value;
      const options = anios.map((y) => `<option value="${y}"${y === bankYear ? " selected" : ""}>${y}</option>`).join("");
      selectBankYear.innerHTML = options;
      bankYear = parseInt(selectBankYear.value, 10) || currentYear;
    }

    const total = calcularResumenTotal(state.registros);
    const deducciones = state.deduccionesPorAusencia || {};
    const deduccionTotalMin = Object.values(deducciones).reduce((a, b) => a + b, 0);
    const deduccionAnualMin = Object.entries(deducciones).filter(([f]) => f.startsWith(String(bankYear))).reduce((s, [, m]) => s + m, 0);
    const mesStr = String(currentMonth + 1).padStart(2, "0");
    const deduccionMensualMin = Object.entries(deducciones).filter(([f]) => f.startsWith(String(bankYear) + "-" + mesStr)).reduce((s, [, m]) => s + m, 0);

    const inicialExtra = state.config.horasExtraInicialMin || 0;
    const inicialExceso = state.config.excesoJornadaInicialMin || 0;
    const saldoTotalConInicial = total.saldo + inicialExtra + inicialExceso - deduccionTotalMin;
    const anual = calcularResumenAnual(state.registros, bankYear);
    anual.saldo -= deduccionAnualMin;
    const mensual = calcularResumenMensual(state.registros, currentMonth, bankYear);
    mensual.saldo -= deduccionMensualMin;

    if (bTotalDisponible) {
      bTotalDisponible.innerText = minutosAHorasMinutos(saldoTotalConInicial);
      bTotalDisponible.style.color = saldoTotalConInicial >= 0 ? "var(--positive)" : "var(--negative)";
    }
    if (bGeneradas) bGeneradas.innerText = minutosAHorasMinutos(anual.generadas);
    if (bExceso) bExceso.innerText = minutosAHorasMinutos(anual.exceso || 0);
    if (bNegativas) bNegativas.innerText = minutosAHorasMinutos(anual.negativas);
    if (bDisfrutadas) bDisfrutadas.innerText = minutosAHorasMinutos(anual.disfrutadas);
    if (bDisfruteHorasExtra) {
      const dhe = anual.disfruteHorasExtraMin ?? 0;
      bDisfruteHorasExtra.innerText = dhe === 0 ? "0h" : "\u2212" + minutosAHorasMinutos(dhe);
      bDisfruteHorasExtra.style.color = dhe > 0 ? "var(--negative)" : "";
    }
    if (bSaldoAnual) {
      bSaldoAnual.innerText = minutosAHorasMinutos(anual.saldo);
      bSaldoAnual.style.color = anual.saldo >= 0 ? "var(--positive)" : "var(--negative)";
    }
    if (bSaldo) {
      bSaldo.innerText = minutosAHorasMinutos(mensual.saldo);
      bSaldo.style.color = mensual.saldo >= 0 ? "var(--positive)" : "var(--negative)";
    }

    actualizarBancoVacaciones();
  }

  function actualizarBancoVacaciones() {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const anioAnterior = anioActual - 1;
    const total = getTotalDiasDisponibles(state, hoy);
    if (bVacacionesTotal) {
      bVacacionesTotal.innerText = total + " días";
      bVacacionesTotal.style.color = total >= 0 ? "var(--positive)" : "var(--negative)";
    }
    if (bVacacionesAnioCursoLabel) bVacacionesAnioCursoLabel.innerText = anioActual;
    if (bVacacionesAnioCurso) {
      const cur = getDiasDisponiblesAnio(state, anioActual, hoy);
      bVacacionesAnioCurso.innerText = cur + " días";
    }
    if (bVacacionesAnioAnteriorLabel) bVacacionesAnioAnteriorLabel.innerText = anioAnterior;
    if (bVacacionesAnioAnterior) {
      const d = getDiasDisponiblesAnio(state, anioAnterior, hoy);
      bVacacionesAnioAnterior.innerText = d + " días";
    }
    if (leyendaCaducidadVacaciones) {
      leyendaCaducidadVacaciones.textContent = "Las vacaciones anuales podrán disfrutarse como máximo hasta el 30 de septiembre del año siguiente.";
    }
    try {
      if (bLDAnioCursoLabel) bLDAnioCursoLabel.innerText = anioActual;
      if (bLDAnioCurso) {
        const ldCur = getLDDisponiblesAnio(state, anioActual, hoy);
        bLDAnioCurso.innerText = ldCur + " días";
      }
    } catch (e) {
      console.warn("Actualizar panel LD:", e);
    }
  }

  if (selectBankYear) {
    selectBankYear.addEventListener("change", () => {
      bankYear = parseInt(selectBankYear.value, 10) || currentYear;
      actualizarBanco();
      actualizarGrafico();
    });
  }

  if (bankTabHoras) {
    bankTabHoras.addEventListener("click", () => {
      if (bankPanelHoras) bankPanelHoras.classList.add("bank-panel--active");
      if (bankPanelVacaciones) bankPanelVacaciones.classList.remove("bank-panel--active");
      if (bankTabHoras) bankTabHoras.classList.add("bank-tab--active");
      if (bankTabVacaciones) bankTabVacaciones.classList.remove("bank-tab--active");
    });
  }
  if (bankTabVacaciones) {
    bankTabVacaciones.addEventListener("click", () => {
      if (bankPanelVacaciones) bankPanelVacaciones.classList.add("bank-panel--active");
      if (bankPanelHoras) bankPanelHoras.classList.remove("bank-panel--active");
      if (bankTabVacaciones) bankTabVacaciones.classList.add("bank-tab--active");
      if (bankTabHoras) bankTabHoras.classList.remove("bank-tab--active");
    });
  }

  function actualizarGrafico() {
    if (!chartCanvas || esModoMinutosSemanal()) return;
    const anual = calcularResumenAnual(state.registros, bankYear);
    renderGrafico(chartCanvas, anual);
  }

// ===============================
// RECÁLCULO EN VIVO
// ===============================

function recalcularEnVivo() {

  if (!entrada || !entrada.value) {
    if (salidaTeorica) salidaTeorica.innerText = "--:--";
    if (salidaAjustada) salidaAjustada.innerText = "--:--";
    return;
  }

  try {

    const resultado = calcularJornada({
      entrada: entrada.value,
      salidaReal: salida.value || null,
      jornadaMin: state.config.jornadaMin,
      minAntes: Number(minAntes.value) || 0,
      trabajoATurnos: state.config.trabajoATurnos === true
    });

    if (salidaTeorica) salidaTeorica.innerText = minutesToTime(resultado.salidaTeoricaMin);
    if (salidaAjustada) salidaAjustada.innerText = minutesToTime(resultado.salidaAjustadaMin);

  } catch {
    if (salidaTeorica) salidaTeorica.innerText = "--:--";
    if (salidaAjustada) salidaAjustada.innerText = "--:--";
  }
}

function actualizarProgreso() {

  const progresoInside = document.getElementById("progresoInside");
  const hoy = getHoyISO();

  // Jornada ya finalizada (registro con salida): barra a 0 y no contar
  if (fecha && state.registros[fecha.value] && state.registros[fecha.value].salidaReal != null) {
    if (barra) barra.style.width = "0%";
    if (progresoInside) progresoInside.innerText = "";
    if (barra) barra.classList.remove("progress-complete");
    return;
  }

  // Modo extensión: contador de horas extra desde extensionJornada.desdeTime (bloques de 15 min) — solo GP3/GP4
  if (!esModoMinutosSemanal() && state.extensionJornada && state.extensionJornada.fecha === hoy && state.extensionJornada.desdeTime) {
    const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    const desdeMin = timeToMinutes(state.extensionJornada.desdeTime);
    let extraMin = ahoraMin - desdeMin;
    if (extraMin < 0) extraMin += 24 * 60;
    extraMin = extraEnBloques15(extraMin);
    if (barra) barra.style.width = "0%";
    if (progresoInside) {
      const h = Math.floor(extraMin / 60);
      const m = extraMin % 60;
      progresoInside.innerText = "+" + h + "h " + String(m).padStart(2, "0") + "m extra";
      progresoInside.classList.add("light-text");
    }
    if (barra) barra.classList.remove("progress-complete");
    return;
  }

  if (!entrada || !entrada.value) {
    if (barra) barra.style.width = "0%";
    if (progresoInside) progresoInside.innerText = "";
    return;
  }

  const ahora = new Date();
  let ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  const entradaMin = timeToMinutes(entrada.value);

  if (ahoraMin < entradaMin) {
    ahoraMin += 24 * 60;
  }

  const trabajado = ahoraMin - entradaMin;
  const jornadaRef = state.config.trabajoATurnos ? 8 * 60 : state.config.jornadaMin;

  // Fin teórico alcanzado: barra a 0; GP3/GP4 muestran horas extra, GP1/GP2 solo "Completado"
  if (trabajado >= jornadaRef) {
    if (barra) barra.style.width = "0%";
    if (progresoInside) {
      if (esModoMinutosSemanal()) {
        progresoInside.innerText = "Completado";
      } else {
        const extraMin = extraEnBloques15(trabajado - jornadaRef);
        const horas = Math.floor(extraMin / 60);
        const minutos = extraMin % 60;
        progresoInside.innerText = "+" + horas + "h " + String(minutos).padStart(2, "0") + "m extra";
      }
      progresoInside.classList.add("light-text");
    }
    if (barra) barra.classList.remove("progress-complete");
    return;
  }

  const porcentaje = Math.min((trabajado / jornadaRef) * 100, 100);

  if (barra) barra.style.width = porcentaje + "%";

  const horas = Math.floor(trabajado / 60);
  const minutos = trabajado % 60;

  const texto =
    horas + "h " +
    String(minutos).padStart(2, "0") + "m • " +
    Math.round(porcentaje) + "%";

  if (progresoInside) {
    progresoInside.innerText = texto;
    if (porcentaje > 35) {
      progresoInside.classList.add("light-text");
    } else {
      progresoInside.classList.remove("light-text");
    }
  }

  const hue = Math.max(0, 120 - (porcentaje * 1.2));

  if (barra) {
    barra.style.background =
      "linear-gradient(90deg, hsl(" + hue + ",75%,45%), hsl(" + (hue - 15) + ",85%,55%))";
    if (porcentaje >= 100) {
      barra.classList.add("progress-complete");
    } else {
      barra.classList.remove("progress-complete");
    }
  }
}

// ===============================
// NOTIFICACIONES (aviso previo + fin de jornada)
// ===============================

function controlarNotificaciones() {

  if (!state.config.notificationsEnabled) return;

  const ahora = new Date();
  const fechaHoy =
    `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,"0")}-${String(ahora.getDate()).padStart(2,"0")}`;

  // Usar hora de entrada de hoy: del formulario si está en hoy, o del registro guardado
  let entradaHoy = null;
  if (fecha.value === fechaHoy && entrada.value) {
    entradaHoy = entrada.value;
  } else {
    const regHoy = state.registros[fechaHoy];
    if (regHoy && !regHoy.vacaciones && regHoy.entrada) entradaHoy = regHoy.entrada;
  }
  if (!entradaHoy) return;

  let ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  const entradaMin = timeToMinutes(entradaHoy);
  if (ahoraMin < entradaMin) ahoraMin += 24 * 60;

  const jornadaRefNotif = state.config.trabajoATurnos ? 8 * 60 : state.config.jornadaMin;
  const salidaTeoricaMin = entradaMin + jornadaRefNotif;
  const avisoMin = Math.max(0, state.config.avisoMin || 0);

  // Aviso previo: "Quedan X minutos para finalizar tu jornada"
  if (
    ahoraMin >= salidaTeoricaMin - avisoMin &&
    ahoraMin < salidaTeoricaMin &&
    !localStorage.getItem(`notif_${fechaHoy}_previo`)
  ) {
    notificarUnaVez(
      fechaHoy,
      "previo",
      `Quedan ${avisoMin} minutos para finalizar tu jornada`
    );
  }

  // Aviso final: "Has finalizado tu jornada" (no mostrar si sigue en curso y podría extender)
  const enVivoSinSalida = fecha.value === fechaHoy && entrada && entrada.value && !(state.registros[fechaHoy] && state.registros[fechaHoy].salidaReal);
  if (
    ahoraMin >= salidaTeoricaMin &&
    !enVivoSinSalida &&
    !localStorage.getItem(`notif_${fechaHoy}_final`)
  ) {
    notificarUnaVez(
      fechaHoy,
      "final",
      "Has finalizado tu jornada"
    );
  }
}

  function comprobarPaseJustificadoAutoFinalizar() {
    const p = state.paseJustificadoHasta;
    if (!p || !p.fecha || !p.hastaTime) return;
    const hoy = getHoyISO();
    const endDate = p.endDate || p.fecha;
    const pasada = hoy > endDate || (hoy === endDate && ahoraHoraISO() >= p.hastaTime);
    if (!pasada) return;
    ejecutarFinalizarJornada(true);
    state.paseJustificadoHasta = null;
    saveState(state);
  }

  function limpiarEarlyExitStateSiPasado() {
    const e = state.earlyExitState;
    if (!e) return;
    if (!pasadoFinTeorico(e)) return;
    state.earlyExitState = null;
    saveState(state);
    actualizarEstadoIniciarJornada();
  }

  function limpiarExtensionSiCambioDia() {
    const ext = state.extensionJornada;
    if (!ext) return;
    if (ext.fecha === getHoyISO()) return;
    state.extensionJornada = null;
    saveState(state);
    actualizarEstadoIniciarJornada();
    actualizarProgreso();
  }

  function comprobarExtenderJornada() {
    if (esModoMinutosSemanal()) return;
    if (!fecha || !entrada || !fecha.value || !entrada.value) return;
    const hoy = getHoyISO();
    if (fecha.value !== hoy) return;
    if (state.registros[hoy] && state.registros[hoy].salidaReal != null) return;
    if (state.paseJustificadoHasta && state.paseJustificadoHasta.fecha === hoy) return;
    const jornadaRef = state.config.trabajoATurnos ? 8 * 60 : state.config.jornadaMin;
    const ahora = new Date();
    let ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    const entradaMin = timeToMinutes(entrada.value);
    if (ahoraMin < entradaMin) ahoraMin += 24 * 60;
    const trabajado = ahoraMin - entradaMin;
    if (trabajado < jornadaRef) return;
    if (localStorage.getItem(EXTEND_PROMPT_KEY + "_" + hoy)) return;
    localStorage.setItem(EXTEND_PROMPT_KEY + "_" + hoy, "1");
    if (modalExtenderJornada) {
      modalExtenderJornada.hidden = false;
    }
  }

  function cerrarModalExtender() {
    if (modalExtenderJornada) modalExtenderJornada.hidden = true;
  }

  if (modalExtenderNo) {
    modalExtenderNo.addEventListener("click", () => {
      cerrarModalExtender();
      ejecutarFinalizarJornada(true);
    });
  }
  if (modalExtenderSi) {
    modalExtenderSi.addEventListener("click", cerrarModalExtender);
  }
  if (modalExtenderJornada) {
    const backdrop = modalExtenderJornada.querySelector(".modal-extender-backdrop");
    if (backdrop) backdrop.addEventListener("click", cerrarModalExtender);
  }

  function nextDayISO(iso) {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function pasadoFinTeorico(early) {
    if (!early || !early.endDate) return true;
    const hoy = getHoyISO();
    return hoy > early.endDate || (hoy === early.endDate && ahoraHoraISO() >= early.hastaTime);
  }

  if (modalPaseJustificado) {
    modalPaseJustificado.addEventListener("click", () => {
      const hoy = hoyISO();
      const fin = calcularFinTeorico();
      state.paseJustificadoHasta = {
        fecha: hoy,
        hastaTime: fin.time,
        endDate: fin.nextDay ? nextDayISO(hoy) : hoy
      };
      if (salida) salida.value = "";
      saveState(state);
      cerrarModalPaseSalida();
      actualizarEstadoIniciarJornada();
      actualizarProgreso();
      actualizarResumenDia();
    });
  }
  if (modalPaseSinJustificar) {
    modalPaseSinJustificar.addEventListener("click", () => {
      const salidaVal = (pendingPaseSalida && pendingPaseSalida.salidaValue) || ahoraHoraISO();
      if (salida) salida.value = salidaVal;
      const fechaClave = fecha && fecha.value ? fecha.value : hoyISO();
      ejecutarFinalizarJornada();
      if (state.registros[fechaClave]) state.registros[fechaClave].paseSinJustificado = true;
      const fin = calcularFinTeorico();
      const hoy = hoyISO();
      state.earlyExitState = {
        fecha: hoy,
        salidaAt: salidaVal,
        entrada: entrada.value,
        hastaTime: fin.time,
        endDate: fin.nextDay ? nextDayISO(hoy) : hoy
      };
      saveState(state);
      renderCalendario();
      actualizarBanco();
      actualizarGrafico();
      cerrarModalPaseSalida();
      actualizarEstadoIniciarJornada();
    });
  }
  if (modalPaseFinJornada) {
    modalPaseFinJornada.addEventListener("click", () => {
      const salidaVal = (pendingPaseSalida && pendingPaseSalida.salidaValue) || ahoraHoraISO();
      if (salida) salida.value = salidaVal;
      const fechaClave = fecha && fecha.value ? fecha.value : hoyISO();
      ejecutarFinalizarJornada();
      saveState(state);
      renderCalendario();
      actualizarBanco();
      actualizarGrafico();
      cerrarModalPaseSalida();
      actualizarEstadoIniciarJornada();
      actualizarResumenDia();
    });
  }
  if (modalPaseSalida) {
    const backdropPase = modalPaseSalida.querySelector(".modal-extender-backdrop");
    if (backdropPase) backdropPase.addEventListener("click", cerrarModalPaseSalida);
  }

  setInterval(() => {
    actualizarProgreso();
    controlarNotificaciones();
    comprobarExtenderJornada();
    comprobarPaseJustificadoAutoFinalizar();
    limpiarEarlyExitStateSiPasado();
    limpiarExtensionSiCambioDia();
  }, 1000);

  if (entrada) entrada.addEventListener("input", () => {
    recalcularEnVivo();
    actualizarProgreso();
    if (fecha && fecha.value === getHoyISO() && entrada.value) guardarBorradorSesion();
    actualizarEstadoIniciarJornada();
  });
  if (salida) salida.addEventListener("input", recalcularEnVivo);
  if (minAntes) minAntes.addEventListener("input", recalcularEnVivo);
  if (fecha) fecha.addEventListener("change", () => {
    if (fecha.value === getHoyISO() && entrada && entrada.value) guardarBorradorSesion();
    else if (fecha.value !== getHoyISO()) limpiarBorradorSesion();
    actualizarEstadoIniciarJornada();
  });

  // ===============================
  // INICIAR / FINALIZAR JORNADA
  // ===============================

  function ahoraHoraISO() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function jornadaRefMin() {
    return state.config.trabajoATurnos ? 8 * 60 : state.config.jornadaMin;
  }

  /** True si con la salida indicada los minutos trabajados son menores que la jornada de referencia (salida anticipada). */
  function esSalidaAnticipada(salidaTime) {
    if (!entrada || !entrada.value) return false;
    const entMin = timeToMinutes(entrada.value);
    let salMin = timeToMinutes(salidaTime || "");
    if (!salidaTime || salMin === 0) return false;
    if (salMin < entMin) salMin += 24 * 60;
    const trabajados = salMin - entMin;
    return trabajados < jornadaRefMin();
  }

  /** Hora teórica de fin (HH:MM) y si es al día siguiente (turno noche). */
  function calcularFinTeorico() {
    if (!entrada || !entrada.value) return { time: "00:00", nextDay: false };
    const entMin = timeToMinutes(entrada.value);
    const total = entMin + jornadaRefMin();
    const nextDay = total >= 24 * 60;
    const minEnDia = total % (24 * 60);
    const h = Math.floor(minEnDia / 60);
    const m = minEnDia % 60;
    return { time: String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"), nextDay };
  }

  let pendingPaseSalida = null;

  function abrirModalPaseSalida(salidaValue) {
    if (!modalPaseSalida) return;
    pendingPaseSalida = { salidaValue: salidaValue || ahoraHoraISO() };
    if (modalPaseFinJornada) modalPaseFinJornada.hidden = !esModoMinutosSemanal();
    modalPaseSalida.hidden = false;
  }

  function cerrarModalPaseSalida() {
    if (modalPaseSalida) modalPaseSalida.hidden = true;
    pendingPaseSalida = null;
  }

  function hoyISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const SESSION_DRAFT_KEY = "jornadaPro_sessionDraft";

  function guardarBorradorSesion() {
    const hoy = hoyISO();
    const ent = entrada && entrada.value ? entrada.value : null;
    if (hoy && ent) {
      try {
        localStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify({ fecha: hoy, entrada: ent }));
      } catch (e) {}
    }
  }

  function limpiarBorradorSesion() {
    try {
      localStorage.removeItem(SESSION_DRAFT_KEY);
    } catch (e) {}
  }

  /** Para pruebas: deja el día en curso como si no se hubiera iniciado ni interactuado. */
  function resetearDiaEnCurso() {
    const hoy = getHoyISO();
    delete state.registros[hoy];
    if (state.paseJustificadoHasta && state.paseJustificadoHasta.fecha === hoy) state.paseJustificadoHasta = null;
    if (state.earlyExitState && state.earlyExitState.fecha === hoy) state.earlyExitState = null;
    if (state.extensionJornada && state.extensionJornada.fecha === hoy) state.extensionJornada = null;
    if (state.deduccionesPorAusencia && state.deduccionesPorAusencia[hoy] !== undefined) delete state.deduccionesPorAusencia[hoy];
    limpiarBorradorSesion();
    try { localStorage.removeItem(EXTEND_PROMPT_KEY + "_" + hoy); } catch (e) {}
    saveState(state);
    if (fecha && fecha.value === hoy) {
      if (entrada) entrada.value = "";
      if (salida) salida.value = "";
      if (minAntes) minAntes.value = "0";
      if (disfrutadas) disfrutadas.value = "0";
    }
    if (fecha) fecha.value = hoy;
    actualizarEstadoIniciarJornada();
    actualizarProgreso();
    actualizarBanco();
    actualizarGrafico();
    actualizarResumenDia();
    renderCalendario();
    actualizarEstadoEliminar();
  }

  function horaInicioJornada() {
    const d = new Date();
    const ahoraMin = d.getHours() * 60 + d.getMinutes();
    if (state.config.trabajoATurnos && state.config.turno) {
      return state.config.turno === "22-06" ? "22:00" : state.config.turno === "14-22" ? "14:00" : "06:00";
    }
    if (ahoraMin < 6 * 60) return "06:00";
    return ahoraHoraISO();
  }

  function ejecutarFinalizarJornada(sinExtra) {
    const hoy = hoyISO();
    if (!fecha || !fecha.value) {
      if (fecha) fecha.value = hoy;
    }
    if (!entrada || !entrada.value) {
      alert("Indica la hora de entrada o pulsa primero «Iniciar jornada».");
      return;
    }
    if (sinExtra) {
      const jornadaRef = state.config.trabajoATurnos ? 8 * 60 : state.config.jornadaMin;
      const entradaMin = timeToMinutes(entrada.value);
      const salidaTeoricaMin = entradaMin + jornadaRef;
      const minEnDia = salidaTeoricaMin % (24 * 60);
      const h = Math.floor(minEnDia / 60);
      const m = minEnDia % 60;
      if (salida) salida.value = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    } else {
      if (salida) salida.value = ahoraHoraISO();
    }

    const resultado = calcularJornada({
      entrada: entrada.value,
      salidaReal: salida.value || null,
      jornadaMin: state.config.jornadaMin,
      minAntes: Number(minAntes.value) || 0,
      trabajoATurnos: state.config.trabajoATurnos === true
    });

    var yaPaseSinJustificado = state.registros[fecha.value] && state.registros[fecha.value].paseSinJustificado === true;
    state.registros[fecha.value] = aplicarTxTSiFinDeSemanaOFestivo({
      ...resultado,
      entrada: entrada.value,
      salidaReal: salida.value || null,
      disfrutadasManualMin: Number(disfrutadas.value) || 0,
      vacaciones: false
    }, fecha.value);
    if (yaPaseSinJustificado) state.registros[fecha.value].paseSinJustificado = true;

    saveState(state);
    limpiarBorradorSesion();
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
  }

  function ejecutarFinalizarExtension() {
    const hoy = getHoyISO();
    const ext = state.extensionJornada;
    if (!ext || ext.fecha !== hoy || !state.registros[hoy]) return;

    const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    const desdeMin = timeToMinutes(ext.desdeTime);
    let extraMin = ahoraMin - desdeMin;
    if (extraMin < 0) extraMin += 24 * 60;
    extraMin = extraEnBloques15(extraMin);

    const reg = state.registros[hoy];
    reg.extraGeneradaMin = (reg.extraGeneradaMin || 0) + extraMin;
    if (state.config.trabajoATurnos && extraMin > 0) {
      const EXCESO_JORNADA_TURNOS_MIN = 21;
      reg.excesoJornadaMin = (reg.excesoJornadaMin || 0) + Math.min(extraMin, EXCESO_JORNADA_TURNOS_MIN);
    }

    state.extensionJornada = null;
    saveState(state);
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
    actualizarProgreso();
  }

  if (btnIniciarJornada) {
    btnIniciarJornada.onclick = () => {
      const hoy = hoyISO();
      const textoBtn = (btnIniciarJornada.textContent || "").trim();
      const esExtender = textoBtn.includes("Extender jornada") && !btnIniciarJornada.disabled;

      if (esExtender && state.registros[hoy] && state.registros[hoy].salidaReal && getHoyISO() === hoy) {
        state.extensionJornada = { fecha: hoy, desdeTime: ahoraHoraISO() };
        saveState(state);
        actualizarEstadoIniciarJornada();
        actualizarProgreso();
        actualizarResumenDia();
        return;
      }

      const esContinuar = textoBtn.toLowerCase().includes("continuar");

      if (esContinuar && state.paseJustificadoHasta && state.paseJustificadoHasta.fecha === hoy) {
        state.paseJustificadoHasta = null;
        if (salida) salida.value = "";
        saveState(state);
        actualizarEstadoIniciarJornada();
        actualizarProgreso();
        actualizarResumenDia();
        return;
      }

      if (esContinuar && state.earlyExitState && state.earlyExitState.fecha === hoy && !pasadoFinTeorico(state.earlyExitState)) {
        const early = state.earlyExitState;
        const salidaAtMin = timeToMinutes(early.salidaAt);
        const hastaMin = timeToMinutes(early.hastaTime);
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const endDate = early.endDate || early.fecha;
        const rangeMin = endDate === early.fecha
          ? hastaMin - salidaAtMin
          : (24 * 60 - salidaAtMin) + hastaMin;
        let elapsedMin = 0;
        if (getHoyISO() === early.fecha) {
          elapsedMin = Math.max(0, nowMin - salidaAtMin);
        } else {
          elapsedMin = (24 * 60 - salidaAtMin) + (getHoyISO() === endDate ? nowMin : 24 * 60);
        }
        const deduccion = Math.min(elapsedMin, Math.max(0, rangeMin));
        state.deduccionesPorAusencia[hoy] = (state.deduccionesPorAusencia[hoy] || 0) + deduccion;
        delete state.registros[hoy];
        state.earlyExitState = null;
        if (fecha) fecha.value = hoy;
        if (entrada) entrada.value = early.entrada;
        if (salida) salida.value = "";
        if (minAntes) minAntes.value = "0";
        if (disfrutadas) disfrutadas.value = "0";
        saveState(state);
        renderCalendario();
        actualizarBanco();
        actualizarGrafico();
        actualizarEstadoEliminar();
        actualizarEstadoIniciarJornada();
        actualizarResumenDia();
        return;
      }

      if (fecha) fecha.value = hoy;
      if (entrada) entrada.value = horaInicioJornada();
      if (salida) salida.value = "";
      if (minAntes) minAntes.value = "0";
      if (disfrutadas) disfrutadas.value = "0";
      try { localStorage.removeItem(EXTEND_PROMPT_KEY + "_" + hoy); } catch (e) {}
      guardarBorradorSesion();
      actualizarEstadoIniciarJornada();
      recalcularEnVivo();
      actualizarProgreso();
      actualizarResumenDia();
      if (calendarGrid) {
        renderCalendario();
        actualizarEstadoEliminar();
      }
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(() => {});
      }
    };
  }

  (function setupFinalizarSlider() {
    if (!finalizarSliderTrack || !finalizarSliderThumb) return;
    const threshold = 0.85;
    let dragging = false;

    function getProgress( clientX ) {
      const rect = finalizarSliderTrack.getBoundingClientRect();
      const w = rect.width;
      const x = Math.max(0, Math.min(clientX - rect.left, w));
      return x / w;
    }

    let lastProgress = 0;

    function setThumbPosition( p ) {
      lastProgress = Math.max(0, Math.min(1, p));
      const pct = lastProgress * 100;
      finalizarSliderThumb.style.left = pct + "%";
      if (pct >= threshold * 100) {
        finalizarSliderThumb.classList.add("finalizar-slider-done");
      } else {
        finalizarSliderThumb.classList.remove("finalizar-slider-done");
      }
    }

    function onEnd( clientX ) {
      dragging = false;
      const p = (clientX != null && finalizarSliderTrack) ? getProgress(clientX) : lastProgress;
      if (p >= threshold) {
        const hoy = getHoyISO();
        if (state.extensionJornada && state.extensionJornada.fecha === hoy) {
          ejecutarFinalizarExtension();
          setThumbPosition(0);
          return;
        }
        const salidaAhora = ahoraHoraISO();
        if (esSalidaAnticipada(salidaAhora)) {
          abrirModalPaseSalida(salidaAhora);
          setThumbPosition(0);
        } else {
          ejecutarFinalizarJornada();
          setThumbPosition(0);
        }
      } else {
        setThumbPosition(0);
      }
    }

    finalizarSliderThumb.addEventListener("mousedown", (e) => {
      if (finalizarJornadaWrap && finalizarJornadaWrap.classList.contains("finalizar-slider-wrap--disabled")) return;
      e.preventDefault();
      dragging = true;
    });
    finalizarSliderThumb.addEventListener("touchstart", (e) => {
      if (finalizarJornadaWrap && finalizarJornadaWrap.classList.contains("finalizar-slider-wrap--disabled")) return;
      e.preventDefault();
      dragging = true;
    }, { passive: false });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      setThumbPosition(getProgress(e.clientX));
    });
    window.addEventListener("mouseup", (e) => {
      if (dragging) onEnd(e.clientX);
    });

    window.addEventListener("touchmove", (e) => {
      if (!dragging || !e.touches.length) return;
      setThumbPosition(getProgress(e.touches[0].clientX));
    }, { passive: true });
    window.addEventListener("touchend", (e) => {
      if (!dragging) return;
      onEnd(e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
    });
  })();

  // ===============================
  // BOTONES
  // ===============================

  if (btnGuardar) btnGuardar.onclick = () => {

    if (!fecha.value || !entrada.value) return;

    const salidaParaGuardar = salida.value || null;
    if (fecha.value === getHoyISO() && salidaParaGuardar && esSalidaAnticipada(salidaParaGuardar)) {
      abrirModalPaseSalida(salidaParaGuardar);
      return;
    }

    const resultado = calcularJornada({
      entrada: entrada.value,
      salidaReal: salidaParaGuardar,
      jornadaMin: state.config.jornadaMin,
      minAntes: Number(minAntes.value) || 0,
      trabajoATurnos: state.config.trabajoATurnos === true
    });

    var yaPaseSinJustificadoGuardar = state.registros[fecha.value] && state.registros[fecha.value].paseSinJustificado === true;
    state.registros[fecha.value] = aplicarTxTSiFinDeSemanaOFestivo({
      ...resultado,
      entrada: entrada.value,
      salidaReal: salida.value || null,
      disfrutadasManualMin: Number(disfrutadas.value)||0,
      vacaciones: false
    }, fecha.value);
    if (yaPaseSinJustificadoGuardar) state.registros[fecha.value].paseSinJustificado = true;

    saveState(state);
    if (fecha.value === getHoyISO()) limpiarBorradorSesion();
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
  };

  if (btnVacaciones) btnVacaciones.onclick = () => {

    if (!fecha.value) return;
    if (state.registros[fecha.value]?.libreDisposicion) return;

    const anioDescontado = descontarDiaVacacion(state, fecha.value);
    if (anioDescontado == null) {
      alert("No hay días de vacaciones disponibles en el banco. Revisa la pestaña Vacaciones/LD.");
      return;
    }

    state.registros[fecha.value] = {
      entrada: null,
      salidaReal: null,
      trabajadosMin: 0,
      salidaTeoricaMin: 0,
      salidaAjustadaMin: 0,
      extraGeneradaMin: 0,
      negativaMin: 0,
      excesoJornadaMin: 0,
      disfrutadasManualMin: 0,
      vacaciones: true,
      vacacionesDiaAnioDescontado: anioDescontado
    };

    saveState(state);
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
  };

  function abrirModalLDAnio(anio) {
    if (modalLDAnioLabel) modalLDAnioLabel.textContent = anio;
    if (inputLDAnio) { inputLDAnio.value = String(state.ldDiasPorAnio?.[anio] ?? 0); inputLDAnio.focus(); }
    if (modalLDAnio) modalLDAnio.hidden = false;
  }

  function cerrarModalLDAnio() {
    if (modalLDAnio) modalLDAnio.hidden = true;
  }

  if (btnLD) btnLD.onclick = () => {

    if (!fecha.value) return;
    if (state.registros[fecha.value]?.vacaciones) return;

    const anio = parseInt(fecha.value.slice(0, 4), 10);
    const anioActual = new Date().getFullYear();
    if (state.ldDiasPorAnio?.[anio] === undefined) {
      abrirModalLDAnio(anio);
      return;
    }

    const anioDescontado = descontarDiaLD(state, fecha.value);
    if (anioDescontado == null) {
      alert("No hay días de Libre Disposición disponibles para ese año. Indica los días LD del año en la pestaña Vacaciones/LD.");
      return;
    }

    state.registros[fecha.value] = {
      entrada: null,
      salidaReal: null,
      trabajadosMin: 0,
      salidaTeoricaMin: 0,
      salidaAjustadaMin: 0,
      extraGeneradaMin: 0,
      negativaMin: 0,
      excesoJornadaMin: 0,
      disfrutadasManualMin: 0,
      libreDisposicion: true,
      ldDiaAnioDescontado: anioDescontado
    };

    saveState(state);
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
  };

  if (btnDisfruteHorasExtra) btnDisfruteHorasExtra.onclick = () => {
    if (!fecha || !fecha.value) return;
    if (state.registros[fecha.value]?.vacaciones || state.registros[fecha.value]?.libreDisposicion) return;
    if (state.registros[fecha.value]?.disfruteHorasExtra) return;

    const jornadaMin = state.config.trabajoATurnos ? 8 * 60 : (state.config.jornadaMin || 480);
    state.registros[fecha.value] = {
      entrada: null,
      salidaReal: null,
      trabajadosMin: 0,
      salidaTeoricaMin: 0,
      salidaAjustadaMin: 0,
      extraGeneradaMin: 0,
      negativaMin: 0,
      excesoJornadaMin: 0,
      disfrutadasManualMin: 0,
      disfruteHorasExtra: true,
      disfruteHorasExtraMin: jornadaMin,
      vacaciones: false
    };

    saveState(state);
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
  };

  if (modalLDAceptar) {
    modalLDAceptar.addEventListener("click", () => {
      const anioRaw = modalLDAnioLabel ? parseInt(modalLDAnioLabel.textContent, 10) : NaN;
      const anio = Number.isFinite(anioRaw) ? anioRaw : new Date().getFullYear();
      const val = Math.max(0, parseInt(inputLDAnio?.value, 10) || 0);
      state.ldDiasPorAnio = state.ldDiasPorAnio && typeof state.ldDiasPorAnio === "object" ? { ...state.ldDiasPorAnio, [anio]: val } : { [anio]: val };
      saveState(state);
      cerrarModalLDAnio();
      actualizarBanco();
    });
  }
  if (modalLDAnio) {
    const backdropLD = modalLDAnio.querySelector(".modal-extender-backdrop");
    if (backdropLD) backdropLD.addEventListener("click", cerrarModalLDAnio);
  }

  function ejecutarEliminarRegistroDia() {
    if (!fecha || !fecha.value) return;
    var fechaElim = fecha.value;
    if (!state.registros[fechaElim]) return;
    var reg = state.registros[fechaElim];
    if (reg && reg.vacaciones) devolverDiaVacacion(state, fechaElim);
    if (reg && reg.libreDisposicion) devolverDiaLD(state, fechaElim);
    delete state.registros[fechaElim];
    if (state.earlyExitState && state.earlyExitState.fecha === fechaElim) state.earlyExitState = null;
    if (state.paseJustificadoHasta && state.paseJustificadoHasta.fecha === fechaElim) state.paseJustificadoHasta = null;
    if (fechaElim === getHoyISO()) limpiarBorradorSesion();
    saveState(state);
    if (entrada) entrada.value = "";
    if (salida) salida.value = "";
    if (disfrutadas) disfrutadas.value = "0";
    if (minAntes) minAntes.value = "0";
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarResumenDia();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
  }

  function cerrarModalConfirmarEliminar() {
    if (modalConfirmarEliminar) modalConfirmarEliminar.hidden = true;
  }

  if (btnEliminar) {
    btnEliminar.addEventListener("click", () => {
      if (!fecha.value || !state.registros[fecha.value]) return;
      if (modalConfirmarEliminar) modalConfirmarEliminar.hidden = false;
    });
  }
  if (modalEliminarSi) {
    modalEliminarSi.addEventListener("click", () => {
      ejecutarEliminarRegistroDia();
      cerrarModalConfirmarEliminar();
    });
  }
  if (modalEliminarCancelar) {
    modalEliminarCancelar.addEventListener("click", cerrarModalConfirmarEliminar);
  }
  if (modalConfirmarEliminar) {
    const backdropEliminar = modalConfirmarEliminar.querySelector(".modal-extender-backdrop");
    if (backdropEliminar) backdropEliminar.addEventListener("click", cerrarModalConfirmarEliminar);
  }

  function cerrarModalConfirmarFabrica() {
    if (modalConfirmarFabrica) modalConfirmarFabrica.hidden = true;
  }

  if (btnRestaurarFabrica) {
    btnRestaurarFabrica.addEventListener("click", () => {
      if (modalConfirmarFabrica) modalConfirmarFabrica.hidden = false;
    });
  }
  if (modalFabricaSi) {
    modalFabricaSi.addEventListener("click", async () => {
      state = createInitialState();
      saveState(state);
      try { localStorage.removeItem(GP_ELIGIDO_KEY); } catch (e) {}
      aplicarTheme(state.config.theme);
      aplicarEstadoConfigAUI();
      cerrarModalConfirmarFabrica();
      closeConfigPanel();
      limpiarBorradorSesion();
      if (fecha) fecha.value = getHoyISO();
      if (entrada) entrada.value = "";
      if (salida) salida.value = "";
      if (disfrutadas) disfrutadas.value = "0";
      if (minAntes) minAntes.value = "0";
      renderCalendario();
      actualizarBanco();
      actualizarGrafico();
      actualizarEstadoEliminar();
      actualizarEstadoIniciarJornada();
      actualizarResumenDia();
      actualizarProgreso();
      if (modalElegirGP) modalElegirGP.hidden = false;
    });
  }
  if (modalFabricaCancelar) {
    modalFabricaCancelar.addEventListener("click", cerrarModalConfirmarFabrica);
  }
  if (modalConfirmarFabrica) {
    const backdropFabrica = modalConfirmarFabrica.querySelector(".modal-extender-backdrop");
    if (backdropFabrica) backdropFabrica.addEventListener("click", cerrarModalConfirmarFabrica);
  }

  function aplicarGPYcerrarModal(gp) {
    if (!gp || !["GP1", "GP2", "GP3", "GP4"].includes(gp)) return;
    state.config.grupoProfesional = gp;
    saveState(state);
    try { localStorage.setItem(GP_ELIGIDO_KEY, "1"); } catch (e) {}
    if (modalElegirGP) modalElegirGP.hidden = true;
    if (cfgGrupoProfesional) cfgGrupoProfesional.value = gp;
    aplicarModoGrupoProfesional();
    actualizarBanco();
    actualizarGrafico();
    renderCalendario();
    actualizarResumenDia();
    actualizarEstadoIniciarJornada();
  }

  [modalElegirGP1, modalElegirGP2, modalElegirGP3, modalElegirGP4].forEach(function (btn) {
    if (!btn) return;
    btn.addEventListener("click", function () {
      var val = btn.getAttribute("value") || btn.value;
      aplicarGPYcerrarModal(val);
    });
  });

  if (configAuthorTapTarget && configDevMenu) {
    let authorTapCount = 0;
    let authorTapResetTimer = null;
    configAuthorTapTarget.addEventListener("click", () => {
      if (authorTapResetTimer) clearTimeout(authorTapResetTimer);
      authorTapCount++;
      if (authorTapCount >= 5) {
        configDevMenu.hidden = !configDevMenu.hidden;
        authorTapCount = 0;
      } else {
        authorTapResetTimer = setTimeout(() => { authorTapCount = 0; }, 1500);
      }
    });
  }
  if (btnResetDiaCurso) {
    btnResetDiaCurso.addEventListener("click", () => {
      resetearDiaEnCurso();
    });
  }

  function actualizarEstadoEliminar() {
    if (!btnEliminar) return;
    btnEliminar.disabled = !state.registros[fecha.value];
  }

  function jornadaActivaHoy() {
    const hoy = getHoyISO();
    const tieneJornadaEnCurso = fecha && fecha.value === hoy && entrada && entrada.value && !(state.registros[hoy] && state.registros[hoy].salidaReal != null);
    const enPaseJustificado = state.paseJustificadoHasta && state.paseJustificadoHasta.fecha === hoy;
    const enEarlyExit = state.earlyExitState && state.earlyExitState.fecha === hoy && !pasadoFinTeorico(state.earlyExitState);
    const enExtension = state.extensionJornada && state.extensionJornada.fecha === hoy;
    return !!(tieneJornadaEnCurso || enPaseJustificado || enEarlyExit || enExtension);
  }

  function actualizarEstadoFinalizarJornada() {
    if (!finalizarJornadaWrap) return;
    const esVacaciones = !!(fecha && state.registros[fecha.value]?.vacaciones);
    const esLD = !!(fecha && state.registros[fecha.value]?.libreDisposicion);
    const esDisfruteHorasExtra = !!(fecha && state.registros[fecha.value]?.disfruteHorasExtra);
    if (esVacaciones || esLD || esDisfruteHorasExtra) {
      finalizarJornadaWrap.classList.add("finalizar-slider-wrap--disabled");
      finalizarJornadaWrap.setAttribute("aria-disabled", "true");
      return;
    }
    const activa = jornadaActivaHoy();
    finalizarJornadaWrap.classList.toggle("finalizar-slider-wrap--disabled", !activa);
    finalizarJornadaWrap.setAttribute("aria-disabled", activa ? "false" : "true");
  }

  function actualizarEstadoIniciarJornada() {
    const esDiaVacaciones = !!(fecha && state.registros[fecha.value]?.vacaciones);
    const esDiaLD = !!(fecha && state.registros[fecha.value]?.libreDisposicion);
    const esDiaDisfruteHorasExtra = !!(fecha && state.registros[fecha.value]?.disfruteHorasExtra);
    const esDiaNoTrabajable = esDiaVacaciones || esDiaLD || esDiaDisfruteHorasExtra;
    if (entrada) entrada.disabled = esDiaNoTrabajable;
    if (salida) salida.disabled = esDiaNoTrabajable;
    if (minAntes) minAntes.disabled = esDiaNoTrabajable;
    if (disfrutadas) disfrutadas.disabled = esDiaNoTrabajable;
    if (btnGuardar) btnGuardar.disabled = esDiaNoTrabajable;
    if (btnVacaciones) btnVacaciones.disabled = esDiaLD || esDiaDisfruteHorasExtra;
    if (btnLD) btnLD.disabled = esDiaVacaciones || esDiaDisfruteHorasExtra;
    if (btnDisfruteHorasExtra) btnDisfruteHorasExtra.disabled = esDiaVacaciones || esDiaLD || esDiaDisfruteHorasExtra;

    if (esDiaNoTrabajable) {
      if (btnIniciarJornada) btnIniciarJornada.disabled = true;
      actualizarEstadoFinalizarJornada();
      return;
    }

    if (!btnIniciarJornada) return;
    const hoy = getHoyISO();
    const esHoy = fecha && fecha.value === hoy;
    const tieneEntrada = entrada && entrada.value;
    const yaFinalizado = state.registros[hoy] && state.registros[hoy].salidaReal != null;
    const enPaseJustificado = state.paseJustificadoHasta && state.paseJustificadoHasta.fecha === hoy;
    const enEarlyExit = state.earlyExitState && state.earlyExitState.fecha === hoy && !pasadoFinTeorico(state.earlyExitState);
    const enExtension = state.extensionJornada && state.extensionJornada.fecha === hoy;
    const mostrarContinuar = enPaseJustificado || enEarlyExit;

    if (mostrarContinuar) {
      btnIniciarJornada.textContent = "Continuar jornada";
      btnIniciarJornada.disabled = false;
    } else if (!esModoMinutosSemanal() && enExtension) {
      btnIniciarJornada.textContent = "Extender jornada";
      btnIniciarJornada.disabled = true;
    } else if (!esModoMinutosSemanal() && yaFinalizado && esHoy) {
      btnIniciarJornada.textContent = "Extender jornada";
      btnIniciarJornada.disabled = false;
    } else {
      btnIniciarJornada.textContent = "Iniciar jornada";
      btnIniciarJornada.disabled = !!(esHoy && tieneEntrada && !yaFinalizado);
    }
    actualizarEstadoFinalizarJornada();
  }
  
function mostrarPopupFestivo(texto){

  const popup = document.createElement("div");
  popup.className = "popup-festivo";
  popup.innerText = texto;

  document.body.appendChild(popup);

  setTimeout(()=>{
    popup.classList.add("visible");
  },10);

  setTimeout(()=>{
    popup.classList.remove("visible");
    setTimeout(()=>popup.remove(),300);
  },2500);
}

// ===============================
// EXPORTAR EXCEL
// ===============================

if (btnExcel) {
  btnExcel.addEventListener("click", () => {

    if (typeof XLSX === "undefined") {
      alert("Librería Excel no cargada");
      return;
    }

    var early = state.earlyExitState || null;
    var paseHasta = state.paseJustificadoHasta || null;
    var extJornada = state.extensionJornada || null;

    const rows = Object.entries(state.registros)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([f, r]) => {
        var horaEntrada = "";
        var horaSalida = "";
        var horaPaseSalida = "";
        var tipoPase = "";
        var continuacionJornada = "";
        var tipoDia = "Jornada";

        if (r.vacaciones) {
          tipoDia = "Vacaciones";
        } else if (r.libreDisposicion) {
          tipoDia = "Libre disposición";
        } else if (r.disfruteHorasExtra) {
          tipoDia = "Disfr. h. extra";
        } else {
          horaEntrada = r.entrada || "";
          horaSalida = r.salidaReal != null ? r.salidaReal : "";
          if (r.paseSinJustificado === true) {
            tipoPase = "Sin justificar";
            if (early && early.fecha === f && early.salidaAt) horaPaseSalida = early.salidaAt;
            else if (horaSalida) horaPaseSalida = horaSalida;
          } else if (paseHasta && paseHasta.fecha === f && paseHasta.salidaAt) {
            tipoPase = "Justificado";
            horaPaseSalida = paseHasta.salidaAt;
          } else if (early && early.fecha === f) {
            tipoPase = "Sin justificar";
            horaPaseSalida = early.salidaAt || "";
          }
          if ((r.extraGeneradaMin || 0) > 0 || (r.excesoJornadaMin || 0) > 0) {
            continuacionJornada = "Sí";
            if (extJornada && extJornada.fecha === f && extJornada.desdeTime) {
              continuacionJornada = "Sí (desde " + extJornada.desdeTime + ")";
            }
          }
        }

        return {
          Fecha: f,
          "Tipo día": tipoDia,
          "Hora entrada": horaEntrada,
          "Hora salida": horaSalida,
          "Hora pase salida": horaPaseSalida,
          "Tipo pase": tipoPase,
          "Continuación jornada": continuacionJornada,
          Generadas: (r.extraGeneradaMin || 0) / 60,
          "Exceso jornada": (r.excesoJornadaMin || 0) / 60,
          Negativas: (r.negativaMin || 0) / 60,
          Disfrutadas: (r.disfrutadasManualMin || 0) / 60,
          Vacaciones: r.vacaciones ? "Sí" : "No",
          "Libre disposición": r.libreDisposicion ? "Sí" : "No",
          "Disfr. h. extra": r.disfruteHorasExtra ? "Sí" : "No"
        };
      });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(wb, ws, "Jornada");
    const hoy = new Date();
    const fechaExport = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    XLSX.writeFile(wb, `jornada-${fechaExport}.xlsx`);
  });
}

// ===============================
// BACKUP
// ===============================

if (btnBackup) {
  btnBackup.addEventListener("click", () => {

    const json = exportBackup(state);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const hoy = new Date();
    const fechaExport = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-jornada-${fechaExport}.json`;
    a.click();

    URL.revokeObjectURL(url);
  });
}

// ===============================
// RESTORE BACKUP
// ===============================

if (btnRestore) {
  btnRestore.addEventListener("change", (e) => {

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {

      try {
        const newState = importBackup(event.target.result);

        state = newState;
        saveState(state);

        aplicarTheme(state.config.theme);
        aplicarEstadoConfigAUI();

        if (fecha && fecha.value) {
          cargarFormularioDesdeRegistro(fecha.value);
        }
        renderCalendario();
        actualizarBanco();
        actualizarGrafico();
        actualizarEstadoEliminar();
        actualizarEstadoIniciarJornada();
        actualizarResumenDia();

      } catch {
        alert("Archivo de backup no válido");
      }
    };

    reader.readAsText(file);
  });
}  
  
  // ===============================
  // CALENDARIO
  // ===============================

function renderCalendario() {

  const festivos = obtenerFestivos(currentYear);
  if (!calendarGrid) return;
  calendarGrid.innerHTML = "";

  const fechaSeleccionada = fecha.value;

  const hoy = new Date();
  const hoyISO =
    `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;

  const primerDia = new Date(currentYear,currentMonth,1);
  const totalDias = new Date(currentYear,currentMonth+1,0).getDate();
  const offset = (primerDia.getDay()+6)%7;

  const cabecera = ["L","M","X","J","V","S","D"];

  cabecera.forEach(d=>{
    const el=document.createElement("div");
    el.className="cal-header";
    el.innerText=d;
    calendarGrid.appendChild(el);
  });

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-empty";
    calendarGrid.appendChild(empty);
  }

  for(let d=1; d<=totalDias; d++){

    const fechaISO =
      `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    const div = document.createElement("div");
    div.className = "cal-day";
    div.innerHTML = `<div>${d}</div>`;

    if(fechaISO === fechaSeleccionada) div.classList.add("seleccionado");
    if(fechaISO === hoyISO) div.classList.add("hoy");

    const dow = new Date(currentYear,currentMonth,d).getDay();
    if(dow === 6) div.classList.add("sabado");
    if(dow === 0) div.classList.add("domingo");

// ===============================
// FESTIVOS
// ===============================

if(festivos && festivos[fechaISO]){

  const festivo = festivos[fechaISO];

  div.classList.add("festivo");

  if (festivo.tipo === "ferrol") {
    div.classList.add("festivo-ferrol");
    div.innerHTML += "<small>🎉</small>";
  } else if (festivo.tipo === "galicia") {
    div.classList.add("festivo-galicia");
  } else {
    div.classList.add("festivo-nacional");
  }

  div.onclick = (e) => {
    e.stopPropagation();
    mostrarPopupFestivo(festivo.nombre);
  };

} else {

  div.onclick = () => seleccionarDia(fechaISO);

}

    // ===============================
    // REGISTROS
    // ===============================

    const registro = state.registros[fechaISO];
    const deduccionDia = (state.deduccionesPorAusencia && state.deduccionesPorAusencia[fechaISO]) || 0;

    if (registro) {

      if (registro.libreDisposicion) {

        div.innerHTML += `<span class="cal-day-vacaciones" aria-label="Libre disposición">🕶️</span>`;

      } else if (registro.vacaciones) {

        div.innerHTML += `<span class="cal-day-vacaciones" aria-label="Vacaciones">🏖️</span>`;

      } else if (registro.disfruteHorasExtra) {

        div.innerHTML += `<span class="cal-day-disfrute-horas" aria-label="Disfrute horas extra">⏳</span>`;

      } else {

        var saldoHtml = "";
        if (esModoMinutosSemanal()) {
          var deltaMin = (registro.extraGeneradaMin || 0) - (registro.negativaMin || 0);
          if (deltaMin !== 0) {
            var clsDelta = deltaMin > 0 ? "cal-saldo-pos" : "cal-saldo-neg";
            saldoHtml += "<small class=\"cal-saldo " + clsDelta + "\">" + (deltaMin > 0 ? "+" : "") + deltaMin + "m</small>";
          }
        } else {
        const extra = registro.extraGeneradaMin || 0;
        const exceso = registro.excesoJornadaMin || 0;
        const negativa = registro.negativaMin || 0;
        const saldoDiaMin = extra + exceso - negativa - deduccionDia;

        if (saldoDiaMin !== 0) {
          var sign = saldoDiaMin > 0 ? "+" : "\u2212";
          var absMin = Math.abs(saldoDiaMin);
          var decimalH = (absMin / 60).toFixed(1).replace(".", ",");
          var hm = (saldoDiaMin >= 0 ? "+" : "") + minutosAHorasMinutos(saldoDiaMin);
          var cls = saldoDiaMin > 0 ? "cal-saldo-pos" : "cal-saldo-neg";
          saldoHtml += "<small class=\"cal-saldo " + cls + "\">" + sign + decimalH + "h</small>";
          saldoHtml += "<small class=\"cal-saldo cal-saldo-hm " + cls + "\">" + hm + "</small>";
        }

        if (registro.disfrutadasManualMin > 0) {
          saldoHtml += "<small class=\"cal-disfrutadas\">Disfr. " + (registro.disfrutadasManualMin / 60).toFixed(1) + "h</small>";
        }
        }

        if (registro.entrada && registro.salidaReal != null) {
          var esPaseSinJustificar = registro.paseSinJustificado === true || (state.earlyExitState && state.earlyExitState.fecha === fechaISO);
          if (esPaseSinJustificar) {
            saldoHtml += "<span class=\"cal-day-especial\" aria-hidden=\"true\"><span class=\"cal-day-especial-symbol\">*</span></span>";
          } else {
            saldoHtml += "<span class=\"cal-day-completed\" aria-hidden=\"true\"><span class=\"cal-day-completed-check\">\u2713</span></span>";
          }
        }
        div.innerHTML += saldoHtml;
      }
    } else if (deduccionDia > 0) {
      var decimalH = (deduccionDia / 60).toFixed(1).replace(".", ",");
      var hm = "\u2212" + minutosAHorasMinutos(-deduccionDia);
      div.innerHTML += "<small class=\"cal-saldo cal-saldo-neg\">\u2212" + decimalH + "h</small>";
      div.innerHTML += "<small class=\"cal-saldo cal-saldo-hm cal-saldo-neg\">" + hm + "</small>";
    }

    calendarGrid.appendChild(div);
  }

  const nombreMes = new Date(currentYear, currentMonth)
    .toLocaleString("es-ES", { month: "long" });

  if (mesAnioLabel) mesAnioLabel.innerText =
    `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${currentYear}`;

  actualizarBanco();
  actualizarGrafico();
}

  function cargarFormularioDesdeRegistro(fechaISO) {
    const registro = state.registros[fechaISO];
    const set = (el, val) => { if (el) el.value = val; };
    if (registro) {
      if (registro.vacaciones || registro.libreDisposicion || registro.disfruteHorasExtra) {
        set(entrada, ""); set(salida, ""); set(disfrutadas, "0"); set(minAntes, "0");
      } else {
        set(entrada, registro.entrada || "");
        set(salida, registro.salidaReal || "");
        set(disfrutadas, String(registro.disfrutadasManualMin || 0));
        set(minAntes, "0");
      }
    } else {
      set(entrada, ""); set(salida, ""); set(disfrutadas, "0"); set(minAntes, "0");
    }
    recalcularEnVivo();
    actualizarProgreso();
    actualizarResumenDia();
  }

  function seleccionarDia(fechaISO){
    fecha.value = fechaISO;
    cargarFormularioDesdeRegistro(fechaISO);
    renderCalendario();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
  }

  if (prevMes) prevMes.onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendario();
  };
  if (nextMes) nextMes.onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendario();
  };

  // ===============================
  // INIT – restaurar sesión en curso (PWA: al reabrir tras cerrar)
  // ===============================

  try {
    const raw = localStorage.getItem(SESSION_DRAFT_KEY);
    if (raw) {
      const draft = JSON.parse(raw);
      const hoy = getHoyISO();
      if (draft && draft.fecha === hoy && draft.entrada) {
        if (fecha) fecha.value = draft.fecha;
        if (entrada) entrada.value = draft.entrada;
        recalcularEnVivo();
        actualizarProgreso();
        actualizarResumenDia();
      } else {
        limpiarBorradorSesion();
      }
    }
  } catch (e) {
    limpiarBorradorSesion();
  }

  renderCalendario();
  actualizarBanco();
  actualizarGrafico();
  actualizarEstadoEliminar();
  actualizarEstadoIniciarJornada();
  actualizarResumenDia();
  solicitarPermisoNotificaciones();

  try {
    if ((!state.ldDiasPorAnio || state.ldDiasPorAnio[currentYear] === undefined) && modalLDAnio) {
      setTimeout(() => { try { abrirModalLDAnio(currentYear); } catch (e) { console.warn("Modal LD:", e); } }, 800);
    }
  } catch (e) {
    console.warn("Init LD modal:", e);
  }

  function checkExtendPromptFromUrl() {
    if (esModoMinutosSemanal()) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("extend_prompt") !== "1") return;
    const hoy = getHoyISO();
    if (state.registros[hoy] && state.registros[hoy].salidaReal != null) return;
    try { localStorage.setItem(EXTEND_PROMPT_KEY + "_" + hoy, "1"); } catch (e) {}
    if (modalExtenderJornada) modalExtenderJornada.hidden = false;
    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("extend_prompt");
      url.searchParams.delete("fecha");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  }

  checkExtendPromptFromUrl();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkExtendPromptFromUrl();
  });

  window.addEventListener("focus", checkExtendPromptFromUrl);

  // Primera vez: mostrar modal para elegir grupo profesional
  try {
    if (!localStorage.getItem(GP_ELIGIDO_KEY) && modalElegirGP) {
      modalElegirGP.hidden = false;
    }
  } catch (e) {}

  // ===============================
  // REGISTRO SERVICE WORKER
  // ===============================
  
  if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js")
    .then(() => console.log("Service Worker registrado"));
}

});
