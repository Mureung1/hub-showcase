type ScreenHeaderProps = {
  description: string
  title: string
}

export function ScreenHeader({ description, title }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  )
}
