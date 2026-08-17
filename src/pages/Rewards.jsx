import { useEffect, useRef } from 'react'
import { Gift } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

function formatDateMs(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Rewards() {
  const { currentUser } = useAuth()
  const { actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const initialized = useRef(false)
  const discountStatus = actions.getDiscountStatus(currentUser?.id)

  useEffect(() => {
    if (initialized.current || !currentUser?.id) return
    initialized.current = true
    actions.markExpiredDiscountQuestions(currentUser.id)
    actions.renewMonthlyDiscountQuestions(currentUser.id)
  }, [currentUser?.id, actions])

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Rewards" subtitle="Manage your subscriber benefits and discount questions." />
      <Section title="Discount Questions" icon={Gift}>
        <div
          className="card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            background: 'linear-gradient(135deg, var(--violet-50), var(--primary-bg))',
            border: '1px solid var(--primary-border)',
            padding: '18px 20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>
              <Gift size={18} color="var(--primary)" />
              Discount Question
            </div>
            {discountStatus.state === 'available' && (
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
                1 Discount Question Available<br />
                Valid until: {formatDateMs(discountStatus.validUntil)}
              </div>
            )}
            {discountStatus.state === 'used' && (
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
                Used<br />
                Next question available: {formatDateMs(discountStatus.nextAvailable)}
              </div>
            )}
            {discountStatus.state === 'expired' && <div className="muted" style={{ marginTop: 8 }}>Expired</div>}
            {discountStatus.state === 'none' && <div className="muted" style={{ marginTop: 8 }}>No discount questions available.</div>}
          </div>
          {discountStatus.state === 'available' && <button className="btn btn-primary" type="button" onClick={() => navigate(routes.discountQuestions)}>Use Discount Questions</button>}
        </div>
      </Section>
    </div>
  )
}
