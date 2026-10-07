import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// `navigate(-1)` is only meaningful when the router actually has an entry behind
// the current page. React Router marks the first entry of a freshly loaded
// history stack with the key `default`, which is what a direct URL visit or a
// refresh looks like. In that case popping history would leave the app
// entirely, so callers pass the deterministic parent route for their flow and we
// replace instead of push, which keeps browser Back from bouncing between the
// same page and its fallback.
export function useSafeBack(fallback) {
  const navigate = useNavigate()
  const location = useLocation()
  const canGoBack = location.key !== 'default'

  return useCallback(() => {
    if (canGoBack) navigate(-1)
    else if (fallback) navigate(fallback, { replace: true })
  }, [canGoBack, fallback, navigate])
}
