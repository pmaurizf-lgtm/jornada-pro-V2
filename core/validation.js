// core/validation.js

export function validateState(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Estado inválido");
  }

  if (!state.registros || !state.config) {
    throw new Error("Estructura corrupta");
  }

  if (typeof state.config.jornadaMin !== "number") {
    throw new Error("Config inválida");
  }

  if (typeof state.config.avisoMin !== "number" || state.config.avisoMin < 0) {
    state.config.avisoMin = 10;
  }

  if (!["light", "dark"].includes(state.config.theme)) {
    throw new Error("Theme inválido");
  }

  if (typeof state.config.notificationsEnabled !== "boolean") {
    state.config.notificationsEnabled = true;
  }

  if (typeof state.config.trabajoATurnos !== "boolean") {
    state.config.trabajoATurnos = false;
  }
  if (!["06-14", "14-22", "22-06"].includes(state.config.turno)) {
    state.config.turno = "06-14";
  }
}
