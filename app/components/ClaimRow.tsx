interface Props {
  name: string
  value: unknown
  description?: string
  highlight?: boolean
}

export function ClaimRow({ name, value, description, highlight }: Props) {
  const formatted = formatValue(value)
  return (
    <div className={`grid grid-cols-[200px_1fr] items-baseline gap-3 py-2 border-b border-rim last:border-0 ${
      highlight ? 'bg-warn/5 -mx-1 px-1 rounded border-b-transparent' : ''
    }`}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <code className="font-mono text-[0.82rem] text-brand bg-transparent p-0 break-all">{name}</code>
        {description && <span className="text-[0.74rem] text-ink3 leading-snug">{description}</span>}
      </div>
      <div className="text-[0.875rem] text-ink break-all">{formatted}</div>
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
