/** لینک مسیریابی در اپ‌های نقشه (گوگل مپ؛ در موبایل اپ نشان/ویز هم پیشنهاد می‌شود) */
export const directionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
export const wazeUrl = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
export const neshanUrl = (lat: number, lng: number) => `https://neshan.org/maps/@${lat},${lng},16z`
