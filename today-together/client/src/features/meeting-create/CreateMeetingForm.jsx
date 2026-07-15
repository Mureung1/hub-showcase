import FormField from "../../components/common/FormField";
import Button from "../../components/common/Button";

const CATEGORY_OPTIONS = [
  { value: "공부", label: "공부" },
  { value: "영화", label: "영화" },
  { value: "독서", label: "독서" },
  { value: "취미", label: "취미" },
];

const DURATION_OPTIONS = [
  { value: "15", label: "15분" },
  { value: "30", label: "30분" },
  { value: "60", label: "1시간" },
  { value: "120", label: "2시간" },
];

export default function CreateMeetingForm({ form, updateField, onSubmit, submitting, submitted }) {
  function handleChange(event) {
    updateField(event.target.name, event.target.value);
  }

  return (
    <div className="create-modal">
      <FormField label="방 제목" name="title" value={form.title} onChange={handleChange} placeholder="예: 스터디 모각공" />

      <FormField
        as="textarea"
        label="상세 설명"
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="모임에 대한 간단한 설명을 적어주세요"
      />

      <FormField as="select" label="카테고리" name="category" value={form.category} onChange={handleChange} options={CATEGORY_OPTIONS} />

      <div className="field-row">
        <FormField label="시작 시각" name="startTime" type="time" value={form.startTime} onChange={handleChange} />
        <FormField as="select" label="진행 시간" name="duration" value={form.duration} onChange={handleChange} options={DURATION_OPTIONS} />
      </div>

      <div className="create-footer">
        <Button onClick={onSubmit} disabled={submitting}>
          {submitted ? "생성 완료 ✓" : "모임 생성"}
        </Button>
      </div>
    </div>
  );
}
