// Status token map and helpers shared by the campaign card design. These
// mirror the Astrologer Side "Manage Campaigns" card tokens 1:1 so a User Side
// campaign card uses the exact same colors, gradients and shadows.

export const CAMPAIGN_CARD_STATUS_STYLE = {
  Active: {
    accent: 'var(--green-600)',
    softBg: 'var(--success-bg)',
    border: 'rgba(16, 185, 129, 0.22)',
    gradient: 'linear-gradient(160deg, #EAF6F0 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(16, 185, 129, 0.10)',
    badge: '',
  },
  Scheduled: {
    accent: 'var(--sky-600)',
    softBg: 'var(--sky-bg)',
    border: 'rgba(2, 132, 199, 0.24)',
    gradient: 'linear-gradient(160deg, #EBF3FE 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(2, 132, 199, 0.10)',
    badge: '!bg-[color:var(--sky-bg)] !text-[color:var(--sky-600)]',
  },
  Draft: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
  Paused: {
    accent: 'var(--amber-600)',
    softBg: 'var(--warning-bg)',
    border: 'rgba(245, 158, 11, 0.26)',
    gradient: 'linear-gradient(160deg, #FCF6E6 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(245, 158, 11, 0.10)',
    badge: '!bg-[color:var(--warning-bg)] !text-[color:var(--amber-600)]',
  },
  Closed: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
  Expired: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
  Completed: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
}

const DEFAULT_CAMPAIGN_CARD_STATUS_STYLE = {
  accent: 'var(--primary)',
  softBg: 'var(--primary-bg)',
  border: 'rgba(91, 33, 182, 0.20)',
  gradient: 'linear-gradient(160deg, #ECE5F8 0%, #FFFFFF 100%)',
  shadow: '0 14px 34px rgba(91, 33, 182, 0.10)',
  badge: '',
}

// Topic tones for demo campaign cards. Each one mirrors the status-style shape
// (accent / softBg / border / gradient / shadow / badge) so a User Side card can
// get a distinct, tasteful pastel gradient per topic while staying inside the
// same design system the Manage Campaigns cards use.
export const CAMPAIGN_CARD_TONE_STYLES = {
  violet: {
    accent: 'var(--primary)',
    softBg: 'var(--primary-bg)',
    border: 'rgba(91, 33, 182, 0.20)',
    gradient: 'linear-gradient(160deg, #ECE5F8 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(91, 33, 182, 0.10)',
    badge: '!bg-[color:var(--primary-bg)] !text-[color:var(--primary)]',
  },
  rose: {
    accent: '#E11D48',
    softBg: '#FFF1F2',
    border: 'rgba(225, 29, 72, 0.18)',
    gradient: 'linear-gradient(160deg, #FEF0F3 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(225, 29, 72, 0.09)',
    badge: '!bg-[color:var(--danger-bg)] !text-[color:var(--red-600)]',
  },
  orange: {
    accent: '#EA580C',
    softBg: '#FFF7ED',
    border: 'rgba(234, 88, 12, 0.20)',
    gradient: 'linear-gradient(160deg, #FFF2E6 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(234, 88, 12, 0.09)',
    badge: '!bg-[color:var(--warning-bg)] !text-[color:var(--amber-600)]',
  },
  gold: {
    accent: '#B45309',
    softBg: 'var(--gold-100)',
    border: 'rgba(180, 83, 9, 0.20)',
    gradient: 'linear-gradient(160deg, #FDF3E3 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(180, 83, 9, 0.09)',
    badge: '!bg-[color:var(--gold-100)] !text-[color:var(--accent-dark)]',
  },
  green: {
    accent: 'var(--green-600)',
    softBg: 'var(--success-bg)',
    border: 'rgba(16, 185, 129, 0.22)',
    gradient: 'linear-gradient(160deg, #EAF6F0 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(16, 185, 129, 0.10)',
    badge: '!bg-[color:var(--success-bg)] !text-[color:var(--green-600)]',
  },
  teal: {
    accent: '#0D9488',
    softBg: '#F0FDFA',
    border: 'rgba(13, 148, 136, 0.20)',
    gradient: 'linear-gradient(160deg, #EAF7F4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(13, 148, 136, 0.09)',
    badge: '!bg-[color:#F0FDFA] !text-[#0D9488]',
  },
  sky: {
    accent: 'var(--sky-600)',
    softBg: 'var(--sky-bg)',
    border: 'rgba(2, 132, 199, 0.24)',
    gradient: 'linear-gradient(160deg, #EBF3FE 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(2, 132, 199, 0.10)',
    badge: '!bg-[color:var(--sky-bg)] !text-[color:var(--sky-600)]',
  },
  slate: {
    accent: 'var(--muted)',
    softBg: 'var(--neutral-bg)',
    border: 'rgba(107, 114, 128, 0.26)',
    gradient: 'linear-gradient(160deg, #F1EFF4 0%, #FFFFFF 100%)',
    shadow: '0 14px 34px rgba(107, 114, 128, 0.10)',
    badge: '!bg-[color:var(--neutral-bg)] !text-[color:var(--muted)]',
  },
}

export function campaignCardToneStyle(tone) {
  return CAMPAIGN_CARD_TONE_STYLES[tone] || null
}

export function campaignCardStatusStyle(status) {
  return CAMPAIGN_CARD_STATUS_STYLE[status] || DEFAULT_CAMPAIGN_CARD_STATUS_STYLE
}

export function inr(value) {
  return Number(value || 0).toLocaleString('en-IN')
}