import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'
import { calcularOrdemPagamento } from '../lib/calculators'

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ oficineiros: number; escolas: number; ordensPendentes: number } | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('oficineiros').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('schools').select('id', { count: 'exact', head: true }),
      supabase.from('ordens_pagamento').select('id', { count: 'exact', head: true }).eq('status', 'PENDENTE'),
    ]).then(([a, b, c]) => setStats({ oficineiros: a.count ?? 0, escolas: b.count ?? 0, ordensPendentes: c.count ?? 0 }))
  }, [])

  const exportOrdensExcel = async () => {
    const { data } = await supabase.from('ordens_pagamento').select('*').limit(1000)
    const ws = XLSX.utils.json_to_sheet((data as unknown[]) ?? [])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Ordens')
    XLSX.writeFile(wb, 'ordens-pagamento.xlsx')
  }

  const calcularExemplo = () => {
    const r = calcularOrdemPagamento(81 * 3600000, 35)
    setMsg(`Exemplo 81h: bruto R$ ${r.bruto} ISS ${r.iss} INSS ${r.inss} IR ${r.ir} líquido ${r.liquido} (modelo planilha 2 faixas)`)
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto' }}>
      <h2>Admin — acesso total + edição</h2>
      {stats && <div style={{ display: 'flex', gap: 12 }}><div style={{ flex: 1, padding: 12, background: '#eef' }}>Oficineiros ativos: {stats.oficineiros}</div><div style={{ flex: 1, padding: 12, background: '#eef' }}>Escolas: {stats.escolas}</div><div style={{ flex: 1, padding: 12, background: '#fee' }}>Ordens pendentes: {stats.ordensPendentes}</div></div>}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={exportOrdensExcel} style={{ padding: 10 }}>Exportar Ordens (Excel)</button>
        <button onClick={calcularExemplo} style={{ padding: 10 }}>Testar cálculo 81h (planilha-modelo)</button>
      </div>
      {msg && <div style={{ marginTop: 12, padding: 10, background: '#e6ffe6' }}>{msg}</div>}
      <p style={{ marginTop: 16, color: '#555' }}>Relatórios: Folha Ponto / Quantitativos (escola/oficina/turno) / Banco Horas / Horas Extras — filtros por período + export Excel/PDF. Coordenador valida quinzena 1-15/16-fim, barra com motivo, abona dia (soma grade do weekday).</p>
    </div>
  )
}
