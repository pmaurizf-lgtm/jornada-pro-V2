// core/state.js

export function createInitialState() {
  return {
    registros: {},
    paseJustificadoHasta: null,
    earlyExitState: null,
    deduccionesPorAusencia: {},
    extensionJornada: null,
    /** Días de vacaciones disponibles por año de generación. Ej: { "2025": 22, "2026": 25 } */
    vacacionesDiasPorAnio: {},
    /** Días de libre disposición por año (caducan 31 dic). Ej: { "2026": 5 } */
    ldDiasPorAnio: {},
    config: {
      nombreCompleto: "",
      numeroSAP: "",
      jornadaMin: 459,
      avisoMin: 10,
      theme: "light",
      notificationsEnabled: true,
      trabajoATurnos: false,
      turno: "06-14",
      horasExtraInicialMin: 0,
      excesoJornadaInicialMin: 0,
      /** Saldo de días de vacaciones previo (año 2025) al usar la app. */
      vacacionesDiasPrevio: 0
    }
  };
}

export function setRegistro(state, fecha, data) {
  state.registros[fecha] = {
    ...state.registros[fecha],
    ...data
  };
}

export function toggleVacaciones(state, fecha) {
  if (!state.registros[fecha]) {
    state.registros[fecha] = { vacaciones: true };
    return;
  }

  state.registros[fecha].vacaciones =
    !state.registros[fecha].vacaciones;

  if (state.registros[fecha].vacaciones) {
    delete state.registros[fecha].extraGeneradaMin;
    delete state.registros[fecha].negativaMin;
  }
}
