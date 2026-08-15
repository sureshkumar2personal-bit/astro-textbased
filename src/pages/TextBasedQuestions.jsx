import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import {
  TempleArchIcon,
  TempleBellIcon,
  TempleDonationBoxIcon,
  TempleLampIcon,
  TempleLotusIcon,
  TempleReturnIcon,
  TempleScrollIcon,
} from '../components/TempleIcons.jsx'

export default function TextBasedQuestions() {
  const { questions, liveStreamOpen, setLiveStreamOpen } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)

  const generalQuestion = questions.find((question) => question.type === 'General')
  const personalQuestion = questions.find((question) => question.type === 'Personal')
  const pendingCount = questions.filter((question) => question.status === 'Pending').length
  const inProgressCount = questions.filter((question) => question.status === 'In Progress').length
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined

  return (
    <div>
      <PageHeader
        eyebrow={currentUser?.role === 'astrologer' ? 'Astrologer' : 'User'}
        title="Text Based Questions"
        showBack
        backTo={routes.dashboard}
        backIcon={backIcon}
      />

      <div className="section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22 }}>
        <Card>
          <div className="section-title"><TempleArchIcon size={18} />Active Campaigns</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
              <div className="stat-icon tone-violet"><TempleScrollIcon size={18} /></div>
              <div>
                <div className="stat-value">{questions.length}</div>
                <div className="stat-label">Questions in queue</div>
              </div>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
              <div className="stat-icon tone-gold"><TempleLampIcon size={18} /></div>
              <div>
                <div className="stat-value">{pendingCount}</div>
                <div className="stat-label">Pending Today</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="section-title"><TempleDonationBoxIcon size={18} />Pending Submission</div>
          <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0, marginBottom: 16 }}>
            <div className="stat-icon tone-sky"><TempleDonationBoxIcon size={18} /></div>
            <div>
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-label">Submitted Questions</div>
            </div>
          </div>
          <Link to={`${routes.answerQuestion}?questionId=${generalQuestion?.id || ''}`} className="btn btn-outline" style={{ width: '100%', justifyContent: 'space-between' }}>
            <TempleScrollIcon size={15} />General Question View
          </Link>
        </Card>

        <Card>
          <div className="section-title"><TempleLotusIcon size={18} />Question Queue</div>
          <div className="stat-card" style={{ boxShadow: 'none', border: 'none', padding: 0, marginBottom: 16 }}>
            <div className="stat-icon tone-green"><TempleLotusIcon size={18} /></div>
            <div>
              <div className="stat-value">{inProgressCount}</div>
              <div className="stat-label">Pending Answer</div>
            </div>
          </div>
          <Link to={`${routes.answerQuestion}?questionId=${personalQuestion?.id || ''}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'space-between' }}>
            <TempleArchIcon size={15} />Personal Question View
          </Link>
        </Card>
      </div>

      <div className="section">
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            <TempleBellIcon size={18} />Live Streaming
          </div>
          <button className="btn btn-gold" onClick={() => setLiveStreamOpen(!liveStreamOpen)}>Show Live Schedule</button>
        </Card>
      </div>

      {liveStreamOpen && (
        <Section title="Live Schedule">
          <Card>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="badge badge-violet" style={{ width: 'fit-content' }}>08:00 AM - Tamil General Reading</div>
              <div className="badge badge-green" style={{ width: 'fit-content' }}>10:30 AM - Business Strategy Session</div>
              <div className="badge badge-blue" style={{ width: 'fit-content' }}>06:00 PM - Personal Guidance Live</div>
            </div>
          </Card>
        </Section>
      )}
    </div>
  )
}
