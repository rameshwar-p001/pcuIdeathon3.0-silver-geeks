import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

function resolveApiBaseUrl() {
  if (typeof window === 'undefined') {
    return configuredApiBaseUrl
  }

  try {
    const browserHost = window.location.hostname
    const isDevTunnelHost = browserHost.includes('devtunnels.ms')
    const parsed = new URL(configuredApiBaseUrl)
    const isLocalTarget = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    const isLocalBrowser = browserHost === 'localhost' || browserHost === '127.0.0.1'

    // On dev tunnels, route through Vite's /api proxy so mobile clients don't need direct :5000 access.
    if (isDevTunnelHost && isLocalTarget) {
      return ''
    }

    if (isLocalTarget && !isLocalBrowser) {
      parsed.hostname = browserHost
      return parsed.toString().replace(/\/$/, '')
    }
  } catch {
    return configuredApiBaseUrl
  }

  return configuredApiBaseUrl
}

const apiBaseUrl = resolveApiBaseUrl()

async function waitForFirebaseUser(timeoutMs = 3000) {
  if (auth.currentUser) {
    return auth.currentUser
  }

  return new Promise((resolve) => {
    let settled = false

    const finish = (user) => {
      if (settled) {
        return
      }

      settled = true
      resolve(user || null)
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutId)
      unsubscribe()
      finish(user)
    })

    const timeoutId = setTimeout(() => {
      unsubscribe()
      finish(auth.currentUser)
    }, timeoutMs)
  })
}

async function getAuthHeaders(forceRefresh = false) {
  const currentUser = await waitForFirebaseUser()

  if (!currentUser) {
    throw new Error('Session expired. Please login again.')
  }

  const token = await currentUser.getIdToken(forceRefresh)
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function apiRequest(path, options = {}) {
  const makeRequest = async (forceRefreshToken = false) => {
    const headers = await getAuthHeaders(forceRefreshToken)

    try {
      return await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      })
    } catch {
      throw new Error(`Unable to reach API server at ${apiBaseUrl || 'current origin (/api proxy)'}. If using devtunnel, restart Vite after proxy changes.`)
    }
  }

  let response = await makeRequest(false)

  // Retry once with a forced token refresh when backend rejects auth.
  if (response.status === 401) {
    response = await makeRequest(true)
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    const backendReason = payload?.error ? `: ${payload.error}` : ''
    throw new Error(payload.message ? `${payload.message}${backendReason}` : `API request failed (${response.status})`)
  }

  return payload
}

export { apiBaseUrl }
