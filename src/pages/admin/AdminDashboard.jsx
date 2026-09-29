import {
  BarChart3,
  CalendarDays,
  FileText,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import { useAuth } from '../../state/AuthContext.jsx'

// Placeholder Platform/Admin dashboard.
//
// Deliberately shows NO statistics. Every count in this app is currently either
// hardcoded seed data or per-role scoped, so rendering "Total Users: 1,284" here
// would be fabricated. The modules listed below are the real scope of the admin
// panel; each one is marked as not yet built rather than faked.

// All eleven modules below are built and reachable from the admin sidebar.
// `partial` marks the three whose underlying platform data is still incomplete,
// so the module is live but some of its sections show an honest empty state:
// Subscriptions are session-scoped and only seeded for a user account, Payments
// are held in a single wallet with no owner recorded, and Admin & Audit has no
// admin write path to record actions against.
const PLANNED_MODULES = [
  { label: 'Users', description: 'Manage customer accounts and access.', icon: Users, tone: 'violet', partial: false },
  { label: 'Astrologers', description: 'Manage astrologer profiles and verification.', icon: UserRound, tone: 'sky', partial: false },
  { label: 'Text-Based Questions', description: 'Oversee questions, campaigns and answers.', icon: MessageCircle, tone: 'green', partial: false },
  { label: 'Appointments', description: 'Review scheduling across astrologers.', icon: CalendarDays, tone: 'teal', partial: false },
  { label: 'Subscriptions', description: 'Review subscription plans and status.', icon: Star, tone: 'gold', partial: true },
  { label: 'Payments & Finance', description: 'Wallets, transactions and settlements.', icon: Wallet, tone: 'coral', partial: true },
  { label: 'Disputes', description: 'Track and resolve platform disputes.', icon: Megaphone, tone: 'red', partial: false },
  { label: 'Reviews & Ratings', description: 'Moderate customer feedback.', icon: Star, tone: 'amber', partial: false },
  { label: 'Content Management', description: 'Posts, campaigns and platform content.', icon: FileText, tone: 'neutral', partial: false },
  { label: 'Reports / Analytics', description: 'Platform-wide reporting.', icon: BarChart3, tone: 'sky', partial: false },
  { label: 'Admin & Audit', description: 'Administrator access and audit trail.', icon: ShieldCheck, tone: 'violet', partial: true },
]

export default function AdminDashboard() {
  const { currentUser } = useAuth()

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Platform Admin"
        subtitle={`Signed in as ${currentUser?.name || 'Administrator'}. This workspace will manage users, astrologers, and the platform modules around them.`}
      />

      <Section className="!mt-4">
        <div className="astrologer-list-section__grid">
          {PLANNED_MODULES.map((module) => {
            const Icon = module.icon
            return (
              <Card key={module.label} className="astrologer-card">
                <div className="astrologer-card__content">
                  <span className={`stat-icon tone-${module.tone}`} style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }}>
                    <Icon size={20} />
                  </span>
                  <h3 className="astrologer-card__name">{module.label}</h3>
                  <p className="astrologer-card__specialization">{module.description}</p>
                </div>
                <span className={`badge ${module.partial ? 'badge-amber' : 'badge-green'}`}>
                  {module.partial ? 'Live · partial data' : 'Live'}
                </span>
              </Card>
            )
          })}
        </div>
      </Section>

      <Section className="!mt-5">
        <Card>
          <div className="section-title" style={{ fontSize: 16, marginBottom: 8 }}>Getting started</div>
          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
            Every module in the sidebar is built and reads from the application's real stored records.
            Each one is read-only for now, and no counts or figures appear on this page — a module
            marked partial data has sections that show an empty state because the platform data behind
            them is not yet available to admins.
          </p>
        </Card>
      </Section>
    </div>
  )
}
