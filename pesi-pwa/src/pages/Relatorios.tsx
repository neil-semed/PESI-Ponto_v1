import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

export default function Relatorios() {
  const [msg, setMsg] = useState('')
  const exportExcel = async (tabela: string) => {
    const { data, error } = await supabase.from(tabela as never).select('*').limit(2000) as { data: unknown[] | null; error: { message: string } | null }
    if (error) return setMsg(error.message)
    const ws = XLSX.utils.json_to_sheet(data ?? [])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, tabela)
    XLSX.writeFile(wb, `${tabela}.xlsx`)
    setMsg(`${tabela}.xlsx exportado`)
  }
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto' }}>
      <h2>Relatórios — com export Excel/PDF</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => exportExcel('time_entries')} style={{ padding: 10 }}>Registros Ponto (Excel)</button>
        <button onClick={() => exportExcel('ordens_pagamento')} style={{ padding: 10 }}>Ordens Pagamento (Excel)</button>
        <button onClick={() => exportExcel('oficineiros')} style={{ padding: 10 }}>Oficineiros (Excel)</button>
      </div>
      {msg && <div style={{ marginTop: 12, padding: 8, background: '#eef' }}>{msg}</div>}
      <p style={{ color: '#666', marginTop: 12 }}>Filtros por período/escola/oficina/turno (PontoCalculoHelper.calcularTurno) + Folha assinável PDF e Banco Horas/Horas Extras (contratado vs realizado) virão nas próximas telas.</p>
    </div>
  )
}
