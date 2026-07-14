// Centralized production config for API + WebSocket URLs.
// Vercel provides these at build-time via environment variables (VITE_*).

const httpBase = import.meta.env.VITE_BACKEND_HTTP_URL || ''
const wsBaseEnv = import.meta.env.VITE_BACKEND_WS_URL || ''

function normalizeHttpBase(url) {
  if (!url) return ''
  // remove trailing slash
  return url.replace(/\/+$/, '')
}

function httpToWs(httpUrl) {
  if (!httpUrl) return ''
  if (httpUrl.startsWith('https://')) return httpUrl.replace('https://', 'wss://')
  if (httpUrl.startsWith('http://')) return httpUrl.replace('http://', 'ws://')
  return httpUrl
}

export const config = {
  backendHttpUrl: normalizeHttpBase(httpBase),
  backendWsUrl: normalizeHttpBase(wsBaseEnv || httpToWs(httpBase)),
}

