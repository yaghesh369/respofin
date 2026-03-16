import { cn } from '../../lib/cn.js'
import { useAppearance } from '../../hooks/useAppearance.js'

const floatingSeeds = [
  { className: 'left-[8%] top-[14%] h-3.5 w-3.5', delay: '0s', duration: '9s' },
  { className: 'left-[20%] top-[72%] h-3 w-3', delay: '-4s', duration: '11s' },
  { className: 'left-[44%] top-[18%] h-4 w-4', delay: '-2s', duration: '10s' },
  { className: 'left-[62%] top-[64%] h-3.5 w-3.5', delay: '-7s', duration: '12s' },
  { className: 'left-[78%] top-[26%] h-3 w-3', delay: '-5s', duration: '13s' },
  { className: 'left-[90%] top-[70%] h-4 w-4', delay: '-9s', duration: '14s' },
]

const energyNodes = [
  { className: 'left-[14%] top-[34%] h-8 w-8', delay: '-1s', duration: '10s' },
  { className: 'left-[36%] top-[78%] h-10 w-10', delay: '-5s', duration: '12s' },
  { className: 'left-[57%] top-[30%] h-9 w-9', delay: '-2s', duration: '11s' },
  { className: 'left-[74%] top-[66%] h-8 w-8', delay: '-8s', duration: '13s' },
  { className: 'left-[86%] top-[22%] h-10 w-10', delay: '-4s', duration: '14s' },
]

export default function AnimatedBackdrop({ className = '', showGrid = true, soft = false }) {
  const { motionLevel, resolvedMode } = useAppearance()
  const isDark = resolvedMode === 'dark'
  const shouldReduceMotion = motionLevel === 'reduced'
  const shouldShowGrid = showGrid && !shouldReduceMotion
  const baseGradientClass = isDark
    ? 'bg-[radial-gradient(circle_at_top_right,rgba(74,201,183,0.34),transparent_44%),radial-gradient(circle_at_left_bottom,rgba(212,146,92,0.3),transparent_42%),radial-gradient(circle_at_52%_46%,rgba(99,102,241,0.18),transparent_62%)]'
    : 'bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.48),transparent_45%),radial-gradient(circle_at_left_bottom,rgba(217,119,6,0.36),transparent_44%),radial-gradient(circle_at_55%_42%,rgba(37,99,235,0.3),transparent_64%)]'
  const gridPatternClass = isDark
    ? 'bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)]'
    : 'bg-[linear-gradient(rgba(59,130,246,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.09)_1px,transparent_1px)]'
  const reducedGradientClass = isDark
    ? 'bg-[radial-gradient(circle_at_15%_25%,rgba(74,201,183,0.22),transparent_34%),radial-gradient(circle_at_78%_72%,rgba(212,146,92,0.22),transparent_39%)]'
    : 'bg-[radial-gradient(circle_at_18%_20%,rgba(8,145,178,0.34),transparent_34%),radial-gradient(circle_at_80%_74%,rgba(217,119,6,0.3),transparent_40%),radial-gradient(circle_at_50%_58%,rgba(37,99,235,0.24),transparent_46%)]'
  const orbAGradientClass = isDark
    ? 'bg-[radial-gradient(circle_at_center,rgba(74,201,183,0.95),rgba(74,201,183,0)_68%)]'
    : 'bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.9),rgba(8,145,178,0)_68%)]'
  const orbBGradientClass = isDark
    ? 'bg-[radial-gradient(circle_at_center,rgba(212,146,92,0.86),rgba(212,146,92,0)_70%)]'
    : 'bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.8),rgba(217,119,6,0)_70%)]'
  const orbCGradientClass = isDark
    ? 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.65),rgba(99,102,241,0)_72%)]'
    : 'bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.66),rgba(37,99,235,0)_72%)]'

  return (
    <div aria-hidden className={cn('backdrop-canvas pointer-events-none fixed inset-0 z-0 overflow-hidden', className)}>
      <div className={cn('absolute inset-0', baseGradientClass, shouldReduceMotion ? 'opacity-86' : 'opacity-100')} />

      {shouldReduceMotion ? null : (
        <>
          <div className={cn('kinetic-halo kinetic-halo-a', soft ? 'opacity-24' : 'opacity-44')} />
          <div className={cn('kinetic-halo kinetic-halo-b', soft ? 'opacity-20' : 'opacity-38')} />
          <div className={cn('motion-ribbon motion-ribbon-a', soft ? 'opacity-20' : 'opacity-34')} />
          <div className={cn('motion-ribbon motion-ribbon-b', soft ? 'opacity-16' : 'opacity-28')} />
          <div className={cn('pulse-ring pulse-ring-a', soft ? 'opacity-20' : 'opacity-34')} />
          <div className={cn('pulse-ring pulse-ring-b', soft ? 'opacity-18' : 'opacity-30')} />
          <div className={cn('mesh-layer mesh-layer-a', soft ? 'opacity-32' : 'opacity-55')} />
          <div className={cn('mesh-layer mesh-layer-b', soft ? 'opacity-26' : 'opacity-48')} />
        </>
      )}

      {shouldShowGrid ? (
        <div className={cn('parallax-grid absolute inset-0', gridPatternClass, 'bg-[size:36px_36px] [mask-image:radial-gradient(circle_at_center,black_45%,transparent_100%)]', shouldReduceMotion ? '' : 'grid-drift')} />
      ) : null}

      {shouldReduceMotion ? (
        <div className={cn('absolute inset-0', reducedGradientClass, soft ? 'opacity-68' : 'opacity-92')} />
      ) : (
        <>
          <div className="light-streak light-streak-a" />
          <div className="light-streak light-streak-b" />

          {energyNodes.map((node) => (
            <span
              className={cn('energy-node', node.className)}
              key={node.className}
              style={{
                animationDelay: node.delay,
                animationDuration: node.duration,
              }}
            >
              <span className="energy-node-core" />
            </span>
          ))}

          {floatingSeeds.map((seed) => (
            <span
              className={cn('floating-seed', seed.className)}
              key={seed.className}
              style={{
                animationDelay: seed.delay,
                animationDuration: seed.duration,
              }}
            />
          ))}

          <div className={cn('aurora-orb aurora-orb-a absolute -left-32 -top-24 h-[420px] w-[420px]', orbAGradientClass, soft ? 'opacity-46' : 'opacity-68')} />
          <div className={cn('aurora-orb aurora-orb-b absolute right-[-110px] top-[20%] h-[380px] w-[380px]', orbBGradientClass, soft ? 'opacity-42' : 'opacity-62')} />
          <div className={cn('aurora-orb aurora-orb-c absolute bottom-[-150px] left-[24%] h-[360px] w-[360px]', orbCGradientClass, soft ? 'opacity-36' : 'opacity-52')} />
        </>
      )}
    </div>
  )
}
