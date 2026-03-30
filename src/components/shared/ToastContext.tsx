import { ReactNode, createContext, useContext, useState, useRef, useEffect } from 'react'

export type ToastType = 'error' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = (id: string) => {
    // Clear timer if it exists
    const timer = timerRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timerRef.current.delete(id)
    }
    // Remove from state
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const addToast = (type: ToastType, message: string) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { id, type, message }

    setToasts(prev => [...prev, newToast])

    // Schedule auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      removeToast(id)
    }, 5000)

    timerRef.current.set(id, timer)
  }

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timerRef.current.forEach(timer => clearTimeout(timer))
      timerRef.current.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): Pick<ToastContextValue, 'addToast'> {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider')
  }
  return { addToast: context.addToast }
}

// Exported for internal use by ToastContainer
export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used inside a ToastProvider')
  }
  return context
}
