export default function Card({ children, className = '', hover = false, as: As = 'div', ...rest }) {
  return (
    <As className={`card${hover ? ' card-hover' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </As>
  )
}
