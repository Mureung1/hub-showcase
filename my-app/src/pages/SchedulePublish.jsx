import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopBar from "../components/PageTopBar";
import HeroTimeCard from "../components/schedule-publish/HeroTimeCard";
import AIHelperCard from "../components/schedule-publish/AIHelperCard";
import ScheduleSummaryCard from "../components/schedule-publish/ScheduleSummaryCard";
import PreviewCard from "../components/schedule-publish/PreviewCard";
import ScheduleActions from "../components/schedule-publish/ScheduleActions";
import { useSchedulePublish } from "../hooks/useSchedulePublish";
import { apiClient } from "../api/client";

const TARGET = "네이버 블로그";

// <input type="datetime-local">가 기대하는 "YYYY-MM-DDTHH:mm"(로컬 시간) 포맷으로 변환.
function toDateTimeLocalValue(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplay(dateTimeLocalValue) {
  const d = new Date(dateTimeLocalValue);
  return {
    date: `${d.getMonth() + 1}월 ${d.getDate()}일`,
    time: d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function SchedulePublish() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: suggested, error } = useSchedulePublish(id);
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!suggested || selected !== null) return;
    Promise.resolve().then(() => setSelected(toDateTimeLocalValue(suggested.datetime)));
  }, [suggested, selected]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-error">
        {error.message}
      </div>
    );
  }

  if (!suggested || selected === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant">
        불러오는 중...
      </div>
    );
  }

  const suggestedDisplay = formatDisplay(toDateTimeLocalValue(suggested.datetime));
  const { date: publishDate, time: publishTime } = formatDisplay(selected);

  const handleSchedule = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.post(`/posts/${id}/schedule`, { scheduledAt: new Date(selected).toISOString() });
      navigate("/");
    } catch (err) {
      setSubmitError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <PageTopBar storeName="OO카페" title="예약 발행" onBack={() => navigate(-1)} />

      <main className="max-w-[1440px] mx-auto px-container-margin pt-24 pb-xl grid grid-cols-1 md:grid-cols-[35fr_65fr] gap-xl">
        <aside className="flex flex-col gap-xl">
          <HeroTimeCard day={suggestedDisplay.date} time={suggestedDisplay.time} reasons={[suggested.reason]} />
        </aside>

        <section className="flex flex-col gap-xl">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-xl">
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="publish-datetime">
                발행 일시
              </label>
              <input
                id="publish-datetime"
                type="datetime-local"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-sm focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>
            <div className="flex flex-col gap-xl">
              <AIHelperCard onApply={() => setSelected(toDateTimeLocalValue(suggested.datetime))} />
              <ScheduleSummaryCard publishDate={publishDate} publishTime={publishTime} target={TARGET} />
            </div>
          </div>

          <PreviewCard target={TARGET} />

          {submitError && <p className="font-body-sm text-body-sm text-error">{submitError}</p>}

          <ScheduleActions
            onBack={() => navigate(-1)}
            onSchedule={handleSchedule}
            isSubmitting={isSubmitting}
          />
        </section>
      </main>
    </div>
  );
}

export default SchedulePublish;
