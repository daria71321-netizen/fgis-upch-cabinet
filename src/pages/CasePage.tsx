import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Sparkles, Printer, ShieldCheck, Send, Pencil, Check, X, Paperclip, CalendarPlus, AlertTriangle, Info, ChevronDown, RotateCcw, Lock, History } from 'lucide-react'
import { useStore } from '../data/store'
import { analyze, buildReply, deadlines, variantsFor, territorial } from '../data/ai'
import type { Variant } from '../data/ai'
import { topicById } from '../data/topics'
import { ANSWER_WAYS, APPEAL_TYPES, CATEGORIES, CHANNELS, CRITERIA, ORG, PCLASS_RULE, QUESTIONS, RECOMMENDED_DAYS, REPRESENT, RELATIONS, SUBCATEGORIES, AGENCY, priorityFromAnswers, score, pclass } from '../config/reference'
import type { Answers, PriorityInput, PKey } from '../config/reference'
import type { Applicant, Complaint, Signature } from '../data/types'
import { ChannelBadge, Field, PriorityBadge, Section, StatusBadge, TermBar, leftText, PCLS_STYLE } from '../components/ui'
import SignModal, { SignStamp } from '../components/SignModal'
import { TODAY, fmtDate, fmtLong, fmtStamp, days } from '../lib/dates'

export default function CasePage() {
  const { id = '' } = useParams()
  const { byId } = useStore()
  const c = byId.get(decodeURIComponent(id))
  if (!c) return (
    <div className="card card-pad grid gap-2 max-w-lg">
      <h1 className="text-xl font-semibold">Обращение не найдено</h1>
      <Link to="/" className="link">Вернуться к списку</Link>
    </div>
  )
  return <CaseView key={c.id} c={c} />
}

