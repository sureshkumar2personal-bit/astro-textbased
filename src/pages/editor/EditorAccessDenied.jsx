import { Link } from 'react-router-dom'
import './editor-access-denied.css'
export default function EditorAccessDenied() { return <section className="editor-page editor-denied"><div className="editor-denied-card"><h2>Access restricted</h2><p>This section has not been assigned to your editor account. Ask the astrologer to update your permissions.</p><Link to="/editor/dashboard">Return to dashboard</Link></div></section> }
