import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { deleteFood, saveFood, saveRestaurant } from '@/core/services/commerce'
import type { Food, Restaurant } from '@/core/types'
import { Badge, Button, Card, Cover, Empty, Field, ImagePicker, Input, NumberInput, PageHeader, Select, Sheet, Textarea } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { cityCenter } from '@/core/config'
import { run, runOk, ask } from '@/ui/toast'
import { LocationPicker } from '../shared/LocationPicker'
import { FoodIcon } from '@/ui/icons'

export default function RestaurantPanel() {
  const me = useMe()!
  const restaurants = useDB((s) => s.restaurants)
  const foods = useDB((s) => s.foods)
  const mine = restaurants.filter((r) => r.ownerId === me.id)
  const [rid, setRid] = useState(mine[0]?.id ?? '')
  const current = mine.find((r) => r.id === rid) ?? mine[0]
  const [editR, setEditR] = useState<Partial<Restaurant>>()
  const [editF, setEditF] = useState<Partial<Food>>()
  const blankRestaurant = (): Partial<Restaurant> => {
    const [lat, lng] = cityCenter(me.city)
    return { name: '', description: '', address: '', deliveryMinutes: 40, lat, lng }
  }
  const menu = current ? foods.filter((f) => f.restaurantId === current.id) : []

  return (
    <div className="animate-fade-up">
      <PageHeader title="منو و رستوران" subtitle="غذاهای رژیمی شما در ماژول بوفه" actions={<Button size="sm" variant="outline" icon={<Plus size={16} />} onClick={() => setEditR(blankRestaurant())}>رستوران جدید</Button>} />
      {mine.length === 0 ? (
        <Empty icon="" title="هنوز رستورانی ثبت نکرده‌اید" action={<Button onClick={() => setEditR(blankRestaurant())}>ثبت رستوران</Button>} />
      ) : (
        <>
          {mine.length > 1 && (
            <Select className="mb-3 max-w-xs" value={current?.id} onChange={(e) => setRid(e.target.value)}>
              {mine.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          )}
          {current && (
            <Card className="flex flex-wrap items-center gap-3">
              <Cover gradient={current.id} className="h-14 w-14 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{current.name}</div>
                <div className="text-xs text-ink-500">{current.description}</div>
              </div>
              <Button size="sm" variant={current.open ? 'primary' : 'outline'} onClick={() => saveRestaurant({ id: current.id, open: !current.open })}>{current.open ? 'باز است' : 'بسته است'}</Button>
              <Button size="sm" variant="outline" icon={<Pencil size={14} />} onClick={() => setEditR(current)}>ویرایش</Button>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setEditF({ restaurantId: current.id, name: '', price: 0, calories: 0, protein: 0, carbs: 0, fat: 0, emoji: '', tags: [] })}>غذای جدید</Button>
            </Card>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menu.map((f) => (
              <Card key={f.id} className="flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-aqua-50 text-3xl dark:bg-aqua-500/10">{f.image ? <img loading="lazy" decoding="async" src={f.image} alt="" className="h-full w-full object-cover" /> : <FoodIcon size={24} className="text-ink-400" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{f.name}</div>
                  <div className="text-xs text-ink-500">{toman(f.price)} · {num(f.calories)} کالری</div>
                  {!f.available && <Badge color="rose">ناموجود</Badge>}
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditF(f)}>ویرایش</Button>
                    <Button size="sm" variant="ghost" onClick={() => saveFood({ ...f, available: !f.available })}>{f.available ? 'ناموجود کن' : 'موجود کن'}</Button>
                    <Button size="sm" variant="ghost" className="text-coral-500" icon={<Trash2 size={13} />} onClick={async () => (await ask('حذف شود؟')) && deleteFood(f.id)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet open={!!editR} onClose={() => setEditR(undefined)} title="اطلاعات رستوران" wide>
        {editR && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="نام"><Input value={editR.name} onChange={(e) => setEditR({ ...editR, name: e.target.value })} /></Field>
            <Field label="زمان ارسال (دقیقه)"><NumberInput value={editR.deliveryMinutes ?? 0} onChange={(v) => setEditR({ ...editR, deliveryMinutes: v })} /></Field>
            <div className="sm:col-span-2"><Field label="توضیح"><Input value={editR.description} onChange={(e) => setEditR({ ...editR, description: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="آدرس"><Input value={editR.address} onChange={(e) => setEditR({ ...editR, address: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><LocationPicker lat={editR.lat!} lng={editR.lng!} onChange={(lat, lng) => setEditR({ ...editR, lat, lng })} /></div>
            <Button className="sm:col-span-2" onClick={async () => { await run(() => saveRestaurant(editR), 'ذخیره شد'); setEditR(undefined) }}>ذخیره</Button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!editF} onClose={() => setEditF(undefined)} title={editF?.id ? 'ویرایش غذا' : 'غذای جدید'} wide>
        {editF && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><ImagePicker value={editF.image} onChange={(image) => setEditF({ ...editF, image })} label="تصویر غذا" /></div>
            <Field label="نام غذا"><Input value={editF.name} onChange={(e) => setEditF({ ...editF, name: e.target.value })} /></Field>
            <Field label="قیمت (تومان)"><NumberInput value={editF.price ?? 0} onChange={(v) => setEditF({ ...editF, price: v })} /></Field>
            <Field label="کالری"><NumberInput value={editF.calories ?? 0} onChange={(v) => setEditF({ ...editF, calories: v })} /></Field>
            <Field label="پروتئین (گرم)"><NumberInput value={editF.protein ?? 0} onChange={(v) => setEditF({ ...editF, protein: v })} /></Field>
            <Field label="کربوهیدرات (گرم)"><NumberInput value={editF.carbs ?? 0} onChange={(v) => setEditF({ ...editF, carbs: v })} /></Field>
            <Field label="چربی (گرم)"><NumberInput value={editF.fat ?? 0} onChange={(v) => setEditF({ ...editF, fat: v })} /></Field>
            <Field label="برچسب‌ها" hint="با ویرگول"><Input value={(editF.tags ?? []).join('، ')} onChange={(e) => setEditF({ ...editF, tags: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} /></Field>
            <div className="sm:col-span-2"><Field label="توضیح"><Textarea rows={2} value={editF.description} onChange={(e) => setEditF({ ...editF, description: e.target.value })} /></Field></div>
            <Button className="sm:col-span-2" onClick={async () => {
              const ok = await runOk(() => saveFood(editF), 'ذخیره شد')
              if (ok) setEditF(undefined)
            }}>ذخیره</Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
