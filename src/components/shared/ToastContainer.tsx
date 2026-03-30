import { createPortal } from 'react-dom'
import { AlertCircle, AlertTriangle, X } from 'lucide-react'
import { useToastContext } from './ToastContext'
import './ToastContainer.css'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastContext()

  return createPortal(
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="alert"
          aria-live="assertive"
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="toast__icon" aria-hidden="true" />
          ) : (
            <AlertTriangle size={16} className="toast__icon" aria-hidden="true" />
          )}
          <span className="toast__message">{toast.message}</span>
          <button
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => removeToast(toast.id)}
            type="button"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
