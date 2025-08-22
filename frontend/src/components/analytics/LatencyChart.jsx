import { Line } from 'react-chartjs-2'
import { Chart, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler, CategoryScale } from 'chart.js'
import 'chartjs-adapter-date-fns'
import zoomPlugin from 'chartjs-plugin-zoom'
import annotationPlugin from 'chartjs-plugin-annotation'

Chart.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler, CategoryScale, zoomPlugin, annotationPlugin)

export default function LatencyChart({ chartData, range }) {
  const showChart = ['1h','3h','6h','12h'].includes(range)

  if (!showChart) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <i className="fas fa-chart-line text-3xl text-gray-400 mb-2"/>
          <h3 className="text-base font-medium text-gray-600 dark:text-gray-300 mb-1">Gráfica no disponible</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Las gráficas están limitadas a períodos de 12 horas o menos para optimizar el rendimiento.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Las estadísticas siguen disponibles arriba.</p>
        </div>
      </div>
    )
  }

  if (!chartData || !chartData.chartData) return (
    <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-chart-line text-3xl mb-2"/>
        <p>Sin datos de gráfica</p>
      </div>
    </div>
  )

  const labels = chartData.chartData.labels.map(ts => typeof ts === 'number' ? new Date(ts) : new Date(ts))

  const data = {
    labels,
    datasets: chartData.chartData.datasets
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    elements: {
      point: { radius: 2, hitRadius: 3, hoverRadius: 4 }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: ['1h','3h','6h'].includes(range) ? 'minute' : 'hour' },
        title: { display: true, text: 'Fecha/Hora' }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Latencia (ms)' }
      }
    },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label || 'Dato'
            const val = ctx.raw
            if (label === 'Fallos' && val !== null) return 'Ping fallido'
            if (val === null) return `${label}: Sin datos`
            return `${label}: ${val} ms`
          }
        }
      },
      annotation: chartData.thresholds ? {
        annotations: {
          stableLine: {
            type: 'line', yMin: chartData.thresholds.stable, yMax: chartData.thresholds.stable,
            borderColor: 'rgba(34, 197, 94, 0.8)', borderWidth: 2, borderDash: [3,3],
            label: { enabled: true, content: 'Estable', position: 'end' }
          },
          warningLine: {
            type: 'line', yMin: chartData.thresholds.warning, yMax: chartData.thresholds.warning,
            borderColor: 'rgba(255, 159, 64, 0.8)', borderWidth: 2, borderDash: [5,5],
            label: { enabled: true, content: 'Advertencia', position: 'end' }
          },
          criticalLine: {
            type: 'line', yMin: chartData.thresholds.critical, yMax: chartData.thresholds.critical,
            borderColor: 'rgba(239, 68, 68, 0.8)', borderWidth: 2, borderDash: [5,5],
            label: { enabled: true, content: 'Crítico', position: 'end' }
          }
        }
      } : undefined,
      zoom: {
        pan: { enabled: true, mode: 'x', speed: 10, threshold: 10 },
        zoom: { wheel: { enabled: true, speed: 0.1 }, pinch: { enabled: true }, mode: 'x' }
      }
    }
  }

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  )
}
