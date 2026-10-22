import type { ReactNode } from 'react'
import { Globe, Mail, Phone, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { CHANNELS, STATUSES } from '../config/reference'
import type { Channel, PClass, Status } from '../config/reference'
import { deadlines, deadlineState } from '../data/ai'
import type { Complaint } from '../data/types'
import { fmtDate, days } from '../lib/dates'

export const PCLS_STYLE: Record<PClass, { badge: string; bar: string; dot: string }> = {
  'Критический': { badge: 'bg-bad text-white', bar: 'bg-bad', dot: '#B3261E' },
  'Высокий': { badge: 'bg-warn-soft text-warn border border-warn/30', bar: 'bg-warn', dot: '#9A5B00' },
  'Средний': { badge: 'bg-info-soft text-info border border-info/25', bar: 'bg-info', dot: '#3E5A7E' },
  'Низкий': { badge: 'bg-accent-soft text-muted border border-line2', bar: 'bg-line2', dot: '#9A99A0' },
}

export function PriorityBadge({ cls, score, big }: { cls: PClass; score?: number; big?: boolean }) {
  return (
    <span className={`badge ${PCLS_STYLE[cls].badge} ${big ? '!text-sm !px-3 !py-1' : ''}`} title="Приоритет по модели ранжирования">
      {cls === 'Критический' && <AlertTriangle size={big ? 15 : 13} aria-hidden />}
      {cls}{score !== undefined && <span className="opacity-80 font-medium">· {score}</span>}
    </span>
  )
}

const CH_ICON = { electronic: Globe, paper: Mail, hotline: Phone }
export function ChannelBadge({ channel, big }: { channel: Channel; big?: boolean }) {
  const I = CH_ICON[channel]
  return (
    <span className={`badge bg-surface border border-line2 text-ink ${big ? '!text-sm !px-3 !py-1' : ''}`} title={CHANNELS[channel].hint}>
      <I size={big ? 15 : 13} aria-hidden />{CHANNELS[channel].name}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const cls = status === 'sent' ? 'bg-good-soft text-good' : status === 'ready' ? 'bg-info-soft text-info' : status === 'work' ? 'bg-accent-soft text-ink' : 'bg-ink text-white'
  return <span className={`badge ${cls}`}>{status === 'sent' && <CheckCircle2 size={13} aria-hidden />}{STATUSES[status]}</span>
}

export function leftText(n: number) {
  if (n < 0) return `просрочено на ${days(-n)}`
  if (n === 0) return 'сегодня'
  if (n === 1) return 'завтра'
  return `через ${days(n)}`
}

/** Два срока: рекомендуемый по приоритету и предельный по закону */
export function DeadlineLine({ c, compact }: { c: Complaint; compact?: boolean }) {
  const d = deadlines(c)
  const st = deadlineState(c)
  if (st === 'done') return <span className="text-xs text-good font-semibold">Ответ направлен {fmtDate(c.sentAt!)}</span>
  const recCls = d.recLeft < 0 ? 'text-bad' : d.recLeft <= 1 ? 'text-bad' : d.recLeft <= 3 ? 'text-warn' : 'text-ink'
  const maxCls = d.maxLeft < 0 ? 'text-bad' : d.maxLeft <= 5 ? 'text-warn' : 'text-muted'
  return (
    <div className={`grid ${compact ? 'gap-0.5' : 'gap-1'} text-xs`}>
      <span className={`inline-flex items-center gap-1.5 font-semibold ${recCls}`}><Clock size={13} aria-hidden />Рекомендуемый: {fmtDate(d.rec)}, {leftText(d.recLeft)}</span>
      <span className={`${maxCls} ${compact ? '' : 'font-medium'}`}>По закону (30 дней{c.extended ? ' + 30' : ''}): {fmtDate(d.max)}, {leftText(d.maxLeft)}</span>
    </div>
  )
}

/** Полоса расхода законного срока */
export function TermBar({ c }: { c: Complaint }) {
  const d = deadlines(c)
  const total = c.extended ? 60 : 30
  const used = Math.max(0, Math.min(total, total - d.maxLeft))
  const pct = (used / total) * 100
  const col = d.maxLeft < 0 ? 'bg-bad' : d.maxLeft <= 5 ? 'bg-warn' : 'bg-accent'
  return (
    <div className="h-1.5 w-full rounded-full bg-line overflow-hidden" role="img" aria-label={`Израсходовано ${Math.round(pct)}% законного срока`}>
      <div className={`h-full ${col}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Section({ title, aside, children, className = '' }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card card-pad grid gap-3 content-start min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="h-section">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 min-w-0">
      <span className="label">{label}</span>
      <span className="text-sm break-words">{children || <span className="text-muted">не указано</span>}</span>
    </div>
  )
}
