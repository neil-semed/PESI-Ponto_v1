// Fila offline-first para ponto: salva em localStorage e sincroniza quando online
export type QueuedPonto = { oficineiro_id: string; escola_id: string | null; tipo: string; latitude: number | null; longitude: number | null; distancia_m: number | null; ts: string }

const KEY = 'pesi_offline_pontos'

export function enqueue(p: QueuedPonto) {
  const arr: QueuedPonto[] = JSON.parse(localStorage.getItem(KEY) || '[]')
  arr.push(p)
  localStorage.setItem(KEY, JSON.stringify(arr))
}

export function dequeueAll(): QueuedPonto[] {
  const arr: QueuedPonto[] = JSON.parse(localStorage.getItem(KEY) || '[]')
  localStorage.removeItem(KEY)
  return arr
}

export function pendingCount(): number {
  return JSON.parse(localStorage.getItem(KEY) || '[]').length
}
