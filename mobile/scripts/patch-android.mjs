/** تنظیمات بومی پس از `cap add android`: مجوزهای دوربین (اسکن QR) و موقعیت (نقشه)، نسخه‌ی اپ */
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../android/', import.meta.url).pathname
const manifestPath = `${root}app/src/main/AndroidManifest.xml`
let manifest = readFileSync(manifestPath, 'utf8')
const perms = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
]
const missing = perms.filter((p) => !manifest.includes(p.match(/android:name="([^"]+)"/)[1]))
if (missing.length) manifest = manifest.replace('<application', `${missing.join('\n    ')}\n\n    <application`)
writeFileSync(manifestPath, manifest)

// شماره‌ی نسخه از محیط ساخت (در GitHub Actions: شماره‌ی اجرا)
const gradlePath = `${root}app/build.gradle`
let gradle = readFileSync(gradlePath, 'utf8')
const code = Number(process.env.VERSION_CODE) || 1
const name = process.env.VERSION_NAME || '1.0.0'
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${name}"`)
writeFileSync(gradlePath, gradle)
console.log(`android patched: ${missing.length} permission(s) added, version ${name} (${code})`)
