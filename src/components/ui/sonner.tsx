
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/90 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg group-[.toaster]:shadow-primary/10 group-[.toaster]:border-2",
          description: "group-[.toast]:text-white/80",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          info: "group-[.toast]:bg-blue-900/70 group-[.toaster]:border-blue-500/30",
          success: "group-[.toast]:bg-green-900/70 group-[.toaster]:border-green-500/30",
          warning: "group-[.toast]:bg-yellow-900/70 group-[.toaster]:border-yellow-500/30",
          error: "group-[.toast]:bg-red-900/70 group-[.toaster]:border-red-500/30",
        },
      }}
      position="top-right"
      expand={false}
      closeButton={true}
      richColors={true}
      {...props}
    />
  )
}

export { Toaster }
