import IconButton from "../../components/common/IconButton";
import CreateMeetingForm from "./CreateMeetingForm";
import { useCreateMeeting } from "./useCreateMeeting";

export default function CreateMeetingModal({ onClose }) {
  const { form, updateField, submit, submitting, submitted, error } = useCreateMeeting();

  return (
    <div className="overlay overlay-c">
      <IconButton className="overlay-close" onClick={onClose} label="닫기">
        ✕
      </IconButton>

      <CreateMeetingForm
        form={form}
        updateField={updateField}
        onSubmit={submit}
        submitting={submitting}
        submitted={submitted}
      />

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
