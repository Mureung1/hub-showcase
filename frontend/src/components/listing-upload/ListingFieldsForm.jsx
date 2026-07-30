import { listingFieldGroups } from '../../utils/listingFieldDefinitions'

function ListingFieldsForm({ fields, onFieldChange }) {
  return (
    <div className="listing-field-groups">
      {listingFieldGroups.map((group) => (
        <section className="listing-field-group" key={group.title}>
          <h3>{group.title}</h3>
          <div className="listing-fields">
            {group.fields.map(([name, label, placeholder]) => (
              <div className="field-group" key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                  id={name}
                  name={name}
                  value={fields[name] || ''}
                  onChange={(event) => onFieldChange(name, event.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default ListingFieldsForm
