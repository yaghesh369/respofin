const AUTH_STORAGE_KEY = 'respofin.session'
const APPEARANCE_STORAGE_KEY = 'respofin.appearance'

export const defaultAppearance = {
  mode: 'system',
  accent: 'teal',
  motion: 'full',
  compactMode: false,
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseStoredValue(rawValue, fallbackValue) {
  if (!rawValue) {
    return fallbackValue
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    return fallbackValue
  }
}

export function getStoredSession() {
  if (!canUseStorage()) {
    return null
  }

  const session = parseStoredValue(window.localStorage.getItem(AUTH_STORAGE_KEY), null)
  return session?.access && session?.refresh ? session : null
}

export function setStoredSession(session) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getStoredAppearance() {
  if (!canUseStorage()) {
    return defaultAppearance
  }

  const appearance = parseStoredValue(window.localStorage.getItem(APPEARANCE_STORAGE_KEY), {})
  return {
    ...defaultAppearance,
    ...appearance,
  }
}

export function setStoredAppearance(appearance) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance))
}