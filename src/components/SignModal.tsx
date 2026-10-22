import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, X, KeyRound, Loader2, Info } from 'lucide-react'
import type { Signature } from '../data/types'
import { TODAY, nowStamp } from '../lib/dates'

export const CERT = (owner: string) => ({
  owner,
  serial: '01DB4F2A7C9E00B3E1A7',
  issuer: 'Удостоверяющий центр Федерального казначейства (демо)',
  validFrom: '2026-02-01',
  validTo: '2027-05-01',
})

/** Имитация подписания квалифицированной электронной подписью (КЭП). Ничего никуда не отправляется. */
export default function SignModal({ owner, onClose, onSigned }: { owner: string; onClose: () => void; onSigned: (s: Signature) => void }) {
  const cert = CERT(owner)
  const [step, setStep] = useState<'cert' | 'pin' | 'sign'>('cert')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    ref.current?.querySelector<HTMLElement>('button, input')?.focus()
    return () => document.removeEventListener('keydown', h)
  }, [onClose, step])
  const sign = () => {
    if (pin.length < 4) { setErr('Введите PIN-код ключа: не менее 4 цифр (в демо подойдут любые)'); return }
    setStep('sign')
    setTimeout(() => onSigned({ owner: cert.owner, serial: cert.serial, validFrom: cert.validFrom, validTo: cert.validTo, at: nowStamp() }), 1200)
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 no-print" role="dialog" aria-modal="true" aria-labelledby="sign-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} className="card w-full max-w-lg p-6 sm:p-7 grid gap-4 shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Шаг {step === 'cert' ? 1 : 2} из 2</p>
            <h2 id="sign-title" className="font-display text-xl font-medium tracking-tight mt-1">Подписать ответ КЭП</h2>
          </div>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label="Закрыть"><X size={18} aria-hidden /></button>
        </div>
        {step === 'cert' && (
          <>
            <p className="text-sm text-muted">Выберите сертификат квалифицированной электронной подписи. Подписанный ответ равнозначен документу с собственноручной подписью (63-ФЗ, ст. 6).</p>
            <button className="text-left rounded-[18px] border-2 border-accent bg-accent-soft p-4 grid gap-1" onClick={() => setStep('pin')}>
              <span className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} aria-hidden />{cert.owner}</span>
              <span className="text-xs text-muted">Сертификат № {cert.serial}</span>
              <span className="text-xs text-muted">{cert.issuer}</span>
              <span className="text-xs text-good font-semibold">Действителен с 01.02.2026 по 01.05.2027</span>
            </button>
            <p className="flex gap-2 text-xs text-muted"><Info size={14} className="shrink-0 mt-0.5" aria-hidden />Подписывает должностное лицо, которому приказом по аппарату предоставлено право подписи ответов. Если у вас его нет, распечатайте ответ и передайте руководителю.</p>
          </>
        )}
        {step === 'pin' && (
          <>
            <label className="grid gap-1.5">
              <span className="label">PIN-код ключевого носителя</span>
              <span className="flex items-center gap-2 rounded-full border border-line2 px-4 py-2.5 focus-within:border-accent">
                <KeyRound size={16} className="text-muted" aria-hidden />
                <input type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && sign()} className="w-full outline-none bg-transparent" placeholder="Например, 1234" />
              </span>
            </label>
            {err && <p className="text-sm text-bad" role="alert">{err}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button className="btn-secondary" onClick={() => setStep('cert')}>Назад</button>
              <button className="btn-primary" onClick={sign}><ShieldCheck size={16} aria-hidden />Подписать</button>
            </div>
          </>
        )}
        {step === 'sign' && (
          <p className="flex items-center gap-3 text-sm py-6 justify-center"><Loader2 size={20} className="spin" aria-hidden />Формируем подпись документа от {TODAY.split('-').reverse().join('.')}...</p>
        )}
      </div>
    </div>
  )
}

/** Отметка об электронной подписи на бланке (визуализация по образцу штампа ЭП) */
export function SignStamp({ s }: { s: Signature }) {
  return (
    <div className="inline-grid gap-0.5 border-2 border-[#2F4A7A] text-[#2F4A7A] rounded-[10px] px-4 py-2.5 text-[11px] leading-tight max-w-[320px]">
      <span className="font-bold text-center uppercase tracking-wide text-[10.5px]">Документ подписан<br />электронной подписью</span>
      <span className="mt-1">Сертификат: {s.serial}</span>
      <span>Владелец: {s.owner}</span>
      <span>Действителен: с {s.validFrom.split('-').reverse().join('.')} по {s.validTo.split('-').reverse().join('.')}</span>
      <span>Подписан: {s.at.slice(0, 10).split('-').reverse().join('.')} {s.at.slice(11, 16)}</span>
    </div>
  )
}
