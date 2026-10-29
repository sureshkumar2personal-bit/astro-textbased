import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { cn } from '../../lib/utils.js'

export interface TiltCardProps {
  tiltLimit?: number
  scale?: number
  perspective?: number
  effect?: 'gravitate' | 'evade'
  spotlight?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function TiltCard({
  tiltLimit = 15,
  scale = 1.05,
  perspective = 1200,
  effect = 'evade',
  spotlight = true,
  className,
  style,
  children,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState(
    `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
  )
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)
  const direction = effect === 'evade' ? -1 : 1

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const element = cardRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    const xRotation = (py - 0.5) * (tiltLimit * 2) * direction
    const yRotation = (px - 0.5) * -(tiltLimit * 2) * direction

    setTransform(
      `perspective(${perspective}px) rotateX(${xRotation}deg) rotateY(${yRotation}deg) scale3d(${scale}, ${scale}, ${scale})`,
    )
    if (spotlight) setSpotlightPos({ x: px * 100, y: py * 100 })
  }, [direction, perspective, scale, spotlight, tiltLimit])

  const handlePointerLeave = useCallback(() => {
    setTransform(
      `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
    )
    setIsHovered(false)
  }, [perspective])

  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn('will-change-transform relative overflow-hidden', className)}
      style={{
        transform,
        transition: 'transform 0.2s ease-out',
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {children}
      {spotlight && (
        <div
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s' }}
        >
          <div
            className="absolute h-[200%] w-[200%] rounded-full"
            style={{
              left: `${spotlightPos.x}%`,
              top: `${spotlightPos.y}%`,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 40%)',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default TiltCard
