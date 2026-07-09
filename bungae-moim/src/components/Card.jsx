export default function Card({ variant = 'solid', className = '', children, ...rest }) {
  const classes = ['card', `card--${variant}`, className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
