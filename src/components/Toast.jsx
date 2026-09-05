import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return { toast: () => {}, success: () => {} }
  }
  return ctx
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (message, options = {}) => {
      const id = `toast-${++toastId}`
      const kind = options.kind || 'success'
      setToasts((prev) => [...prev.slice(-3), { id, message, kind }])
      timers.current[id] = setTimeout(() => remove(id), 3200)
    },
    [remove],
  )

  const success = useCallback((message) => push(message, { kind: 'success' }), [push])

  const value = { toast: push, success }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="apt-toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className="apt-toast" role="status">
            <div className="apt-toast-icon">
              <CheckCircle2 size={18} />
            </div>
            <div className="apt-toast-content">
              <div className="apt-toast-title">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
