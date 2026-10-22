import { CHANNELS, CRITERIA, PCLASSES, PCLASS_RULE, RECOMMENDED_DAYS } from '../config/reference'
import type { Channel } from '../config/reference'
import { PriorityBadge, Section, ChannelBadge } from '../components/ui'
import { days } from '../lib/dates'

export default function RulesPage() {
  return (
    <div className="grid gap-5 max-w-5xl">
      <div>
        <p className="eyebrow">Памятка сотрудника</p>
        <h1 className="page-title mt-1">Сроки и правила</h1>
      </div>

      <Section title="Сроки ответа">
        <ul className="grid gap-2 text-sm list-disc pl-5">
          <li>Регистрация обращения: в течение 3 дней с момента поступления (59-ФЗ, ст. 8 ч. 2).</li>
          <li>Максимальный срок ответа: <b>30 дней со дня регистрации</b> (59-ФЗ, ст. 12 ч. 1).</li>
          <li>В исключительных случаях срок можно продлить не более чем на 30 дней, уведомив заявителя (59-ФЗ, ст. 12 ч. 2). Кнопка «Продлить на 30 дней» есть в карточке.</li>
          <li>Рекомендуемый срок зависит от приоритета и задает внутреннюю очередность. Законный срок он не меняет.</li>
        </ul>
        <table className="tbl">
          <thead><tr><th>Класс</th><th>Балл</th><th>Рекомендуемый срок</th><th>Порядок</th></tr></thead>
          <tbody>
            {PCLASSES.map((p, i) => (
              <tr key={p}><td><PriorityBadge cls={p} /></td><td className="whitespace-nowrap">{['80-100', '60-79', '35-59', '20-34'][i]}</td><td className="whitespace-nowrap">{days(RECOMMENDED_DAYS[p])}</td><td>{PCLASS_RULE[p]}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Как считается приоритет">
        <p className="text-sm">Балл = сумма оценок семи критериев (каждая от 1 до 5), умноженных на вес. Итог от 20 до 100. Угроза жизни 5 поднимает балл до 85, угроза 4 до 75 независимо от остальных критериев. ИИ предлагает оценки по ответам анкеты, сотрудник подтверждает или исправляет с указанием причины.</p>
        <table className="tbl">
          <thead><tr><th>Критерий</th><th className="!text-right">Вес</th><th>Откуда оценка</th></tr></thead>
          <tbody>{CRITERIA.map((c) => <tr key={c.key}><td>{c.name}</td><td className="text-right">{c.w}</td><td className="text-muted">{c.from}</td></tr>)}</tbody>
        </table>
      </Section>

      <Section title="Формы поступления">
        <ul className="grid gap-2">
          {(Object.keys(CHANNELS) as Channel[]).map((k) => <li key={k} className="flex flex-wrap items-center gap-3 text-sm"><ChannelBadge channel={k} /><span className="text-muted">{CHANNELS[k].hint}</span></li>)}
        </ul>
        <p className="text-sm">Все три канала приводятся к единой анкете (Приложение 5 итогового документа), поэтому карточка выглядит одинаково.</p>
      </Section>

      <Section title="Электронная подпись ответа">
        <ul className="grid gap-2 text-sm list-disc pl-5">
          <li>Ответ на обращение, поступившее в форме электронного документа, направляется в форме электронного документа по адресу электронной почты, указанному в обращении, или в письменной форме по почтовому адресу (59-ФЗ, ст. 10 ч. 4).</li>
          <li>Документ, подписанный <b>квалифицированной электронной подписью</b>, равнозначен бумажному документу с собственноручной подписью (63-ФЗ, ст. 6 ч. 1).</li>
          <li>Подписывает должностное лицо с правом подписи ответов. Если права подписи нет, распечатайте ответ и передайте руководителю.</li>
          <li>Ответ на бумажное обращение и обращение по горячей линии без адреса почты: печать, собственноручная подпись, отправка почтой.</li>
        </ul>
        <p className="text-xs text-muted">В демо-версии подпись имитируется: сертификат и PIN-код тестовые, письма никуда не отправляются.</p>
      </Section>

      <Section title="Роль ИИ">
        <p className="text-sm">ИИ проверяет полноту анкеты, предлагает классификацию, оценки приоритета, маршрут и проект ответа со ссылками на нормы. ИИ не отклоняет обращения и не принимает решений: каждое значение подтверждает сотрудник, изменения сохраняются в истории карточки.</p>
      </Section>
    </div>
  )
}
