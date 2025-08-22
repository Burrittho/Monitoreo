const ranges = ['1h','3h','6h','12h','24h','3d','7d','30d']
export default function RangeButtons({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ranges.map(r => (
        <button 
          key={r} 
          onClick={() => !disabled && onChange(r)} 
          disabled={disabled} 
          className={`px-3 py-1 rounded text-sm transition-colors ${
            value === r
              ? 'bg-gray-700 dark:bg-gray-600 text-white border border-gray-700 dark:border-gray-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
