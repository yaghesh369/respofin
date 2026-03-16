import { useCallback, useEffect, useMemo, useState } from 'react'
import { accentOptions, accentScales } from './appearance.constants.js'
import { AppearanceContext } from './appearance.context.js'
import { defaultAppearance, getStoredAppearance, setStoredAppearance } from '../lib/storage.js'

function readSystemMode() {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readSystemMotion() {
  if (typeof window === 'undefined') {
    return 'full'
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full'
}

export function AppearanceProvider({ children }) {
  const [appearance, setAppearance] = useState(() => getStoredAppearance())
  const [systemMode, setSystemMode] = useState(readSystemMode)
  const [systemMotion, setSystemMotion] = useState(readSystemMotion)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const modeMedia = window.matchMedia('(prefers-color-scheme: dark)')
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleModeChange = (event) => {
      setSystemMode(event.matches ? 'dark' : 'light')
    }

    const handleMotionChange = (event) => {
      setSystemMotion(event.matches ? 'reduced' : 'full')
    }

    modeMedia.addEventListener('change', handleModeChange)
    motionMedia.addEventListener('change', handleMotionChange)

    return () => {
      modeMedia.removeEventListener('change', handleModeChange)
      motionMedia.removeEventListener('change', handleMotionChange)
    }
  }, [])

  const resolvedMode = appearance.mode === 'system' ? systemMode : appearance.mode
  const motionLevel = appearance.motion === 'system' ? systemMotion : appearance.motion

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedMode === 'dark')
    root.dataset.compact = appearance.compactMode ? 'true' : 'false'
    root.dataset.motion = motionLevel

    const accent = accentScales[appearance.accent] ?? accentScales.teal
    root.style.setProperty('--accent-rgb', accent.primary)
    root.style.setProperty('--accent-soft-rgb', accent.soft)
  }, [appearance.accent, appearance.compactMode, motionLevel, resolvedMode])

  const updateAppearance = useCallback((updates) => {
    setAppearance((currentAppearance) => {
      const nextAppearance = {
        ...currentAppearance,
        ...updates,
      }
      setStoredAppearance(nextAppearance)
      return nextAppearance
    })
  }, [])

  const toggleMode = useCallback(() => {
    updateAppearance({ mode: resolvedMode === 'dark' ? 'light' : 'dark' })
  }, [resolvedMode, updateAppearance])

  const contextValue = useMemo(
    () => ({
      appearance,
      accentOptions,
      defaultAppearance,
      motionLevel,
      resolvedMode,
      toggleMode,
      updateAppearance,
    }),
    [appearance, motionLevel, resolvedMode, toggleMode, updateAppearance],
  )

  return <AppearanceContext.Provider value={contextValue}>{children}</AppearanceContext.Provider>
}
