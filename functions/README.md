# Cloud Functions – Notificaciones en segundo plano

Estas funciones permiten recibir notificaciones de «aviso previo» y «fin de jornada» aunque la app esté cerrada o en segundo plano (iOS y Android).

## Requisitos

1. **Firebase CLI**  
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Proyecto Firebase**  
   El mismo que usa la app (en `app.js`: `projectId: "jornada-pro-88d2d"`).

3. **Firestore**  
   En la consola de Firebase: **Build → Firestore Database → Create database** (modo producción o prueba).  
   Las reglas en `firestore.rules` impiden que el cliente escriba en `notification_subscriptions`; solo las Cloud Functions (Admin) pueden.

4. **Plan Blaze (pago)**  
   Las funciones programadas y las llamadas a Firestore requieren el plan Blaze. Hay cuota gratuita generosa.

## Despliegue

Desde la raíz del proyecto:

```bash
firebase deploy
```

O solo funciones y reglas:

```bash
firebase deploy --only functions,firestore:rules
```

La primera vez puede pedir que actives Blaze y que instales dependencias en `functions`:

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

## Comportamiento

- **registerNotificationSchedule** (callable): la app la llama con el token FCM y el horario de hoy (fecha, entrada, jornada, aviso, timezone). Guarda todo en Firestore.
- **checkAndSendJornadaNotifications** (programada cada minuto): lee las suscripciones, calcula si toca enviar «aviso previo» o «fin de jornada» en la zona horaria de cada uno y envía la notificación por FCM. Marca como enviado para no repetir.

## Región

Por defecto las funciones se despliegan en `us-central1`. Si quieres Europa (menor latencia):

- En `index.js` no hace falta cambiar nada para callable.
- Para cambiar la región al desplegar: `firebase deploy --only functions` y en `firebase.json` puedes definir `functions.region` o usar la flag (consulta la doc de Firebase CLI).

Si despliegas en otra región (por ejemplo `europe-west1`), en la app debes inicializar Functions en esa región:

```javascript
import { getFunctions, httpsCallable } from "firebase/functions";
const functions = getFunctions(firebaseApp, "europe-west1");
```
