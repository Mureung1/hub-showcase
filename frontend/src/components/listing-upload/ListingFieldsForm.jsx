const listingFields = [
  ['address', '주소', '예: 경상남도 진주시 가좌동 1436-6'],
  ['deposit', '보증금', '예: 300'],
  ['monthlyRent', '월세', '예: 36'],
  ['maintenanceFee', '관리비', '예: 9만원'],
  ['area', '면적', '예: 40㎡/30㎡'],
  ['floor', '층수', '예: 2/3층'],
  ['options', '옵션', '예: 분리형 풀옵션 원룸'],
  ['distanceFromSchool', '학교와의 거리', '예: 도보 15분'],
]

function ListingFieldsForm({ fields, onFieldChange }) {
  return (
    <div className="listing-fields">
      {listingFields.map(([name, label, placeholder]) => (
        <div className="field-group" key={name}>
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            name={name}
            value={fields[name]}
            onChange={(event) => onFieldChange(name, event.target.value)}
            placeholder={placeholder}
          />
        </div>
      ))}
    </div>
  )
}

export default ListingFieldsForm
