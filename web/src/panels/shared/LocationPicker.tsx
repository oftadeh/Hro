import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { LocateFixed, MapPin } from 'lucide-react'
import L from 'leaflet'
import { BaseTiles } from '@/ui/BaseTiles'
import { useSession } from '@/core/db'
import { Button } from '@/ui/kit'
import { toast } from '@/ui/toast'

/** سنجاق دیدنی (SVG) با نوک دقیق روی نقطه‌ی انتخاب‌شده */
const pin = L.divIcon({
  className: 'keyfit-marker',
  iconSize: [34, 44],
  iconAnchor: [17, 43],
  html: '<svg width="34" height="44" viewBox="0 0 34 44" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))"><path d="M17 1C8.2 1 1 8 1 16.7 1 28.5 17 43 17 43s16-14.5 16-26.3C33 8 25.8 1 17 1z" fill="#ff5a3c" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16.5" r="6" fill="#fff"/></svg>',
})

const round = (n: number) => +n.toFixed(5)

function Clicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(round(e.latlng.lat), round(e.latlng.lng)) })
  return null
}

/** وقتی موقعیت از بیرون عوض شود (انتخاب شهر یا «موقعیت من»)، نقشه به آن‌جا می‌رود؛ اندازه‌ی نقشه هم پس از نمایش اصلاح می‌شود */
function Follow({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(t)
  }, [map])
  useEffect(() => {
    if (!map.getBounds().pad(-0.1).contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 13))
  }, [map, lat, lng])
  return null
}

/** انتخاب موقعیت روی نقشه: کلیک یا کشیدن سنجاق، یا «موقعیت من» */
export function LocationPicker({ lat, lng, onChange, picked = true }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void; picked?: boolean }) {
  const dark = useSession((s) => s.theme) === 'dark'
  const [locating, setLocating] = useState(false)
  const handlers = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng()
        onChange(round(p.lat), round(p.lng))
      },
    }),
    [onChange],
  )
  const locate = () => {
    if (!navigator.geolocation) {
      toast.error('مرورگر شما موقعیت‌یابی را پشتیبانی نمی‌کند')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        onChange(round(p.coords.latitude), round(p.coords.longitude))
      },
      () => {
        setLocating(false)
        toast.error('دسترسی به موقعیت داده نشد؛ روی نقشه کلیک کنید')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }
  return (
    <div className="space-y-2">
      <div className="relative">
        <MapContainer center={[lat, lng]} zoom={13} className="h-72 w-full cursor-crosshair overflow-hidden rounded-2xl">
          <BaseTiles dark={dark} />
          <Clicker onPick={onChange} />
          <Follow lat={lat} lng={lng} />
          {picked && <Marker position={[lat, lng]} icon={pin} draggable eventHandlers={handlers} />}
        </MapContainer>
        <Button type="button" size="sm" variant="secondary" loading={locating} icon={<LocateFixed size={15} />} onClick={locate} className="absolute bottom-3 right-3 z-[500] shadow-lg">
          موقعیت من
        </Button>
      </div>
      <div className="flex items-start gap-1.5 text-xs leading-6 text-ink-500">
        <MapPin size={14} className={`mt-1 shrink-0 ${picked ? 'text-coral-500' : 'text-ink-400'}`} />
        {picked ? (
          <span>
            موقعیت انتخاب‌شده: <span dir="ltr" className="tabular-nums">{lat.toFixed(5)}, {lng.toFixed(5)}</span> — برای جابه‌جایی، سنجاق را بکشید یا جای دیگری کلیک کنید
          </span>
        ) : (
          <span>هنوز موقعیتی انتخاب نشده؛ روی محل دقیق مجموعه کلیک کنید</span>
        )}
      </div>
    </div>
  )
}
