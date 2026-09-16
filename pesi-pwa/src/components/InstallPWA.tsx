import { useEffect, useState } from 'react'
export default function InstallPWA(){
  const [deferred,setDeferred]=useState<Event|null>(null)
  const [installed,setInstalled]=useState(false)
  useEffect(()=>{
    const h=(e:Event)=>{e.preventDefault(); setDeferred(e)}
    window.addEventListener('beforeinstallprompt',h as never)
    window.addEventListener('appinstalled',()=>setInstalled(true))
    return()=>window.removeEventListener('beforeinstallprompt',h as never)
  },[])
  const install=async()=>{ if(!deferred) return; const p=deferred as unknown as {prompt:()=>Promise<void>; userChoice:Promise<{outcome:string}>}; await p.prompt(); await p.userChoice; setDeferred(null)}
  const copyLink=async()=>{await navigator.clipboard.writeText(window.location.href); alert('Link copiado: '+window.location.href)}
  if(installed) return <span style={{fontSize:12,background:'#e6ffe6',padding:'4px 8px',borderRadius:6}}>Instalado</span>
  return <span style={{display:'flex',gap:8}}>{deferred&&<button className="btn" style={{padding:'6px 10px',fontSize:12}} onClick={install}>Instalar app</button>}<button className="btn-ghost" style={{padding:'6px 10px',fontSize:12}} onClick={copyLink}>Copiar link</button><span style={{fontSize:11,color:'#64748b',alignSelf:'center'}}>Android: ⋮ → Instalar app · iOS: Compartilhar → Adicionar à Tela de Início</span></span>
}
