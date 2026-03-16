import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, LogOut, Paintbrush, Settings2, UserCog } from 'lucide-react'
import { fetchProfile, updateProfile } from '../api/auth.js'
import GlassPanel from '../components/common/GlassPanel.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import { useAppearance } from '../hooks/useAppearance.js'
import { useAuth } from '../hooks/useAuth.js'
import { useToast } from '../hooks/useToast.js'
import { extractApiError } from '../lib/errors.js'
import { formatDateTime } from '../lib/formatters.js'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const notify = useToast()
  const { appearance, accentOptions, motionLevel, resolvedMode, updateAppearance } = useAppearance()
  const { signOut, user } = useAuth()

  const [companyName, setCompanyName] = useState(null)
  const [isOnboarded, setIsOnboarded] = useState(null)

  const profileQuery = useQuery({
    queryFn: fetchProfile,
    queryKey: ['profile'],
  })

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      notify({ message: 'Profile settings updated.', severity: 'success' })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const profileData = profileQuery.data
  const resolvedCompanyName = companyName ?? profileData?.company_name ?? ''
  const resolvedOnboarded = isOnboarded ?? Boolean(profileData?.is_onboarded)

  function handleProfileSubmit(event) {
    event.preventDefault()
    profileMutation.mutate({
      company_name: resolvedCompanyName,
      is_onboarded: resolvedOnboarded,
    })
  }

  async function handleSignOut() {
    await signOut()
    notify({ message: 'Signed out successfully.', severity: 'success' })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace settings"
        title="Configure profile, theme, and interaction preferences"
        description="Update operator profile data and tune visual settings for your team workflow."
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-accent" />
              <h3 className="font-display text-xl font-semibold">Profile settings</h3>
            </div>

            {profileQuery.isLoading ? (
              <div className="h-1 w-full animate-pulse rounded-full bg-accent/70" />
            ) : profileQuery.isError ? (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
                {extractApiError(profileQuery.error, 'Unable to load profile data.')}
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handleProfileSubmit}>
                <div>
                  <label className="field-label" htmlFor="company-name">Company name</label>
                  <input
                    className="field-input"
                    id="company-name"
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Enter your company name"
                    value={resolvedCompanyName}
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={resolvedOnboarded}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                    onChange={(event) => setIsOnboarded(event.target.checked)}
                    type="checkbox"
                  />
                  Mark onboarding complete
                </label>

                <div className="rounded-2xl border border-slate-300/60 bg-white/60 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p>
                    Username: <span className="font-semibold">{user?.username}</span>
                  </p>
                  <p className="mt-1">
                    Profile created: <span className="font-semibold">{formatDateTime(profileQuery.data.created_at)}</span>
                  </p>
                </div>

                <div className="flex justify-end">
                  <button className="btn-primary" disabled={profileMutation.isPending} type="submit">
                    <CheckCircle2 className="h-4 w-4" />
                    {profileMutation.isPending ? 'Saving profile...' : 'Save profile'}
                  </button>
                </div>
              </form>
            )}
          </GlassPanel>
        </div>

        <div className="xl:col-span-5">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Paintbrush className="h-5 w-5 text-accent" />
              <h3 className="font-display text-xl font-semibold">Appearance</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="field-label" htmlFor="appearance-mode">Theme mode</label>
                <select
                  className="field-input"
                  id="appearance-mode"
                  onChange={(event) => updateAppearance({ mode: event.target.value })}
                  value={appearance.mode}
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Currently resolved to: {resolvedMode}</p>
              </div>

              <div>
                <label className="field-label" htmlFor="appearance-accent">Accent palette</label>
                <select
                  className="field-input"
                  id="appearance-accent"
                  onChange={(event) => updateAppearance({ accent: event.target.value })}
                  value={appearance.accent}
                >
                  {accentOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="appearance-motion">Motion preference</label>
                <select
                  className="field-input"
                  id="appearance-motion"
                  onChange={(event) => updateAppearance({ motion: event.target.value })}
                  value={appearance.motion}
                >
                  <option value="system">System</option>
                  <option value="full">Full</option>
                  <option value="reduced">Reduced</option>
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Currently resolved to: {motionLevel}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Reduced mode minimizes route animations and switches the animated backdrop to a calm static version.
                </p>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={appearance.compactMode}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                    onChange={(event) => updateAppearance({ compactMode: event.target.checked })}
                    type="checkbox"
                  />
                  Use compact spacing mode
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Compact mode shrinks typography, controls, table cell padding, and layout spacing for higher data density.
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>

      <GlassPanel className="mt-3 p-4 md:p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-accent" />
              <p className="font-display text-lg font-semibold">Session controls</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Log out this operator account from the current device.
            </p>
          </div>

          <button
            className="btn-ghost border border-rose-400/50 text-rose-600 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-900/40"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}