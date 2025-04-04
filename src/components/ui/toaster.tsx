
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="glass-card neon-glow border-white/10 backdrop-blur-md">
            <div className="grid gap-1">
              {title && <ToastTitle className="text-white font-medium">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-white/90">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-white hover:text-white/90 hover:bg-white/10" />
          </Toast>
        )
      })}
      <ToastViewport className="p-4" />
    </ToastProvider>
  )
}
