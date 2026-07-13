import React, { useState } from "react";
import { SavedOutfit, CalendarEvent } from "../types";
import { Calendar, Save, Trash2, X, AlertTriangle, CheckCircle } from "lucide-react";

interface CalendarTabProps {
  savedStyles: SavedOutfit[];
  calendarEvents: CalendarEvent[];
  onAddEvent: (date: string, outfitId: string) => void;
  onRemoveEvent: (date: string) => void;
}

export default function CalendarTab({ savedStyles, calendarEvents, onAddEvent, onRemoveEvent }: CalendarTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>("2026-07-13"); // Default to current local time date
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>("");

  // Generating July 2026 Monthly Grid
  const daysInMonth = 31;
  const startDayOfWeek = 3; // July 1st, 2026 is a Wednesday (Sunday = 0, Wed = 3)
  
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Helper to format date string
  const formatDateString = (day: number) => {
    return `2026-07-${day < 10 ? "0" + day : day}`;
  };

  // Find outfit scheduled on date
  const getEventForDate = (dateStr: string) => {
    const ev = calendarEvents.find(e => e.date === dateStr);
    if (ev) {
      return savedStyles.find(s => s.id === ev.outfitId);
    }
    return null;
  };

  const activeOutfit = getEventForDate(selectedDate);

  const handleWearOutfit = () => {
    if (selectedOutfitId) {
      onAddEvent(selectedDate, selectedOutfitId);
      setSelectedOutfitId("");
    }
  };

  const handleUnwearOutfit = () => {
    onRemoveEvent(selectedDate);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Upper Panel: Calendar Monthly Grid */}
      <div className="bg-surface border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        {/* Title Bar */}
        <div className="bg-primary text-on-primary px-3 py-2 flex justify-between items-center border-b-4 border-primary">
          <div className="font-label-sm text-label-sm uppercase flex items-center space-x-2 font-bold">
            <Calendar size={16} />
            <span>COORDINATION_DIARY_CALENDAR.SYS [코디 다이어리 달력]</span>
          </div>
          <span className="font-label-sm text-xs font-bold bg-surface px-2 py-0.5 text-primary border border-primary uppercase">
            JULY 2026
          </span>
        </div>

        <div className="p-6 md:p-8 dither-bg">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 text-center mb-2 font-label-sm text-xs text-secondary font-bold uppercase">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, idx) => {
              if (cell === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square bg-surface-container-lowest opacity-25 border-2 border-outline-variant"
                  ></div>
                );
              }

              const dateStr = formatDateString(cell);
              const dayOutfit = getEventForDate(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={`day-${cell}`}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square p-1.5 flex flex-col justify-between text-left transition-all border-2 relative cursor-pointer group ${
                    isSelected
                      ? "bg-secondary text-on-secondary-fixed border-on-secondary-fixed scale-[0.98] shadow-none"
                      : "bg-surface-container-low text-on-surface border-primary hover:border-secondary shadow-[3px_3px_0_0_#000]"
                  }`}
                >
                  <span className="font-label-sm text-xs font-bold leading-none">{cell}</span>
                  
                  {/* Outfit indicator icon */}
                  {dayOutfit && (
                    <div className="absolute right-1 bottom-1 w-5 h-5 bg-primary border border-black flex items-center justify-center text-[10px] shadow-[1px_1px_0_0_#000] rounded-none animate-pulse">
                      👚
                    </div>
                  )}

                  {/* Little dot under schedule */}
                  {dayOutfit && (
                    <div className="w-1.5 h-1.5 bg-secondary-container absolute top-1 right-1"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lower Panel: Daily Details Inspector */}
      <div className="bg-surface border-4 border-secondary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        {/* Title Bar */}
        <div className="bg-secondary text-on-secondary-fixed px-3 py-2 flex justify-between items-center border-b-4 border-secondary">
          <div className="font-label-sm text-label-sm uppercase flex items-center space-x-2 font-bold">
            <span className="material-symbols-outlined text-[16px]">event_note</span>
            <span>DIARY INSPECTOR: {selectedDate} [일기 검사기]</span>
          </div>
          <span className="font-label-sm text-[10px] text-on-secondary-fixed bg-secondary-fixed border border-on-secondary-fixed px-1.5 py-0.5 uppercase font-bold">
            READ_ONLY
          </span>
        </div>

        <div className="p-6 md:p-8 bg-surface bg-notebook grid grid-cols-1 md:grid-cols-12 gap-8">
          {activeOutfit ? (
            /* Has an outfit scheduled */
            <>
              {/* Left detail Column */}
              <div className="md:col-span-5 space-y-4">
                <div className="bg-surface-container-low border-2 border-primary p-4 relative shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <h3 className="font-label-sm text-xs text-primary uppercase mb-3 border-b border-dashed border-outline-variant pb-1.5 font-bold">
                    🌤️ SCHEDULED COORDINATE
                  </h3>

                  {/* Selection tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="bg-surface-container-highest border border-outline px-1.5 py-0.5 font-label-sm text-[9px] text-on-surface uppercase">
                      Weather: {activeOutfit.weather}
                    </span>
                    <span className="bg-surface-container-highest border border-outline px-1.5 py-0.5 font-label-sm text-[9px] text-on-surface uppercase">
                      Dest: {activeOutfit.destination}
                    </span>
                    <span className="bg-surface-container-highest border border-outline px-1.5 py-0.5 font-label-sm text-[9px] text-on-surface uppercase">
                      Sit: {activeOutfit.situation}
                    </span>
                  </div>

                  {/* Clothing visual matrix */}
                  <div className="grid grid-cols-3 gap-2">
                    {activeOutfit.items.top && (
                      <div className="bg-surface p-1 border border-outline-variant text-center">
                        <div className="aspect-square bg-surface-container-low flex items-center justify-center p-0.5 border border-primary mb-1">
                          <img src={activeOutfit.items.top.imageUrl} alt="Top" className="max-h-full max-w-full object-contain" />
                        </div>
                        <p className="font-label-sm text-[8px] text-primary uppercase font-bold truncate">TOP</p>
                      </div>
                    )}
                    {activeOutfit.items.bottom && (
                      <div className="bg-surface p-1 border border-outline-variant text-center">
                        <div className="aspect-square bg-surface-container-low flex items-center justify-center p-0.5 border border-primary mb-1">
                          <img src={activeOutfit.items.bottom.imageUrl} alt="Bottom" className="max-h-full max-w-full object-contain" />
                        </div>
                        <p className="font-label-sm text-[8px] text-primary uppercase font-bold truncate">BOTTOM</p>
                      </div>
                    )}
                    {activeOutfit.items.shoes && (
                      <div className="bg-surface p-1 border border-outline-variant text-center">
                        <div className="aspect-square bg-surface-container-low flex items-center justify-center p-0.5 border border-primary mb-1">
                          <img src={activeOutfit.items.shoes.imageUrl} alt="Shoes" className="max-h-full max-w-full object-contain" />
                        </div>
                        <p className="font-label-sm text-[8px] text-primary uppercase font-bold truncate">SHOES</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancel event button */}
                <button
                  onClick={handleUnwearOutfit}
                  className="w-full py-3 bg-error text-on-error font-headline-md text-xs uppercase font-bold tracking-wider border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>일정에서 해제하기 (UNWEAR COORD)</span>
                </button>
              </div>

              {/* Right Stylist Log Column */}
              <div className="md:col-span-7 flex flex-col justify-between bg-[#150529] border-2 border-secondary-container p-5 shadow-[inset_0_0_10px_rgba(0,238,252,0.1)]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-outline-variant font-bold font-label-sm">
                    <CheckCircle size={14} className="text-secondary" />
                    <span>STYLING LOG PRESET COMPILER</span>
                  </div>
                  <p className="font-body-md text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                    {activeOutfit.stylistNote}
                  </p>
                </div>

                <div className="pt-4 border-t border-dashed border-outline-variant font-label-sm text-[10px] text-on-surface-variant flex justify-between">
                  <span>LOG TIME: {new Date(activeOutfit.savedAt).toLocaleTimeString()}</span>
                  <span className="text-secondary uppercase font-bold">PROTOCOL ENGAGED</span>
                </div>
              </div>
            </>
          ) : (
            /* No outfit scheduled for selected day */
            <div className="md:col-span-12 flex flex-col items-center justify-center py-10 text-center space-y-4">
              <AlertTriangle className="text-primary animate-bounce" size={40} />
              <h4 className="font-headline-md text-lg text-primary uppercase font-bold">
                No Outfit Scheduled for This Date
              </h4>
              <p className="font-body-md text-sm text-on-surface-variant max-w-lg">
                이 날짜에는 기록된 코디가 없습니다. 아래의 리스트에서 내가 저장했던 코디 세트를 선택해 달력에 일기를 기록해 보세요!
              </p>

              {/* Outfit select drop down */}
              <div className="w-full max-w-sm flex flex-col sm:flex-row gap-3 pt-4">
                {savedStyles.length === 0 ? (
                  <div className="w-full border-2 border-dashed border-outline-variant p-3 font-label-sm text-xs italic text-on-surface-variant bg-surface">
                    [ 저장된 코디 세트가 없습니다. 먼저 코디를 추천받아 저장해 주세요! ]
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedOutfitId}
                      onChange={(e) => setSelectedOutfitId(e.target.value)}
                      className="flex-1 bg-surface border-2 border-primary p-3 font-label-sm text-xs text-on-surface focus:outline-none appearance-none"
                      style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23ecb2ff\' height=\'20\' viewBox=\'0 0 24 24\' width=\'20\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>")', backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat' }}
                    >
                      <option value="">-- SELECT OUTFIT TO WEAR --</option>
                      {savedStyles.map((out) => (
                        <option key={out.id} value={out.id}>
                          {`⛅ ${out.weather} | 📍 ${out.destination} | (${out.items.top?.name || "Top"})`}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleWearOutfit}
                      disabled={!selectedOutfitId}
                      className="px-6 py-3 bg-secondary-container text-on-secondary-container font-headline-md text-xs font-bold uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      WEAR FIT
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
