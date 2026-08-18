import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

export default function Rewards() {
  const { currentUser } = useAuth()
  const { actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const initialized = useRef(false)
  const [hasCheckedRewards, setHasCheckedRewards] = useState(false)
  const discountStatus = actions.getDiscountStatus(currentUser?.id)

  useEffect(() => {
    if (initialized.current || !currentUser?.id) {
      setHasCheckedRewards(true)
      return
    }
    initialized.current = true
    actions.markExpiredDiscountQuestions(currentUser.id)
    actions.renewMonthlyDiscountQuestions(currentUser.id)
    setHasCheckedRewards(true)
  }, [currentUser?.id, actions])

  if (!hasCheckedRewards) {
    return null
  }

  return <Navigate to={discountStatus.state === 'available' ? routes.discountQuestions : routes.astrologers} replace />
}
