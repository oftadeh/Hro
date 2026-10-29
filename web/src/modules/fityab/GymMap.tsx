import { useEffect } from 'react'
import { MapContainer, Marker, Popup, useMap, CircleMarker, Polyline } from 'react-leaflet'
import { BaseTiles } from '@/ui/BaseTiles'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { Gym } from '@/core/types'
import { num } from '@/core/format'
import { useSession } from '@/core/db'

/** نشانگر برند: کپسول قیمت با نقطه‌ی لیمویی؛ انتخاب‌شده لیمویی و بزرگ‌تر */
const icon = (active: boolean, price: number, dark: boolean) => {
  const bg = active ? '#b8f400' : dark ? '#16131b' : '#ffffff'
  const fg = active ? '#0d0b10' : dark ? '#f1ece3' : '#16131b'
  const ring = active ? 'rgba(184,244,0,.35)' : dark ? 'rgba(255,255,255,.14)' : 'rgba(22,19,27,.12)'
  return L.divIcon({
    className: 'keyfit-marker',
    iconSize: [96, 44],
    iconAnchor: [48, 44],
    html: `<div class="kf-pin${active ? ' kf-pin-on' : ''}">
      <div style="display:flex;align-items:center;gap:6px;background:${bg};color:${fg};font:700 12px Vazirmatn;padding:6px 11px;border-radius:999px;white-space:nowrap;box-shadow:0 0 0 1px ${ring},0 8px 20px -8px rgba(0,0,0,.55)">
        <span style="width:7px;height:7px;border-radius:50%;background:${active ? '#5b37f5' : '#b8f400'}"></span>${num(price / 1000)} هزار
      </div>
      <div style="width:2px;height:9px;background:${bg};box-shadow:0 0 0 1px ${ring}"></div>
    </div>`,
  })
}

function Fly({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 13), { duration: 0.6 })
  }, [center[0], center[1], map]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function GymMap({ gyms, center, user, selected, onSelect, className = 'h-[55dvh]' }: { gyms: Gym[]; center: [number, number]; user?: [number, number]; selected?: string; onSelect?: (id: string) => void; className?: string }) {
  const dark = useSession((s) => s.theme) === 'dark'
  const sel = gyms.find((g) => g.id === selected)
  return (
    <MapContainer center={center} zoom={12} className={`kf-map w-full overflow-hidden rounded-[2rem] ${className}`} scrollWheelZoom zoomControl={false}>
      <BaseTiles dark={dark} />
      <Fly center={center} />
      {user && sel && <Polyline positions={[user, [sel.lat, sel.lng]]} pathOptions={{ color: '#b8f400', weight: 3, dashArray: '2 9', lineCap: 'round' }} />}
      {user && (
        <>
          <CircleMarker center={user} radius={18} pathOptions={{ stroke: false, fillColor: '#b8f400', fillOpacity: 0.18 }} />
          <CircleMarker center={user} radius={8} pathOptions={{ color: '#16131b', weight: 3, fillColor: '#b8f400', fillOpacity: 1 }} />
        </>
      )}
      {gyms.map((g) => (
        <Marker key={g.id} position={[g.lat, g.lng]} icon={icon(g.id === selected, g.rental && !g.sessionPrice ? g.rental.hourlyPrice : g.sessionPrice, dark)} eventHandlers={{ click: () => onSelect?.(g.id) }}>
          {!onSelect && (
            <Popup>
              <Link to={`/fityab/${g.id}`} className="font-semibold">
                {g.name}
              </Link>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  )
}
