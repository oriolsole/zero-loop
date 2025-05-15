
import * as React from "react"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"

interface InfoBoxProps {
  title?: string
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

const InfoBox = React.forwardRef<
  HTMLDivElement,
  InfoBoxProps
>(({ title, children, className, icon, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative w-full rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
      className
    )}
    role="alert"
    {...props}
  >
    {icon || <Info className="h-4 w-4" />}
    {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
    <div className="text-sm [&_p]:leading-relaxed">{children}</div>
  </div>
))

InfoBox.displayName = "InfoBox"

export { InfoBox }
