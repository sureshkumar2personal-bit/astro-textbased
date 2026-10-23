import StatusBadge from '../StatusBadge.jsx'
import { TempleDonationBoxIcon } from '../TempleIcons.jsx'
import { campaignCardStatusStyle, campaignCardToneStyle } from './campaignCardTokens.js'

// Faithful, reusable port of the Astrologer Side "Manage Campaigns" campaign
// card design (TextBasedQuestions.jsx). The card chrome, status token map,
// typography, chip styles and detail strip copy that card 1:1 so a User Side
// campaign looks identical to an Active campaign on the Manage Campaigns page.
// Only the content children differ; no astrologer actions are copied here.

export function CampaignDetail({ label, children }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 3, whiteSpace: 'nowrap' }}>{children}</div>
    </div>
  )
}

export function CampaignStatusChip({ children, style }) {
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function OfferChip({ children }) {
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--gold-100)',
        color: 'var(--gold-600)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <span aria-hidden="true">🎁</span>
      {children}
    </span>
  )
}

// The Manage Campaigns card shell:
//   padding 22 · radius 22 · status gradient / border / shadow · gap 16
//   header (46px stat-icon, 16px/800 name, muted 11px subtitle, StatusBadge)
//   muted description · wrapped chips row · translucent detail strip · footer.
export default function CampaignCard({
  status = 'Active',
  tone,
  icon = <TempleDonationBoxIcon size={22} />,
  name,
  subtitle,
  description,
  chips = [],
  details = [],
  footer,
}) {
  const style = tone ? campaignCardToneStyle(tone) || campaignCardStatusStyle(status) : campaignCardStatusStyle(status)
  return (
    <div
      className="flex flex-col"
      style={{
        padding: 22,
        borderRadius: 22,
        border: `1px solid ${style.border}`,
        background: style.gradient,
        boxShadow: style.shadow,
        height: '100%',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span className="stat-icon" style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 14, background: style.softBg, color: style.accent }}>{icon}</span>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.3, overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{name}</div>
            {subtitle && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>
        <StatusBadge label={status} className={style.badge} />
      </div>

      {description && (
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>{description}</p>
      )}

      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{chips}</div>
      )}

      {details.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 16,
            border: '1px solid var(--surface-border)',
            background: 'rgba(255, 255, 255, 0.75)',
          }}
        >
          {details.map((detail) => <CampaignDetail key={detail.label} label={detail.label}>{detail.value}</CampaignDetail>)}
        </div>
      )}

      {footer && <div style={{ marginTop: 'auto' }}>{footer}</div>}
    </div>
  )
}

// Empty state in the same dashed-box language the Manage Campaigns page uses
// for "No campaigns yet" / filtered-empty states.
export function CampaignEmptyState({ icon, title, message, action }) {
  return (
    <div
      className="text-center"
      style={{
        padding: 'clamp(36px, 5vw, 52px) 24px',
        borderRadius: 24,
        border: '1.5px dashed rgba(91, 33, 182, 0.28)',
        background: 'linear-gradient(160deg, #F7F3FC 0%, #FFFFFF 100%)',
      }}
    >
      <span className="stat-icon tone-violet" style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px' }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{title}</h2>
      {message && <p className="muted" style={{ margin: '6px auto 16px', maxWidth: 380, fontSize: 13, lineHeight: 1.6 }}>{message}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
