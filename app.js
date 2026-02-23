// ===============================
// IMPORTS CORE
// ===============================

import { loadState, saveState, exportBackup, importBackup } from "./core/storage.js";
import { calcularJornada, minutesToTime, timeToMinutes } from "./core/calculations.js";
import { calcularResumenAnual, calcularResumenMensual, calcularResumenTotal } from "./core/bank.js";
import { obtenerFestivos } from "./core/holidays.js";
import { solicitarPermisoNotificaciones, notificarUnaVez } from "./core/notifications.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// ===============================
// IMPORTS UI
// ===============================

import { aplicarTheme, inicializarSelectorTheme } from "./ui/theme.js";
import { renderGrafico } from "./ui/charts.js";

document.addEventListener("DOMContentLoaded", () => {

  let state = loadState();
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  let bankYear = currentYear;

  // ===============================
  // FIREBASE INIT
  // ===============================

  const firebaseConfig = {
    apiKey: "AIzaSyAAQBdFnKPD7u6a0KTFp9gAmF8ZgdIB2Ak",
    authDomain: "jornada-pro-88d2d.firebaseapp.com",
    projectId: "jornada-pro-88d2d",
    storageBucket: "jornada-pro-88d2d.firebasestorage.app",
    messagingSenderId: "1086735102271",
    appId: "1:1086735102271:web:fb9fbf3da6f489ec51238a"
  };

  const firebaseApp = initializeApp(firebaseConfig);
  const messaging = getMessaging(firebaseApp);

  let currentFcmToken = null;

  function getHoyISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  async function registerBackendNotificationsIfReady() {
    if (!currentFcmToken || !state.config.notificationsEnabled) return;
    const hoy = getHoyISO();
    const entradaHoy =
      state.registros[hoy]?.entrada ||
      (fecha && fecha.value === hoy && entrada?.value ? entrada.value : null);
    if (!entradaHoy) return;
    try {
      const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js");
      const functions = getFunctions(firebaseApp);
      const register = httpsCallable(functions, "registerNotificationSchedule");
      const jornadaNotif = state.config.trabajoATurnos ? 8 * 60 : state.config.jornadaMin;
      await register({
        token: currentFcmToken,
        fecha: hoy,
        entrada: entradaHoy,
        jornadaMin: jornadaNotif,
        avisoMin: state.config.avisoMin,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid"
      });
    } catch (e) {
      console.warn("Notificaciones en segundo plano no disponibles:", e.message);
    }
  }

  async function unregisterBackendNotifications() {
    if (!currentFcmToken) return;
    try {
      const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js");
      const functions = getFunctions(firebaseApp);
      const unregister = httpsCallable(functions, "unregisterNotificationSchedule");
      await unregister({ token: currentFcmToken });
    } catch (e) {
      console.warn("No se pudo desactivar notificaciones en el servidor:", e.message);
    }
  }

  const swPath = "firebase-messaging-sw.js";

  if ("serviceWorker" in navigator) {
    (async () => {
      try {
        const swReg = await navigator.serviceWorker.register(swPath);
        getToken(messaging, {
          vapidKey: "BHhgWLEfYEysLxe9W16MxacXdlTAaKgd9vNS2gGzGZB2U_4KKnNiuzX9rp3y2hmGFPzUasQ27s8z-Dr7BLp4vLM",
          serviceWorkerRegistration: swReg
        }).then(async (currentToken) => {
          if (currentToken) {
            currentFcmToken = currentToken;
            if (state.config.notificationsEnabled) await registerBackendNotificationsIfReady();
          }
        }).catch((err) => {
          console.error("Error obteniendo token:", err);
        });
      } catch (e) {
        console.warn("Service Worker Firebase no registrado:", e.message);
      }
    })();
  }

  onMessage(messaging, (payload) => {
    if (payload.data && payload.data.type === "extend_prompt") {
      const hoy = payload.data.fecha || getHoyISO();
      try { localStorage.setItem(EXTEND_PROMPT_KEY + "_" + hoy, "1"); } catch (e) {}
      const modal = document.getElementById("modalExtenderJornada");
      if (modal) modal.hidden = false;
      return;
    }
    new Notification(
      payload.notification?.title || "Jornada Pro",
      {
        body: payload.notification?.body || "",
        icon: "icon-192.png"
      }
    );
  });

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
  const bSaldoAnual = document.getElementById("bSaldoAnual");
  const bSaldo = document.getElementById("bSaldo");

  const btnEliminar = document.getElementById("eliminar");
  const btnGuardar = document.getElementById("guardar");
  const btnVacaciones = document.getElementById("vacaciones");
  const btnIniciarJornada = document.getElementById("iniciarJornada");
  const btnExcel = document.getElementById("excel");
  const btnBackup = document.getElementById("backup");
  const btnRestore = document.getElementById("restore");

  const cfgJornada = document.getElementById("cfgJornada");
  const cfgAviso = document.getElementById("cfgAviso");
  const cfgTheme = document.getElementById("cfgTheme");
  const cfgNotificaciones = document.getElementById("cfgNotificaciones");
  const cfgTrabajoTurnos = document.getElementById("cfgTrabajoTurnos");
  const cfgTurno = document.getElementById("cfgTurno");
  const cfgHorasExtraPrevias = document.getElementById("cfgHorasExtraPrevias");
  const cfgExcesoJornadaPrevias = document.getElementById("cfgExcesoJornadaPrevias");
  const btnResetSaldoPrevio = document.getElementById("resetSaldoPrevio");
  const configTurnoWrap = document.getElementById("configTurnoWrap");
  const guardarConfig = document.getElementById("guardarConfig");
  const finalizarSliderTrack = document.getElementById("finalizarSliderTrack");
  const finalizarSliderThumb = document.getElementById("finalizarSliderThumb");
  const modalExtenderJornada = document.getElementById("modalExtenderJornada");
  const modalExtenderNo = document.getElementById("modalExtenderNo");
  const modalExtenderSi = document.getElementById("modalExtenderSi");
  const modalPaseSalida = document.getElementById("modalPaseSalida");
  const modalPaseJustificado = document.getElementById("modalPaseJustificado");
  const modalPaseSinJustificar = document.getElementById("modalPaseSinJustificar");

  const chartCanvas = document.getElementById("chart");

// ===============================
// CONFIGURACIÓN
// ===============================

// Cargar valores en inputs
if (cfgJornada) cfgJornada.value = state.config.jornadaMin;
if (cfgAviso) cfgAviso.value = state.config.avisoMin;
if (cfgTheme) cfgTheme.value = state.config.theme;
if (cfgNotificaciones) cfgNotificaciones.checked = state.config.notificationsEnabled !== false;
if (cfgTrabajoTurnos) cfgTrabajoTurnos.checked = state.config.trabajoATurnos === true;
if (cfgTurno) cfgTurno.value = state.config.turno || "06-14";
if (cfgHorasExtraPrevias) cfgHorasExtraPrevias.value = ((state.config.horasExtraInicialMin || 0) / 60).toFixed(2).replace(/\.?0+$/, "") || "0";
if (cfgExcesoJornadaPrevias) cfgExcesoJornadaPrevias.value = ((state.config.excesoJornadaInicialMin || 0) / 60).toFixed(2).replace(/\.?0+$/, "") || "0";
if (configTurnoWrap) configTurnoWrap.hidden = !state.config.trabajoATurnos;

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
  guardarConfig.addEventListener("click", async () => {

    state.config.jornadaMin = Number(cfgJornada.value);
    state.config.avisoMin = Number(cfgAviso.value);
    state.config.theme = cfgTheme.value;
    state.config.notificationsEnabled = cfgNotificaciones ? cfgNotificaciones.checked : true;
    state.config.trabajoATurnos = cfgTrabajoTurnos ? cfgTrabajoTurnos.checked : false;
    state.config.turno = cfgTurno ? cfgTurno.value : "06-14";
    state.config.horasExtraInicialMin = Math.round((parseFloat(cfgHorasExtraPrevias?.value) || 0) * 60);
    state.config.excesoJornadaInicialMin = Math.round((parseFloat(cfgExcesoJornadaPrevias?.value) || 0) * 60);

    saveState(state);

    aplicarTheme(state.config.theme);

    if (state.config.notificationsEnabled) {
      await registerBackendNotificationsIfReady();
    } else {
      await unregisterBackendNotifications();
    }

    recalcularEnVivo();
    actualizarProgreso();
    actualizarBanco();
    actualizarGrafico();
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
  
  // ===============================
  // RESUMEN DEL DÍA
  // ===============================

  function actualizarResumenDia() {

    if (!resumenDia || !rTrabajado || !rExtra || !rNegativa) return;

    const registro = state.registros[fecha.value];

    if (!fecha.value || !registro) {
      resumenDia.style.display = "none";
      return;
    }

    resumenDia.style.display = "grid";

    rTrabajado.innerText = (registro.trabajadosMin / 60).toFixed(2) + "h";

    rExtra.innerText = (registro.extraGeneradaMin / 60).toFixed(2) + "h";
    rExtra.classList.toggle("positive", registro.extraGeneradaMin > 0);
    rExtra.classList.remove("negative");

    const excesoMin = registro.excesoJornadaMin || 0;
    if (rExceso) rExceso.innerText = (excesoMin / 60).toFixed(2) + "h";
    if (resumenExcesoWrap) resumenExcesoWrap.style.display = excesoMin > 0 ? "" : "none";

    rNegativa.innerText = (registro.negativaMin / 60).toFixed(2) + "h";
    rNegativa.classList.toggle("negative", registro.negativaMin > 0);
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
    if (bSaldoAnual) {
      bSaldoAnual.innerText = minutosAHorasMinutos(anual.saldo);
      bSaldoAnual.style.color = anual.saldo >= 0 ? "var(--positive)" : "var(--negative)";
    }
    if (bSaldo) {
      bSaldo.innerText = minutosAHorasMinutos(mensual.saldo);
      bSaldo.style.color = mensual.saldo >= 0 ? "var(--positive)" : "var(--negative)";
    }
  }

  if (selectBankYear) {
    selectBankYear.addEventListener("change", () => {
      bankYear = parseInt(selectBankYear.value, 10) || currentYear;
      actualizarBanco();
      actualizarGrafico();
    });
  }

  function actualizarGrafico() {
    if (!chartCanvas) return;
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

  if (!entrada || !entrada.value) {
    if (barra) barra.style.width = "0%";

    const progresoInside = document.getElementById("progresoInside");
    if (progresoInside) progresoInside.innerText = "";

    return;
  }

  const ahora = new Date();
  let ahoraMin = ahora.getHours()*60 + ahora.getMinutes();
  const entradaMin = timeToMinutes(entrada.value);

  if (ahoraMin < entradaMin) {
    ahoraMin += 24 * 60;
  }

  const trabajado = ahoraMin - entradaMin;
  const jornadaRef = state.config.trabajoATurnos ? 8 * 60 : state.config.jornadaMin;
  const porcentaje = Math.min(
    (trabajado / jornadaRef) * 100,
    100
  );

  if (barra) barra.style.width = porcentaje + "%";

  // 🔥 FORMATO HORAS + MINUTOS
  const horas = Math.floor(trabajado / 60);
  const minutos = trabajado % 60;

  const texto =
    horas + "h " +
    String(minutos).padStart(2,"0") + "m • " +
    Math.round(porcentaje) + "%";

  const progresoInside = document.getElementById("progresoInside");

  if (progresoInside) {

    progresoInside.innerText = texto;

    // color automático según porcentaje
    if (porcentaje > 35) {
      progresoInside.classList.add("light-text");
    } else {
      progresoInside.classList.remove("light-text");
    }
  }

  // 🎨 COLOR DINÁMICO CONTINUO
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

  const EXTEND_PROMPT_KEY = "jornadaPro_extendPrompt";

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

  function comprobarExtenderJornada() {
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
      ejecutarFinalizarJornada();
      const fin = calcularFinTeorico();
      state.earlyExitState = {
        fecha: hoyISO(),
        salidaAt: salidaVal,
        entrada: entrada.value,
        hastaTime: fin.time,
        endDate: fin.nextDay ? nextDayISO(hoyISO()) : hoyISO()
      };
      saveState(state);
      cerrarModalPaseSalida();
      actualizarEstadoIniciarJornada();
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

    state.registros[fecha.value] = {
      ...resultado,
      entrada: entrada.value,
      salidaReal: salida.value || null,
      disfrutadasManualMin: Number(disfrutadas.value) || 0,
      vacaciones: false
    };

    saveState(state);
    limpiarBorradorSesion();
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
  }

  if (btnIniciarJornada) {
    btnIniciarJornada.onclick = () => {
      const hoy = hoyISO();
      const esContinuar = (btnIniciarJornada.textContent || "").trim().toLowerCase().includes("continuar");

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
      if (state.config.notificationsEnabled) registerBackendNotificationsIfReady();
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
      e.preventDefault();
      dragging = true;
    });
    finalizarSliderThumb.addEventListener("touchstart", (e) => {
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

    state.registros[fecha.value] = {
      ...resultado,
      entrada: entrada.value,
      salidaReal: salida.value || null,
      disfrutadasManualMin: Number(disfrutadas.value)||0,
      vacaciones: false
    };

    saveState(state);
    if (fecha.value === getHoyISO()) limpiarBorradorSesion();
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
    if (fecha.value === getHoyISO() && state.config.notificationsEnabled) registerBackendNotificationsIfReady();
  };

  if (btnVacaciones) btnVacaciones.onclick = () => {

    if (!fecha.value) return;

    state.registros[fecha.value] = {
      entrada:null,
      salidaReal:null,
      trabajadosMin:0,
      salidaTeoricaMin:0,
      salidaAjustadaMin:0,
      extraGeneradaMin:0,
      negativaMin:0,
      excesoJornadaMin:0,
      disfrutadasManualMin:0,
      vacaciones:true
    };

    saveState(state);
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
    actualizarEstadoIniciarJornada();
    actualizarResumenDia();
  };

  if (btnEliminar) {
    btnEliminar.addEventListener("click", () => {

      if (!fecha.value || !state.registros[fecha.value]) return;

      delete state.registros[fecha.value];
      if (fecha.value === getHoyISO()) limpiarBorradorSesion();

      saveState(state);

      entrada.value = "";
      salida.value = "";
      disfrutadas.value = 0;
      minAntes.value = 0;

      renderCalendario();
      actualizarBanco();
      actualizarGrafico();
      actualizarEstadoEliminar();
      actualizarEstadoIniciarJornada();
      actualizarResumenDia();
    });
  }

  function actualizarEstadoEliminar() {
    if (!btnEliminar) return;
    btnEliminar.disabled = !state.registros[fecha.value];
  }

  function actualizarEstadoIniciarJornada() {
    if (!btnIniciarJornada) return;
    const hoy = getHoyISO();
    const esHoy = fecha && fecha.value === hoy;
    const tieneEntrada = entrada && entrada.value;
    const yaFinalizado = state.registros[hoy] && state.registros[hoy].salidaReal != null;
    const enPaseJustificado = state.paseJustificadoHasta && state.paseJustificadoHasta.fecha === hoy;
    const enEarlyExit = state.earlyExitState && state.earlyExitState.fecha === hoy && !pasadoFinTeorico(state.earlyExitState);
    const mostrarContinuar = enPaseJustificado || enEarlyExit;
    if (mostrarContinuar) {
      btnIniciarJornada.textContent = "Continuar jornada";
      btnIniciarJornada.disabled = false;
    } else {
      btnIniciarJornada.textContent = "Iniciar jornada";
      btnIniciarJornada.disabled = !!(esHoy && tieneEntrada && !yaFinalizado);
    }
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

    const rows = Object.entries(state.registros)
      .map(([f, r]) => ({
        Fecha: f,
        Generadas: (r.extraGeneradaMin || 0) / 60,
        "Exceso jornada": (r.excesoJornadaMin || 0) / 60,
        Negativas: (r.negativaMin || 0) / 60,
        Disfrutadas: (r.disfrutadasManualMin || 0) / 60,
        Vacaciones: r.vacaciones ? "Sí" : "No"
      }));

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

        if (fecha && fecha.value) {
          cargarFormularioDesdeRegistro(fecha.value);
        }
        renderCalendario();
        actualizarBanco();
        actualizarGrafico();
        actualizarEstadoEliminar();
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

    if(registro){

      if(registro.vacaciones){

        div.innerHTML += `<small>Vac</small>`;

      } else {

        if(registro.extraGeneradaMin > 0){
          div.innerHTML +=
            `<small style="color:var(--positive)">+${(registro.extraGeneradaMin/60).toFixed(1)}h</small>`;
        }
        if(registro.excesoJornadaMin > 0){
          div.innerHTML +=
            `<small class="cal-exceso" title="Exceso de jornada">+${(registro.excesoJornadaMin/60).toFixed(1)}h exc.</small>`;
        }

        if(registro.negativaMin > 0){
          div.innerHTML +=
            `<small style="color:var(--negative)">-${(registro.negativaMin/60).toFixed(1)}h</small>`;
        }
        if(registro.disfrutadasManualMin > 0){
          div.innerHTML +=
            `<small class="cal-disfrutadas">Disfr. ${(registro.disfrutadasManualMin/60).toFixed(1)}h</small>`;
        }
      }
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
      if (registro.vacaciones) {
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

  function checkExtendPromptFromUrl() {
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

  // ===============================
  // REGISTRO SERVICE WORKER
  // ===============================
  
  if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js")
    .then(() => console.log("Service Worker registrado"));
}

});
