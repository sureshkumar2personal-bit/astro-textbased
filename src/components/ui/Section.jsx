export default function Section({ title, icon: Icon, children, className = '', titleRight }) {
  return (
    <div className={`section${className ? ` ${className}` : ''}`}>
      {title && (
        <div className="section-title" style={titleRight ? { justifyContent: 'space-between' } : undefined}>
          <span className="flex items-center gap-2.5">
            {Icon && <Icon size={20} />}
            {title}
          </span>
          {titleRight}
        </div>
      )}
      {children}
    </div>
  )
}
