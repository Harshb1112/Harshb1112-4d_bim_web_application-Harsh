import { format, formatInTimeZone } from 'date-fns-tz'
import { format as formatDate } from 'date-fns'

export interface UserSettings {
  timezone: string
  dateFormat: string
  language: string
}

/**
 * Format date according to user's timezone and date format preference
 */
export function formatUserDate(
  date: Date | string | number,
  userSettings: UserSettings
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date

  try {
    // Convert date format string to date-fns format
    const formatMap: Record<string, string> = {
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'DD MMM YYYY': 'dd MMM yyyy',
      'DD-MM-YYYY': 'dd-MM-yyyy',
      'YYYY/MM/DD': 'yyyy/MM/dd',
    }

    const dateFnsFormat = formatMap[userSettings.dateFormat] || 'MM/dd/yyyy'

    // Format in user's timezone
    return formatInTimeZone(dateObj, userSettings.timezone, dateFnsFormat)
  } catch (error) {
    console.error('Error formatting date:', error)
    return formatDate(dateObj, 'MM/dd/yyyy')
  }
}

/**
 * Format date with time according to user's timezone and date format
 */
export function formatUserDateTime(
  date: Date | string | number,
  userSettings: UserSettings
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date

  try {
    const formatMap: Record<string, string> = {
      'MM/DD/YYYY': 'MM/dd/yyyy hh:mm a',
      'DD/MM/YYYY': 'dd/MM/yyyy HH:mm',
      'YYYY-MM-DD': 'yyyy-MM-dd HH:mm',
      'DD MMM YYYY': 'dd MMM yyyy hh:mm a',
      'DD-MM-YYYY': 'dd-MM-yyyy HH:mm',
      'YYYY/MM/DD': 'yyyy/MM/dd HH:mm',
    }

    const dateFnsFormat = formatMap[userSettings.dateFormat] || 'MM/dd/yyyy hh:mm a'

    return formatInTimeZone(dateObj, userSettings.timezone, dateFnsFormat)
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return formatDate(dateObj, 'MM/dd/yyyy hh:mm a')
  }
}

/**
 * Get current time in user's timezone
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  try {
    return formatInTimeZone(new Date(), timezone, 'hh:mm:ss a')
  } catch (error) {
    console.error('Error getting current time:', error)
    return formatDate(new Date(), 'hh:mm:ss a')
  }
}

/**
 * Get timezone offset display (e.g., "UTC+5:30")
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date()
    const offset = formatInTimeZone(now, timezone, 'XXX')
    return `UTC${offset}`
  } catch (error) {
    return 'UTC+0:00'
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string | number,
  userSettings: UserSettings
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return formatUserDate(dateObj, userSettings)
}

/**
 * Example usage in components:
 * 
 * const userSettings = {
 *   timezone: 'Asia/Kolkata',
 *   dateFormat: 'DD/MM/YYYY',
 *   language: 'en'
 * }
 * 
 * formatUserDate(new Date(), userSettings) // "12/01/2025"
 * formatUserDateTime(new Date(), userSettings) // "12/01/2025 10:30 AM"
 * getCurrentTimeInTimezone('Asia/Kolkata') // "10:30:45 AM"
 */
