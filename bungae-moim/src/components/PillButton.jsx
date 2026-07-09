import { Link } from 'react-router-dom'

export default function PillButton({
  variant = 'primary',
  size,
  block,
  as,
  to,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'pill-btn',
    `pill-btn--${variant}`,
    size === 'sm' ? 'pill-btn--sm' : '',
    block ? 'pill-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  const Tag = as || 'button'
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
