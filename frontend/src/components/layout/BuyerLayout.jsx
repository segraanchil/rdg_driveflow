import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import ChatWidget from '../chatbot/ChatWidget'

export default function BuyerLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  )
}
