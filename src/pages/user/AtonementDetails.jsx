import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import AtonementDayFlow from '../../components/atonements/AtonementDayFlow.jsx'
import useUserAtonements, { belongsToUser } from '../../state/useUserAtonements.js'
import './Atonements.css'

export default function AtonementDetails() {
  const { atonementId } = useParams()
  const { state: navState } = useLocation()
  const from = typeof navState?.from === 'string' ? navState.from : ''
  const fromQuestion = from.startsWith('/user/track-questions') ? from : null
  const fromAppointment = from.startsWith('/user/appointment-details') ? from : null
  const backTo = fromQuestion || fromAppointment
  const { allAtonements, currentUser, toggleDay, saveProof } = useUserAtonements()
  const atonement = allAtonements.find((item) => item.id === atonementId && belongsToUser(item, currentUser))
  const back = <Link to={backTo || '/user/atonements'} className="btn btn-ghost atonement-back"><ArrowLeft size={15} /> {fromQuestion ? 'Back to Question' : fromAppointment ? 'Back to Appointment' : 'Back to Atonements'}</Link>

  if (!atonement) return <div className="user-atonements-page atonements-page">{back}<Card className="atonement-empty"><h2>Atonement not found</h2><p>This remedy is not available.</p></Card></div>

  return <div className="user-atonements-page atonements-page atonement-details-page">
    {back}
    <AtonementDayFlow key={atonement.id} atonement={atonement} onToggleDay={(index) => toggleDay(atonement, index, true)} onSaveProof={(index, proof) => saveProof(atonement, index, proof)} />
  </div>
}
