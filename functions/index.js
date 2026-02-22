/**
 * Cloud Functions para Jornada Pro: notificaciones push en segundo plano.
 * - registerNotificationSchedule: el cliente registra token + horario de hoy.
 * - checkAndSendJornadaNotifications: ejecución cada minuto; envía aviso previo y aviso final.
 */

const crypto = require("crypto");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const COLLECTION = "notification_subscriptions";

/**
 * Parsea "HH:MM" a minutos desde medianoche.
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const [h, m] = timeStr.trim().split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

/**
 * Obtiene la fecha y la hora actual en minutos (desde medianoche) en la zona horaria dada.
 */
function getNowInTimezone(timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Europe/Madrid",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value || "0";
  const y = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const date = `${y}-${month}-${day}`;
  const minutesFromMidnight = parseInt(hour, 10) * 60 + parseInt(minute, 10);
  return { date, minutesFromMidnight };
}

/**
 * Callable: registra el horario de hoy para este token y recibir notificaciones push.
 * Body: { token, fecha, entrada, jornadaMin, avisoMin, timezone }
 */
exports.registerNotificationSchedule = functions.https.onCall(async (data, context) => {
  const { token, fecha, entrada, jornadaMin, avisoMin, timezone } = data || {};

  if (!token || typeof token !== "string" || token.length < 10) {
    throw new functions.https.HttpsError("invalid-argument", "token inválido");
  }
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new functions.https.HttpsError("invalid-argument", "fecha inválida (YYYY-MM-DD)");
  }
  if (!entrada || typeof entrada !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "entrada inválida (HH:MM)");
  }

  const jornada = Math.max(0, parseInt(jornadaMin, 10) || 459);
  const aviso = Math.max(0, parseInt(avisoMin, 10) || 10);
  const tz = typeof timezone === "string" && timezone.length > 0 ? timezone : "Europe/Madrid";

  const docId = crypto.createHash("sha256").update(token).digest("hex");

  await db.collection(COLLECTION).doc(docId).set({
    token,
    fecha,
    entrada: entrada.trim(),
    jornadaMin: jornada,
    avisoMin: aviso,
    timezone: tz,
    previoSent: false,
    finalSent: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, message: "Horario registrado para notificaciones" };
});

/**
 * Callable: desactiva las notificaciones en segundo plano para este token.
 * Body: { token }
 */
exports.unregisterNotificationSchedule = functions.https.onCall(async (data, context) => {
  const { token } = data || {};

  if (!token || typeof token !== "string" || token.length < 10) {
    throw new functions.https.HttpsError("invalid-argument", "token inválido");
  }

  const docId = crypto.createHash("sha256").update(token).digest("hex");
  await db.collection(COLLECTION).doc(docId).delete();

  return { ok: true, message: "Notificaciones desactivadas para este dispositivo" };
});

/**
 * Programada cada minuto: revisa suscripciones y envía aviso previo / aviso final por FCM.
 */
exports.checkAndSendJornadaNotifications = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("Europe/Madrid")
  .onRun(async () => {
    const snapshot = await db.collection(COLLECTION).get();
    const messaging = admin.messaging();

    for (const doc of snapshot.docs) {
      const d = doc.data();
      const {
        token,
        fecha,
        entrada,
        jornadaMin,
        avisoMin,
        timezone,
        previoSent,
        finalSent,
      } = d;

      const now = getNowInTimezone(timezone);
      if (now.date !== fecha) continue;

      const entradaMin = timeToMinutes(entrada);
      const salidaTeoricaMin = entradaMin + (jornadaMin || 459);
      const aviso = Math.max(0, avisoMin || 10);
      const nowMin = now.minutesFromMidnight;

      try {
        if (
          !previoSent &&
          nowMin >= salidaTeoricaMin - aviso &&
          nowMin < salidaTeoricaMin
        ) {
          await messaging.send({
            token,
            notification: {
              title: "Jornada Pro",
              body: `Quedan ${aviso} minutos para finalizar tu jornada`,
            },
            android: { priority: "high" },
            apns: { payload: { aps: { sound: "default" } } },
          });
          await doc.ref.update({
            previoSent: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else if (!finalSent && nowMin >= salidaTeoricaMin) {
          await messaging.send({
            token,
            notification: {
              title: "Jornada Pro",
              body: "Has finalizado tu jornada",
            },
            android: { priority: "high" },
            apns: { payload: { aps: { sound: "default" } } },
          });
          await doc.ref.update({
            finalSent: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (e) {
        if (e.code === "messaging/invalid-registration-token" ||
            e.code === "messaging/registration-token-not-registered") {
          await doc.ref.delete();
        }
        functions.logger.warn("FCM error", doc.id, e.message);
      }
    }

    return null;
  });
