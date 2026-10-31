import type { InputHTMLAttributes } from 'react'
import { IR_CITIES } from '@/core/config'
import { Input } from '@/ui/kit'

/** فهرست پیشنهادی شهرها برای فیلدهای شهر (شهر دیگری هم قابل نوشتن است) */
export function CityList({ id = 'ir-cities' }: { id?: string }) {
  return (
    <datalist id={id}>
      {IR_CITIES.map((c) => <option key={c.name} value={c.name} />)}
    </datalist>
  )
}

/** فیلد شهر با پیشنهاد شهرهای ایران */
export function CityInput(p: Omit<InputHTMLAttributes<HTMLInputElement>, 'list'>) {
  return (
    <>
      <Input {...p} list="ir-cities" autoComplete="address-level2" placeholder={p.placeholder ?? 'مثلاً تهران'} />
      <CityList />
    </>
  )
}