function CaseView({ c }: { c: Complaint }) {
  const { complaints, update, me } = useStore()
  const t = topicById.get(c.topic)!
  const d = deadlines(c)
  const ai = useMemo(() => analyze(c, complaints), [c, complaints])
  const variants = variantsFor(c)
  const [variant, setVariant] = useState<Variant['id']>(variants[0].id)
  const aiText = buildReply(c, variant)
  const [draft, setDraft] = useState(c.reply || buildReply(c, variants[0].id))
  const [editForm, setEditForm] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const sent = c.status === 'sent'
  const locked = sent || !!c.signature
  const byEmail = c.applicant.answerWay === 0 && !!c.applicant.email

  // Открытое новое обращение переходит в работу
  useEffect(() => {
    if (c.status === 'new') update(c.id, { status: 'work' }, 'Взято в работу')
  }, [c.id, c.status, update])

  const saveDraft = (text = draft) => {
    if (text !== c.reply) update(c.id, { reply: text, replyEdited: text.trim() !== aiText.trim() })
  }
  const useAi = () => { setDraft(aiText); update(c.id, { reply: aiText, replyEdited: false }, `Вставлен проект ответа ИИ: «${variants.find((v) => v.id === variant)?.label}»`) }
  const flash = (s: string) => { setNotice(s); setTimeout(() => setNotice(''), 4000) }

  const doPrint = () => {
    saveDraft()
    update(c.id, { printed: true, status: c.signature || sent ? c.status : 'ready' }, 'Ответ распечатан для подписи')
    setTimeout(() => window.print(), 50)
  }
  const onSigned = (s: Signature) => {
    setSignOpen(false)
    update(c.id, { signature: s, reply: draft, replyEdited: draft.trim() !== aiText.trim(), status: 'ready' }, 'Ответ подписан КЭП')
    flash('Ответ подписан квалифицированной электронной подписью')
  }
  const unsign = () => {
    if (!confirm('Изменение текста снимет электронную подпись. Продолжить?')) return
    update(c.id, { signature: null, status: 'work' }, 'Подпись снята для изменения текста')
  }
  const send = () => {
    const way = c.signature && byEmail ? `По электронной почте на ${c.applicant.email}, подписан КЭП` : 'Почтой, подписан собственноручно'
    update(c.id, { status: 'sent', sentAt: `${TODAY}T${new Date().toTimeString().slice(0, 5)}`, sentWay: way, reply: draft }, `Ответ направлен: ${way}`)
    flash('Ответ направлен заявителю. Обращение учтено в ваших показателях.')
  }
  const extend = () => {
    const why = prompt('Причина продления срока на 30 дней (59-ФЗ, ст. 12 ч. 2). Заявитель будет уведомлен.')
    if (!why) return
    update(c.id, { extended: true }, `Срок продлен на 30 дней: ${why}`)
  }

  return (
    <div className="grid gap-5">
      <div className="no-print grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/" className="btn-secondary"><ArrowLeft size={16} aria-hidden />Все обращения</Link>
          <span className="text-sm text-muted">{c.id}</span>
        </div>

        <div className="grid gap-2">
          <h1 className="page-title">{t.title}</h1>
          <p className="text-muted">{c.institution} · {AGENCY.name}</p>
        </div>

        {/* Паспорт обращения: форма поступления, важность, сроки */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="card px-5 py-4 grid gap-2 content-start">
            <span className="label">Форма поступления</span>
            <div><ChannelBadge channel={c.channel} big /></div>
            <span className="text-xs text-muted">{CHANNELS[c.channel].hint}. Поступило {fmtDate(c.received)}, зарегистрировано {fmtDate(c.registered)}</span>
          </div>
          <div className="card px-5 py-4 grid gap-2 content-start">
            <span className="label">Важность по ранжированию</span>
            <div className="flex flex-wrap items-center gap-2"><PriorityBadge cls={d.cls} score={d.score} big />{c.priorityConfirmed ? <span className="badge bg-good-soft text-good"><Check size={12} aria-hidden />подтверждено</span> : <span className="badge bg-warn-soft text-warn">предложено ИИ</span>}</div>
            <span className="text-xs text-muted">{PCLASS_RULE[d.cls]}</span>
          </div>
          <div className="card px-5 py-4 grid gap-2 content-start">
            <span className="label">Рекомендуемый срок ответа</span>
            <span className={`kpi-num text-[22px] ${d.recLeft <= 1 && !sent ? 'text-bad' : d.recLeft <= 3 && !sent ? 'text-warn' : ''}`}>{fmtDate(d.rec)}</span>
            <span className="text-xs text-muted">{sent ? 'Ответ направлен' : leftText(d.recLeft)}. Для класса «{d.cls}»: {days(RECOMMENDED_DAYS[d.cls])} с поступления</span>
          </div>
          <div className="card px-5 py-4 grid gap-2 content-start">
            <span className="label">Максимальный срок по закону</span>
            <span className={`kpi-num text-[22px] ${d.maxLeft < 0 && !sent ? 'text-bad' : ''}`}>{fmtDate(d.max)}</span>
            {!sent && <TermBar c={c} />}
            <span className="text-xs text-muted">{sent ? `Ответ ${fmtDate(c.sentAt!)}` : leftText(d.maxLeft)}. 30 дней с регистрации{c.extended ? ' + продление 30 дней' : ''} (59-ФЗ, ст. 12)</span>
            {!sent && !c.extended && <button onClick={extend} className="justify-self-start inline-flex items-center gap-1 text-xs font-semibold hover:underline"><CalendarPlus size={13} aria-hidden />Продлить на 30 дней</button>}
          </div>
        </div>

        {notice && <div className="rounded-full bg-good-soft text-good px-5 py-2.5 text-sm font-semibold" role="status">{notice}</div>}

        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-5 items-start">
          {/* Левая колонка: жалоба */}
          <div className="grid gap-5 min-w-0">
            {editForm
              ? <FormEditor c={c} onClose={() => setEditForm(false)} />
              : (
                <>
                  <Section title="Описание ситуации" aside={!sent && <button className="btn-secondary !py-1.5" onClick={() => setEditForm(true)}><Pencil size={14} aria-hidden />Редактировать жалобу</button>}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{c.text}</p>
                    {c.attachments.length > 0 && (
                      <ul className="flex flex-wrap gap-2">
                        {c.attachments.map((a) => <li key={a} className="badge bg-bg text-ink border border-line2 !py-1"><Paperclip size={12} aria-hidden />{a}</li>)}
                      </ul>
                    )}
                  </Section>
                  <FormView c={c} />
                </>
              )}
            <PriorityPanel c={c} readOnly={sent} />
            <HistoryPanel c={c} />
          </div>

          {/* Правая колонка: ИИ и ответ */}
          <div className="grid gap-5 min-w-0 xl:sticky xl:top-28">
            <section className="card card-pad grid gap-3 border-2 !border-accent/15">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="h-section flex items-center gap-2"><Sparkles size={18} aria-hidden />Рекомендация ИИ</h2>
                <span className="badge bg-accent-soft text-ink">уверенность {Math.round(ai.confidence * 100)}%</span>
              </div>
              <p className="text-sm"><span className="font-semibold">Маршрут: </span>{ai.route}</p>
              <p className="text-sm"><span className="font-semibold">Классификация: </span>{ai.classText}</p>
              {ai.flags.length > 0 && (
                <ul className="grid gap-1.5">
                  {ai.flags.map((f) => (
                    <li key={f.text} className={`flex gap-2 text-sm rounded-[14px] px-3 py-2 ${f.level === 'bad' ? 'bg-bad-soft text-bad' : f.level === 'warn' ? 'bg-warn-soft text-warn' : 'bg-info-soft text-info'}`}>
                      {f.level === 'info' ? <Info size={16} className="shrink-0 mt-0.5" aria-hidden /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />}{f.text}
                    </li>
                  ))}
                </ul>
              )}
              <details className="group">
                <summary className="cursor-pointer list-none inline-flex items-center gap-1 text-sm font-semibold"><ChevronDown size={15} className="group-open:rotate-180 transition-transform" aria-hidden />Правовые основания ({ai.basis.length})</summary>
                <ul className="mt-2 grid gap-1 text-sm text-muted list-disc pl-5">{ai.basis.map((b) => <li key={b}>{b}</li>)}</ul>
              </details>
              {!locked && (
                <div className="grid gap-2 pt-1">
                  <span className="label">Вариант проекта ответа</span>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <button key={v.id} onClick={() => setVariant(v.id)} aria-pressed={variant === v.id} title={v.hint}
                        className={`chip ${variant === v.id ? 'bg-ink text-white border-ink' : 'bg-surface border-line2 hover:border-ink'}`}>{v.label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted">{variants.find((v) => v.id === variant)?.hint}</p>
                  <button className="btn-secondary justify-self-start" onClick={useAi}><Sparkles size={15} aria-hidden />Вставить проект в ответ</button>
                </div>
              )}
            </section>

            <section className="card card-pad grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="h-section">Ответ заявителю</h2>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-xs text-muted">
                Способ ответа, выбранный заявителем: <b className="text-ink">{ANSWER_WAYS[c.applicant.answerWay]}</b>{byEmail ? ` (${c.applicant.email})` : ''}.{' '}
                {byEmail ? 'Ответ направляется электронным документом, подписанным КЭП (59-ФЗ, ст. 10 ч. 4).' : 'Ответ направляется в письменной форме по почтовому адресу: распечатайте и подпишите.'}
              </p>
              <textarea
                className="input !rounded-[18px] min-h-[340px] leading-relaxed text-[14.5px] resize-y disabled:bg-bg"
                value={draft}
                readOnly={locked}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => saveDraft()}
                aria-label="Текст ответа"
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>{draft.length} знаков</span>
                {draft.trim() !== aiText.trim() && !locked && <span className="text-ink font-semibold">Текст изменен сотрудником</span>}
                {!locked && draft !== aiText && <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setDraft(aiText)}><RotateCcw size={12} aria-hidden />Вернуть проект ИИ</button>}
                {c.signature && !sent && <button className="inline-flex items-center gap-1 font-semibold text-ink hover:underline" onClick={unsign}><Lock size={12} aria-hidden />Изменить текст (подпись будет снята)</button>}
              </div>
              {c.signature && <SignStamp s={c.signature} />}
              {sent ? (
                <p className="rounded-[16px] bg-good-soft text-good px-4 py-3 text-sm font-semibold">Ответ направлен {fmtStamp(c.sentAt!)}: {c.sentWay}</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="btn-secondary" onClick={doPrint}><Printer size={16} aria-hidden />Распечатать для подписи</button>
                  {!c.signature && <button className="btn-primary" onClick={() => { saveDraft(); setSignOpen(true) }} disabled={!draft.trim()}><ShieldCheck size={16} aria-hidden />Подписать КЭП</button>}
                  {(c.signature || c.printed) && (
                    <button className="btn-primary" onClick={send}><Send size={16} aria-hidden />{c.signature && byEmail ? 'Отправить на e-mail' : 'Отметить: отправлено почтой'}</button>
                  )}
                </div>
              )}
              {!sent && !c.signature && !c.printed && <p className="text-xs text-muted">Чтобы отправить ответ, подпишите его электронной подписью или распечатайте и подпишите собственноручно.</p>}
            </section>
          </div>
        </div>
      </div>

      <Letter c={c} text={draft} me={me.short} title={me.title} />
      {signOpen && <SignModal owner={me.name} onClose={() => setSignOpen(false)} onSigned={onSigned} />}
    </div>
  )
}

