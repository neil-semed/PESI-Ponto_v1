// Portado de src/helpers/PontoCalculoHelper.gs + IRHelper.gs + fórmulas da planilha (linha 1)
// Modelo planilha: 2 faixas IR (0% até 5000, 27.5% acima, ded 908.73) + redutor Lei 15.270/2025

export type TipoRegistro = 'ENTRADA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO' | 'SAIDA'
export type Registro = { id: string; tipo: TipoRegistro; timestamp: Date | string; barrado?: boolean }
export type PeriodoGrade = { dia: string; inicio: string; fim: string } // dia: SEG..DOM, inicio/fim HH:MM

function toDate(d: Date | string): Date { return d instanceof Date ? d : new Date(d) }

// Haversine — igual GeocodingHelper.distanciaMetros
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

export function calcularTotalMs(registros: Registro[], contarAbertoAteAgora = true): number {
  let total = 0
  let entrada: number | null = null
  let intervaloInicio: number | null = null
  for (const r of registros.filter((x) => !x.barrado)) {
    const ts = toDate(r.timestamp).getTime()
    if (r.tipo === 'ENTRADA') entrada = ts
    else if (r.tipo === 'INICIO_INTERVALO') intervaloInicio = ts
    else if (r.tipo === 'FIM_INTERVALO') {
      if (intervaloInicio !== null) total -= ts - intervaloInicio
      intervaloInicio = null
    } else if (r.tipo === 'SAIDA' && entrada !== null) {
      total += ts - entrada
      entrada = null
    }
  }
  if (entrada !== null && contarAbertoAteAgora) {
    const fimParcial = intervaloInicio ?? Date.now()
    total += fimParcial - entrada
  }
  return total
}

export function calcularContratadoMs(grade: PeriodoGrade[], inicio: Date, fim: Date): number {
  const DIA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
  let total = 0
  const cur = new Date(inicio); cur.setHours(0, 0, 0, 0)
  const end = new Date(fim); end.setHours(0, 0, 0, 0)
  while (cur.getTime() <= end.getTime()) {
    const ds = DIA[cur.getDay()]
    for (const p of grade ?? []) {
      if (p.dia !== ds) continue
      const [hi, mi] = p.inicio.split(':').map(Number)
      const [hf, mf] = p.fim.split(':').map(Number)
      const mins = hf * 60 + mf - (hi * 60 + mi)
      if (mins > 0) total += mins * 60 * 1000
    }
    cur.setDate(cur.getDate() + 1)
  }
  return total
}

export function calcularTurno(grade: PeriodoGrade[]): string {
  if (!grade?.length) return '-'
  const manha = grade.some((p) => p.inicio < '12:00')
  const tarde = grade.some((p) => p.inicio >= '12:00')
  if (manha && tarde) return 'INTEGRAL'
  return manha ? 'MANHÃ' : 'TARDE'
}

export function calcularAbonoMs(grade: PeriodoGrade[], abonos: { data: Date | string }[]): number {
  let t = 0
  for (const a of abonos ?? []) {
    const d = toDate(a.data)
    t += calcularContratadoMs(grade, d, d)
  }
  return t
}

// IR modelo planilha: ded 908.73, redutor 978.62 - bruto*0.133145 para 5000.01<=bruto<7350.01
export function calcularIR(bruto: number, inss: number) {
  const baseIR = bruto - inss
  if (bruto <= 5000) return { baseIR, irBruto: 0, redutor: 0, ir: 0, deducao: 0 }
  const irBruto = baseIR * 0.275
  const deducao = irBruto - 908.73
  let redutor = 0
  if (bruto >= 5000.01 && bruto < 7350.01) redutor = Math.round((978.62 - bruto * 0.133145) * 100) / 100
  const ir = Math.max(0, Math.round((deducao - redutor) * 100) / 100)
  return { baseIR, irBruto, deducao, redutor, ir }
}

export function calcularOrdemPagamento(horasMs: number, valorHora = 35) {
  const horas = horasMs / 3600000
  const bruto = Math.round(horas * valorHora * 100) / 100
  const iss = Math.round(bruto * 0.03 * 100) / 100
  const inss = Math.round(bruto * 0.11 * 100) / 100
  const { baseIR, irBruto, deducao, redutor, ir } = calcularIR(bruto, inss)
  const liquido = Math.round((bruto - iss - inss - ir) * 100) / 100
  return { horas, bruto, iss, inss, baseIR, irBruto, deducao, redutor, ir, liquido }
}
