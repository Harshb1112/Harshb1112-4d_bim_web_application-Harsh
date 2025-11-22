/**
 * Client-side authentication utilities
 */

export function getClientToken(): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'token') {
      return value
    }
  }
  return null
}

export function getAuthHeaders(): HeadersInit {
  const token = getClientToken()
  if (!token) {
    console.warn('[Client Auth] No token found in cookies')
    return {}
  }
  return {
    'Authorization': `Bearer ${token}`
  }
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  })
}