// ---------- Анкета ----------

function FormView({ c }: { c: Complaint }) {
  const a = c.applicant
  return (
    <Section title="Анкета обращения" aside={<span className="text-xs text-muted">Единая форма (Приложение 5)</span>}>
      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3">
        <Field label="Заявитель">{a.fio}{a.represent === 2 ? ` и еще ${a.count - 1} заявителей` : ''}</Field>
        <Field label="Год рождения">{String(a.birthYear)}</Field>
        <Field label="Телефон">{a.phone}</Field>
        <Field label="Электронная почта">{a.email}</Field>
        <Field label="Почтовый адрес">{a.address}</Field>
        <Field label="Способ получения ответа">{ANSWER_WAYS[a.answerWay]}</Field>
        <Field label="Обращается">{REPRESENT[a.represent]}{a.represent === 1 ? `: ${RELATIONS[a.relation].toLowerCase()}` : ''}</Field>
        <Field label="Чьи права затронуты">{a.victimFio || (a.represent === 2 ? 'Группа заявителей' : a.fio)}</Field>
      </div>
      <ol className="grid gap-2 mt-1 border-t border-line pt-3">
        {QUESTIONS.map((q) => (
          <li key={q.key} className="grid sm:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] gap-x-4 gap-y-0.5 text-sm">
            <span className="text-muted">{q.n}. {q.title}</span>
            <span className="font-medium">{q.options[c.answers[q.key]]}</span>
          </li>
        ))}
      </ol>
    </Section>
  )
}

