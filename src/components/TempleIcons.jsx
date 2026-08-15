function IconBase({ children, size = 18, className = '', color = 'currentColor', strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function TempleArchIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 10l8-6 8 6" />
      <path d="M5 20h14" />
      <path d="M7 10v10" />
      <path d="M12 8v12" />
      <path d="M17 10v10" />
      <circle cx="12" cy="4" r="1" />
    </IconBase>
  )
}

export function TempleDonationBoxIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M9 8V7.2A3 3 0 0 1 12 4a3 3 0 0 1 3 3.2V8" />
      <path d="M8 12h8" />
      <circle cx="12" cy="4" r="1.3" />
    </IconBase>
  )
}

export function TempleBellIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M9 6.5A3 3 0 0 1 15 6.5" />
      <path d="M7 14a5 5 0 1 1 10 0v3H7z" />
      <path d="M12 3.5V2" />
      <path d="M12 17v1" />
      <circle cx="12" cy="18.5" r="1" />
    </IconBase>
  )
}

export function TempleLotusIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 19c-3 0-5.5-2.2-5.5-5 0-2.2 1.3-4 3.1-5.1" />
      <path d="M12 19c3 0 5.5-2.2 5.5-5 0-2.2-1.3-4-3.1-5.1" />
      <path d="M12 18V9" />
      <path d="M9 14.2c.8-1.8 2-3 3-3.7 1 .7 2.2 1.9 3 3.7" />
      <path d="M8 12.5c-.6-1.8-.3-3.8 1-5" />
      <path d="M16 12.5c.6-1.8.3-3.8-1-5" />
      <path d="M12 8V4" />
    </IconBase>
  )
}

export function TempleShieldIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3 19 6v5c0 4.2-2.7 7.6-7 10-4.3-2.4-7-5.8-7-10V6z" />
      <path d="M12 8v8" />
      <path d="M9.5 11.5h5" />
      <circle cx="12" cy="11.5" r="1" />
    </IconBase>
  )
}

export function TempleScrollIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 6h9a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2H8a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2Z" />
      <path d="M6 6c0 1.7 1.3 3 3 3h6" />
      <path d="M9 12h5" />
      <path d="M9 15h6" />
      <circle cx="16.5" cy="7.5" r="0.9" />
    </IconBase>
  )
}

export function TempleSearchIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="5" />
      <path d="M15 15l4 4" />
      <path d="M8.5 7.5 11 5l2.5 2.5" />
      <path d="M11 5v3" />
    </IconBase>
  )
}

export function TempleLampIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 4c1.8 2 2.8 3.7 2.8 5.2A2.8 2.8 0 0 1 12 12a2.8 2.8 0 0 1-2.8-2.8C9.2 7.7 10.2 6 12 4Z" />
      <path d="M7 14h10" />
      <path d="M8.2 14c0 2.5 1.7 4.5 3.8 4.5s3.8-2 3.8-4.5" />
      <path d="M6.5 20h11" />
      <path d="M12 12v2" />
    </IconBase>
  )
}

export function TempleCycleIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6.5 8A8 8 0 0 1 18 6.5" />
      <path d="M18 6.5V10h-3.5" />
      <path d="M17.5 16A8 8 0 0 1 6 17.5" />
      <path d="M6 17.5V14h3.5" />
      <circle cx="12" cy="12" r="2.2" />
    </IconBase>
  )
}

export function TempleReturnIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M10 5 4 11l6 6" />
      <path d="M4 11h10a4 4 0 0 1 4 4v1" />
      <path d="M18 16v4h-4" />
      <path d="M12 4h6v4" />
    </IconBase>
  )
}

