import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuth } from './stores/auth'
import Login from './pages/Login'
import Signup from './pages/Signup'
import OficineiroHome from './pages/OficineiroHome'
import AdminDashboard from './pages/AdminDashboard'

function Guard({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const s = useAuth(x => x.session)
  if (!s) return <Navigate to="/login" replace />
  if (!allow.includes(s.perfil)) return <div style={{ padding: 16 }}>Acesso negado para {s.perfil}</div>
  return <>{children}</>
}

export default function App() {
  const { session, loading, init, signOut } = useAuth()
  useEffect(() => { init() }, [init])
  if (loading) return <div style={{ padding: 16 }}>Carregando...</div>
  return (
    <BrowserRouter basename="/pesi-pwa">
      {session && <nav style={{ padding: 12, background: '#0f4c81', color: '#fff', display: 'flex', gap: 12, alignItems: 'center' }}>
        <b>PESI</b><span>{session.perfil}</span>
        <Link to="/" style={{ color: '#fff' }}>Início</Link>
        {session.perfil === 'ADMIN' && <Link to="/admin" style={{ color: '#fff' }}>Admin</Link>}
        <button onClick={signOut} style={{ marginLeft: 'auto', padding: '6px 12px' }}>Sair</button>
      </nav>}
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={!session ? <Navigate to="/login" replace /> : session.perfil === 'ADMIN' ? <Navigate to="/admin" replace /> : <Guard allow={['OFICINEIRO','COORDENADOR','DIRETOR','ADMIN']}><OficineiroHome /></Guard>} />
        <Route path="/admin" element={<Guard allow={['ADMIN']}><AdminDashboard /></Guard>} />
      </Routes>
    </BrowserRouter>
  )
}
