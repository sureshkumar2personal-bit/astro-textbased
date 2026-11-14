import ConsultationHistoryTable from './ConsultationHistoryTable.jsx'
import InstantChatWorkspace from './instantchat/InstantChatWorkspace.jsx'

export default function InstantChatHistory() {
  return (
    <>
      <InstantChatWorkspace />
      <div className="icw-history"><ConsultationHistoryTable type="chat" title="Instant Chat History" /></div>
    </>
  )
}
