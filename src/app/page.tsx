import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InlineLoginForm from '@/components/auth/inline-login-form'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/calendar')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-4xl font-bold">BudgetFlow Pro</h1>
      <p className="mb-6 text-slate-600">
        Login to manage your monthly budget, bills, calendar, and analytics.
      </p>
      <InlineLoginForm />
    </main>
  )
}