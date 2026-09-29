import Card from './Card.jsx'

// Shared status summary card used by the Text-Based Questions module
// (Questions and History) so both pages render the exact same card.
export default function SummaryCard({ label, value, hint, background, color, border, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="w-full text-left"
      style={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 'inherit',
        boxShadow: active ? `0 0 0 2px ${color}` : undefined,
        transition: 'box-shadow 200ms ease',
      }}
    >
      <Card className="h-full w-full" style={{ padding: 16, display: 'flex' }}>
        <div
          className="stat-card"
          style={{
            boxShadow: 'none',
            border: 'none',
            padding: 0,
            flex: '1 1 auto',
            alignItems: 'stretch',
            width: '100%',
          }}
        >
          <div
            className="text-center"
            style={{
              padding: '4px 8px 14px',
              borderRadius: 18,
              background,
              border: `1px solid ${border}`,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color,
                lineHeight: 1.25,
                minHeight: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.15, marginTop: 6 }}>{value}</div>
            <div
              className="muted"
              style={{
                fontSize: 11,
                marginTop: 2,
                lineHeight: 1.25,
                minHeight: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {hint}
            </div>
          </div>
        </div>
      </Card>
    </button>
  )
}
