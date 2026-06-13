import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "secondary" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "default", loading, disabled, children, ...props }, ref) => {
    
    const fallbackVariantClasses = {
      secondary: "bg-bg-elevated text-text-primary border border-border-default hover:bg-bg-card-hover shadow-sm rounded-full inline-flex items-center justify-center font-semibold transition-all focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-50",
      outline: "border-2 border-border-default bg-transparent text-text-primary rounded-full inline-flex items-center justify-center font-semibold transition-all duration-150 shadow-[0_3px_0_#E5E2E1] hover:translate-y-[-1px] hover:shadow-[0_4px_0_#D5D2D1] active:translate-y-[2px] active:shadow-none hover:border-text-secondary disabled:opacity-50",
      ghost: "hover:bg-bg-card-hover text-text-secondary hover:text-text-primary rounded-full inline-flex items-center justify-center font-semibold transition-all disabled:opacity-50",
      link: "text-accent-blue underline-offset-4 hover:underline inline-flex items-center justify-center font-semibold disabled:opacity-50",
    }
    
    const sizeClasses = {
      default: "h-14 px-8 text-base",
      sm: "h-10 px-4 text-sm",
      lg: "h-16 px-10 text-lg",
      icon: "h-12 w-12",
    }

    // Default rendering
    return (
      <button
        className={cn(
          fallbackVariantClasses[variant as keyof typeof fallbackVariantClasses],
          sizeClasses[size],
          className
        )}
        disabled={loading || disabled}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
