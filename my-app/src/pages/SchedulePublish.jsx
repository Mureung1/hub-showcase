import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopBar from "../components/PageTopBar";
import HeroTimeCard from "../components/schedule-publish/HeroTimeCard";
import ExpectedEffectsList from "../components/schedule-publish/ExpectedEffectsList";
import CalendarCard from "../components/schedule-publish/CalendarCard";
import AIHelperCard from "../components/schedule-publish/AIHelperCard";
import ScheduleSummaryCard from "../components/schedule-publish/ScheduleSummaryCard";
import PreviewCard from "../components/schedule-publish/PreviewCard";
import ScheduleActions from "../components/schedule-publish/ScheduleActions";
import { useSchedulePublish } from "../hooks/useSchedulePublish";

function SchedulePublish() {
  const navigate = useNavigate();
  const { data } = useSchedulePublish();

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant">
        불러오는 중...
      </div>
    );
  }

  return <SchedulePublishView data={data} onBack={() => navigate(-1)} />;
}

function SchedulePublishView({ data, onBack }) {
  const { recommendation, expectedEffects, calendar, target } = data;
  const [selectedDay, setSelectedDay] = useState(calendar.selectedDay);
  const [selectedTime, setSelectedTime] = useState(calendar.selectedTime);
  const publishDate = `${calendar.month} ${selectedDay}일`;

  return (
    <div className="min-h-screen bg-surface">
      <PageTopBar storeName="OO카페" title="예약 발행" onBack={onBack} />

      <main className="max-w-[1440px] mx-auto px-container-margin pt-24 pb-xl grid grid-cols-1 md:grid-cols-[35fr_65fr] gap-xl">
        <aside className="flex flex-col gap-xl">
          <HeroTimeCard
            day={recommendation.day}
            time={recommendation.time}
            confidence={recommendation.confidence}
            reasons={recommendation.reasons}
          />
          <ExpectedEffectsList effects={expectedEffects} />
        </aside>

        <section className="flex flex-col gap-xl">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-xl">
            <CalendarCard
              month={calendar.month}
              weekLabels={calendar.weekLabels}
              dates={calendar.dates}
              timeOptions={calendar.timeOptions}
              selectedDay={selectedDay}
              selectedTime={selectedTime}
              onSelectDay={setSelectedDay}
              onSelectTime={setSelectedTime}
            />
            <div className="flex flex-col gap-xl">
              <AIHelperCard onApply={() => setSelectedTime(recommendation.time)} />
              <ScheduleSummaryCard publishDate={publishDate} publishTime={selectedTime} target={target} />
            </div>
          </div>

          <PreviewCard target={target} />

          <ScheduleActions onBack={onBack} onPublishNow={() => {}} onSchedule={() => {}} />
        </section>
      </main>
    </div>
  );
}

export default SchedulePublish;
