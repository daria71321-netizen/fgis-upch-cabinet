import type { Answers, AppealType, Channel, PriorityInput, Status } from '../config/reference'

export interface Applicant {
  fio: string
  birthYear: number
  phone: string
  email: string
  address: string
  answerWay: number
  represent: number
  victimFio: string
  relation: number
  count: number
}

export interface Signature {
  owner: string
  serial: string
  validFrom: string
  validTo: string
  at: string
}

export interface HistoryItem { at: string; who: string; what: string }

export interface Complaint {
  id: string
  channel: Channel
  topic: string
  /** даты в формате YYYY-MM-DD */
  received: string
  registered: string
  institution: string
  region: string
  applicant: Applicant
  answers: Answers
  text: string
  attachments: string[]
  vid: AppealType
  cat: string
  sub: string
  /** Оценки критериев приоритета (предложены ИИ, могут быть исправлены сотрудником) */
  priority: PriorityInput
  priorityConfirmed: boolean
  status: Status
  reply: string
  replyEdited: boolean
  signature: Signature | null
  printed: boolean
  sentAt: string | null
  sentWay: string | null
  extended: boolean
  history: HistoryItem[]
  createdByMe?: boolean
}
