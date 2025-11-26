/**
 * Fetch helper that uses cookie-based authentication
 * DO NOT use Authorization header - cookies are sent automatically with credentials: 'include'
 */

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      // DO NOT add Authorization header
    },
    credentials: 'include', // This sends cookies automatically
  })
}

export async function authFetchJSON<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}
