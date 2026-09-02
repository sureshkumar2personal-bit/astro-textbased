import AuthPage from './AuthPage.jsx'
import { useParams } from 'react-router-dom'

export default function Login() {
  const { role } = useParams()
  return <AuthPage mode="login" selectedRole={role} />
}
