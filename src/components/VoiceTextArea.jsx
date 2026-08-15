import { useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was denied. Allow microphone permission in your browser and try again.',
  'service-not-allowed': 'Microphone access was denied. Allow microphone permission in your browser and try again.',
  'no-speech': "Didn't catch that. Tap the mic and try speaking again.",
  'audio-capture': 'No microphone was found on this device.',
  network: 'Voice input needs an internet connection. Please try again.',
}

export default function VoiceTextArea({ value, onChange, maxLength, placeholder, style, lang = 'en-IN' }) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const baseTextRef = useRef('')

  const stopListening = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }

  const startListening = () => {
    if (!SpeechRecognitionImpl) {
      setError("Voice input isn't supported in this browser. Try Chrome or Edge instead.")
      return
    }

    setError('')
    const recognition = new SpeechRecognitionImpl()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    baseTextRef.current = value

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      const separator = baseTextRef.current && !baseTextRef.current.endsWith(' ') ? ' ' : ''
      onChange(`${baseTextRef.current}${separator}${transcript}`.slice(0, maxLength))
    }
    recognition.onerror = (event) => {
      setError(ERROR_MESSAGES[event.error] || 'Voice input stopped unexpectedly. Please try again.')
      stopListening()
    }
    recognition.onend = () => stopListening()

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const remaining = maxLength - value.length

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <textarea
          className="textarea-box"
          style={{ paddingRight: 52, ...style }}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => (isListening ? stopListening() : startListening())}
          aria-label={isListening ? 'Stop voice input' : 'Speak your question'}
          title={isListening ? 'Stop voice input' : 'Speak your question'}
          className={[
            'absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border transition duration-200',
            isListening
              ? 'motion-safe:animate-pulse border-transparent bg-[color:var(--red-500)] text-white shadow-[0_8px_18px_rgba(239,68,68,0.35)]'
              : 'border-[color:var(--line)] bg-white/90 text-[color:var(--violet-600)] hover:-translate-y-0.5 hover:border-[color:var(--violet-300)]',
          ].join(' ')}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
        <span className={error ? 'font-semibold text-[color:var(--red-600)]' : ''}>
          {error || (isListening ? 'Listening… tap the mic to stop.' : 'Tap the mic to speak your question instead of typing.')}
        </span>
        <span className={remaining <= 20 ? 'shrink-0 font-semibold text-[color:var(--red-600)]' : 'shrink-0'}>
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  )
}
