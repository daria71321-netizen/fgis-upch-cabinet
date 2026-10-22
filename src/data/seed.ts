// Детерминированный генератор демонстрационных обращений по ФСИН России.
// Даты строятся от сегодняшнего дня, поэтому сроки в демо всегда актуальны.
import type { Answers, Channel, QKey } from '../config/reference'
import { REGISTER_DAYS, massFromSimilar, priorityFromAnswers } from '../config/reference'
import { TODAY, addDays, isWeekend } from '../lib/dates'
import { TOPICS } from './topics'
import type { Topic } from './topics'
import type { Applicant, Complaint } from './types'
import { buildReply, variantsFor } from './ai'

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const REGIONS = [
  'Иркутской области', 'Красноярскому краю', 'Пермскому краю', 'Свердловской области', 'Республике Коми',
  'Кемеровской области', 'Владимирской области', 'Нижегородской области', 'Республике Мордовия', 'г. Москве',
]
export const INSTITUTIONS = [
  { name: 'ФКУ ИК-3', r: 0 }, { name: 'ФКУ СИЗО-1', r: 0 }, { name: 'ФКУ ИК-27', r: 1 }, { name: 'ФКУ ИК-10', r: 2 },
  { name: 'ФКУ СИЗО-1', r: 3 }, { name: 'ФКУ ИК-49', r: 4 }, { name: 'ФКУ ИК-5', r: 5 }, { name: 'ФКУ ИК-6', r: 6 },
  { name: 'ФКУ ЛИУ-3', r: 7 }, { name: 'ФКУ ИК-14', r: 8 }, { name: 'ФКУ СИЗО-2', r: 9 },
].map((x) => ({ name: `${x.name} УФСИН России по ${REGIONS[x.r]}`, region: REGIONS[x.r] }))

const SURNAMES = ['Петров', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Соколов', 'Михайлов', 'Новиков', 'Федоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семенов', 'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров', 'Захаров', 'Зайцев', 'Борисов', 'Яковлев', 'Григорьев', 'Романов', 'Воробьев', 'Сергеев']
const MALE = ['Иван', 'Алексей', 'Сергей', 'Дмитрий', 'Андрей', 'Николай', 'Михаил', 'Артем', 'Евгений', 'Владимир', 'Павел', 'Роман']
const MALE_PATR = ['Иванович', 'Сергеевич', 'Петрович', 'Александрович', 'Викторович', 'Николаевич', 'Андреевич', 'Олегович']
const FEMALE = ['Мария', 'Елена', 'Ольга', 'Татьяна', 'Наталья', 'Светлана', 'Ирина', 'Анна', 'Галина', 'Людмила', 'Валентина', 'Надежда']
const FEMALE_PATR = ['Ивановна', 'Сергеевна', 'Петровна', 'Александровна', 'Викторовна', 'Николаевна', 'Владимировна', 'Михайловна']
const STREETS = ['ул. Ленина', 'ул. Советская', 'ул. Мира', 'ул. Гагарина', 'ул. Садовая', 'пр. Строителей', 'ул. Лесная', 'ул. Школьная']
const CITIES = ['г. Иркутск', 'г. Красноярск', 'г. Пермь', 'г. Екатеринбург', 'г. Сыктывкар', 'г. Кемерово', 'г. Владимир', 'г. Нижний Новгород', 'г. Саранск', 'г. Москва', 'г. Тула', 'г. Омск']
const TRANSLIT: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ь: '', ъ: '' }
const tr = (s: string) => s.toLowerCase().split('').map((c) => TRANSLIT[c] ?? c).join('')

/** Родство и формы слова для подстановки в текст: им., род., вин., дат. падеж */
const KIN = {
  son: { rel: 0, forms: ['мой сын', 'моего сына', 'моего сына', 'моему сыну'] },
  husband: { rel: 1, forms: ['мой муж', 'моего мужа', 'моего мужа', 'моему мужу'] },
  brother: { rel: 3, forms: ['мой брат', 'моего брата', 'моего брата', 'моему брату'] },
  father: { rel: 2, forms: ['мой отец', 'моего отца', 'моего отца', 'моему отцу'] },
}

export function fillText(t: string, kinForms: string[], inst: string) {
  const s = t.replace(/^[@#]/, '')
    .replace(/\{whoG\}/g, kinForms[1]).replace(/\{whoA\}/g, kinForms[2]).replace(/\{whoD\}/g, kinForms[3]).replace(/\{who\}/g, kinForms[0])
    .replace(/\{inst\}/g, inst)
  return s.replace(/(^|[.!?]\s+)([а-я])/g, (_, p: string, c: string) => p + c.toUpperCase())
}

const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)]

interface Plan { topic: Topic; inst: number; ago: number; channel: Channel; sentAgo: number | null }

