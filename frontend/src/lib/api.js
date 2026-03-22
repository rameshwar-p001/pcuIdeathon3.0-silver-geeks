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

    // On dev tunnels, prefer direct backend tunnel host (for example 5000.<suffix>)
    // so auth headers do not depend on frontend proxy behavior.
    if (isDevTunnelHost && isLocalTarget) {
      const hostMatch = browserHost.match(/^(\d+)\.(.+\.devtunnels\.ms)$/)
      const backendPort = parsed.port || '5000'

      if (hostMatch?.[2]) {
        return `${window.location.protocol}//${backendPort}.${hostMatch[2]}`
      }

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
  const isRelativeApiPath = typeof path === 'string' && path.startsWith('/api/')

  const makeRequest = async (forceRefreshToken = false, useSameOrigin = false) => {
    const headers = await getAuthHeaders(forceRefreshToken)
    const primaryUrl = useSameOrigin ? path : `${apiBaseUrl}${path}`

    try {
      return await fetch(primaryUrl, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      })
    } catch {
      // If direct backend tunnel is unreachable, retry via same-origin /api proxy.
      if (!useSameOrigin && typeof window !== 'undefined' && apiBaseUrl && apiBaseUrl.includes('.devtunnels.ms')) {
        try {
          return await fetch(path, {
            ...options,
            headers: {
              ...headers,
              ...(options.headers || {}),
            },
          })
        } catch {
          // Continue to shared error below.
        }
      }

      throw new Error(`Unable to reach API server at ${apiBaseUrl || 'current origin (/api proxy)'}. If using devtunnel, restart Vite after proxy changes.`)
    }
  }

  let response = await makeRequest(false)

  // Retry once with a forced token refresh when backend rejects auth.
  if (response.status === 401) {
    response = await makeRequest(true)
  }

  // If direct base URL still returns 401, retry one last time through same-origin /api.
  // This helps when VITE_API_BASE_URL host is reachable but not the actual backend.
  if (response.status === 401 && isRelativeApiPath && typeof window !== 'undefined') {
    response = await makeRequest(true, true)
  }

  const rawText = await response.text().catch(() => '')
  let payload = {}
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    payload = {}
  }

  if (!response.ok || payload.success === false) {
    const contentType = response.headers.get('content-type') || ''
    const backendRawReason = !payload.message && rawText && !contentType.includes('application/json')
      ? `: ${rawText.replace(/\s+/g, ' ').slice(0, 140)}`
      : ''
    const backendReason = payload?.error ? `: ${payload.error}` : ''
    throw new Error(
      payload.message
        ? `${payload.message}${backendReason}`
        : `API request failed (${response.status})${backendRawReason}`
    )
  }

  return payload
}

export { apiBaseUrl }
