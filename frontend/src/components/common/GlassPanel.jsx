import { cn } from '../../lib/cn.js'

export default function GlassPanel({ as = 'div', children, className = '', ...props }) {
  const Tag = as

  return (
    <Tag className={cn('panel', className)} {...props}>
      {children}
    </Tag>
  )
}