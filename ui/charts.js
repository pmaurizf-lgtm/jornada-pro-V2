let chartInstance = null;

function getChartThemeColors() {
  const s = getComputedStyle(document.body);
  const getVar = (name) => s.getPropertyValue(name).trim();
  return {
    text: getVar("--text") || (document.body.classList.contains("dark") ? "#e5e7eb" : "#374151"),
    grid: getVar("--border") || "rgba(0,0,0,0.1)",
    barPositive: getVar("--positive") || "#16a34a",
    barNegative: getVar("--negative") || "#dc2626",
    barDisfrutadas: getVar("--primary") || "#2563eb"
  };
}

export function renderGrafico(canvas, resumen) {

  if (!canvas || typeof Chart === "undefined") return;

  const r = resumen || { generadas: 0, negativas: 0, disfrutadas: 0 };
  const generadas = (r.generadas || 0) / 60;
  const negativas = (r.negativas || 0) / 60;
  const disfrutadas = (r.disfrutadas || 0) / 60;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const theme = getChartThemeColors();

  // Destruir gráfico anterior si existe y es válido
  if (chartInstance && typeof chartInstance.destroy === "function") {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Generadas", "Negativas", "Disfrutadas"],
      datasets: [{
        label: "Horas",
        data: [generadas, negativas, disfrutadas],
        backgroundColor: [theme.barPositive, theme.barNegative, theme.barDisfrutadas]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: theme.text }
        }
      },
      scales: {
        x: {
          ticks: { color: theme.text },
          grid: { color: theme.grid }
        },
        y: {
          ticks: { color: theme.text },
          grid: { color: theme.grid }
        }
      }
    }
  });
}
