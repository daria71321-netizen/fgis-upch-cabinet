import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Inbox, FilePlus2, BarChart3, BookOpen, Search, Menu, X, LogOut, RotateCcw } from 'lucide-react'
import { AGENCY, DEMO_NOTE, PORTAL_URL } from '../config/reference'
import { useStore } from '../data/store'
import { deadlineState } from '../data/ai'
import { TODAY, fmtLong, weekday } from '../lib/dates'

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { complaints, me, reset } = useStore()
  const urgent = useMemo(() => complaints.filter((c) => c.status !== 'sent' && ['overdue', 'today'].includes(deadlineState(c))).length, [complaints])
  const MENU = [
    { to: '/', label: 'Обращения', icon: Inbox, end: true, count: urgent },
    { to: '/new', label: 'Новое обращение', icon: FilePlus2 },
    { to: '/kpi', label: 'Мои показатели', icon: BarChart3 },
    { to: '/rules', label: 'Сроки и правила', icon: BookOpen },
  ]
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} aria-hidden />}
      <nav
        className={`no-print fixed lg:sticky top-0 lg:top-3 z-40 h-screen lg:h-[calc(100vh-24px)] lg:m-3 lg:mr-0 w-[248px] shrink-0 bg-side text-side-ink flex flex-col px-3 py-5 gap-1 lg:rounded-[28px] overflow-y-auto transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Основное меню"
      >
        <Link to="/" className="flex items-center gap-3 px-2 pb-5 pt-1 rounded" onClick={onClose}>
          <span className="grid place-items-center w-10 h-10 rounded-full bg-accent text-white text-[11px] font-display font-medium tracking-wide shadow-[0_0_0_4px_rgba(59,58,64,.14)]">УПЧ</span>
          <span className="leading-tight">
            <span className="block text-ink font-display font-medium tracking-tight">ФГИС УПЧ</span>
            <span className="block text-xs text-side-ink">Кабинет сотрудника</span>
          </span>
        </Link>
        {MENU.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] transition-colors ${isActive ? 'bg-side-act text-white font-semibold shadow-[0_8px_24px_-10px_rgba(30,30,40,.8)]' : 'hover:bg-black/[.05] hover:text-ink'}`
            }
          >
            <m.icon size={18} aria-hidden />
            <span className="flex-1">{m.label}</span>
            {!!m.count && <span className="badge bg-bad text-white !px-2" title="Просрочено или срок истекает сегодня">{m.count}</span>}
          </NavLink>
        ))}
        <div className="mt-auto grid gap-2 pt-4">
          <div className="mx-1 rounded-[20px] bg-white/70 p-4 text-xs leading-snug">
            <span className="block text-ink font-semibold text-sm">{me.short}</span>
            <span className="block mt-0.5">{me.title}</span>
            <span className="block mt-2 text-ink">Ведомство: {AGENCY.name}</span>
            <a href={PORTAL_URL} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-ink hover:underline"><LogOut size={14} aria-hidden />Выйти</a>
          </div>
          <button className="mx-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-side-ink hover:text-ink rounded-full hover:bg-black/[.05]" onClick={() => { if (confirm('Сбросить все изменения демо-версии?')) reset() }}>
            <RotateCcw size={13} aria-hidden />Сбросить демо-данные
          </button>
        </div>
      </nav>
    </>
  )
}

function SearchBox() {
  const { complaints } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const res = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    return complaints.filter((c) => c.id.toLowerCase().includes(s) || c.applicant.fio.toLowerCase().includes(s) || c.applicant.victimFio.toLowerCase().includes(s)).slice(0, 7)
  }, [q, complaints])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const go = (id: string) => { nav(`/case/${encodeURIComponent(id)}`); setQ(''); setOpen(false) }
  return (
    <div ref={ref} className="relative w-full sm:w-72">
      <label className="flex items-center gap-2 rounded-full border border-line2 bg-surface px-4 py-2 focus-within:border-accent">
        <Search size={16} className="text-muted shrink-0" aria-hidden />
        <span className="sr-only">Поиск по номеру и ФИО</span>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) go(res[0].id); if (e.key === 'Escape') setOpen(false) }}
          placeholder="Номер обращения или ФИО"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>
      {open && res.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full sm:w-96 right-0 rounded-[18px] border border-line bg-surface shadow-pop py-2">
          {res.map((c) => (
            <li key={c.id}>
              <button className="w-full text-left px-3 py-2 hover:bg-bg flex justify-between gap-3 text-sm" onClick={() => go(c.id)}>
                <span>{c.applicant.fio}</span><span className="text-muted text-xs shrink-0">{c.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="no-print lg:sticky top-3 z-20 mx-3 lg:mx-4 mt-3 rounded-[24px] glass shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 lg:px-6 py-3">
        <button className="lg:hidden btn-ghost !p-2" onClick={onMenu} aria-label="Открыть меню"><Menu size={20} aria-hidden /></button>
        <span className="font-display font-medium text-md tracking-tight whitespace-nowrap">Кабинет сотрудника УПЧ</span>
        <span className="badge bg-ink text-white" title="MVP: все обращения в одном ведомстве">{AGENCY.name}</span>
        <span className="badge border border-line2 text-muted bg-surface" title="Все данные тестовые">Демонстрационный режим</span>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="hidden md:inline">Сегодня {weekday(TODAY)}, {fmtLong(TODAY)}</span>
          <SearchBox />
        </div>
      </div>
    </header>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      {open && <button className="fixed top-3 left-[256px] z-50 btn-secondary !p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Закрыть меню"><X size={18} aria-hidden /></button>}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main key={loc.pathname} className="page-enter flex-1 px-4 lg:px-7 py-6">{children}</main>
        <footer className="no-print mt-6 mx-3 lg:mx-4 mb-3 rounded-[24px] bg-side text-side-ink px-6 py-5 text-xs grid gap-1.5">
          <p className="text-sm text-ink font-display font-normal tracking-tight">{DEMO_NOTE}: обращения, заявители и учреждения демонстрационные.</p>
          <p>Рекомендации ИИ носят вспомогательный характер: классификацию, приоритет и текст ответа подтверждает сотрудник. Приоритет определяет внутреннюю очередность и не меняет законный срок ответа.</p>
        </footer>
      </div>
    </div>
  )
}
