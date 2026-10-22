import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Paperclip, FilePlus2, X } from 'lucide-react'
import { useStore } from '../data/store'
import { deadlines, deadlineState } from '../data/ai'
import { topicById } from '../data/topics'
import { CHANNELS, PCLASSES } from '../config/reference'
import type { Channel, PClass } from '../config/reference'
import type { Complaint } from '../data/types'
import { PCLS_STYLE, PriorityBadge, ChannelBadge, StatusBadge, DeadlineLine, TermBar } from '../components/ui'
import { TODAY, fmtDate, plural } from '../lib/dates'

type DFilter = 'all' | 'overdue' | 'today' | '3' | '7' | 'later'
const D_OPTIONS: { id: DFilter; label: string }[] = [
  { id: 'all', label: 'Любой срок' },
  { id: 'overdue', label: 'Просрочено по закону' },
  { id: 'today', label: 'Рекомендуемый срок сегодня или прошел' },
  { id: '3', label: 'Истекает в течение 3 дней' },
  { id: '7', label: 'Истекает в течение 7 дней' },
  { id: 'later', label: 'Больше 7 дней' },
]

function matchDeadline(c: Complaint, f: DFilter) {
  if (f === 'all') return true
  const d = deadlines(c)
  if (f === 'overdue') return d.maxLeft < 0
  if (f === 'today') return d.recLeft <= 0
  if (f === '3') return d.recLeft <= 3
  if (f === '7') return d.recLeft <= 7
  return d.recLeft > 7
}

