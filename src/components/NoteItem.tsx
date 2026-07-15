type NoteItemProps = {
  index: number;
  note: string;
  onDelete: () => void;
  classNameItem?: string;
  classNameIndex?: string;
  classNameText?: string;
  classNameDelete?: string;
};

export default function NoteItem({
  index,
  note,
  onDelete,
  classNameItem,
  classNameIndex,
  classNameText,
  classNameDelete,
}: NoteItemProps) {
  return (
    <li className={classNameItem}>
      <span className={classNameIndex}>{String(index + 1).padStart(2, "0")}</span>
      <p className={classNameText}>{note}</p>
      <button
        type="button"
        className={classNameDelete}
        onClick={onDelete}
        aria-label="메모 삭제"
      >
        &times;
      </button>
    </li>
  );
}
