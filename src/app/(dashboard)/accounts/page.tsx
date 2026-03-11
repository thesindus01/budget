import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function createAccount(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('accounts').insert({
    user_id: user.id,
    name: String(formData.get('name')),
    account_type: String(formData.get('account_type')),
    starting_balance: Number(formData.get('starting_balance') || 0),
    is_active: true,
  })

  revalidatePath('/accounts')
  revalidatePath('/dashboard')
}

export default async function AccountsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div className="p-6">You are not logged in.</div>
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Accounts</h1>

      <form
        action={createAccount}
        className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4"
      >
        <input
          name="name"
          placeholder="Account name"
          className="rounded-xl border p-3"
          required
        />

        <select
          name="account_type"
          className="rounded-xl border p-3"
          defaultValue="Checking"
        >
          <option value="Checking">Checking</option>
          <option value="Savings">Savings</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Cash">Cash</option>
        </select>

        <input
          name="starting_balance"
          type="number"
          step="0.01"
          placeholder="Starting balance"
          className="rounded-xl border p-3"
          required
        />

        <button className="rounded-xl bg-slate-900 p-3 text-white">
          Add account
        </button>
      </form>

      <div className="grid gap-3">
        {(accounts ?? []).length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 text-slate-600">
            No accounts yet.
          </div>
        ) : (
          accounts?.map((account) => (
            <div key={account.id} className="rounded-2xl border bg-white p-4">
              <div className="font-semibold">{account.name}</div>
              <div className="text-sm text-slate-500">
                {account.account_type} • $
                {Number(account.starting_balance).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}