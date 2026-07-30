function CheckboxGroup({ columns = 'three', label, name, options, values, updateField }) {
  const selectedValues = Array.isArray(values) ? values : []

  function toggleValue(value) {
    if (selectedValues.includes(value)) {
      updateField(name, selectedValues.filter((item) => item !== value))
      return
    }

    updateField(name, [...selectedValues, value])
  }

  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <div className={`choice-grid ${columns === 'three' ? 'choice-grid-three' : ''}`}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value)
          return (
            <label key={option.value} className={isSelected ? 'choice-card selected' : 'choice-card'}>
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => toggleValue(option.value)}
              />
              <span>{option.label}</span>
              {isSelected && <small className="selected-status">선택됨</small>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default CheckboxGroup