function FormEditor({ c, onClose }: { c: Complaint; onClose: () => void }) {
  const { update } = useStore()
  const [ap, setAp] = useState<Applicant>(c.applicant)
  const [ans, setAns] = useState<Answers>(c.answers)
  const [text, setText] = useState(c.text)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const setA = (k: keyof Applicant, v: string | number) => setAp((p) => ({ ...p, [k]: v }))
  const save = () => {
    if (!reason.trim()) { setErr('Укажите причину изменения: она сохраняется в истории карточки'); return }
    const priority = priorityFromAnswers(ans, c.priority.mass)
    update(c.id, { applicant: ap, answers: ans, text, priority, priorityConfirmed: false }, `Анкета изменена: ${reason.trim()}`)
    onClose()
  }
  const inp = (label: string, k: keyof Applicant, type = 'text') => (
    <label className="grid gap-1"><span className="label">{label}</span><input className="input" type={type} value={String(ap[k])} onChange={(e) => setA(k, type === 'number' ? Number(e.target.value) : e.target.value)} /></label>
  )
  return (
    <section className="card card-pad grid gap-4 ring-2 ring-accent/30">
      <div className="flex items-center justify-between gap-2">
        <h2 className="h-section">Редактирование жалобы</h2>
        <button className="btn-ghost !p-2" onClick={onClose} aria-label="Отменить"><X size={18} aria-hidden /></button>
      </div>
      <label className="grid gap-1"><span className="label">Описание ситуации</span><textarea className="input !rounded-[16px] min-h-[150px]" value={text} onChange={(e) => setText(e.target.value)} /></label>
      <div className="grid sm:grid-cols-2 gap-3">
        {inp('ФИО заявителя', 'fio')}
        {inp('Год рождения', 'birthYear', 'number')}
        {inp('Телефон', 'phone')}
        {inp('Электронная почта', 'email')}
        <div className="sm:col-span-2">{inp('Почтовый адрес', 'address')}</div>
        <label className="grid gap-1"><span className="label">Способ получения ответа</span>
          <select className="select !rounded-[14px]" value={ap.answerWay} onChange={(e) => setA('answerWay', Number(e.target.value))}>{ANSWER_WAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>
        {inp('ФИО человека, чьи права затронуты', 'victimFio')}
      </div>
      <div className="grid gap-3 border-t border-line pt-3">
        {QUESTIONS.map((q) => (
          <label key={q.key} className="grid gap-1">
            <span className="label">{q.n}. {q.title}</span>
            <select className="select !rounded-[14px] w-full" value={ans[q.key]} onChange={(e) => setAns((p) => ({ ...p, [q.key]: Number(e.target.value) }))}>
              {q.options.map((o, i) => <option key={o} value={i}>{o}</option>)}
            </select>
          </label>
        ))}
      </div>
      <label className="grid gap-1"><span className="label">Причина изменения (обязательно)</span><input className="input" value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} placeholder="Например: уточнено по телефону со слов заявителя" /></label>
      {err && <p className="text-sm text-bad" role="alert">{err}</p>}
      <p className="text-xs text-muted">После сохранения приоритет пересчитается по ответам анкеты и потребует подтверждения.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={save}><Check size={16} aria-hidden />Сохранить изменения</button>
        <button className="btn-secondary" onClick={onClose}>Отмена</button>
      </div>
    </section>
  )
}

