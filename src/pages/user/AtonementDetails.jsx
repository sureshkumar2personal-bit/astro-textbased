import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import AtonementDayFlow from '../../components/atonements/AtonementDayFlow.jsx'
import useUserAtonements, { belongsToUser } from '../../state/useUserAtonements.js'
import './Atonements.css'

export default function AtonementDetails() {
  const { atonementId } = useParams()
  const { allAtonements, currentUser, toggleDay, saveProof } = useUserAtonements()
  const atonement = allAtonements.find((item) => item.id === atonementId && belongsToUser(item, currentUser))
  const back = <Link to="/user/atonements" className="btn btn-ghost atonement-back"><ArrowLeft size={15} /> Back to Atonements</Link>

  if (!atonement) return <div className="user-atonements-page atonements-page">{back}<Card className="atonement-empty"><h2>Atonement not found</h2><p>This remedy is not available.</p></Card></div>

  return <div className="user-atonements-page atonements-page atonement-details-page">
    {back}
    <AtonementDayFlow key={atonement.id} atonement={atonement} onToggleDay={(index) => toggleDay(atonement, index, true)} onSaveProof={(index, proof) => saveProof(atonement, index, proof)} />
  </div>
}
