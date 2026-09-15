import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OficineirosList() {
  const [rows, setRows] = useState<{ id: string; nome: string; escola_id: string; grade: unknown }[]>([])
  useEffect(() => { supabase.from('oficineiros').select('id,nome,escola_id,grade').limit(50).then(({ data }) => setRows((data as never) ?? [])) }, [])
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto' }}>
      <h2>Oficineiros — grade semanal + turno</h2>
      <p style={{ color: '#666' }}>Cadastro com validação OficineiroValidator (nome/CPF/email/telefone/escola/oficina + grade 07-17). Turno = {`MANHÃ (<12h) / TARDE (>=12h) / INTEGRAL`}</p>
      <ul>{rows.map(r => <li key={r.id}>{r.nome} — grade {JSON.stringify(r.grade).slice(0, 80)}</li>)}{rows.length === 0 && <li>Nenhum oficineiro — importe via SQL ou cadastre.</li>}</ul>
    </div>
  )
}
