import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../data/store'
import { deadlines } from '../data/ai'
import { PCLASSES } from '../config/reference'
import { PCLS_STYLE, Section } from '../components/ui'
import { TODAY, addDays, diffDays, fmtDate, isWeekend, weekday } from '../lib/dates'

const NORM = 8

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export default function KpiPage() {
  const { complaints } = useStore()
  const k = useMemo(() => {
    const sent = complaints.filter((c) => c.status === 'sent' && c.sentAt)
    const today = sent.filter((c) => c.sentAt!.slice(0, 10) === TODAY).length
    const series = Array.from({ length: 14 }, (_, i) => {
      const day = addDays(TODAY, i - 13)
      return { day, label: `${weekday(day)} ${fmtDate(day).slice(0, 5)}`, n: sent.filter((c) => c.sentAt!.slice(0, 10) === day).length, off: isWeekend(day) }
    })
    const workDays = series.filter((s) => !s.off && s.day !== TODAY)
    const avgDay = workDays.reduce((a, s) => a + s.n, 0) / Math.max(1, workDays.length)
    const week = series.slice(-7).reduce((a, s) => a + s.n, 0)
    const ds = sent.map((c) => ({ c, d: deadlines(c) }))
    const avgTerm = ds.reduce((a, x) => a + diffDays(x.c.sentAt!.slice(0, 10), x.c.registered), 0) / Math.max(1, ds.length)
    const inRec = ds.filter((x) => x.d.recLeft >= 0).length
    const inLaw = ds.filter((x) => x.d.maxLeft >= 0).length
    const noEdit = sent.filter((c) => !c.replyEdited).length
    const ecp = sent.filter((c) => c.signature).length
    const open = complaints.filter((c) => c.status !== 'sent')
    const queue = PCLASSES.map((p) => ({ p, n: open.filter((c) => deadlines(c).cls === p).length }))
    const crit = ds.filter((x) => x.d.cls === 'Критический')
    const critFast = crit.filter((x) => diffDays(x.c.sentAt!.slice(0, 10), x.c.received) <= 1).length
    return { sent, today, series, avgDay, week, avgTerm, inRec, inLaw, noEdit, ecp, queue, open, crit, critFast }
  }, [complaints])

  const Tile = ({ v, label, hint }: { v: string; label: string; hint?: string }) => (
    <div className="card px-5 py-4 grid gap-1 content-start">
      <span className="kpi-num text-[30px]">{v}</span>
      <span className="text-sm font-semibold leading-tight">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  )
  const progress = Math.min(100, (k.today / NORM) * 100)

  return (
    <div className="grid gap-5">
      <div>
        <p className="eyebrow">Личная статистика</p>
        <h1 className="page-title mt-1">Мои показатели</h1>
      </div>

      <section className="relative overflow-hidden rounded-[28px] bg-side px-6 sm:px-8 py-7 grid sm:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="blob absolute -right-24 -bottom-32 w-[320px] h-[320px] opacity-80" style={{ background: 'linear-gradient(135deg,#8E8D95,#3B3A40)' }} aria-hidden />
        <div className="relative">
          <p className="eyebrow">Сегодня, {fmtDate(TODAY)}</p>
          <p className="kpi-num text-[64px] mt-2">{k.today}<span className="text-[28px] text-muted"> / {NORM}</span></p>
          <p className="text-sm text-side-ink">ответов направлено, дневная норма {NORM}</p>
        </div>
        <div className="relative grid gap-2 max-w-md">
          <div className="h-3 rounded-full bg-white/70 overflow-hidden"><div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="text-sm text-side-ink">{k.today >= NORM ? 'Норма на сегодня выполнена.' : `До нормы осталось ${NORM - k.today}.`} В очереди {k.open.length} обращений, из них критических {k.queue[0].n}.</p>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile v={String(k.week)} label="Ответов за 7 дней" hint={`В среднем ${k.avgDay.toFixed(1).replace('.', ',')} за рабочий день`} />
        <Tile v={`${k.avgTerm.toFixed(1).replace('.', ',')} дн.`} label="Средний срок ответа" hint="От регистрации до отправки, закон: до 30 дней" />
        <Tile v={`${pct(k.inLaw, k.sent.length)}%`} label="Ответов в законный срок" hint={`${pct(k.inRec, k.sent.length)}% в рекомендуемый срок по приоритету`} />
        <Tile v={`${pct(k.noEdit, k.sent.length)}%`} label="Проектов ИИ без правок" hint={`Подписано КЭП: ${pct(k.ecp, k.sent.length)}% ответов`} />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5">
        <Section title="Ответы по дням" aside={<span className="text-xs text-muted">14 дней, линия: норма {NORM}</span>}>
          <div className="h-[280px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={k.series} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#E5E4E8" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5E5C63' }} interval={0} angle={-35} textAnchor="end" height={52} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5E5C63' }} width={32} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,.04)' }} formatter={(v) => [`${v}`, 'Ответов']} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 14, border: '1px solid #E5E4E8' }} />
                <ReferenceLine y={NORM} stroke="#B3261E" strokeDasharray="4 4" />
                <Bar dataKey="n" radius={[8, 8, 0, 0]}>
                  {k.series.map((s) => <Cell key={s.day} fill={s.day === TODAY ? '#3B3A40' : s.off ? '#CBCAD0' : '#8E8D95'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Очередь по важности">
          <ul className="grid gap-3">
            {k.queue.map((q) => (
              <li key={q.p} className="grid gap-1">
                <div className="flex justify-between text-sm"><span>{q.p}</span><span className="font-semibold">{q.n}</span></div>
                <div className="h-2.5 rounded-full bg-line overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct(q.n, k.open.length)}%`, background: PCLS_STYLE[q.p].dot }} /></div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Критические обращения с ответом в течение суток: {k.critFast} из {k.crit.length}.</p>
          <p className="text-xs text-muted border-t border-line pt-3">Показатели построены на метриках итогового документа: средний срок рассмотрения, доля рассмотренных в срок, доля классифицированных с первого раза. Норма {NORM} ответов в день условная и задается руководителем.</p>
        </Section>
      </div>
    </div>
  )
}
