function RequirementModal({
  idPrefix,
  title,
  subtitle,
  totalLabel,
  majorLabel,
  generalLabel,
  totalValue,
  majorValue,
  generalValue,
  onTotalChange,
  onMajorChange,
  onGeneralChange,
  onClose,
  onSubmit,
}) {
  const isValid = totalValue && majorValue && generalValue;

  return (
    <div className="req-modal-overlay" onClick={onClose}>
      <div className="req-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="req-modal-close"
          onClick={onClose}
          aria-label="닫기"
        >
          ✕
        </button>
        <h2 className="req-modal-title">{title}</h2>
        <p className="req-modal-sub">{subtitle}</p>

        <div className="req-field">
          <label htmlFor={`${idPrefix}TotalInput`}>{totalLabel}</label>
          <input
            id={`${idPrefix}TotalInput`}
            type="number"
            value={totalValue}
            onChange={(e) => onTotalChange(e.target.value)}
          />
        </div>

        <div className="req-field">
          <label htmlFor={`${idPrefix}MajorInput`}>{majorLabel}</label>
          <input
            id={`${idPrefix}MajorInput`}
            type="number"
            value={majorValue}
            onChange={(e) => onMajorChange(e.target.value)}
          />
        </div>

        <div className="req-field">
          <label htmlFor={`${idPrefix}GeneralInput`}>{generalLabel}</label>
          <input
            id={`${idPrefix}GeneralInput`}
            type="number"
            value={generalValue}
            onChange={(e) => onGeneralChange(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="cta req-modal-submit"
          onClick={() => {
            if (!isValid) return;
            onSubmit();
          }}
        >
          적용하기
        </button>
      </div>
    </div>
  );
}

export default RequirementModal;