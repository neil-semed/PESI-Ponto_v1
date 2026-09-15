import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export default function Usuarios(){
  const [rows,setRows]=useState<{id:string;email:string;nome:string;perfil:string;ativo:boolean}[]>([])
  useEffect(()=>{supabase.from('profiles').select('id,email,nome,perfil,ativo').limit(100).then(({data})=>setRows((data as never)??[]))},[])
  return <div style={{padding:16,maxWidth:900,margin:'0 auto',fontFamily:'system-ui'}}><h2>Usuários — Admin total + edição</h2><div className="card"><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{textAlign:'left'}}>Nome</th><th>Email</th><th>Perfil</th><th>Ativo</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} style={{borderTop:'1px solid #eee'}}><td>{r.nome}</td><td>{r.email}</td><td>{r.perfil}</td><td>{r.ativo?'Sim':'Não'}</td></tr>)}{rows.length===0&&<tr><td colSpan={4} style={{padding:16,color:'#666'}}>Nenhum usuário — crie via /signup ou SQL</td></tr>}</tbody></table></div></div>
}
