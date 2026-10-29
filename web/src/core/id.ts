export const uid = (prefix = '') =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const now = () => new Date().toISOString()

export const entryCode = () => String(Math.floor(100000 + Math.random() * 900000))
