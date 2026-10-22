import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { Gym } from '@/core/types'
import { toman } from '@/core/format'

const icon = (active: boolean, price: number) =>
  L.divIcon({
    className: 'keyfit-marker',
    iconSize: [86, 34],
    iconAnchor: [43, 34],
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:${active ? '#0f172a' : '#10b981'};color:#fff;font:700 11px Vazirmatn;padding:4px 9px;border-radius:999px;box-shadow:0 6px 16px -6px rgba(0,0,0,.5);white-space:nowrap;border:2px solid #fff">${toman(price).replace(' تومان', '')} ت</div>
      <div style="width:8px;height:8px;background:${active ? '#0f172a' : '#10b981'};transform:rotate(45deg);margin-top:-5px;border-right:2px solid #fff;border-bottom:2px solid #fff"></div>
    </div>`,
  })

function Fly({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 13), { duration: 0.6 })
  }, [center[0], center[1], map]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function GymMap({ gyms, center, user, selected, onSelect, className = 'h-[55dvh]' }: { gyms: Gym[]; center: [number, number]; user?: [number, number]; selected?: string; onSelect?: (id: string) => void; className?: string }) {
  return (
    <MapContainer center={center} zoom={12} className={`w-full overflow-hidden rounded-3xl ${className}`} scrollWheelZoom attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Fly center={center} />
      {user && <CircleMarker center={user} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }} />}
      {gyms.map((g) => (
        <Marker key={g.id} position={[g.lat, g.lng]} icon={icon(g.id === selected, g.sessionPrice)} eventHandlers={{ click: () => onSelect?.(g.id) }}>
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
