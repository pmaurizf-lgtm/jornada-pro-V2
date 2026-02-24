# Guía de uso – Jornada Pro

**Jornada Pro © 1.0** – Control de jornada laboral  
**Autor:** Pablo Mouriz Fontao

---

## 1. Introducción

Jornada Pro es una aplicación para el control de la jornada laboral: registrar entradas y salidas, calcular horas trabajadas, horas extra, excesos y negativas, y mantener un banco de horas. Está pensada para uso en NAVANTIA (Ferrol), con soporte para turnos y festivos locales.

Los datos se guardan en el propio dispositivo (navegador). Puedes hacer backup y restaurar desde el menú de configuración.

---

## 2. Pantalla principal

- **Cabecera:** título de la app, logo y botón de menú (☰) para abrir **Configuración**.
- **Registro diario:** formulario con fecha, entrada, salida y acciones (Iniciar jornada, Finalizar, Guardar, Vacaciones, Eliminar).
- **Salidas teórica y ajustada:** se calculan en función de la jornada configurada.
- **Barra de progreso:** indica el avance del día respecto a la jornada nominal.
- **Resumen del día:** horas trabajadas, extra, exceso y negativa (en horas y minutos y en decimal).
- **Calendario:** vista mensual con registros, saldos y días festivos.
- **Banco de horas:** total disponible, generadas, exceso, negativas, disfrutadas y saldo anual.
- **Gráfico:** evolución del banco en el año seleccionado.

---

## 3. Registro diario

### 3.1 Iniciar la jornada

1. Selecciona la **fecha** del día (por defecto es hoy).
2. Pulsa **«Iniciar jornada»**. Se rellenará automáticamente la **hora de entrada** con la hora actual (o la de inicio del turno si tienes turnos configurados).
3. Puedes ajustar manualmente la entrada si lo necesitas.

Solo puede haber una jornada «iniciada» al día. Si ya has finalizado la jornada y pasas del fin teórico, el botón cambiará a **«Extender jornada»** (ver más adelante).

### 3.2 Finalizar la jornada

- Cuando tengas entrada puesta y quieras dar por terminado el día:
  1. Usa el **control deslizante** «Desliza para finalizar jornada»: arrastra hasta el final y suelta.
  2. La app pondrá la **hora de salida real** (o la salida teórica si no quieres horas extra).
  3. Se guarda el registro del día y se actualizan calendario, banco y gráfico.

El botón de finalizar solo está activo si hay una jornada en curso (día con entrada y sin salida guardada, o en «Continuar jornada» / «Extender jornada»).

### 3.3 Pase de salida (salir antes de completar la jornada)

Si intentas finalizar o guardar con una hora de salida **anterior al fin teórico** de la jornada, se abre un **modal de pase de salida** con dos opciones:

- **Pase de salida justificado**  
  La jornada se considera completada hasta el fin teórico y se cierra automáticamente. El botón principal pasará a «Continuar jornada» si quisieras volver a abrir el día.

- **Pase de salida sin justificar**  
  Se registra la salida y se descuenta del banco el tiempo no trabajado. Puedes pulsar **«Continuar jornada»** más tarde para reanudar; solo se descontará el tiempo entre la salida sin justificar y el momento de continuar.

### 3.4 Continuar jornada

Tras un pase (justificado o sin justificar), el botón **«Continuar jornada»** permite reabrir el día para seguir registrando. Al volver a finalizar, se tendrá en cuenta el tiempo total trabajado y las deducciones correspondientes.

### 3.5 Extender jornada (horas extra)

- Cuando la **jornada nominal** ha terminado (has llegado al fin teórico), la app puede preguntarte **«¿Vas a extender la jornada?»**.  
  - **Sí:** el tiempo que sigas se contará como **horas extra** (en bloques de 15 minutos) hasta que vuelvas a finalizar.
  - **No:** se cierra el día con la salida teórica.

- Si ya cerraste el día y es el mismo día, el botón puede mostrarse como **«Extender jornada»**. Al pulsarlo, se reabre el día en modo extensión y el tiempo adicional se suma como extra hasta que finalices de nuevo.

La extensión solo es posible hasta las 23:59. A partir de medianoche el botón vuelve a «Iniciar jornada» para el nuevo día.

### 3.6 Guardar (registro manual)

- Rellena **fecha**, **entrada** y, si procede, **salida real** y **salir antes (minutos)**.
- Pulsa **«Guardar»** para guardar o modificar el registro de ese día sin usar el flujo de Iniciar/Finalizar.

Si la salida es anterior al fin teórico, se mostrará también el modal de pase de salida.

### 3.7 Vacaciones

- Con el día seleccionado en el calendario/formulario, pulsa **«Vacaciones»**.  
- Ese día queda marcado como vacaciones (en el calendario se muestra el icono de playa 🏖️).  
- En un día marcado como vacaciones **no** se pueden usar los controles de entrada/salida ni Iniciar/Finalizar; solo puedes cambiar de fecha, marcar otro día como vacaciones o usar **«Eliminar»** en ese día para quitar la marca.

### 3.8 Eliminar registro del día