export default function InboxPage() {
  const { complaints } = useStore()
  const [sp, setSp] = useSearchParams()
  const pf = (sp.get('p') ?? '').split(',').filter(Boolean) as PClass[]
  const df = (sp.get('d') ?? 'all') as DFilter
  const ch = (sp.get('ch') ?? '') as Channel | ''
  const st = sp.get('st') ?? 'open'
  const sort = sp.get('sort') ?? 'prio'
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }

  const open = useMemo(() => complaints.filter((c) => c.status !== 'sent'), [complaints])
  const tiles = useMemo(() => ({
    open: open.length,
    crit: open.filter((c) => deadlines(c).cls === 'Критический').length,
    hot: open.filter((c) => ['overdue', 'today'].includes(deadlineState(c))).length,
    soon: open.filter((c) => deadlines(c).recLeft <= 3).length,
    doneToday: complaints.filter((c) => c.sentAt?.slice(0, 10) === TODAY).length,
  }), [open, complaints])

  const list = useMemo(() => {
    let l = st === 'open' ? open : st === 'sent' ? complaints.filter((c) => c.status === 'sent') : complaints
    if (pf.length) l = l.filter((c) => pf.includes(deadlines(c).cls))
    if (ch) l = l.filter((c) => c.channel === ch)
    l = l.filter((c) => matchDeadline(c, df))
    const arr = l.map((c) => ({ c, d: deadlines(c) }))
    if (sort === 'deadline') arr.sort((a, b) => a.d.recLeft - b.d.recLeft || b.d.score - a.d.score)
    else if (sort === 'new') arr.sort((a, b) => (a.c.received < b.c.received ? 1 : -1))
    else arr.sort((a, b) => b.d.score - a.d.score || a.d.maxLeft - b.d.maxLeft)
    return arr
  }, [complaints, open, st, pf, ch, df, sort])

  const togglePrio = (p: PClass) => set('p', (pf.includes(p) ? pf.filter((x) => x !== p) : [...pf, p]).join(','))
  const anyFilter = pf.length || df !== 'all' || ch || st !== 'open'

  const Tile = ({ n, label, onClick, tone = '' }: { n: number; label: string; onClick?: () => void; tone?: string }) => (
    <button onClick={onClick} disabled={!onClick} className="card text-left px-5 py-4 grid gap-1 hover:shadow-pop transition-shadow disabled:cursor-default disabled:hover:shadow-card">
      <span className={`kpi-num text-[30px] ${tone}`}>{n}</span>
      <span className="text-xs text-muted leading-tight">{label}</span>
    </button>
  )

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Рабочая очередь</p>
          <h1 className="page-title mt-1">Обращения</h1>
        </div>
        <Link to="/new" className="btn-primary"><FilePlus2 size={16} aria-hidden />Новое обращение</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile n={tiles.open} label="Ждут ответа" onClick={() => setSp({}, { replace: true })} />
        <Tile n={tiles.crit} label="Критический приоритет" tone="text-bad" onClick={() => setSp({ p: 'Критический' }, { replace: true })} />
        <Tile n={tiles.hot} label="Срок сегодня или просрочен" tone="text-bad" onClick={() => setSp({ d: 'today', sort: 'deadline' }, { replace: true })} />
        <Tile n={tiles.soon} label="Срок в ближайшие 3 дня" tone="text-warn" onClick={() => setSp({ d: '3', sort: 'deadline' }, { replace: true })} />
        <Tile n={tiles.doneToday} label="Отвечено сегодня" tone="text-good" />
      </div>

      <div className="card px-4 sm:px-5 py-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label mr-1">Важность</span>
          {PCLASSES.map((p) => {
            const on = pf.includes(p)
            return (
              <button key={p} onClick={() => togglePrio(p)} aria-pressed={on}
                className={`chip ${on ? 'bg-ink text-white border-ink' : 'bg-surface border-line2 hover:border-ink'}`}>
                <i className="w-2.5 h-2.5 rounded-full" style={{ background: on ? '#fff' : PCLS_STYLE[p].dot }} />{p}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="select" value={df} onChange={(e) => set('d', e.target.value === 'all' ? '' : e.target.value)} aria-label="Срок">
            {D_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <select className="select" value={ch} onChange={(e) => set('ch', e.target.value)} aria-label="Форма поступления">
            <option value="">Любая форма поступления</option>
            {(Object.keys(CHANNELS) as Channel[]).map((k) => <option key={k} value={k}>{CHANNELS[k].name}</option>)}
          </select>
          <select className="select" value={st} onChange={(e) => set('st', e.target.value === 'open' ? '' : e.target.value)} aria-label="Статус">
            <option value="open">Ждут ответа</option>
            <option value="sent">Ответ направлен</option>
            <option value="all">Все</option>
          </select>
          <div className="flex rounded-full bg-bg p-1 text-sm ml-auto" role="radiogroup" aria-label="Сортировка">
            {[['prio', 'По важности'], ['deadline', 'По сроку'], ['new', 'Сначала новые']].map(([id, l]) => (
              <button key={id} role="radio" aria-checked={sort === id} onClick={() => set('sort', id === 'prio' ? '' : id)}
                className={`px-3.5 py-1.5 rounded-full transition-all ${sort === id ? 'bg-accent text-white font-semibold shadow' : 'text-muted hover:text-ink'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>Найдено {list.length} {plural(list.length, 'обращение', 'обращения', 'обращений')}</span>
          {!!anyFilter && <button className="inline-flex items-center gap-1 font-semibold text-ink hover:underline" onClick={() => setSp({}, { replace: true })}><X size={14} aria-hidden />Сбросить фильтры</button>}
        </div>
      </div>

      <ul className="grid gap-2.5">
        {list.map(({ c, d }) => {
          const t = topicById.get(c.topic)
          return (
            <li key={c.id}>
              <Link to={`/case/${encodeURIComponent(c.id)}`} className="card relative flex flex-col md:flex-row md:items-center gap-3 pl-6 pr-4 py-4 hover:shadow-pop transition-shadow overflow-hidden group">
                <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${PCLS_STYLE[d.cls].bar}`} aria-hidden />
                <div className="flex-1 min-w-0 grid gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PriorityBadge cls={d.cls} score={d.score} />
                    <ChannelBadge channel={c.channel} />
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-muted ml-1">{c.id} · поступило {fmtDate(c.received)}</span>
                  </div>
                  <p className="font-semibold text-[16px] leading-snug">{t?.title}</p>
                  <p className="text-sm text-muted truncate">
                    {c.applicant.fio}{c.applicant.represent === 1 ? ' (родственник)' : c.applicant.represent === 2 ? ` и еще ${c.applicant.count - 1}` : ''} · {c.institution}
                    {c.attachments.length > 0 && <span className="inline-flex items-center gap-0.5 ml-2"><Paperclip size={12} aria-hidden />{c.attachments.length}</span>}
                  </p>
                </div>
                <div className="md:w-[300px] shrink-0 grid gap-1.5">
                  <DeadlineLine c={c} compact />
                  {c.status !== 'sent' && <TermBar c={c} />}
                </div>
                <ChevronRight size={18} className="hidden md:block text-muted group-hover:text-ink shrink-0" aria-hidden />
              </Link>
            </li>
          )
        })}
        {!list.length && <li className="card card-pad text-muted text-sm">Под выбранные фильтры обращений нет.</li>}
      </ul>
    </div>
  )
}
