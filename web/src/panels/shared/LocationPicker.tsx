import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const pin = L.divIcon({
  className: 'keyfit-marker',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  html: '<div style="font-size:34px;line-height:1;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))">📍</div>',
})

function Clicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)) })
  return null
}

/** انتخاب موقعیت روی نقشه با کلیک */
export function LocationPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={[lat, lng]} zoom={13} className="h-64 w-full overflow-hidden rounded-2xl" attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Clicker onPick={onChange} />
      <Marker position={[lat, lng]} icon={pin} />
    </MapContainer>
  )
}
