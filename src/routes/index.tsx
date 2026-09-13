import { createFileRoute } from '@tanstack/react-router'
import ReportIssue from '../ReportIssue'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="p-2">
      <h3>مرحباً بك في Kautrash</h3>
      {/* عرض مكون الإبلاغ الجديد دون مساس بالتصميم */}
      <ReportIssue />
    </div>
  )
}
