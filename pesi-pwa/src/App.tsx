import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuth } from './stores/auth'
import Login from './pages/Login'
import Signup from './pages/Signup'
import OficineiroHome from './pages/OficineiroHome'
import AdminDashboard from './pages/AdminDashboard'
import Escolas from './pages/Escolas'
import OficineirosList from './pages/OficineirosList'
import Relatorios from './pages/Relatorios'

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
    <BrowserRouter basename="/PESI-Ponto_v1">
      {session && <nav style={{ padding:'10px 16px', background:'#0f4c81', color:'#fff', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', position:'sticky', top:0, zIndex:10 }}>
        <b style={{ letterSpacing:.5 }}>PESI PONTO</b><span style={{ fontSize:12, opacity:.8 }}>{session.nome} · {session.perfil}</span>
        <Link to="/" style={{ color:'#fff', marginLeft:8 }}>Início</Link>
        {session.perfil === 'ADMIN' && <><Link to="/admin" style={{ color:'#fff' }}>Admin</Link><Link to="/escolas" style={{ color:'#fff' }}>Escolas</Link><Link to="/oficineiros" style={{ color:'#fff' }}>Oficineiros</Link><Link to="/relatorios" style={{ color:'#fff' }}>Relatórios</Link></>}
        <button onClick={signOut} className="btn-ghost" style={{ marginLeft:'auto', padding:'6px 12px', borderColor:'#fff', color:'#fff', background:'transparent' }}>Sair</button>
      </nav>}
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={!session ? <Navigate to="/login" replace /> : session.perfil === 'ADMIN' ? <Navigate to="/admin" replace /> : <Guard allow={['OFICINEIRO','COORDENADOR','DIRETOR','ADMIN']}><OficineiroHome /></Guard>} />
        <Route path="/admin" element={<Guard allow={['ADMIN']}><AdminDashboard /></Guard>} />
        <Route path="/escolas" element={<Guard allow={['ADMIN']}><Escolas /></Guard>} />
        <Route path="/oficineiros" element={<Guard allow={['ADMIN','COORDENADOR','DIRETOR']}><OficineirosList /></Guard>} />
        <Route path="/relatorios" element={<Guard allow={['ADMIN','COORDENADOR','DIRETOR']}><Relatorios /></Guard>} />
      </Routes>
    </BrowserRouter>
  )
}