// ---------- Классификация и приоритет ----------

function PriorityPanel({ c, readOnly }: { c: Complaint; readOnly: boolean }) {
  const { update } = useStore()
  const [edit, setEdit] = useState(false)
  const [p, setP] = useState<PriorityInput>(c.priority)
  const [cls, setCls] = useState({ vid: c.vid, cat: c.cat, sub: c.sub })
  const [reason, setReason] = useState('')
  const s = score(edit ? p : c.priority)
  const pc = pclass(s)
  const save = () => {
    if (!reason.trim()) return
    update(c.id, { priority: p, ...cls, priorityConfirmed: true }, `Классификация и приоритет исправлены: ${reason.trim()}`)
    setEdit(false); setReason('')
  }
  const subs = Object.keys(SUBCATEGORIES).filter((k) => k.startsWith(cls.cat))
  return (
    <Section title="Классификация и приоритет" aside={!readOnly && !edit && (
      <div className="flex gap-2">
        {!c.priorityConfirmed && <button className="btn-primary !py-1.5" onClick={() => update(c.id, { priorityConfirmed: true }, 'Классификация и приоритет ИИ подтверждены')}><Check size={14} aria-hidden />Подтвердить</button>}
        <button className="btn-secondary !py-1.5" onClick={() => { setP(c.priority); setEdit(true) }}><Pencil size={14} aria-hidden />Исправить</button>
      </div>
    )}>
      {edit ? (
        <div className="grid sm:grid-cols-3 gap-2">
          <select className="select !rounded-[14px]" value={cls.vid} onChange={(e) => setCls({ ...cls, vid: e.target.value as Complaint['vid'] })} aria-label="Вид обращения">{APPEAL_TYPES.map((v) => <option key={v.code} value={v.code}>{v.code} {v.name}</option>)}</select>
          <select className="select !rounded-[14px]" value={cls.cat} onChange={(e) => setCls({ ...cls, cat: e.target.value, sub: Object.keys(SUBCATEGORIES).find((k) => k.startsWith(e.target.value)) ?? '' })} aria-label="Категория прав">{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{k} {v}</option>)}</select>
          <select className="select !rounded-[14px]" value={cls.sub} onChange={(e) => setCls({ ...cls, sub: e.target.value })} aria-label="Подкатегория">{subs.length ? subs.map((k) => <option key={k} value={k}>{k} {SUBCATEGORIES[k]}</option>) : <option value="">нет подкатегорий</option>}</select>
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Вид обращения">{`${c.vid} ${APPEAL_TYPES.find((v) => v.code === c.vid)?.name}`}</Field>
          <Field label="Категория прав">{`${c.cat} ${CATEGORIES[c.cat]}`}</Field>
          <Field label="Подкатегория">{`${c.sub} ${SUBCATEGORIES[c.sub] ?? ''}`}</Field>
        </div>
      )}
      <table className="tbl mt-1">
        <thead><tr><th>Критерий</th><th className="!text-right">Вес</th><th className="!text-center">Оценка 1-5</th><th className="!text-right">Баллы</th></tr></thead>
        <tbody>
          {CRITERIA.map((k) => {
            const v = (edit ? p : c.priority)[k.key]
            return (
              <tr key={k.key}>
                <td>{k.name}<span className="block text-xs text-muted">{k.from}</span></td>
                <td className="text-right text-muted">×{k.w}</td>
                <td className="text-center">
                  {edit ? (
                    <select className="select !py-1 !pl-3 !pr-7" value={v} onChange={(e) => setP((x) => ({ ...x, [k.key as PKey]: Number(e.target.value) }))} aria-label={k.name}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
                  ) : (
                    <span className="inline-flex gap-0.5" aria-label={`${v} из 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={`w-2.5 h-2.5 rounded-full ${n <= v ? 'bg-ink' : 'bg-line'}`} />)}</span>
                  )}
                </td>
                <td className="text-right font-semibold">{k.w * v}</td>
              </tr>
            )
          })}
          <tr><td colSpan={3} className="font-semibold">Итоговый балл{(edit ? p : c.priority).threat >= 4 ? ' (с учетом правила угрозы)' : ''}</td><td className="text-right"><span className="badge text-sm" style={{ background: PCLS_STYLE[pc].dot, color: '#fff' }}>{s}</span></td></tr>
        </tbody>
      </table>
      <p className="text-xs text-muted">Класс «{pc}»: {PCLASS_RULE[pc]}. Угроза 5 поднимает балл до 85, угроза 4 до 75.</p>
      {edit && (
        <div className="grid gap-2">
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина изменения (обязательно, сохраняется в истории)" />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={!reason.trim()}><Check size={16} aria-hidden />Сохранить</button>
            <button className="btn-secondary" onClick={() => setEdit(false)}>Отмена</button>
          </div>
        </div>
      )}
    </Section>
  )
}

function HistoryPanel({ c }: { c: Complaint }) {
  return (
    <Section title={<span className="flex items-center gap-2"><History size={17} aria-hidden />История карточки</span>}>
      <ol className="grid gap-2">
        {[...c.history].reverse().map((h, i) => (
          <li key={i} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm">
            <span className="text-muted text-xs pt-0.5">{fmtStamp(h.at)}</span>
            <span><span className="font-semibold">{h.who}:</span> {h.what}</span>
          </li>
        ))}
      </ol>
    </Section>
  )
}

// ---------- Бланк для печати ----------

function Letter({ c, text, me, title }: { c: Complaint; text: string; me: string; title: string }) {
  return (
    <article className="print-only text-black font-sans text-[12.5pt] leading-[1.45]">
      <header className="grid grid-cols-2 gap-8 mb-8">
        <div className="text-center text-[10.5pt] leading-tight">
          <p className="font-bold uppercase">Уполномоченный по правам человека<br />в Российской Федерации</p>
          <p className="mt-1">{ORG.replace('Аппарат', 'Аппарат')}</p>
          <p className="mt-3">{fmtLong(TODAY)} № {c.id.replace('УПЧ', 'исх')}</p>
          <p>на № {c.id} от {fmtDate(c.received)}</p>
        </div>
        <div className="pt-6 text-[12pt]">
          <p>{c.applicant.fio}</p>
          <p>{c.applicant.answerWay === 0 && c.applicant.email ? c.applicant.email : c.applicant.address}</p>
        </div>
      </header>
      <div className="whitespace-pre-wrap text-justify">{text}</div>
      <footer className="mt-12 grid grid-cols-[1fr_auto] items-end gap-6">
        <div className="text-[11.5pt]">{title}</div>
        <div className="text-right">
          {c.signature ? <SignStamp s={c.signature} /> : <p>____________________ {me}</p>}
        </div>
      </footer>
      <p className="mt-10 text-[9.5pt]">Исполнитель: {me}. Копия: {territorial(c)} (по запросу).</p>
      <p className="mt-6 text-[8.5pt] text-center text-gray-500">Демонстрационный образец ФГИС УПЧ. Документ сформирован в учебных целях.</p>
    </article>
  )
}
