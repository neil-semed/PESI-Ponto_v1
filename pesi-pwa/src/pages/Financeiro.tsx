import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export default function Financeiro(){
  const [cfg,setCfg]=useState<{chave:string;valor:string}[]>([])
  const [msg,setMsg]=useState('')
  const load=()=>supabase.from('financial_config').select('chave,valor').order('chave').then(({data})=>setCfg((data as never)??[]))
  useEffect(()=>{load()},[])
  const save=async(chave:string,valor:string)=>{const {error}=await supabase.from('financial_config').update({valor} as never).eq('chave',chave as never); if(error) setMsg(error.message); else {setMsg(chave+' salvo'); load()}}
  return <div style={{padding:16,maxWidth:900,margin:'0 auto',fontFamily:'system-ui'}}><h2>Financeiro — VALOR_HORA, ISS, INSS, horário, secretário, redutor</h2>{cfg.map(c=><div key={c.chave} className="card" style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}><b style={{minWidth:200}}>{c.chave}</b><input defaultValue={c.valor} id={'f-'+c.chave} className="input" style={{flex:1}} /><button className="btn" onClick={()=>{const el=document.getElementById('f-'+c.chave) as HTMLInputElement; save(c.chave,el.value)}}>Salvar</button></div>)}{msg&&<div style={{padding:8,background:'#eef'}}>{msg}</div>}<p style={{fontSize:12,color:'#666'}}>IR modelo planilha: bruto&lt;=5000→0, senão (base*0.275-908.73 -redutor). Redutor 978.62-0.133145*bruto para 5000-7350.</p></div>
}
