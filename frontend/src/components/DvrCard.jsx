export default function DvrCard({ result }) {
  const success = !!result.success
  const latency = result.latency
  const latencyDisplay = success ? `${latency} ms` : 'Host no alcanzable'
  const status = success ? (latency > 70 ? 'warning' : 'online') : 'offline'

  const statusClass = status === 'online'
    ? 'bg-green-500'
    : status === 'warning'
    ? 'bg-yellow-500'
    : 'bg-red-500'

  const statusText = status === 'online' ? 'Online' : status === 'warning' ? 'Lento' : 'Offline'
  const statusColor = status === 'online' ? '#22C55E' : status === 'warning' ? '#EAB308' : '#EF4444'
  const href = `https://${result.ip}:80`

  return (
    <div className={`min-w-[140px] sm:min-w-[160px] rounded-xl p-4 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 border-2 hover:delay-300 ${statusClass}`}>
      <a href={href} target="_blank" rel="noreferrer" className="block w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center p-2 rounded-lg">
          <h5 className="text-xs sm:text-sm font-bold text-white tracking-tight overflow-hidden text-ellipsis whitespace-nowrap w-full text-center" title={result.name}>
            {result.name}
          </h5>
          <div className="flex items-center my-2 justify-center w-full">
            <div className="relative mr-2">
              <div className={`w-3 h-3 rounded-full ${statusClass} animate-pulse`} style={{ boxShadow: `0 0 8px 2px ${statusColor}` }} />
            </div>
            <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusClass} text-white border border-white/70`}>
              {statusText}
            </span>
          </div>
          <p className="font-bold text-[10px] sm:text-xs text-white text-center break-words max-w-full">
            {latencyDisplay}
          </p>
        </div>
      </a>
    </div>
  )
}
