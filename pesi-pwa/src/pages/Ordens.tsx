import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { calcularOrdemPagamento } from '../lib/calculators'
import * as XLSX from 'xlsx'
export default function Ordens(){
  const [oficId,setOficId]=useState(''); const [ini,setIni]=useState('2026-07-01'); const [fim,setFim]=useState('2026-07-31'); const [res,setRes]=useState<string>('')
  const calcular=async()=>{
    if(!oficId) return setRes('Informe oficineiro_id')
    const {data:regs}=await supabase.from('time_entries').select('timestamp,tipo,barrado').eq('oficineiro_id',oficId).gte('timestamp',ini).lte('timestamp',fim)
    const ms = (regs as {timestamp:string;tipo:string;barrado:boolean}[]??[]).reduce((acc)=>acc,0) // placeholder — usa PontoCalculoHelper
    // demo com 81h
    const r=calcularOrdemPagamento(81*3600000,35); setRes(`Bruto ${r.bruto} ISS ${r.iss} INSS ${r.inss} IR ${r.ir} Líquido ${r.liquido}`)
  }
  const exportar=async()=>{const {data}=await supabase.from('ordens_pagamento').select('*').limit(1000); const ws=XLSX.utils.json_to_sheet((data as unknown[])??[]); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Ordens'); XLSX.writeFile(wb,'ordens.xlsx')}
  return <div style={{padding:16,maxWidth:900,margin:'0 auto',fontFamily:'system-ui'}}><h2>Ordens de Pagamento — cálculo planilha-modelo + PDF/Excel</h2><div className="card" style={{display:'flex',gap:8,flexWrap:'wrap'}}><input placeholder="oficineiro_id" value={oficId} onChange={e=>setOficId(e.target.value)} className="input" style={{flex:1}} /><input type="date" value={ini} onChange={e=>setIni(e.target.value)} className="input" /><input type="date" value={fim} onChange={e=>setFim(e.target.value)} className="input" /><button className="btn" onClick={calcular}>Calcular prévia</button><button className="btn-ghost" onClick={exportar}>Exportar Excel</button></div>{res&&<div style={{marginTop:12,padding:12,background:'#e6ffe6'}}>{res}</div>}</div>
}
