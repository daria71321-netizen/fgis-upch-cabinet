import { Routes, Route, Link } from 'react-router-dom'
import Layout from './components/Layout'
import InboxPage from './pages/InboxPage'
import CasePage from './pages/CasePage'
import NewCasePage from './pages/NewCasePage'
import KpiPage from './pages/KpiPage'
import RulesPage from './pages/RulesPage'

function NotFound() {
  return (
    <div className="card card-pad grid gap-2 max-w-lg">
      <h1 className="text-xl font-semibold">Страница не найдена</h1>
      <Link to="/" className="link">Вернуться к обращениям</Link>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<InboxPage />} />
        <Route path="/case/:id" element={<CasePage />} />
        <Route path="/new" element={<NewCasePage />} />
        <Route path="/kpi" element={<KpiPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
