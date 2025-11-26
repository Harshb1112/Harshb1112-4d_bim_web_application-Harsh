/**
 * Client-side authentication utilities
 * 
 * NOTE: We use cookie-based authentication with credentials: 'include'
 * DO NOT send Authorization header - it can cause conflicts with old cached tokens
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

/**
 * @deprecated Use authenticatedFetch instead - it uses cookies automatically
 * DO NOT use Authorization header to avoid conflicts with old tokens
 */
export function getAuthHeaders(): HeadersInit {
  console.warn('[Client Auth] getAuthHeaders is deprecated - use cookies with credentials: include')
  return {}
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Use cookies only - no Authorization header
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers
      // DO NOT add Authorization header - cookies are sent automatically
    },
    credentials: 'include'
  })
}
