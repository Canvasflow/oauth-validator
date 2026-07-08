interface Props {
  name: string
  value: unknown
  description?: string
  highlight?: boolean
  pills?: boolean
}

export function ClaimRow({ name, value, description, highlight, pills }: Props) {
  const isArray = Array.isArray(value)
  const showPills = pills && isArray

  return (
    <div className={`grid grid-cols-[200px_1fr] items-baseline gap-3 py-2 border-b border-rim last:border-0 ${
      highlight ? 'bg-warn/5 -mx-1 px-1 rounded border-b-transparent' : ''
    }`}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <code className="font-mono text-[0.82rem] text-brand bg-transparent p-0 break-all">{name}</code>
        {description && <span className="text-[0.74rem] text-ink3 leading-snug">{description}</span>}
      </div>
      <div className="text-[0.875rem] text-ink break-all">
        {showPills ? (
          (value as unknown[]).length === 0
            ? <span className="text-ink3">[] (empty)</span>
            : (
              <div className="flex flex-wrap gap-1.5">
                {(value as unknown[]).map((item, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20">
                    {String(item)}
                  </span>
                ))}
              </div>
            )
        ) : (
          formatValue(value)
        )}
      </div>
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) {
    if (value.length === 0) return '[] (empty)'
    return value.map((v) => String(v)).join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}
