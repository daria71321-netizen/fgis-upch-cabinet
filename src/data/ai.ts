// Имитация ИИ-помощника: классификация, проверка полноты, маршрут и проект ответа.
// В демо работает по правилам и шаблонам, без внешних сервисов. Решение всегда за сотрудником.
import { CATEGORIES, EXTEND_DAYS, LEGAL_DAYS, RECOMMENDED_DAYS, SUBCATEGORIES, AGENCY, isSystemic, pclass, score, priorityFromAnswers, massFromSimilar, QUESTIONS } from '../config/reference'
import type { Answers, PClass } from '../config/reference'
import { TODAY, addDays, diffDays, fmtDate } from '../lib/dates'
import { TOPICS, topicById } from './topics'
import type { Complaint } from './types'

// ---------- Сроки ----------

export interface Deadlines { rec: string; max: string; recLeft: number; maxLeft: number; cls: PClass; score: number }

export function deadlines(c: Complaint): Deadlines {
  const s = score(c.priority)
  const cls = pclass(s)
  const max = addDays(c.registered, LEGAL_DAYS + (c.extended ? EXTEND_DAYS : 0))
  let rec = addDays(c.received, RECOMMENDED_DAYS[cls])
  if (rec > max) rec = max
  const ref = c.sentAt ? c.sentAt.slice(0, 10) : TODAY
  return { rec, max, recLeft: diffDays(rec, ref), maxLeft: diffDays(max, ref), cls, score: s }
}

export type DeadlineState = 'overdue' | 'today' | 'soon' | 'ok' | 'done'
export function deadlineState(c: Complaint): DeadlineState {
  if (c.status === 'sent') return 'done'
  const d = deadlines(c)
  if (d.maxLeft < 0) return 'overdue'
  if (d.recLeft <= 0) return 'today'
  if (d.recLeft <= 3) return 'soon'
  return 'ok'
}

// ---------- Анализ ----------

export interface Analysis {
  confidence: number
  route: string
  flags: { level: 'bad' | 'warn' | 'info'; text: string }[]
  basis: string[]
  similar: Complaint[]
  classText: string
}

export function analyze(c: Complaint, all: Complaint[]): Analysis {
  const t = topicById.get(c.topic) ?? TOPICS[0]
  const similar = all.filter((x) => x.id !== c.id && x.institution === c.institution && x.topic === c.topic)
  const flags: Analysis['flags'] = []
  if (c.priority.threat >= 4) flags.push({ level: 'bad', text: 'Признаки угрозы жизни и здоровью: передать на оперативную проверку, не дожидаясь остальных процедур' })
  if (isSystemic(c.priority)) flags.push({ level: 'warn', text: `Возможная системная проблема: ${similar.length} похожих обращений по этому учреждению` })
  else if (similar.length >= 2) flags.push({ level: 'info', text: `Есть ${similar.length} похожих обращения по этому учреждению` })
  if (t.missing && (c.text.length < 230 || c.channel === 'hotline')) flags.push({ level: 'warn', text: `Не хватает сведений: ${t.missing}` })
  if (c.applicant.answerWay === 0 && !c.applicant.email) flags.push({ level: 'warn', text: 'Заявитель выбрал ответ по электронной почте, но адрес не указан' })
  if (c.answers.comm > 0) flags.push({ level: 'info', text: 'Человеку трудно общаться на русском: учесть при информировании' })
  if (c.applicant.represent === 1 && c.attachments.every((a) => !a.includes('доверен'))) flags.push({ level: 'info', text: 'Обращение подано родственником: проверьте согласие пострадавшего на рассмотрение' })
  const conf = 0.72 + ((c.id.charCodeAt(c.id.length - 1) % 20) / 100)
  return {
    confidence: Math.min(0.97, conf),
    route: t.route,
    flags,
    basis: t.basis,
    similar,
    classText: `${c.vid} · ${CATEGORIES[c.cat]} · ${c.sub} ${SUBCATEGORIES[c.sub] ?? ''}`,
  }
}

// ---------- Проект ответа ----------

export interface Variant { id: 'accept' | 'explain' | 'clarify' | 'final'; label: string; hint: string }

export function variantsFor(c: Complaint): Variant[] {
  const t = topicById.get(c.topic) ?? TOPICS[0]
  const v: Variant[] = []
  if (c.vid === 'В04' || c.vid === 'В01') v.push({ id: 'explain', label: c.vid === 'В04' ? 'Разъяснение' : 'Ответ на предложение', hint: 'Ответ по существу без запроса в ведомство' })
  else v.push({ id: 'accept', label: 'Принято к рассмотрению', hint: 'Уведомление заявителя и запрос в территориальный орган ФСИН' })
  if (t.missing) v.push({ id: 'clarify', label: 'Запрос уточнений', hint: 'Попросить заявителя дополнить сведения' })
  if (c.vid !== 'В04' && c.vid !== 'В01') v.push({ id: 'final', label: 'Итоговый ответ', hint: 'Шаблон после получения ответа ведомства' })
  return v
}

const io = (fio: string) => fio.split(' ').slice(1).join(' ')
const female = (fio: string) => /вна$/.test(fio.trim())
const initials = (fio: string) => { const [s, n, p] = fio.split(' '); return `${s}а ${n?.[0] ?? ''}. ${p?.[0] ?? ''}.` }
export const territorial = (c: Complaint) => `УФСИН России по ${c.region}`

