import { useEffect, useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const locales = {
  'ko': ko,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarView() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');

  const fetchEvents = () => {
    fetch('http://localhost:8080/api/dashboard/calendar-events')
      .then(res => res.json())
      .then(data => {
        const formattedEvents = data.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }));
        setEvents(formattedEvents);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedSlot(slotInfo);
    setNewEventTitle('');
    setShowModal(true);
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !selectedSlot) return;

    try {
      const res = await fetch('http://localhost:8080/api/dashboard/action-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEventTitle,
          start: selectedSlot.start.toISOString(),
          end: selectedSlot.end.toISOString()
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans relative">
      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-96 p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-extrabold text-slate-800 mb-4">새 일정 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">일정 제목</label>
                <input 
                  type="text" 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 focus:border-pastel-blue focus:ring-4 focus:ring-pastel-blue/30 outline-none transition-all"
                  placeholder="예: 과제 마감, 저녁 약속..."
                  autoFocus
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button 
                  onClick={handleCreateEvent}
                  className="flex-1 bg-brand-blue text-white font-bold py-2.5 rounded-xl hover:bg-dark-blue transition-colors"
                >
                  추가하기
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8 h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">일정 캘린더</h1>
          </div>
          <button 
            onClick={async () => {
              try {
                await fetch('http://localhost:8080/api/dashboard/sync-google', { method: 'POST' });
                alert("구글 캘린더 동기화(내보내기)가 백엔드로 요청되었습니다! (콘솔 확인)");
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-5 py-2.5 bg-indigo-50 text-indigo-600 font-medium rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            + Google Calendar 연동
          </button>
        </div>

        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-100 p-4">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            culture="ko"
            selectable
            onSelectSlot={handleSelectSlot}
            className="font-sans text-sm cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
