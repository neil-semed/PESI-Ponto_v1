import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Escolas() {
  const [rows, setRows] = useState<{ id: string; nome: string; raio_permitido_m: number; latitude: number | null }[]>([])
  const [nome, setNome] = useState('')
  const load = () => supabase.from('schools').select('id,nome,raio_permitido_m,latitude').order('nome').then(({ data }) => setRows((data as never) ?? []))
  useEffect(() => { load() }, [])
  const add = async () => {
    if (!nome.trim()) return
    const { error } = await supabase.from('schools').insert({ nome: nome.trim() } as never)
    if (error) alert(error.message); else { setNome(''); load() }
  }
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto' }}>
      <h2>Escolas — raio 100m/escola configurável</h2>
      <div style={{ display: 'flex', gap: 8 }}><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nova escola" style={{ flex: 1, padding: 8 }} /><button onClick={add} style={{ padding: '8px 16px' }}>Adicionar</button></div>
      <ul style={{ marginTop: 12 }}>{rows.map(r => <li key={r.id}>{r.nome} — raio {r.raio_permitido_m}m {r.latitude ? '· com coordenadas' : '· sem coordenadas (ponto liberado)'}</li>)}</ul>
      <p style={{ color: '#666', fontSize: 12 }}>Edição de lat/lon/raio via UPDATE em schools (Admin). Coordenada vazia = validação de distância deixa passar (src/services/PontoService.gs:143).</p>
    </div>
  )
}
