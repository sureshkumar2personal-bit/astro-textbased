import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ to, icon: Icon = ArrowLeft }) {
  const navigate = useNavigate()
  return (
    <button
      className="inline-flex items-center gap-2 rounded-[12px] border border-[color:var(--line)] bg-transparent px-4 py-2 text-sm font-semibold text-[color:var(--body)] transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(143,77,255,0.08)] hover:text-[color:var(--violet-700)]"
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <Icon size={16} />
      Back
    </button>
  )
}
