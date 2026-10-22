import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Save, Phone, Mail, AlertTriangle } from 'lucide-react'
import { useStore } from '../data/store'
import { autofill, previewPriority } from '../data/ai'
import { TOPICS, topicById } from '../data/topics'
import { INSTITUTIONS } from '../data/seed'
import { ANSWER_WAYS, CRITERIA, LEGAL_DAYS, PCLASS_RULE, QUESTIONS, RECOMMENDED_DAYS, REPRESENT, RELATIONS } from '../config/reference'
import type { Answers, Channel } from '../config/reference'
import type { Applicant, Complaint } from '../data/types'
import { PriorityBadge } from '../components/ui'
import { TODAY, addDays, fmtDate, nowStamp } from '../lib/dates'

const EMPTY: Answers = { goal: 1, sphere: 5, victims: 0, group: 0, location: 3, health: 1, change: 2, when: 4, prior: 0, comm: 0 }

export default function NewCasePage() {
  const { complaints, create } = useStore()
  const nav = useNavigate()
  const [channel, setChannel] = useState<Channel>('hotline')
  const [inst, setInst] = useState(0)
  const [ap, setAp] = useState<Applicant>({ fio: '', birthYear: 1970, phone: '', email: '', address: '', answerWay: 1, represent: 1, victimFio: '', relation: 0, count: 1 })
  const [text, setText] = useState('')
  const [ans, setAns] = useState<Answers>(EMPTY)
  const [topic, setTopic] = useState<string>('')
  const [aiNotes, setAiNotes] = useState<string[]>([])
  const [err, setErr] = useState('')
  const setA = (k: keyof Applicant, v: string | number) => setAp((p) => ({ ...p, [k]: v }))
  const institution = INSTITUTIONS[inst].name
  const pv = useMemo(() => previewPriority(ans, topic || null, institution, complaints), [ans, topic, institution, complaints])

  const runAi = () => {
    if (text.trim().length < 20) { setErr('Сначала запишите суть обращения: ИИ заполнит анкету по тексту'); return }
    const r = autofill(text, ans)
    setAns(r.answers)
    if (r.topic) setTopic(r.topic)
    setAiNotes(r.notes.length ? r.notes : ['Явных признаков не найдено, проверьте ответы вручную'])
    setErr('')
  }

  const save = () => {
    if (!ap.fio.trim()) { setErr('Укажите ФИО заявителя'); return }
    if (text.trim().length < 20) { setErr('Опишите ситуацию: не меньше 20 знаков'); return }
    if (!topic) { setErr('Выберите сюжет обращения или нажмите «Заполнить по тексту»'); return }
    const t = topicById.get(topic)!
    const id = `УПЧ-${TODAY.slice(2, 4)}-${String(Date.now()).slice(-5)}`
    const now = nowStamp()
    const c: Complaint = {
      id, channel, topic, received: TODAY, registered: TODAY,
      institution, region: INSTITUTIONS[inst].region,
      applicant: { ...ap, email: ap.email.trim(), answerWay: ap.answerWay === 0 && !ap.email.trim() ? 1 : ap.answerWay },
      answers: ans, text: text.trim(), attachments: channel === 'paper' ? ['Скан письма (PDF)'] : [],
      vid: t.vid, cat: t.cat, sub: t.sub, priority: pv.p, priorityConfirmed: false,
      status: 'work', reply: '', replyEdited: false, signature: null, printed: false, sentAt: null, sentWay: null, extended: false,
      history: [
        { at: now, who: 'Вы', what: channel === 'hotline' ? 'Принято по горячей линии, анкета заполнена со слов заявителя' : 'Бумажное обращение оцифровано и внесено в систему' },
        { at: now, who: 'Система', what: 'Зарегистрировано, ИИ рассчитал приоритет' },
      ],
      createdByMe: true,
    }
    create(c)
    nav(`/case/${encodeURIComponent(id)}`)
  }

  const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} aria-pressed={on} className={`chip text-left !font-medium ${on ? 'bg-ink text-white border-ink' : 'bg-surface border-line2 hover:border-ink'}`}>{children}</button>
  )

  return (
    <div className="grid gap-5">
      <div>
        <p className="eyebrow">Для горячей линии и приема бумажных писем</p>
        <h1 className="page-title mt-1">Новое обращение</h1>
        <p className="text-muted mt-2 max-w-3xl">Заполните единую анкету со слов заявителя. Можно сначала записать суть разговора, затем нажать «Заполнить по тексту»: ИИ предложит ответы на вопросы, вы их проверите.</p>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <div className="grid gap-5 min-w-0">
          <section className="card card-pad grid gap-4">
            <h2 className="h-section">Поступление</h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Форма поступления">
              {([['hotline', 'Горячая линия', Phone], ['paper', 'Бумажное письмо', Mail]] as const).map(([k, l, I]) => (
                <button key={k} role="radio" aria-checked={channel === k} onClick={() => setChannel(k)}
                  className={`btn ${channel === k ? 'bg-accent text-white' : 'bg-surface border border-line2 hover:border-ink'}`}><I size={16} aria-hidden />{l}</button>
              ))}
            </div>
            <label className="grid gap-1"><span className="label">Учреждение ФСИН России</span>
              <select className="select !rounded-[14px] w-full" value={inst} onChange={(e) => setInst(Number(e.target.value))}>{INSTITUTIONS.map((x, i) => <option key={i} value={i}>{x.name}</option>)}</select>
            </label>
          </section>

          <section className="card card-pad grid gap-4">
            <h2 className="h-section">Заявитель</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="grid gap-1 sm:col-span-2"><span className="label">ФИО заявителя *</span><input className="input" value={ap.fio} onChange={(e) => setA('fio', e.target.value)} placeholder="Фамилия Имя Отчество" /></label>
              <label className="grid gap-1"><span className="label">Телефон</span><input className="input" value={ap.phone} onChange={(e) => setA('phone', e.target.value)} placeholder="+7" /></label>
              <label className="grid gap-1"><span className="label">Электронная почта</span><input className="input" type="email" value={ap.email} onChange={(e) => setA('email', e.target.value)} /></label>
              <label className="grid gap-1 sm:col-span-2"><span className="label">Почтовый адрес для ответа</span><input className="input" value={ap.address} onChange={(e) => setA('address', e.target.value)} placeholder="Индекс, регион, город, улица, дом, квартира" /></label>
              <label className="grid gap-1"><span className="label">Год рождения</span><input className="input" type="number" value={ap.birthYear} onChange={(e) => setA('birthYear', Number(e.target.value))} /></label>
              <label className="grid gap-1"><span className="label">Способ получения ответа</span>
                <select className="select !rounded-[14px]" value={ap.answerWay} onChange={(e) => setA('answerWay', Number(e.target.value))}>{ANSWER_WAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>
              <label className="grid gap-1"><span className="label">Обращается</span>
                <select className="select !rounded-[14px]" value={ap.represent} onChange={(e) => setA('represent', Number(e.target.value))}>{REPRESENT.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>
              {ap.represent === 1 && <>
                <label className="grid gap-1"><span className="label">Кем приходится</span>
                  <select className="select !rounded-[14px]" value={ap.relation} onChange={(e) => setA('relation', Number(e.target.value))}>{RELATIONS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>
                <label className="grid gap-1 sm:col-span-2"><span className="label">ФИО человека, чьи права затронуты</span><input className="input" value={ap.victimFio} onChange={(e) => setA('victimFio', e.target.value)} /></label>
              </>}
              {ap.represent === 2 && <label className="grid gap-1"><span className="label">Количество заявителей</span><input className="input" type="number" min={2} value={ap.count} onChange={(e) => setA('count', Number(e.target.value))} /></label>}
            </div>
          </section>

          <section className="card card-pad grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="h-section">Описание ситуации</h2>
              <button className="btn-secondary" onClick={runAi}><Sparkles size={15} aria-hidden />Заполнить анкету по тексту</button>
            </div>
            <textarea className="input !rounded-[16px] min-h-[150px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} placeholder="Что произошло и когда, где находится человек, к кому уже обращались" />
            {aiNotes.length > 0 && <p className="text-sm rounded-[14px] bg-accent-soft px-3 py-2"><Sparkles size={14} className="inline mr-1.5 -mt-0.5" aria-hidden />ИИ заполнил ответы: {aiNotes.join('; ')}. Проверьте их ниже.</p>}
            <label className="grid gap-1"><span className="label">Сюжет обращения *</span>
              <select className="select !rounded-[14px] w-full" value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="">Выберите</option>
                {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
          </section>

          <section className="card card-pad grid gap-5">
            <h2 className="h-section">Вопросы о ситуации</h2>
            {QUESTIONS.map((q) => (
              <fieldset key={q.key} className="grid gap-2">
                <legend className="text-sm font-semibold mb-2">{q.n}. {q.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o, i) => <Pill key={o} on={ans[q.key] === i} onClick={() => setAns((p) => ({ ...p, [q.key]: i }))}>{o}</Pill>)}
                </div>
              </fieldset>
            ))}
            <p className="text-xs text-muted flex gap-2"><AlertTriangle size={14} className="shrink-0" aria-hidden />Если кому-то грозит опасность прямо сейчас, посоветуйте заявителю позвонить 112: обращение не заменяет вызов экстренных служб.</p>
          </section>
        </div>

        <aside className="grid gap-4 xl:sticky xl:top-28">
          <section className="card card-pad grid gap-3">
            <h2 className="h-section">Приоритет по анкете</h2>
            <div className="flex items-center gap-3"><span className="kpi-num text-[40px]">{pv.s}</span><PriorityBadge cls={pv.cls} big /></div>
            <p className="text-xs text-muted">{PCLASS_RULE[pv.cls]}</p>
            <ul className="grid gap-1 text-sm">
              {CRITERIA.map((k) => (
                <li key={k.key} className="flex justify-between gap-2"><span className="text-muted">{k.name}</span><span className="font-semibold">{pv.p[k.key]} × {k.w}</span></li>
              ))}
            </ul>
            <div className="grid gap-1 border-t border-line pt-3 text-sm">
              <span>Рекомендуемый срок: <b>{fmtDate(addDays(TODAY, RECOMMENDED_DAYS[pv.cls]))}</b></span>
              <span>Срок по закону: <b>{fmtDate(addDays(TODAY, LEGAL_DAYS))}</b></span>
              {pv.similar > 0 && <span className="text-xs text-muted">Похожих обращений по учреждению: {pv.similar}</span>}
            </div>
          </section>
          {err && <p className="text-sm text-bad font-semibold" role="alert">{err}</p>}
          <button className="btn-primary !py-3 text-md" onClick={save}><Save size={18} aria-hidden />Зарегистрировать обращение</button>
        </aside>
      </div>
    </div>
  )
}
