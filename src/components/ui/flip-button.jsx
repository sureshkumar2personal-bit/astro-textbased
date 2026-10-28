import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils.js'

export function FlipButton({ text1, text2, initialShow = false, className, onClick, ...props }) {
  const [show, setShow] = useState(initialShow)
  const flipVariants = {
    one: { rotateX: 0, backgroundColor: '#3a2618', color: '#ffffff' },
    two: { rotateX: 180, backgroundColor: '#f5b51b', color: '#3a2618' },
  }

  return (
    <motion.button
      type="button"
      className={cn('flip-button', className)}
      onClick={(event) => {
        event.stopPropagation()
        setShow((value) => !value)
        onClick?.(event)
      }}
      animate={show ? 'two' : 'one'}
      variants={flipVariants}
      transition={{ duration: 0.6, type: 'spring' }}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      {...props}
    >
      <motion.span
        animate={{ rotateX: show ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        {show ? text1 : text2}
      </motion.span>
    </motion.button>
  )
}

export default FlipButton