const WORKDAYS = Array.from({ length: 28 }, (_, i) => i + 1).filter((n) => !isWeekend(addDays(TODAY, -n))).slice(0, 20)

export function generate(): Complaint[] {
  const r = rng(20261023)
  const plans: Plan[] = []
  // Веса сюжетов: условия содержания и медпомощь встречаются чаще
  const W: Record<string, number> = { med: 9, med_urgent: 2, violence: 2, cold: 6, crowd: 5, transfer: 7, letters: 5, visits: 5, shizo: 4, wage: 4, disab: 3, release: 3, where: 4, parcel: 4, pension: 3, video: 2 }
  const bag = TOPICS.flatMap((t) => Array(W[t.id] ?? 1).fill(t) as Topic[])
  // кластеры: в части учреждений проблемы повторяются (массовость)
  const hot: Record<string, number> = { cold: 0, crowd: 1, med: 3, wage: 6 }
  const N_OPEN = 46, N_SENT = 96
  for (let i = 0; i < N_OPEN + N_SENT; i++) {
    const topic = pick(r, bag)
    const inst = hot[topic.id] !== undefined && r() < 0.6 ? hot[topic.id] : Math.floor(r() * INSTITUTIONS.length)
    const self = r() < 0.5
    const channel: Channel = r() < (self ? 0.7 : 0.15) ? 'paper' : r() < 0.55 ? 'electronic' : 'hotline'
    let ago: number, sentAgo: number | null = null
    if (i < N_OPEN) {
      // открытые: большинство свежие, несколько у предела срока и 2 просроченных
      ago = i < 2 ? 31 + i * 2 : i < 6 ? 22 + i : Math.floor(r() * r() * 16)
      if (topic.id === 'med_urgent' || topic.id === 'violence') ago = Math.floor(r() * 2)
    } else {
      // ответы за последние 20 рабочих дней; сегодня уже отправлено 3
      sentAgo = i < N_OPEN + 3 ? 0 : WORKDAYS[Math.floor(r() * WORKDAYS.length)]
      ago = sentAgo + 1 + Math.floor(r() * 24)
    }
    plans.push({ topic, inst, ago, channel, sentAgo })
  }

  const list: Complaint[] = plans.map((p, i) => {
    const t = p.topic
    const textIdx = Math.floor(r() * t.texts.length)
    const raw = t.texts[textIdx]
    const selfText = raw.startsWith('@')
    const collective = raw.startsWith('#')
    const kinKey = t.id === 'pension' ? 'father' : pick(r, ['son', 'son', 'husband', 'brother'] as const)
    const kin = KIN[kinKey]
    const inst = INSTITUTIONS[p.inst]
    const channel: Channel = selfText && p.channel === 'hotline' ? 'paper' : p.channel
    const vSur = pick(r, SURNAMES), vName = pick(r, MALE), vPatr = pick(r, MALE_PATR)
    const victimFio = `${vSur} ${vName} ${vPatr}`
    let fio = victimFio, birthYear = 1975 + Math.floor(r() * 25)
    if (!selfText && !collective) {
      const kinFemale = kinKey === 'father' ? r() < 0.8 : true
      if (kinFemale) {
        const sur = kinKey === 'husband' || kinKey === 'son' ? `${vSur}а` : `${pick(r, SURNAMES)}а`
        fio = `${sur} ${pick(r, FEMALE)} ${pick(r, FEMALE_PATR)}`
      } else fio = `${pick(r, SURNAMES)} ${pick(r, MALE)} ${pick(r, MALE_PATR)}`
      birthYear = kinKey === 'son' ? 1955 + Math.floor(r() * 20) : 1970 + Math.floor(r() * 25)
    }
    if (t.id === 'pension') birthYear = 1956 + Math.floor(r() * 3)
    const atInst = selfText || collective
    const email = atInst ? '' : `${tr(fio.split(' ')[0])}.${tr(fio.split(' ')[1]).slice(0, 1)}${Math.floor(r() * 90 + 10)}@mail.ru`
    const address = atInst
      ? `${inst.name} (адрес учреждения)`
      : `${100000 + Math.floor(r() * 599999)}, ${pick(r, CITIES)}, ${pick(r, STREETS)}, д. ${1 + Math.floor(r() * 120)}, кв. ${1 + Math.floor(r() * 200)}`
    const applicant: Applicant = {
      fio, birthYear,
      phone: atInst ? '' : `+7 9${Math.floor(r() * 90 + 10)} ${Math.floor(r() * 900 + 100)}-${Math.floor(r() * 90 + 10)}-${Math.floor(r() * 90 + 10)}`,
      email: channel === 'paper' && r() < 0.6 ? '' : email,
      address,
      answerWay: channel === 'electronic' && email ? 0 : channel === 'hotline' && email && r() < 0.5 ? 0 : 1,
      represent: collective ? 2 : selfText ? 0 : 1,
      victimFio: selfText || collective ? '' : victimFio,
      relation: kin.rel,
      count: collective ? 4 + Math.floor(r() * 12) : 1,
    }
    if (t.id === 'video') { applicant.represent = 0; applicant.address = `${100000 + Math.floor(r() * 599999)}, ${pick(r, CITIES)}, ${pick(r, STREETS)}, д. ${1 + Math.floor(r() * 120)}` }

    const a = { goal: 1, sphere: 5, victims: 0, group: 0, location: 3, health: 1, change: 2, when: 2, prior: 0, comm: 0, ...t.base } as Answers
    if (!selfText && !collective && a.victims === 0) a.victims = 1
    if (collective && a.victims < 3) a.victims = 4
    if (a.group === 0 && r() < 0.15) a.group = pick(r, [2, 3, 4, 6])
    if (t.id === 'pension') a.group = 3
    if (r() < 0.08) a.comm = 1
    for (const k of ['health', 'prior', 'when'] as QKey[]) {
      if (t.id === 'med_urgent' || t.id === 'violence') break
      if (r() < 0.25) a[k] = Math.max(0, Math.min(4, a[k] + (r() < 0.5 ? -1 : 1)))
    }
    if (t.id === 'video') a.location = 0

    const received = addDays(TODAY, -p.ago)
    const regLag = channel === 'paper' ? 1 + Math.floor(r() * (REGISTER_DAYS - 1)) : 0
    let registered = addDays(received, regLag)
    if (registered > TODAY) registered = TODAY
    const attachments = channel === 'paper' ? ['Скан письма (PDF, 2 стр.)'] : []
    if (r() < 0.35) attachments.push(pick(r, ['Копия ответа администрации учреждения', 'Медицинская выписка', 'Копия приговора (выписка)', 'Фото конверта', 'Копия справки об инвалидности']))

    const c: Complaint = {
      id: `УПЧ-${received.slice(2, 4)}-${String(48210 + (plans.length - i) * 7).padStart(5, '0')}`,
      channel, topic: t.id, received, registered,
      institution: inst.name, region: inst.region,
      applicant, answers: a,
      text: fillText(raw, kin.forms, inst.name),
      attachments, vid: t.vid, cat: t.cat, sub: t.sub,
      priority: priorityFromAnswers(a, 1), priorityConfirmed: false,
      status: 'new', reply: '', replyEdited: false, signature: null, printed: false,
      sentAt: null, sentWay: null, extended: false,
      history: [
        { at: `${received}T${String(9 + Math.floor(r() * 8)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`, who: 'Система', what: `Обращение поступило: ${channel === 'electronic' ? 'электронная приемная' : channel === 'paper' ? 'почта, оцифровано' : 'горячая линия, заполнено оператором'}` },
        { at: `${registered}T${String(10 + Math.floor(r() * 7)).padStart(2, '0')}:00`, who: 'Система', what: 'Зарегистрировано, ИИ заполнил классификацию и оценки приоритета' },
      ],
    }
    if (p.sentAgo !== null) {
      let sent = addDays(TODAY, -p.sentAgo)
      if (sent < registered) sent = registered
      c.status = 'sent'
      c.priorityConfirmed = true
      c.replyEdited = r() < 0.38
      c.sentAt = `${sent}T${String(10 + Math.floor(r() * 7)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`
      const electronic = c.applicant.answerWay === 0 && !!c.applicant.email
      c.sentWay = electronic ? 'По электронной почте, подписан КЭП' : 'Почтой, подписан собственноручно'
      if (electronic) c.signature = { owner: 'Сотрудник аппарата', serial: '01DB4F2A7C9E00B3', validFrom: '2026-02-01', validTo: '2027-05-01', at: c.sentAt }
      c.history.push({ at: c.sentAt, who: 'Вы', what: `Ответ направлен: ${c.sentWay}` })
    } else if (p.ago > 3 && r() < 0.6) {
      c.status = 'work'
      c.priorityConfirmed = r() < 0.7
      c.history.push({ at: `${addDays(registered, 1)}T11:20`, who: 'Вы', what: 'Взято в работу' })
    }
    return c
  })

  // Массовость: похожие обращения по тому же учреждению и сюжету
  for (const c of list) {
    const similar = list.filter((x) => x !== c && x.institution === c.institution && x.topic === c.topic).length
    c.priority = priorityFromAnswers(c.answers, massFromSimilar(similar))
    const v = variantsFor(c)[0]
    c.reply = c.status === 'sent' ? buildReply(c, v.id) : ''
  }
  return list.sort((a, b) => (a.received < b.received ? 1 : -1))
}
