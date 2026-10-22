import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, Popup, useMap, CircleMarker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { Gym } from '@/core/types'
import { num } from '@/core/format'
import { useSession } from '@/core/db'

// کاشی‌های کارتو: روشن برای تم روشن و سرمه‌ای برای تم تیره (مانند طرح ناوبری)
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

const icon = (active: boolean, price: number, dark: boolean) => {
  const bg = active ? (dark ? '#e8bf5a' : '#0f172a') : dark ? '#3b82f6' : '#6a35f2'
  const fg = active && dark ? '#0a1120' : '#fff'
  return L.divIcon({
    className: 'keyfit-marker',
    iconSize: [90, 40],
    iconAnchor: [45, 40],
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:scale(${active ? 1.12 : 1});transition:transform .2s">
      <div style="background:${bg};color:${fg};font:800 11px Vazirmatn;padding:5px 10px;border-radius:12px;box-shadow:0 10px 22px -8px ${bg};white-space:nowrap;border:2px solid ${dark ? 'rgba(255,255,255,.15)' : '#fff'}">${num(price / 1000)}هزار</div>
      <div style="width:10px;height:10px;background:${bg};transform:rotate(45deg);margin-top:-6px;border-radius:2px"></div>
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
    <MapContainer center={center} zoom={12} className={`w-full overflow-hidden rounded-[2rem] ${className}`} scrollWheelZoom attributionControl={false} zoomControl={false}>
      <TileLayer key={dark ? 'd' : 'l'} url={dark ? TILES.dark : TILES.light} subdomains="abcd" />
      <Fly center={center} />
      {user && sel && <Polyline positions={[user, [sel.lat, sel.lng]]} pathOptions={{ color: dark ? '#e8bf5a' : '#7c4dff', weight: 4, dashArray: '2 10', lineCap: 'round' }} />}
      {user && (
        <>
          <CircleMarker center={user} radius={18} pathOptions={{ stroke: false, fillColor: '#3b82f6', fillOpacity: 0.18 }} />
          <CircleMarker center={user} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }} />
        </>
      )}
      {gyms.map((g) => (
        <Marker key={g.id} position={[g.lat, g.lng]} icon={icon(g.id === selected, g.sessionPrice, dark)} eventHandlers={{ click: () => onSelect?.(g.id) }}>
          {!onSelect && (
            <Popup>
              <Link to={`/fityab/${g.id}`} className="font-bold">
                {g.name}
              </Link>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  )
}
