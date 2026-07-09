import React from 'react';
import { NotebookPen, Pin, Trash2, Calendar, Smile, AlertCircle } from 'lucide-react';
import { DiaryEntry, ClothesItem } from '../types';

interface DiaryViewProps {
  entries: DiaryEntry[];
  clothes: ClothesItem[];
  onDeleteEntry: (id: string) => void;
}

export default function DiaryView({ entries, clothes, onDeleteEntry }: DiaryViewProps) {
  
  // Helper to find clothes items by id
  const getClothesForEntry = (outfitIds: string[]) => {
    return outfitIds
      .map(id => clothes.find(c => c.id === id))
      .filter((c): c is ClothesItem => c !== undefined);
  };

  return (
    <div className="w-full max-w-[900px] mx-auto mt-6 md:mt-16 px-4 pb-16">
      <div className="bg-white rounded-3xl p-6 md:p-12 border border-stone-200/50 shadow-sm min-h-[900px]">
        
        <div className="mb-8 ml-4 md:ml-10">
          <h1 className="font-serif text-3xl md:text-4xl font-black text-on-background tracking-tight flex items-center gap-2">
            <NotebookPen className="w-8 h-8 text-secondary" />
            나의 스타일 다이어리
          </h1>
          <p className="font-serif text-sm text-stone-500 italic mt-1">
            저장해 두었던 감성적인 코디들과 스토리를 펼쳐보세요.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 ml-4 md:ml-10">
            <AlertCircle className="w-12 h-12 text-secondary-container mb-4" />
            <p className="font-serif text-lg font-bold text-stone-600">아직 저장된 다이어리가 없어요.</p>
            <p className="text-xs text-stone-400 mt-2 max-w-xs">
              "Today's Look" 탭에서 코디를 추천받은 후 "이 코디 다이어리에 저장" 버튼을 눌러보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-10 ml-4 md:ml-10">
            {entries.map((entry, index) => {
              const matchedClothes = getClothesForEntry(entry.outfitIds);
              // Alternate subtle tilt directions
              const tiltClass = index % 2 === 0 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]';

              return (
                <div
                  key={entry.id}
                  className={`bg-secondary-container/10 p-6 md:p-8 rounded-2xl border-2 border-dashed border-secondary/20 relative transition-transform duration-300 hover:rotate-0 hover:scale-[1.01] shadow-xs ${tiltClass}`}
                >
                  {/* Pushpin decorative */}
                  <Pin className="w-6 h-6 absolute -top-3.5 right-6 text-secondary fill-secondary/80 transform rotate-12" />

                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-secondary/10 pb-4 mb-5">
                    <div>
                      <span className="flex items-center gap-1.5 text-xs text-stone-400 font-bold tracking-wide uppercase">
                        <Calendar className="w-3.5 h-3.5 text-secondary" />
                        {entry.date}
                      </span>
                      <h3 className="font-serif text-xl md:text-2xl font-black text-secondary mt-1">
                        {entry.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-full transition-colors self-start"
                      title="다이어리 삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Outfit Preview Polaroids inside the diary memo */}
                  <div className="flex flex-wrap gap-4 mb-5">
                    {matchedClothes.map(item => (
                      <div
                        key={item.id}
                        className="bg-white p-2 rounded-lg border border-stone-100 shadow-xxs flex items-center gap-3 pr-4"
                      >
                        <div className="w-12 h-12 overflow-hidden rounded-md bg-stone-50 border border-stone-100 flex-shrink-0">
                          <img
                            alt={item.name}
                            className="w-full h-full object-cover"
                            src={item.image}
                          />
                        </div>
                        <div>
                          <p className="font-serif text-xs font-bold text-on-background truncate max-w-[120px]">
                            {item.name}
                          </p>
                          <span className="text-[9px] bg-secondary-container/30 text-secondary font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block">
                            {item.category === 'top' ? '상의' : item.category === 'bottom' ? '하의' : item.category === 'outer' ? '아우터' : '악세서리'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Description Handwritten text */}
                  <p className="font-serif text-md text-stone-700 leading-relaxed font-semibold italic">
                    {entry.recommendationText}
                  </p>

                  {/* Small mood sticker bottom right */}
                  {entry.mood && (
                    <div className="absolute -bottom-3.5 right-6 bg-white border border-secondary-container px-3 py-1 rounded-full text-[10px] font-bold text-secondary shadow-xs">
                      ✨ {entry.mood}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
