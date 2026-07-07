// src/components/ClaimRow.tsx

interface Props {
  name: string
  value: unknown
  description?: string
  highlight?: boolean
  mono?: boolean
}

export function ClaimRow({ name, value, description, highlight, mono }: Props) {
  const formatted = formatValue(value)

  return (
    <div className={`claim-row${highlight ? ' claim-row--highlight' : ''}`}>
      <div className="claim-row__meta">
        <code className="claim-row__name">{name}</code>
        {description && <span className="claim-row__desc">{description}</span>}
      </div>
      <div className={`claim-row__value${mono ? ' claim-row__value--mono' : ''}`}>
        {formatted}
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
