import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/auth'
import { distanciaMetros, calcularTotalMs } from '../lib/calculators'
import { enqueue, pendingCount, dequeueAll } from '../lib/offlineQueue'

type Registro = { id: string; tipo: string; timestamp: string; escola_id: string | null; distancia_m: number | null; barrado: boolean }

export default function OficineiroHome() {
  const session = useAuth(s => s.session)!
  const [oficineiro, setOfic] = useState<{ id: string; escola_id: string; nome: string } | null>(null)
  const [escolas, setEscolas] = useState<{ id: string; nome: string; latitude: number | null; longitude: number | null; raio_permitido_m: number }[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [escolaSel, setEscolaSel] = useState('')
  const [gps, setGps] = useState<{ lat: number | null; lon: number | null; dist: number | null }>({ lat: null, lon: null, dist: null })
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState(pendingCount())

  useEffect(() => {
    supabase.from('oficineiros').select('id,escola_id,nome').eq('profile_id', session.id).single().then(({ data }) => { if (data) { setOfic(data as never); setEscolaSel(data.escola_id) } })
    supabase.from('schools').select('id,nome,latitude,longitude,raio_permitido_m').eq('ativo', true).then(({ data }) => setEscolas((data as never) ?? []))
  }, [session.id])

  const refresh = async () => {
    if (!oficineiro) return
    const { data } = await supabase.from('time_entries').select('id,tipo,timestamp,escola_id,distancia_m,barrado').eq('oficineiro_id', oficineiro.id).order('timestamp', { ascending: true }).limit(50)
    setRegistros((data as never) ?? [])
  }
  useEffect(() => { refresh() }, [oficineiro])

  const getGPS = () => new Promise<{ lat: number; lon: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalização não suportada'))
    navigator.geolocation.getCurrentPosition(p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }), reject, { enableHighAccuracy: true, timeout: 10000 })
  })

  const syncOffline = async () => {
    const q = dequeueAll()
    for (const p of q) {
      await supabase.from('time_entries').insert({ oficineiro_id: p.oficineiro_id, escola_id: p.escola_id, tipo: p.tipo, latitude: p.latitude, longitude: p.longitude, distancia_m: p.distancia_m })
    }
    setPending(0); await refresh()
  }

  useEffect(() => { if (navigator.onLine && pending > 0) syncOffline() }, [pending])

  const registrar = async (tipo: string) => {
    if (!oficineiro) return setMsg('Vínculo oficineiro não encontrado')
    setMsg('')
    try {
      const { lat, lon } = await getGPS()
      const esc = escolas.find(e => e.id === (tipo === 'ENTRADA' ? escolaSel : registros.filter(r => r.tipo === 'ENTRADA').slice(-1)[0]?.escola_id ?? escolaSel))
      let dist: number | null = null
      if (esc?.latitude && esc?.longitude) dist = distanciaMetros(lat, lon, esc.latitude, esc.longitude)
      const raio = esc?.raio_permitido_m ?? 100
      if (dist !== null && dist > raio) { setGps({ lat, lon, dist }); return setMsg(`Você está a ${dist}m da escola (raio ${raio}m). Aproxime-se.`) }
      setGps({ lat, lon, dist })
      // horario configurável
      const { data: cfg } = await supabase.from('financial_config').select('chave,valor').in('chave', ['HORARIO_INICIO', 'HORARIO_FIM'])
      const ini = (cfg as { chave: string; valor: string }[] | null)?.find(c => c.chave === 'HORARIO_INICIO')?.valor ?? '07:00'
      const fim = (cfg as { chave: string; valor: string }[] | null)?.find(c => c.chave === 'HORARIO_FIM')?.valor ?? '17:00'
      const hh = new Date().toTimeString().slice(0, 5)
      if (hh < ini || hh > fim) return setMsg(`Fora do horário permitido (${ini}–${fim})`)
      const payload = { oficineiro_id: oficineiro.id, escola_id: tipo === 'ENTRADA' ? escolaSel : esc?.id ?? escolaSel, tipo, latitude: lat, longitude: lon, distancia_m: dist }
      if (!navigator.onLine) { enqueue({ ...payload, ts: new Date().toISOString() } as never); setPending(pendingCount()); return setMsg('Sem internet — ponto na fila offline, sincroniza ao voltar.') }
      const { error } = await supabase.from('time_entries').insert(payload)
      if (error) throw error
      await refresh()
      setMsg(`${tipo} registrado — ${dist !== null ? dist + 'm da escola' : 'sem raio cadastrado (permitido)'}`)
    } catch (e: unknown) { setMsg((e as Error).message) }
  }

  const estado = (() => {
    const last = registros.filter(r => !r.barrado).slice(-1)[0]
    if (!last) return 'LIVRE'
    if (last.tipo === 'ENTRADA' || last.tipo === 'FIM_INTERVALO') return 'TRABALHANDO'
    if (last.tipo === 'INICIO_INTERVALO') return 'EM_INTERVALO'
    return 'LIVRE'
  })()
  const totalMs = calcularTotalMs(registros.map(r => ({ id: r.id, tipo: r.tipo as never, timestamp: r.timestamp, barrado: r.barrado })), true)

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto' }}>
      <h2>Olá, {session.nome} — {session.perfil}</h2>
      <div style={{ padding: 12, background: '#eef4ff', borderRadius: 8 }}>Estado: <b>{estado}</b> · Hoje: {(totalMs / 3600000).toFixed(2)}h · GPS: {gps.dist !== null ? `${gps.dist}m` : '—'} · Fila offline: {pending}</div>
      {oficineiro && <div style={{ marginTop: 8 }}>Vínculo: {oficineiro.nome} · Escola: {escolas.find(e => e.id === oficineiro.escola_id)?.nome}</div>}
      <label style={{ display: 'block', marginTop: 12 }}>Escola (para ENTRADA)
        <select value={escolaSel} onChange={e => setEscolaSel(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }}>{escolas.map(e => <option key={e.id} value={e.id}>{e.nome} — raio {e.raio_permitido_m}m</option>)}</select>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <button onClick={() => registrar('ENTRADA')} disabled={estado !== 'LIVRE'} style={{ padding: 14, background: estado === 'LIVRE' ? '#0f4c81' : '#ccc', color: '#fff', border: 0 }}>ENTRADA</button>
        <button onClick={() => registrar('SAIDA')} disabled={estado !== 'TRABALHANDO'} style={{ padding: 14, background: estado === 'TRABALHANDO' ? '#0f4c81' : '#ccc', color: '#fff', border: 0 }}>SAÍDA</button>
        <button onClick={() => registrar('INICIO_INTERVALO')} disabled={estado !== 'TRABALHANDO'} style={{ padding: 14 }}>Início Intervalo</button>
        <button onClick={() => registrar('FIM_INTERVALO')} disabled={estado !== 'EM_INTERVALO'} style={{ padding: 14 }}>Fim Intervalo</button>
      </div>
      {msg && <div style={{ marginTop: 12, padding: 10, background: '#fff3cd' }}>{msg}</div>}
      {pending > 0 && <button onClick={syncOffline} style={{ marginTop: 8, width: '100%', padding: 10 }}>Sincronizar fila offline ({pending})</button>}
      <h3 style={{ marginTop: 16 }}>Registros recentes</h3>
      <ul>{registros.slice(-10).reverse().map(r => <li key={r.id}>{new Date(r.timestamp).toLocaleString()} — {r.tipo} — {r.distancia_m !== null ? r.distancia_m + 'm' : '—'} {r.barrado ? '(BARRADO)' : ''}</li>)}</ul>
    </div>
  )
}
