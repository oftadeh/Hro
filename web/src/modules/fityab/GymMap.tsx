import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, Popup, useMap, CircleMarker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { Gym } from '@/core/types'
import { num } from '@/core/format'
import { useSession } from '@/core/db'

// کاشی‌های کارتو: روشن برای تم روشن و سرمه‌ای برای تم تیره (مانند طرح ناوبری)
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

const icon = (active: boolean, price: number, dark: boolean) => {
  const bg = active ? (dark ? '#d8c49c' : '#b0915c') : dark ? '#f1f0ed' : '#0e0e0d'
  const fg = active ? '#0e0e0d' : dark ? '#0e0e0d' : '#fff'
  return L.divIcon({
    className: 'keyfit-marker',
    iconSize: [80, 34],
    iconAnchor: [40, 34],
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:${bg};color:${fg};font:500 11px Vazirmatn;padding:4px 9px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 12px -4px rgba(0,0,0,.35)">${num(price / 1000)} هزار</div>
      <div style="width:1px;height:8px;background:${bg}"></div>
      <div style="width:5px;height:5px;border-radius:50%;background:${bg}"></div>
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
    <MapContainer center={center} zoom={12} className={`w-full overflow-hidden rounded-3xl ${className}`} scrollWheelZoom attributionControl={false} zoomControl={false}>
      <TileLayer key={dark ? 'd' : 'l'} url={dark ? TILES.dark : TILES.light} subdomains="abcd" />
      <Fly center={center} />
      {user && sel && <Polyline positions={[user, [sel.lat, sel.lng]]} pathOptions={{ color: dark ? '#d8c49c' : '#0e0e0d', weight: 2, dashArray: '4 8', lineCap: 'round' }} />}
      {user && (
        <>
          <CircleMarker center={user} radius={18} pathOptions={{ stroke: false, fillColor: '#6a8189', fillOpacity: 0.18 }} />
          <CircleMarker center={user} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#6a8189', fillOpacity: 1 }} />
        </>
      )}
      {gyms.map((g) => (
        <Marker key={g.id} position={[g.lat, g.lng]} icon={icon(g.id === selected, g.sessionPrice, dark)} eventHandlers={{ click: () => onSelect?.(g.id) }}>
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
