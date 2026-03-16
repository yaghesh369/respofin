import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Home, LockKeyhole, Sparkles, TrendingUp, UserRoundPlus } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import AnimatedBackdrop from '../components/common/AnimatedBackdrop.jsx'
import BrandLogo from '../components/common/BrandLogo.jsx'
import GlassPanel from '../components/common/GlassPanel.jsx'
import ThemeModeToggle from '../components/common/ThemeModeToggle.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useToast } from '../hooks/useToast.js'
import { cn } from '../lib/cn.js'
import { extractApiError } from '../lib/errors.js'

const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/
const passwordPolicyMessage = 'Use at least 6 characters with uppercase, lowercase, number, and special character.'

const passwordChecks = [
  {
    label: 'At least 6 characters',
    test: (value) => value.length >= 6,
  },
  {
    label: 'One uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    label: 'One lowercase letter',
    test: (value) => /[a-z]/.test(value),
  },
  {
    label: 'One number',
    test: (value) => /\d/.test(value),
  },
  {
    label: 'One special character',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
]

function evaluatePasswordStrength(value = '') {
  const checks = passwordChecks.map((item) => ({
    ...item,
    passed: item.test(value),
  }))
  const passedCount = checks.filter((item) => item.passed).length
  const progress = Math.round((passedCount / passwordChecks.length) * 100)

  if (!value) {
    return {
      checks,
      label: 'Start typing password',
      passedCount,
      progress,
      toneBar: 'bg-slate-300 dark:bg-slate-700',
      toneText: 'text-slate-500 dark:text-slate-400',
    }
  }

  if (passedCount <= 2) {
    return {
      checks,
      label: 'Weak',
      passedCount,
      progress,
      toneBar: 'bg-rose-500',
      toneText: 'text-rose-600 dark:text-rose-300',
    }
  }

  if (passedCount <= 4) {
    return {
      checks,
      label: 'Medium',
      passedCount,
      progress,
      toneBar: 'bg-amber-500',
      toneText: 'text-amber-600 dark:text-amber-300',
    }
  }

  return {
    checks,
    label: 'Strong',
    passedCount,
    progress,
    toneBar: 'bg-emerald-500',
    toneText: 'text-emerald-600 dark:text-emerald-300',
  }
}

const signInSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .regex(passwordPolicyRegex, passwordPolicyMessage),
  username: z.string().min(1, 'Username is required'),
})

const signUpSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(passwordPolicyRegex, passwordPolicyMessage),
  username: z.string().min(3, 'Username must be at least 3 characters'),
})

