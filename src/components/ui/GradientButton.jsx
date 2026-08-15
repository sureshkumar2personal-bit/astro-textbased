import { Link } from 'react-router-dom'

const VARIANT_CLASS = {
  primary: 'btn-primary',
  accent: 'btn-gold',
  secondary: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

export default function GradientButton({
  children,
  variant = 'primary',
  size,
  to,
  className = '',
  icon: Icon,
  iconPosition = 'right',
  ...rest
}) {
  const cls = [
    'btn',
    VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
    size === 'sm' ? 'btn-sm' : '',
    className,
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon size={16} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={16} />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={cls} {...rest}>
      {content}
    </button>
  )
}
