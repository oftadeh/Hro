import { useEffect, useRef, useState } from 'react'
import { TileLayer } from 'react-leaflet'

/**
 * کاشی‌های پایه‌ی نقشه از Mapbox (سبک روشن/تیره هم‌رنگ تم اپ).
 * توکن عمومی (pk.*) برای استفاده در مرورگر است؛ با VITE_MAPBOX_TOKEN هنگام بیلد قابل تغییر است.
 * اگر Mapbox در دسترس نباشد (مثلاً محدودیت شبکه)، خودکار به کاشی‌های جایگزین برمی‌گردد.
 */
export const MAPBOX_TOKEN: string =
  (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ||
  ''

const mapbox = (style: string) => `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`

const MAPBOX = { light: mapbox('light-v11'), dark: mapbox('dark-v11') }
const MAPBOX_ATTR = '© <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'

const FALLBACK = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}
const FALLBACK_ATTR = '© OpenStreetMap © CARTO'

/** پس از چند خطای پیاپی کاشی، Mapbox در این نشست کنار گذاشته می‌شود */
let mapboxFailed = false

export function BaseTiles({ dark }: { dark: boolean }) {
  const [useFallback, setUseFallback] = useState(mapboxFailed || !MAPBOX_TOKEN)
  const errors = useRef(0)
  const loaded = useRef(0)

  useEffect(() => {
    errors.current = 0
    loaded.current = 0
  }, [dark])

  if (useFallback) {
    return <TileLayer key={`f-${dark}`} url={dark ? FALLBACK.dark : FALLBACK.light} subdomains="abcd" attribution={FALLBACK_ATTR} />
  }
  return (
    <TileLayer
      key={`m-${dark}`}
      url={dark ? MAPBOX.dark : MAPBOX.light}
      tileSize={512}
      zoomOffset={-1}
      maxZoom={20}
      attribution={MAPBOX_ATTR}
      eventHandlers={{
        tileload: () => {
          loaded.current += 1
        },
        tileerror: () => {
          errors.current += 1
          if (loaded.current === 0 && errors.current >= 3) {
            mapboxFailed = true
            setUseFallback(true)
          }
        },
      }}
    />
  )
}
