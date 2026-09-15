import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/auth'
export default function Aprovacoes(){
  const s=useAuth(x=>x.session)!; const [ofi,setOfi]=useState<{id:string;nome:string}[]>([]); const [sel,setSel]=useState(''); const [regs,setRegs]=useState<{id:string;tipo:string;timestamp:string;barrado:boolean}[]>([]); const [msg,setMsg]=useState('')
  useEffect(()=>{supabase.from('oficineiros').select('id,nome').eq('escola_id',s.escola_id as never).limit(100).then(({data})=>setOfi((data as never)??[]))},[s.escola_id])
  const carregar=async()=>{ if(!sel) return; const {data}=await supabase.from('time_entries').select('id,tipo,timestamp,barrado').eq('oficineiro_id',sel).order('timestamp'); setRegs((data as never)??[])}
  const barrar=async(id:string)=>{ const motivo=prompt('Motivo para barrar:'); if(!motivo) return; const {error}=await supabase.from('time_entries').update({barrado:true,motivo_barrado:motivo} as never).eq('id',id as never); if(error) setMsg(error.message); else carregar()}
  return <div style={{padding:16,maxWidth:900,margin:'0 auto',fontFamily:'system-ui'}}><h2>Coordenador — Aprovações quinzena 1-15/16-fim + Barrar + Abonar</h2><select value={sel} onChange={e=>setSel(e.target.value)} className="input"><option value="">Selecione oficineiro da sua escola</option>{ofi.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select><button className="btn" style={{marginTop:8}} onClick={carregar}>Carregar registros</button><ul style={{marginTop:12}}>{regs.map(r=><li key={r.id} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderBottom:'1px solid #eee'}}><span>{new Date(r.timestamp).toLocaleString()} — {r.tipo} {r.barrado&&'(BARRADO)'}</span><button disabled={r.barrado} onClick={()=>barrar(r.id)} className="btn-ghost" style={{marginLeft:'auto'}}>Barrar</button></li>)}</ul>{msg&&<div style={{padding:8,background:'#fee',marginTop:8}}>{msg}</div>}</div>
}