export default function AuthPage() {
  const [tab, setTab] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useToast()
  const { signIn, signUp } = useAuth()
  const destination = location.state?.from?.pathname || '/dashboard'

  const signInForm = useForm({
    defaultValues: {
      password: '',
      username: '',
    },
    resolver: zodResolver(signInSchema),
  })

  const signUpForm = useForm({
    defaultValues: {
      email: '',
      password: '',
      username: '',
    },
    resolver: zodResolver(signUpSchema),
  })

  const signUpPasswordValue = useWatch({
    control: signUpForm.control,
    name: 'password',
  }) || ''
  const signUpPasswordStrength = evaluatePasswordStrength(signUpPasswordValue)

  const signInMutation = useMutation({
    mutationFn: signIn,
    onSuccess: () => {
      notify({ message: 'Welcome back. Workspace restored.', severity: 'success' })
      navigate(destination, { replace: true })
    },
  })

  const signUpMutation = useMutation({
    mutationFn: signUp,
    onSuccess: () => {
      notify({ message: 'Account created successfully.', severity: 'success' })
      navigate('/dashboard', { replace: true })
    },
  })

  return (
    <div className="relative min-h-screen py-5 md:py-8">
      <AnimatedBackdrop showGrid={false} soft />

      <div className="relative z-20 mx-auto mb-2 flex w-full max-w-[1400px] items-center justify-end gap-2 px-4 lg:px-6">
        <Link
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/60 bg-white/70 text-slate-600 transition hover:border-accent/50 hover:bg-white hover:text-accent dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent"
          title="Home"
          to="/"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ThemeModeToggle />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <GlassPanel
          as={motion.section}
          animate={{ opacity: 1, x: 0 }}
          className="flex min-h-[640px] flex-col gap-6 overflow-hidden p-6 md:p-8"
          initial={{ opacity: 0, x: -24 }}
        >
          <div className="space-y-3">
            <BrandLogo scale="lg" subtitle="Campaign intelligence platform" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Respofin workspace</p>
            <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight md:text-5xl">
              Build revenue campaigns from customer intelligence, not spreadsheets.
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 md:text-base dark:text-slate-300">
              Manage customers, run segmentation, generate recommendations, review notification drafts, and monitor analytics in one polished workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                icon: <TrendingUp className="h-[18px] w-[18px]" />,
                text: 'Interactive dashboards surface segment mix, recommendation output, and notification health.',
                title: 'Live business views',
              },
              {
                icon: <Sparkles className="h-[18px] w-[18px]" />,
                text: 'Transitions guide attention without slowing down data-heavy workflows.',
                title: 'Motion with intent',
              },
              {
                icon: <LockKeyhole className="h-[18px] w-[18px]" />,
                text: 'JWT access tokens refresh automatically so protected screens stay smooth.',
                title: 'Token-safe session flow',
              },
            ].map((item) => (
              <div
                className="rounded-3xl border border-slate-300/50 bg-white/55 p-3 dark:border-slate-700/70 dark:bg-slate-900/55"
                key={item.title}
              >
                <div className="mb-2 inline-flex rounded-full bg-accent/20 p-2 text-accent">{item.icon}</div>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-3xl border border-accent/35 bg-gradient-to-br from-accent/15 to-accent-soft/15 p-4 md:p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="font-display text-xl font-semibold">Everything your team needs in one place</h3>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  Customers, segmentation, recommendations, notifications, analytics, profile settings, dark mode, and responsive workflows.
                </p>
              </div>
              <UserRoundPlus className="h-7 w-7 shrink-0 text-accent" />
            </div>
          </div>
        </GlassPanel>

        <GlassPanel
          as={motion.section}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 md:p-8"
          initial={{ opacity: 0, x: 24 }}
        >
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-3xl font-bold">Access the control room</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Sign in with an operator account or create a new one to open the workspace and start managing campaigns.
              </p>
            </div>

            <div className="inline-flex rounded-full border border-slate-300/70 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-900/65">
              <button
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  tab === 0 ? 'bg-accent text-slate-950' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
                onClick={() => setTab(0)}
                type="button"
              >
                Sign in
              </button>
              <button
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  tab === 1 ? 'bg-accent text-slate-950' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
                onClick={() => setTab(1)}
                type="button"
              >
                Create account
              </button>
            </div>

            {tab === 0 ? (
              <form className="space-y-3" onSubmit={signInForm.handleSubmit((values) => signInMutation.mutate(values))}>
                {signInMutation.isError ? (
                  <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
                    {extractApiError(signInMutation.error)}
                  </div>
                ) : null}

                <div>
                  <label className="field-label" htmlFor="sign-in-username">Username</label>
                  <input className="field-input" id="sign-in-username" {...signInForm.register('username')} />
                  {signInForm.formState.errors.username ? (
                    <p className="field-error">{signInForm.formState.errors.username.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="sign-in-password">Password</label>
                  <input className="field-input" id="sign-in-password" type="password" {...signInForm.register('password')} />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{passwordPolicyMessage}</p>
                  {signInForm.formState.errors.password ? (
                    <p className="field-error">{signInForm.formState.errors.password.message}</p>
                  ) : null}
                </div>

                <button className="btn-primary w-full" disabled={signInMutation.isPending} type="submit">
                  {signInMutation.isPending ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={signUpForm.handleSubmit((values) => signUpMutation.mutate(values))}>
                {signUpMutation.isError ? (
                  <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
                    {extractApiError(signUpMutation.error)}
                  </div>
                ) : null}

                <div>
                  <label className="field-label" htmlFor="sign-up-username">Username</label>
                  <input className="field-input" id="sign-up-username" {...signUpForm.register('username')} />
                  {signUpForm.formState.errors.username ? (
                    <p className="field-error">{signUpForm.formState.errors.username.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="sign-up-email">Email</label>
                  <input className="field-input" id="sign-up-email" type="email" {...signUpForm.register('email')} />
                  {signUpForm.formState.errors.email ? (
                    <p className="field-error">{signUpForm.formState.errors.email.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="sign-up-password">Password</label>
                  <input className="field-input" id="sign-up-password" type="password" {...signUpForm.register('password')} />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{passwordPolicyMessage}</p>

                  <div className="mt-2 rounded-2xl border border-slate-300/60 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
                      <div
                        className={cn('h-full rounded-full transition-all duration-300', signUpPasswordStrength.toneBar)}
                        style={{ width: `${signUpPasswordStrength.progress}%` }}
                      />
                    </div>

                    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                      <span className={cn('font-semibold', signUpPasswordStrength.toneText)}>{signUpPasswordStrength.label}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {signUpPasswordStrength.passedCount}/{passwordChecks.length} checks
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {signUpPasswordStrength.checks.map((item) => (
                        <p
                          className={cn(
                            'text-xs',
                            item.passed
                              ? 'text-emerald-600 dark:text-emerald-300'
                              : 'text-slate-500 dark:text-slate-400',
                          )}
                          key={item.label}
                        >
                          {item.passed ? '✓' : '•'} {item.label}
                        </p>
                      ))}
                    </div>
                  </div>

                  {signUpForm.formState.errors.password ? (
                    <p className="field-error">{signUpForm.formState.errors.password.message}</p>
                  ) : null}
                </div>

                <button className="btn-primary w-full" disabled={signUpMutation.isPending} type="submit">
                  {signUpMutation.isPending ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}