import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Complaint } from './types'
import { generate } from './seed'
import { nowStamp } from '../lib/dates'

const KEY = 'upch-cabinet-v1'

interface Saved { patches: Record<string, Partial<Complaint>>; created: Complaint[] }

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && s.patches && s.created) return s
  } catch { /* пусто */ }
  return { patches: {}, created: [] }
}
function save(s: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* браузер без хранилища */ }
}

export interface Employee { login: string; name: string; short: string; title: string }

function readEmployee(): Employee {
  let login = ''
  try { login = JSON.parse(sessionStorage.getItem('fgis-upch-user') ?? '{}').login ?? '' } catch { /* нет входа */ }
  const name = login || 'Иванова Елена Сергеевна'
  const parts = name.split(' ')
  const short = parts.length === 3 ? `${parts[1][0]}. ${parts[2][0]}. ${parts[0]}` : name
  return { login, name, short, title: 'Консультант отдела защиты прав человека в местах принудительного содержания' }
}

interface Store {
  complaints: Complaint[]
  byId: Map<string, Complaint>
  me: Employee
  update: (id: string, patch: Partial<Complaint>, what?: string) => void
  create: (c: Complaint) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)
const SEED = generate()

export function DataProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(load)
  const me = useMemo(readEmployee, [])
  const complaints = useMemo(() => {
    const base = [...saved.created, ...SEED]
    return base.map((c) => (saved.patches[c.id] ? { ...c, ...saved.patches[c.id] } : c))
  }, [saved])
  const byId = useMemo(() => new Map(complaints.map((c) => [c.id, c])), [complaints])

  const update = useCallback((id: string, patch: Partial<Complaint>, what?: string) => {
    setSaved((s) => {
      const cur = [...s.created, ...SEED].find((c) => c.id === id)
      if (!cur) return s
      const prev = { ...cur, ...(s.patches[id] ?? {}) }
      const next: Partial<Complaint> = { ...(s.patches[id] ?? {}), ...patch }
      if (what) next.history = [...(patch.history ?? prev.history), { at: nowStamp(), who: 'Вы', what }]
      const out = { ...s, patches: { ...s.patches, [id]: next } }
      save(out)
      return out
    })
  }, [])
  const create = useCallback((c: Complaint) => {
    setSaved((s) => { const out = { ...s, created: [c, ...s.created] }; save(out); return out })
  }, [])
  const reset = useCallback(() => { const out = { patches: {}, created: [] }; save(out); setSaved(out) }, [])

  return <Ctx.Provider value={{ complaints, byId, me, update, create, reset }}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('DataProvider не найден')
  return s
}
