import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, History, SlidersHorizontal } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import BenefitManagementLanding from './astrologer/BenefitManagementLanding.jsx'
import PerksSettings, { SubscriberProgramGlance } from './astrologer/PerksSettings.jsx'
import { INITIAL_DELIVERIES, INITIAL_TIER_CONFIGS } from './PerksAndBenefits.jsx'
import './astrologer/perksSettings.css'

export default function BenefitManagementLandingPage() {
  const navigate = useNavigate()
  const [benefits, setBenefits] = useState(INITIAL_DELIVERIES)
  const [tierConfigs, setTierConfigs] = useState(INITIAL_TIER_CONFIGS)
  const openEditor = (template) => navigate(template ? `/astrologer/perks-benefits/settings?template=${template}` : '/astrologer/perks-benefits/settings')
  const deleteBenefit = (benefit) => setBenefits((current) => current.filter((item) => item.id !== benefit.id))

  return <div className="perks-benefits-page">
    <button type="button" className="perks-benefits-back" onClick={() => navigate('/astrologer/dashboard')}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
    <PageHeader eyebrow="Astrologer Workspace" title="Benefit Management" />
    <SubscriberProgramGlance className="mt-4" />
    <Section className="mt-4">
      <div className="perks-tab-navigation">
        <button type="button" className="perks-tab-btn active" onClick={() => navigate('/astrologer/perks-benefits')}><SlidersHorizontal size={18} /><span>Benefit Management</span></button>
        <button type="button" className="perks-tab-btn" onClick={() => navigate('/astrologer/perks-benefits/history')}><History size={18} /><span>History</span></button>
      </div>
    </Section>
      <BenefitManagementLanding
        benefits={benefits}
        onCreate={() => openEditor('zodiac')}
        onSpecialization={() => openEditor('specialization')}
        onEdit={openEditor}
        onView={openEditor}
        onPreview={openEditor}
        onDelete={deleteBenefit}
      />
    <div className="benefit-landing-parameters">
      <PerksSettings
        showGlance={false}
        tierConfigs={tierConfigs}
        onTierSave={(tier, nextConfig) => setTierConfigs((current) => ({ ...current, [tier]: nextConfig }))}
        onSave={() => {}}
      />
    </div>
  </div>
}
