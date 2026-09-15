import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState('')
  const submit = async () => {
    setMsg('')
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) return setMsg(error.message)
    if (!data.user) return setMsg('Verifique seu e-mail para confirmar')
    // cria profile — trigger não existe, então insere aqui (RLS permite insert admin? primeiro user precisa bypass)
    // workaround: insere via SQL Editor se RLS bloquear; por enquanto tenta:
    const { error: e2 } = await supabase.from('profiles').insert({ id: data.user.id, email, nome, perfil: 'ADMIN', ativo: true } as never)
    if (e2) setMsg('Conta criada, mas profile bloqueado por RLS — cole no SQL Editor: insert into profiles (id,email,nome,perfil) values (\''+data.user.id+'\',\''+email+'\',\''+nome+'\',\'ADMIN\')')
    else setMsg('Admin criado — faça login')
  }
  return (
    <div style={{ maxWidth: 360, margin: '40px auto', fontFamily: 'system-ui', padding: 16 }}>
      <h2>Criar primeiro ADMIN</h2>
      <input placeholder="nome" value={nome} onChange={e => setNome(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 8 }} />
      <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 8 }} />
      <input placeholder="senha (min 6)" type="password" value={senha} onChange={e => setSenha(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 8 }} />
      <button onClick={submit} style={{ width: '100%', padding: 12, marginTop: 12, background: '#0f4c81', color: '#fff', border: 0 }}>Criar</button>
      {msg && <div style={{ marginTop: 12, padding: 10, background: '#eef' }}>{msg}</div>}
      <p style={{ fontSize: 12, color: '#777', marginTop: 12 }}>Free tier sem "Add user": use esta tela. Se der erro de RLS, copie o SQL exibido e rode no SQL Editor (com service_role) e faça login.</p>
    </div>
  )
}
