import { useState } from 'react'
import { Package, Pencil, Plus, ShoppingBag, Trash2, Wallet } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { deleteProduct, saveProduct } from '@/core/services/commerce'
import type { Product } from '@/core/types'
import { Badge, Button, Card, Empty, Field, ImagePicker, Input, NumberInput, PageHeader, Select, Sheet, Stat, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { runOk, ask } from '@/ui/toast'
import { CATEGORIES } from '@/modules/shop/Shop'
import { CategoryIcon } from '@/ui/icons'

const EMPTY: Partial<Product> = { name: '', brand: '', category: 'supplement', price: 0, discount: 0, stock: 10, description: '', emoji: '' }

export default function SellerDashboard() {
  const me = useMe()!
  const products = useDB((s) => s.products)
  const orders = useDB((s) => s.orders)
  const txs = useDB((s) => s.transactions)
  const [edit, setEdit] = useState<Partial<Product>>()
  const mine = products.filter((p) => p.sellerId === me.id)
  const myOrders = orders.filter((o) => o.kind === 'shop' && o.vendorId === me.id)
  const net = txs.filter((t) => t.to === me.id && t.module === 'shop').reduce((a, t) => a + t.amount - t.commission, 0)

  return (
    <div className="animate-fade-up">
      <PageHeader title="محصولات من" subtitle="محصولات شما در ماژول فروشگاه کی‌فیت" actions={<Button size="sm" icon={<Plus size={16} />} onClick={() => setEdit({ ...EMPTY })}>محصول جدید</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" label="محصولات" value={num(mine.length)} icon={<Package size={18} />} />
        <Stat label="سفارش‌ها" value={num(myOrders.length)} icon={<ShoppingBag size={18} />} tone="sky" />
        <Stat label="در انتظار ارسال" value={num(myOrders.filter((o) => o.status === 'paid' || o.status === 'preparing').length)} icon={<ShoppingBag size={18} />} tone="emerald" />
        <Stat label="درآمد خالص" value={toman(net)} icon={<Wallet size={18} />} tone="amber" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mine.length === 0 && <Empty icon="" title="هنوز محصولی ثبت نکرده‌اید" />}
        {mine.map((p) => (
          <Card key={p.id} className="flex gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ink-50 text-4xl dark:bg-ink-500/10">
              {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <CategoryIcon category={p.category} size={36} className="text-ink-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold">{p.name}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge color={p.stock > 0 ? 'emerald' : 'rose'}>موجودی {num(p.stock)}</Badge>
                {p.discount > 0 && <Badge color="rose">٪{num(p.discount)}</Badge>}
              </div>
              <div className="mt-1 text-xs">{toman(p.price)} · {num(p.sold)} فروش</div>
              <div className="mt-2 flex gap-1">
                <Button size="sm" variant="outline" icon={<Pencil size={13} />} onClick={() => setEdit(p)}>ویرایش</Button>
                <Button size="sm" variant="ghost" className="text-coral-500" icon={<Trash2 size={13} />} onClick={async () => (await ask('حذف شود؟')) && deleteProduct(p.id)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(undefined)} title={edit?.id ? 'ویرایش محصول' : 'محصول جدید'} wide>
        {edit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><ImagePicker value={edit.image} onChange={(image) => setEdit({ ...edit, image })} label="تصویر محصول" /></div>
            <Field label="نام محصول"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="برند"><Input value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} /></Field>
            <Field label="دسته‌بندی">
              <Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as Product['category'] })}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="قیمت (تومان)"><NumberInput value={edit.price ?? 0} onChange={(v) => setEdit({ ...edit, price: v })} /></Field>
            <Field label="تخفیف (درصد)"><NumberInput value={edit.discount ?? 0} onChange={(v) => setEdit({ ...edit, discount: Math.min(90, v) })} /></Field>
            <Field label="موجودی انبار"><NumberInput value={edit.stock ?? 0} onChange={(v) => setEdit({ ...edit, stock: v })} /></Field>
            <div className="sm:col-span-2"><Field label="توضیحات"><Textarea rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field></div>
            <Button className="sm:col-span-2" onClick={async () => {
              const ok = await runOk(() => saveProduct(edit), 'محصول ذخیره شد')
              if (ok) setEdit(undefined)
            }}>ذخیره</Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
