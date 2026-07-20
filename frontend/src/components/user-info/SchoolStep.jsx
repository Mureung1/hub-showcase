function SchoolStep({ errors, form, updateField }) {
  return (
    <div className="field-group">
      <label htmlFor="school">학교</label>
      <input
        id="school"
        name="school"
        value={form.school}
        onChange={(event) => updateField('school', event.target.value)}
        placeholder="예: 한국대학교"
        aria-describedby={errors.school ? 'school-error' : undefined}
        aria-invalid={Boolean(errors.school)}
      />
      {errors.school && <p className="error-text" id="school-error">{errors.school}</p>}
    </div>
  )
}

export default SchoolStep
