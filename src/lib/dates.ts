// Даты в формате YYYY-MM-DD, по местному времени
const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parse = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d) }
export const TODAY = iso(new Date())
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
export const diffDays = (a: string, b: string) => Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000)
export const fmtDate = (s: string) => s.slice(0, 10).split('-').reverse().join('.')
export const nowStamp = () => { const d = new Date(); return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const fmtStamp = (s: string) => `${fmtDate(s)}${s.length > 10 ? ` ${s.slice(11, 16)}` : ''}`
export const isWeekend = (s: string) => { const w = parse(s).getDay(); return w === 0 || w === 6 }
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
export const fmtLong = (s: string) => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} г.` }
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
export const weekday = (s: string) => WD[parse(s).getDay()]

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}
export const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`