export function buildReply(c: Complaint, variant: Variant['id']): string {
  const t = topicById.get(c.topic) ?? TOPICS[0]
  const a = c.applicant
  const hello = a.represent === 2 ? 'Уважаемые заявители!' : `${female(a.fio) ? 'Уважаемая' : 'Уважаемый'} ${io(a.fio)}!`
  const about = a.victimFio ? ` в отношении ${initials(a.victimFio)}` : ''
  const head = `Ваше обращение от ${fmtDate(c.received)} (регистрационный № ${c.id}) по вопросу ${t.about}${about} в ${c.institution} рассмотрено в аппарате Уполномоченного по правам человека в Российской Федерации.`
  const term = `Срок рассмотрения обращения составляет не более 30 дней со дня регистрации (статья 12 Федерального закона от 02.05.2006 № 59-ФЗ «О порядке рассмотрения обращений граждан Российской Федерации»).`
  const urgent = c.priority.threat >= 4
    ? `Учитывая сведения об угрозе жизни и здоровью, проверка проведена в оперативном порядке: информация в день поступления обращения передана в ${territorial(c)} и в прокуратуру по надзору за соблюдением законов в исправительных учреждениях.`
    : ''
  let body: string
  if (variant === 'explain') {
    body = `${head}\n\n${t.explain ?? ''}`
  } else if (variant === 'clarify') {
    body = `${head}\n\nДля рассмотрения обращения по существу просим дополнительно сообщить: ${t.missing}. Сведения можно направить через электронную приемную ФГИС УПЧ, по почте или сообщить по телефону горячей линии, указав регистрационный номер обращения.\n\n${term}`
  } else if (variant === 'final') {
    body = `${head}\n\nПо результатам проверки, проведенной по запросу Уполномоченного, ${territorial(c)} сообщило следующее: [кратко изложите результат проверки и принятые меры].\n\n[Если нарушение подтвердилось: укажите, какие меры приняты для восстановления права. Если не подтвердилось: укажите, куда заявитель может обжаловать решение.]\n\nВопрос остается на контроле Уполномоченного до подтверждения восстановления прав.`
  } else {
    body = `${head}\n\nВ соответствии со статьей 20 Федерального конституционного закона от 26.02.1997 № 1-ФКЗ «Об Уполномоченном по правам человека в Российской Федерации» обращение принято к рассмотрению. В ${territorial(c)} направлен запрос, в котором запрошены ${t.request}.${urgent ? `\n\n${urgent}` : ''}\n\nО результатах рассмотрения Вам будет сообщено дополнительно. ${term}`
  }
  return `${hello}\n\n${body}`
}

// ---------- Автозаполнение анкеты из текста (для горячей линии) ----------

export function guessTopic(text: string) {
  const s = text.toLowerCase()
  let best = TOPICS[0], bestN = 0
  for (const t of TOPICS) {
    const n = t.keys.filter((k) => s.includes(k)).length
    if (n > bestN) { best = t; bestN = n }
  }
  return bestN ? best : null
}

export function autofill(text: string, prev: Answers): { answers: Answers; topic: string | null; notes: string[] } {
  const s = text.toLowerCase()
  const t = guessTopic(text)
  const a: Answers = { ...prev, ...(t?.base ?? {}) }
  const notes: string[] = []
  if (t) notes.push(`Сюжет: ${t.title}`)
  if (/срочно|умира|умрет|жизн|избил|кровотеч|сознани/.test(s)) { a.health = 4; a.change = 4; a.when = 0; notes.push('Найдены признаки угрозы жизни') }
  if (/инвалид|коляск/.test(s)) { a.group = 2; notes.push('Человек с инвалидностью') }
  if (/пенси|лет,? пожил|пожилая|пожилой/.test(s) && a.group === 0) { a.group = 3; notes.push('Пожилой человек') }
  if (/сво|участник боев/.test(s)) a.group = 4
  if (/(\d{2,3}) человек|нас около|несколько осужденн|многие/.test(s)) { a.victims = Math.max(a.victims, 4); notes.push('Пострадала группа людей') }
  if (/сын|муж|брат|отец|мать|дочь/.test(s) && a.victims === 0) a.victims = 1
  if (/дважды|второй раз|2 раза|уже обращал|отказал/.test(s)) a.prior = Math.max(a.prior, 2)
  if (/трижды|много раз|третий раз/.test(s)) a.prior = 3
  if (/сизо|колони|ик-|шизо|камер/.test(s)) a.location = 3
  if (/переводчик|не говорит по-русски/.test(s)) a.comm = 1
  return { answers: a, topic: t?.id ?? null, notes }
}

export function previewPriority(a: Answers, topic: string | null, institution: string, all: Complaint[]) {
  const similar = all.filter((x) => x.institution === institution && x.topic === topic).length
  const p = priorityFromAnswers(a, massFromSimilar(similar))
  return { p, s: score(p), cls: pclass(score(p)), similar }
}

export const answerText = (key: keyof Answers, i: number) => QUESTIONS.find((q) => q.key === key)?.options[i] ?? 'н/д'
export { AGENCY }
