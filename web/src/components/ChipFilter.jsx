import './ChipFilter.css'

function ChipFilter({ categories, active, onSelect }) {
  return (
    <div className="chips">
      {categories.map((category) => (
        <div
          key={category}
          className={`chip${category === active ? ' chip--on' : ''}`}
          onClick={() => onSelect(category)}
        >
          {category}
        </div>
      ))}
    </div>
  )
}

export default ChipFilter
