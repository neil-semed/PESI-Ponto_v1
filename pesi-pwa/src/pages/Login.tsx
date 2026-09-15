import { useState } from 'react'
import { useAuth } from '../stores/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [err, setErr] = useState('')
  const signIn = useAuth(s => s.signIn)
  return (
    <div style={{ maxWidth: 360, margin: '60px auto', fontFamily: 'system-ui', padding: 16 }}>
      <h1>PESI Ponto</h1>
      <p style={{ color: '#555' }}>Oficineiro / Coordenador / Admin — PWA instalável</p>
      <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 12 }} />
      <input placeholder="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 8 }} />
      {err && <div style={{ color: 'crimson', marginTop: 8 }}>{err}</div>}
      <button onClick={async () => { setErr(''); try { await signIn(email, senha) } catch (e: unknown) { setErr((e as Error).message) } }} style={{ width: '100%', padding: 12, marginTop: 12, background: '#0f4c81', color: '#fff', border: 0, cursor: 'pointer' }}>Entrar</button>
      <p style={{ fontSize: 12, color: '#777', marginTop: 16 }}>Primeiro acesso: use a senha provisória e troque em Perfil. Offline: ponto fica na fila e sincroniza ao voltar.</p>
    </div>
  )
}
