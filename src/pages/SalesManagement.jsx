import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  Megaphone,
  MessageCircleQuestion,
  Percent,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getMonthKeyFromDate, getMonthLabel, shiftMonthKey } from '../utils/questions.js'
import { getSalesReport } from '../utils/sales.js'
import { TempleReturnIcon } from '../components/TempleIcons.jsx'

function formatINR(value) {
  const amount = Number(value) || 0
  return `₹${amount.toLocaleString('en-IN')}`
}

function shortINR(value) {
  const amount = Number(value) || 0
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`
  return formatINR(amount)
}

function MonthSelector({ monthKey, onChange }) {
  const isCurrentMonth = Boolean(monthKey) && getMonthKeyFromDate(new Date()) === monthKey
  return (
    <div
      className="flex items-center gap-1"
      style={{
        padding: '5px 6px 5px 8px',
        borderRadius: 14,
        border: '1px solid var(--surface-border)',
        background: 'var(--surface-strong)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => onChange(shiftMonthKey(monthKey, -1))}><ArrowLeft size={15} /></button>
      <div style={{ minWidth: 132, textAlign: 'center', padding: '0 2px' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{getMonthLabel(monthKey)}</span>
        {isCurrentMonth && (
          <span className="muted" style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 1 }}>This month</span>
        )}
      </div>
      <button type="button" className="icon-btn" aria-label="Next month" onClick={() => onChange(shiftMonthKey(monthKey, 1))}><ArrowRight size={15} /></button>
    </div>
  )
}

function SalesStat({ icon: Icon, label, value, hint, background, color, border }) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        flex: '1 1 150px',
        minWidth: 0,
        padding: '14px 16px',
        borderRadius: 16,
        border: `1px solid ${border}`,
        background,
      }}
    >
      <span className="stat-icon" style={{ width: 38, height: 38, borderRadius: 11, color, background: 'rgba(255,255,255,0.75)', flexShrink: 0 }}><Icon size={17} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.2, marginTop: 2 }}>{value}</div>
        {hint && <div className="muted" style={{ fontSize: 10, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</div>}
      </div>
    </div>
  )
}

function BreakdownCard({ icon: Icon, title, subtitle, accent, gradient, border, rows }) {
  return (
    <div
      className="flex flex-col"
      style={{
        padding: '20px 22px',
        borderRadius: 20,
        border: `1px solid ${border}`,
        background: gradient,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="stat-icon" style={{ width: 40, height: 40, borderRadius: 12, color: accent, background: 'rgba(255,255,255,0.8)', flexShrink: 0 }}><Icon size={18} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{title}</div>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 600, marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{row.label}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatPurchaseDate(dateISO, fallback) {
  try {
    const date = new Date(dateISO)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    }
  } catch {
    // fall through to the display label
  }
  return fallback || '—'
}

export default function SalesManagement() {
  const { campaigns, questions } = useAppData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(currentUser?.role)
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined
  const astrologerId = currentUser?.id || 'astrologer-demo'
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getMonthKeyFromDate(new Date()) || '')

  const monthLabel = getMonthLabel(selectedMonthKey)
  const report = useMemo(
    () => getSalesReport({ questions, campaigns, astrologerId, monthKey: selectedMonthKey }),
    [questions, campaigns, astrologerId, selectedMonthKey],
  )

  const openQuestionsSold = report.openQuestions.reduce((sum, entry) => sum + entry.sold, 0)
  const openQuestionsRevenue = report.openQuestions.reduce((sum, entry) => sum + entry.netRevenue, 0)
  const campaignSold = report.campaignSales.reduce((sum, entry) => sum + entry.sold, 0)
  const campaignRevenue = report.campaignSales.reduce((sum, entry) => sum + entry.netRevenue, 0)

  const hasSales = report.rows.length > 0

  const openTransaction = (row) => {
    if (!row.id) return
    navigate(`${routes.answerQuestion}?questionId=${encodeURIComponent(row.id)}`)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer"
        title="Sales Management"
        subtitle="Track your Text-Based Questions sales, revenue, purchases, offers and transaction activity."
        showBack
        backTo={routes.dashboard}
        backIcon={backIcon}
        actions={<MonthSelector monthKey={selectedMonthKey} onChange={setSelectedMonthKey} />}
      />

      <Section
        title="Sales Overview"
        icon={TrendingUp}
        titleRight={<span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>{monthLabel}</span>}
      >
        <div
          style={{
            padding: 'clamp(20px, 3vw, 28px)',
            borderRadius: 24,
            border: '1px solid rgba(2, 132, 199, 0.20)',
            background: 'linear-gradient(150deg, #E7F2FB 0%, #F3F9FD 48%, #FFFFFF 100%)',
            boxShadow: '0 18px 42px rgba(2, 132, 199, 0.10)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 18 }}>
            <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="flex items-center gap-2.5">
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sky-400), var(--sky-600))', boxShadow: '0 0 0 4px rgba(2, 132, 199, 0.12)', flexShrink: 0 }} />
                <span className="muted" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Sales / Revenue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>{shortINR(report.overview.revenue)}</span>
                <span className="muted" style={{ fontSize: 15, fontWeight: 700 }}>{report.overview.sold} question{report.overview.sold === 1 ? '' : 's'} sold</span>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 10, maxWidth: 330 }}>
                Net of refunds for <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{monthLabel}</strong> from actual question purchases.
              </div>
            </div>

            <div style={{ flex: '1 1 430px', minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <SalesStat icon={ShoppingBag} label="Questions Sold" value={report.overview.sold} hint="Paid purchases" background="var(--sky-bg)" color="var(--sky-600)" border="rgba(2, 132, 199, 0.22)" />
              <SalesStat icon={Users} label="General" value={report.general.sold} hint={`₹${report.general.revenue.toLocaleString('en-IN')} net`} background="var(--success-bg)" color="var(--green-600)" border="rgba(16, 185, 129, 0.22)" />
              <SalesStat icon={MessageCircleQuestion} label="Personal" value={report.personal.sold} hint={`₹${report.personal.revenue.toLocaleString('en-IN')} net`} background="var(--primary-bg)" color="var(--primary)" border="rgba(91, 33, 182, 0.20)" />
              <SalesStat icon={Wallet} label="Refunded Amount" value={formatINR(report.overview.refunded)} hint="Completed refunds" background="var(--danger-bg)" color="var(--red-600)" border="rgba(239, 68, 68, 0.22)" />
              <SalesStat icon={BadgeIndianRupee} label="Net Revenue" value={formatINR(report.overview.netRevenue)} hint="After refunds" background="var(--gold-100)" color="var(--accent-dark)" border="rgba(242, 102, 42, 0.24)" />
            </div>
          </div>
        </div>
      </Section>

      {!hasSales && (
        <Section title="Sales & Transactions" icon={Receipt}>
          <div
            style={{
              padding: '56px 24px',
              borderRadius: 24,
              border: '1px dashed rgba(2, 132, 199, 0.28)',
              background: 'linear-gradient(150deg, #F4FAFE 0%, #FFFFFF 60%)',
              textAlign: 'center',
            }}
          >
            <span className="stat-icon tone-violet" style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto' }}><ShoppingBag size={28} /></span>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginTop: 16 }}>No sales yet</div>
            <p className="muted" style={{ margin: '8px auto 0', maxWidth: 400, fontSize: 13.5, lineHeight: 1.6 }}>
              Sales and purchase activity for this month will appear here once customers start purchasing questions.
            </p>
          </div>
        </Section>
      )}

      {hasSales && (
        <>
          <Section title="Sales Breakdown" icon={Receipt}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <BreakdownCard
                icon={Megaphone}
                title="Campaign Sales"
                subtitle={`${campaignSold} sold across campaigns`}
                accent="var(--primary)"
                gradient="linear-gradient(160deg, #F3EDFB 0%, #FAF7FF 55%, #FFFFFF 100%)"
                border="rgba(91, 33, 182, 0.18)"
                rows={[
                  { label: 'Questions Sold', value: campaignSold },
                  { label: 'Revenue', value: formatINR(campaignRevenue) },
                ]}
              />
              <BreakdownCard
                icon={MessageCircleQuestion}
                title="Open Question Sales"
                subtitle={`${openQuestionsSold} sold without a campaign`}
                accent="var(--sky-600)"
                gradient="linear-gradient(160deg, #E9F3FB 0%, #F5FAFD 55%, #FFFFFF 100%)"
                border="rgba(2, 132, 199, 0.18)"
                rows={[
                  { label: 'Questions Sold', value: openQuestionsSold },
                  { label: 'Revenue', value: formatINR(openQuestionsRevenue) },
                ]}
              />
              <BreakdownCard
                icon={Users}
                title="General vs Personal"
                subtitle="Split by existing question type"
                accent="var(--green-600)"
                gradient="linear-gradient(160deg, #EAF6F0 0%, #F6FBF9 55%, #FFFFFF 100%)"
                border="rgba(16, 185, 129, 0.20)"
                rows={[
                  { label: 'General Sales', value: `${report.general.sold} · ${formatINR(report.general.netRevenue)}` },
                  { label: 'Personal Sales', value: `${report.personal.sold} · ${formatINR(report.personal.netRevenue)}` },
                ]}
              />
            </div>
          </Section>

          <Section title="Campaign Performance" icon={Megaphone} titleRight={<span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>{monthLabel}</span>}>
            <div className="table-wrap">
              <table className="wallet-txn-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>General</th>
                    <th>Personal</th>
                    <th>Total Sold</th>
                    <th>Revenue</th>
                    <th>Refunds</th>
                  </tr>
                </thead>
                <tbody>
                  {report.campaignSales.map((entry) => (
                    <tr key={entry.campaignId}>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{entry.campaignName}</td>
                      <td>{entry.general || 0}</td>
                      <td>{entry.personal || 0}</td>
                      <td style={{ fontWeight: 800, color: 'var(--ink)' }}>{entry.sold}</td>
                      <td style={{ fontWeight: 800, color: 'var(--ink)' }}>{formatINR(entry.netRevenue)}</td>
                      <td style={{ color: entry.refunds > 0 ? 'var(--red-600)' : 'var(--text-secondary)' }}>{entry.refunds > 0 ? formatINR(entry.refunds) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Subscriber Offer Performance" icon={Percent} titleRight={<span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>{monthLabel}</span>}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                padding: '16px 18px',
                borderRadius: 18,
                border: '1px solid rgba(245, 158, 11, 0.24)',
                background: 'linear-gradient(150deg, #FFF7E8 0%, #FFFCF5 60%, #FFFFFF 100%)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <SalesStat icon={Percent} label="Campaigns w/ Offer" value={report.offerSummary.campaigns} hint="Offer enabled" background="var(--warning-bg)" color="var(--amber-600)" border="rgba(245, 158, 11, 0.28)" />
              <SalesStat icon={ShoppingBag} label="Offer Purchases" value={report.offerSummary.offerPurchases} hint="At discounted price" background="var(--gold-100)" color="var(--accent-dark)" border="rgba(242, 102, 42, 0.26)" />
              <SalesStat icon={Users} label="Regular Purchases" value={report.offerSummary.regularPurchases} hint="Full price" background="var(--neutral-bg)" color="var(--muted)" border="rgba(100, 116, 139, 0.18)" />
              <SalesStat icon={Wallet} label="Discount Given" value={formatINR(report.offerSummary.discountGiven)} hint="On offer purchases" background="var(--success-bg)" color="var(--green-600)" border="rgba(16, 185, 129, 0.22)" />
              <SalesStat icon={BadgeIndianRupee} label="Offer Revenue" value={formatINR(report.offerSummary.offerRevenue)} hint="Paid via offers" background="var(--sky-bg)" color="var(--sky-600)" border="rgba(2, 132, 199, 0.22)" />
            </div>
            {report.campaignsWithOffers.filter((entry) => entry.hasSales).length > 0 && (
              <div className="table-wrap" style={{ marginTop: 14 }}>
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Offer Discount</th>
                      <th>Offer Purchases</th>
                      <th>Regular Purchases</th>
                      <th>Discount Given</th>
                      <th>Revenue via Offers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.campaignsWithOffers
                      .filter((entry) => entry.hasSales)
                      .map((entry) => (
                        <tr key={entry.campaignId}>
                          <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{entry.campaignName}</td>
                          <td>{entry.discountPercent}%</td>
                          <td>{entry.offerPurchases}</td>
                          <td>{entry.regularPurchases}</td>
                          <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatINR(entry.discountGiven)}</td>
                          <td style={{ fontWeight: 800, color: 'var(--ink)' }}>{formatINR(entry.offerRevenue)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Sales Transactions" icon={Receipt} titleRight={<span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>{report.rows.length} transactions</span>}>
            <div className="table-wrap">
              <table className="wallet-txn-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Campaign</th>
                    <th>Question Type</th>
                    <th>Original Price</th>
                    <th>Discount</th>
                    <th>Paid Amount</th>
                    <th>Purchase Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="wallet-txn-row"
                      onClick={() => openTransaction(row)}
                      title="View question details"
                    >
                      <td style={{ fontWeight: 700, color: 'var(--ink)', minWidth: 120 }}>{row.customer}</td>
                      <td className="wallet-txn-date">{row.campaignName}</td>
                      <td>
                        <span className={`wallet-txn-type wallet-txn-type--${row.type.toLowerCase()}`}>{row.type} Question</span>
                      </td>
                      <td>{formatINR(row.originalPrice)}</td>
                      <td style={{ color: row.discount > 0 ? 'var(--green-600)' : 'var(--text-secondary)' }}>{row.discount > 0 ? `-${formatINR(row.discount)}` : '—'}</td>
                      <td style={{ fontWeight: 800, color: 'var(--ink)' }}>{formatINR(row.paid)}</td>
                      <td className="wallet-txn-date">{formatPurchaseDate(row.dateISO, row.dateLabel)}</td>
                      <td><StatusBadge label={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}