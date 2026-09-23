import { useAuth } from '../../state/AuthContext.jsx'
import { useEditor } from '../../state/EditorContext.jsx'
import { hasEditorPermission } from '../../utils/editorAccess.js'
import AppointmentAvailabilityPanel from '../astrologer/appointments/AppointmentAvailabilityPanel.jsx'
import './editor-availability.css'

export default function EditorAvailability() {
  const { currentUser } = useAuth()
  const { currentEditor } = useEditor()
  const editor = currentEditor || currentUser
  const astrologerId = editor?.astrologerId || currentUser?.astrologerId
  const canEdit = hasEditorPermission(editor, 'Availability', 'Edit')
  const canPublish = hasEditorPermission(editor, 'Availability', 'Publish')

  return (
    <section className={`editor-page editor-availability-page${canEdit ? '' : ' is-readonly'}`}>
      <div className="editor-page-intro">
        <span className="editor-eyebrow">EDITOR WORKSPACE</span>
        <h2>Appointments</h2>
        <p>Manage appointment availability using the same calendar workspace as the astrologer.</p>
      </div>
      <div className="editor-availability-access-note">
        <span>{canEdit ? 'Availability editing enabled' : 'Availability view only'}</span>
        <small>{canPublish ? 'You can publish assigned changes.' : 'Publishing remains with the astrologer.'}</small>
      </div>
      <AppointmentAvailabilityPanel
        astrologerId={astrologerId}
        onPublished={() => undefined}
      />
    </section>
  )
}
