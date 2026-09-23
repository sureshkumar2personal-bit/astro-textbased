import { useState } from 'react'
import { Send, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../state/AuthContext.jsx'
import { useEditor } from '../../state/EditorContext.jsx'
import { hasEditorPermission } from '../../utils/editorAccess.js'
import PerksBenefitManagement from '../astrologer/PerksBenefitManagement.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import '../../pages/astrologer/perksSettings.css'
import './editor-perks.css'

const INITIAL_CONFIG = {
  Silver: { price: 199, discounts: { questions: 10, audio: 10, appointments: 10, emergency: 5 }, access: { booking: 'Standard', live: 'Standard Access', content: 'Standard' }, categories: [] },
  Gold: { price: 399, discounts: { questions: 20, audio: 15, appointments: 15, emergency: 10 }, access: { booking: 'Priority', live: 'Early Access', content: 'Early Access' }, categories: [] },
  Platinum: { price: 699, discounts: { questions: 30, audio: 20, appointments: 20, emergency: 15 }, access: { booking: 'Priority+', live: 'Priority Access', content: 'Premium Access' }, categories: [] },
}

export default function EditorPerks() {
  const { currentUser } = useAuth(); const { currentEditor, saveDraft, submitDraft, recordAudit } = useEditor(); const editor = currentEditor || currentUser
  const canConfigure = hasEditorPermission(editor, 'Perks', 'Configure'); const canSubmit = hasEditorPermission(editor, 'Perks', 'Submit'); const [config, setConfig] = useState(INITIAL_CONFIG); const [saved, setSaved] = useState(null)
  const save = (nextConfig) => { setConfig(nextConfig); const draft = saveDraft({ id: saved?.id, module: 'Perks', action: 'configure', payload: nextConfig }); setSaved(draft); recordAudit('Perks Configured', 'Perks', 'Saved subscriber benefit configuration draft.') }
  const submit = () => { const draft = saved || saveDraft({ module: 'Perks', action: 'configure', payload: config }); submitDraft(draft.id); setSaved({ ...draft, status: 'pending' }); recordAudit('Perks Submitted', 'Perks', 'Submitted subscriber benefits for approval.') }
  return <section className="editor-page editor-perks-page"><div className="editor-page-intro"><span className="editor-eyebrow">PERKS & BENEFITS</span><h2>Subscriber benefit management</h2><p>Use the same subscriber plan and benefit management page as the astrologer. Changes stay in editor approval until accepted.</p></div><div className="editor-perks-banner"><div><ShieldCheck size={18} /><span>Editor draft workspace</span><small>Live subscriber benefits are not changed by this page.</small></div>{saved && <StatusBadge label={saved.status === 'pending' ? 'Pending Approval' : 'Draft'} />}</div><div className={canConfigure ? '' : 'editor-perks-readonly'}><PerksBenefitManagement tierConfigs={config} onSave={canConfigure ? save : () => {}} onReset={() => setSaved(null)} /></div>{canSubmit && saved && <div className="editor-perks-submit"><span>Review the configuration before sending it to the astrologer.</span><button type="button" className="btn btn-primary" onClick={submit}><Send size={16} /> Submit for Approval</button></div>}</section>
}
