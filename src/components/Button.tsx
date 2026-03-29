import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

const styles: Record<Variant, string> = {
  primary:   'bg-gray-900 text-white hover:bg-gray-700',
  secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
  danger:    'bg-red-600 text-white hover:bg-red-500',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
