import { useState } from 'react'
import { useDB } from '@/core/db'
import { ROLE_META } from '@/core/config'
import { faDate, num, toman } from '@/core/format'
import { toggleBlockUser } from '@/core/services/admin'
import { Avatar, Badge, Button, Card, Input, PageHeader } from '@/ui/kit'
import { RoleIcon } from '@/ui/icons'

export default function AdminUsers() {
  const users = useDB((s) => s.users)
  const wallets = useDB((s) => s.wallets)
  const [q, setQ] = useState('')
  const list = users.filter((u) => !q || u.name.includes(q) || u.phone.includes(q) || !!u.email?.includes(q.toLowerCase()))
  return (
    <div className="animate-fade-up">
      <PageHeader title="کاربران و نقش‌ها" subtitle={`${num(users.length)} کاربر`} />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو با نام یا موبایل…" className="mb-3 max-w-sm" />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ink-50 text-xs text-ink-500 dark:bg-white/5">
            <tr>
              <th className="p-3 text-right">کاربر</th>
              <th className="p-3 text-right">نقش‌ها</th>
              <th className="p-3 text-right">کیف پول</th>
              <th className="p-3 text-right">XP</th>
              <th className="p-3 text-right">عضویت</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-white/5">
            {list.map((u) => (
              <tr key={u.id} className={u.blocked ? 'opacity-50' : ''}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.name} src={u.avatar} size={32} />
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-[12px] text-ink-400" dir="ltr">{u.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r}><RoleIcon role={r} size={12} /> {ROLE_META[r].label}</Badge>)}</div></td>
                <td className="p-3">{toman(wallets[u.id] ?? 0)}</td>
                <td className="p-3">{num(u.xp)}</td>
                <td className="p-3 text-xs">{faDate(u.createdAt)}</td>
                <td className="p-3">
                  {!u.roles.includes('admin') && (
                    <Button size="sm" variant={u.blocked ? 'secondary' : 'ghost'} className={u.blocked ? '' : 'text-coral-500'} onClick={() => toggleBlockUser(u.id)}>
                      {u.blocked ? 'رفع مسدودی' : 'مسدود'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
