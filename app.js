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
    console.log("Mensaje en primer plano:", payload);

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
  const btnFinalizarJornada = document.getElementById("finalizarJornada");
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
  const configTurnoWrap = document.getElementById("configTurnoWrap");
  const guardarConfig = document.getElementById("guardarConfig");

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
    const inicialExtra = state.config.horasExtraInicialMin || 0;
    const inicialExceso = state.config.excesoJornadaInicialMin || 0;
    const saldoTotalConInicial = total.saldo + inicialExtra + inicialExceso;
    const anual = calcularResumenAnual(state.registros, bankYear);
    const mensual = calcularResumenMensual(state.registros, currentMonth, bankYear);

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

  const salidaTeoricaMin = entradaMin + state.config.jornadaMin;
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

  // Aviso final: "Has finalizado tu jornada"
  if (
    ahoraMin >= salidaTeoricaMin &&
    !localStorage.getItem(`notif_${fechaHoy}_final`)
  ) {
    notificarUnaVez(
      fechaHoy,
      "final",
      "Has finalizado tu jornada"
    );
  }
}

  
  setInterval(() => {
    actualizarProgreso();
    controlarNotificaciones();
}, 1000);

  if (entrada) entrada.addEventListener("input", () => {
    recalcularEnVivo();
    actualizarProgreso();
    if (fecha && fecha.value === getHoyISO() && entrada.value) guardarBorradorSesion();
  });
  if (salida) salida.addEventListener("input", recalcularEnVivo);
  if (minAntes) minAntes.addEventListener("input", recalcularEnVivo);
  if (fecha) fecha.addEventListener("change", () => {
    if (fecha.value === getHoyISO() && entrada && entrada.value) guardarBorradorSesion();
    else if (fecha.value !== getHoyISO()) limpiarBorradorSesion();
  });

  // ===============================
  // INICIAR / FINALIZAR JORNADA
  // ===============================

  function ahoraHoraISO() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
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

  if (btnIniciarJornada) {
    btnIniciarJornada.onclick = () => {
      const hoy = hoyISO();
      if (fecha) fecha.value = hoy;
      if (entrada) {
        if (state.config.trabajoATurnos && state.config.turno) {
          const horaInicio = state.config.turno === "22-06" ? "22:00" : state.config.turno === "14-22" ? "14:00" : "06:00";
          entrada.value = horaInicio;
        } else {
          entrada.value = ahoraHoraISO();
        }
      }
      if (salida) salida.value = "";
      if (minAntes) minAntes.value = "0";
      if (disfrutadas) disfrutadas.value = "0";
      guardarBorradorSesion();
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

  if (btnFinalizarJornada) {
    btnFinalizarJornada.onclick = () => {
      const hoy = hoyISO();
      if (!fecha || !fecha.value) {
        if (fecha) fecha.value = hoy;
      }
      if (!entrada || !entrada.value) {
        alert("Indica la hora de entrada o pulsa primero «Iniciar jornada».");
        return;
      }
      if (salida) salida.value = ahoraHoraISO();

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
    actualizarResumenDia();
  };
}

  // ===============================
  // BOTONES
  // ===============================

  if (btnGuardar) btnGuardar.onclick = () => {

    if (!fecha.value || !entrada.value) return;

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
      disfrutadasManualMin: Number(disfrutadas.value)||0,
      vacaciones: false
    };

    saveState(state);
    if (fecha.value === getHoyISO()) limpiarBorradorSesion();
    renderCalendario();
    actualizarBanco();
    actualizarGrafico();
    actualizarEstadoEliminar();
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
      actualizarResumenDia();
    });
  }

  function actualizarEstadoEliminar() {
    if (!btnEliminar) return;
    btnEliminar.disabled = !state.registros[fecha.value];
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
  actualizarResumenDia();
  solicitarPermisoNotificaciones();

  // ===============================
  // REGISTRO SERVICE WORKER
  // ===============================
  
  if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js")
    .then(() => console.log("Service Worker registrado"));
}

});