- Con el día seleccionado, pulsa **«Eliminar»**.  
- Aparece un mensaje de confirmación. Si confirmas, se borra todo el registro de ese día (entrada, salida, extra, negativa, etc.).  
- El día vuelve a estar «vacío» para poder registrarlo de nuevo si quieres.

### 3.9 Otros campos

- **Salir antes (minutos):** minutos que sales antes de la salida teórica (reduce tiempo trabajado / puede generar negativa).
- **Horas disfrutadas (min):** horas de banco que disfrutas ese día; se restan del banco en el resumen.

---

## 4. Calendario

- Muestra el mes actual (o el que navegues con las flechas).
- Cada celda es un día. **Pulsando** en un día lo seleccionas y se cargan sus datos en el formulario de registro.
- **Indicadores en las celdas:**
  - **Triángulo verde con ✓:** jornada completada (entrada y salida registradas).
  - **+X.Xh / −X.Xh:** saldo del día (positivo o negativo respecto a la jornada).
  - **Disfr. X.Xh:** horas disfrutadas ese día.
  - **🏖️:** día marcado como vacaciones.
- **Festivos:** se muestran resaltados (nacional, Galicia, Ferrol). Pulsar en un festivo muestra su nombre.
- Sábados y domingos tienen un estilo diferenciado.

---

## 5. Banco de horas

- **Total disponible:** horas que tienes en el banco (según configuración y registros).
- **Generadas / Exceso / Negativas / Disfrutadas:** desglose del año seleccionado.
- **Saldo anual:** resultado del año.
- Puedes cambiar el **año** del banco con el selector correspondiente.

El saldo inicial (horas extra previas, exceso previo) se configura en **Configuración → Configuración de jornada**. El botón **«Resetear saldo previo»** pone a cero esos valores.

---

## 6. Gráfico

- Muestra la evolución del **banco de horas** a lo largo del año seleccionado.
- Útil para ver tendencia y cómo afectan registros, disfrutes y negativas.

---

## 7. Configuración

Se abre desde el **menú (☰)** de la cabecera. Está organizada en bloques desplegables:

### 7.1 Datos personales

- **Nombre completo:** para exportaciones o identificación.
- **Número SAP:** 8 cifras (opcional).

### 7.2 Configuración de la aplicación

- **Tema:** Claro / Oscuro.
- **Notificaciones:** activar o desactivar. Las notificaciones (aviso previo al fin de jornada y aviso de fin de jornada) **solo funcionan con la app abierta** en primer plano.
- **Aviso antes de terminar (min):** minutos antes del fin teórico en que quieres recibir el aviso.

### 7.3 Configuración de jornada

- **Jornada (min):** duración nominal de la jornada en minutos (p. ej. 459 para 7h 39min).
- **Trabajo a turnos:** activar si trabajas por turnos.
- **Turno:** elegir horario (06-14, 14-22, 22-06) cuando turnos está activo.
- **Horas extra previas / Exceso de jornada previas:** saldo que arrastras de antes de usar la app.
- **Resetear saldo previo:** pone a cero las horas extra previas y el exceso previo.

### 7.4 Copia de datos y seguridad

- **Exportar Excel:** descarga una hoja con los registros (fechas, generadas, exceso, negativas, disfrutadas, vacaciones).
- **Backup:** descarga un archivo JSON con todos los datos (registros, configuración, banco, etc.).
- **Restaurar:** sube un archivo de backup (JSON) para recuperar un estado guardado.
- **Restaurar valores de fábrica:** borra todos los datos y deja la app como recién instalada. Se pide confirmación antes de ejecutar.

Al final del panel aparecen el nombre de la app, la versión y el autor.

**Guardar configuración:** después de cambiar cualquier opción, pulsa **«Guardar configuración»** para que los cambios se apliquen.

---

## 8. Notificaciones

- Si las notificaciones están activadas en configuración, la app puede mostrarte:
  - Un **aviso unos minutos antes** del fin teórico de la jornada.
  - Un **aviso al llegar** al fin teórico.
- Estas notificaciones **solo se muestran cuando la aplicación está abierta** (en primer plano). No se envían con la app en segundo plano o cerrada.

---

## 9. Resumen rápido

| Acción | Dónde |
|--------|--------|
| Empezar el día | Iniciar jornada |
| Terminar el día | Deslizar para finalizar jornada |
| Salir antes de hora | Modal → Pase justificado / sin justificar |
| Seguir después del fin teórico | Extender jornada (Sí en el modal o botón) |
| Guardar a mano un día | Rellenar fecha, entrada, salida → Guardar |
| Marcar vacaciones | Vacaciones |
| Borrar el día | Eliminar (con confirmación) |
| Cambiar tema, notificaciones, jornada | Menú ☰ → Configuración |
| Exportar datos | Configuración → Exportar Excel / Backup |
| Dejar la app como nueva | Configuración → Restaurar valores de fábrica |

---

*Documento generado para Jornada Pro. Para convertir esta guía a PDF, abre el archivo `GUIA-JORNADA-PRO.html` en un navegador y usa Imprimir → Guardar como PDF.*
