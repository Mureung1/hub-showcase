import React, { useState } from 'react';
import { BookOpen, Pin, Image as ImageIcon, Heart, Plus, Trash2, Quote } from 'lucide-react';

interface PostItNote {
  id: string;
  text: string;
  color: string; // Tailwind bg class
  rotation: string;
}

const DEFAULT_POSTITS: PostItNote[] = [
  { id: '1', text: '포근한 니트와 연청 데님 조합은 언제나 옳다! 가장 클래식하면서 사랑스러운 가을 코디 🧸🍂', color: 'bg-yellow-100 border-yellow-200 text-yellow-800', rotation: '-rotate-2' },
  { id: '2', text: '프렌치 시크의 핵심: 무심한 듯 시크하게. 레이스 리본 디테일 하나로 페미닌함 더하기 🎀🕶️', color: 'bg-pink-100 border-pink-200 text-pink-800', rotation: 'rotate-3' },
  { id: '3', text: '비 오는 날엔 차분한 브라운 / 베이지 톤으로 성숙하고 아늑한 분위기 연출해 보기 ☔☕', color: 'bg-blue-100 border-blue-200 text-blue-800', rotation: '-rotate-1' },
];

const INSPIRATIONS = [
  {
    image: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=500&q=80',
    title: 'Warm Palette',
    subtitle: 'Nude & Beige styling inspiration'
  },
  {
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=500&q=80',
    title: 'Modern Retro',
    subtitle: 'Vibrant cardigans & checks'
  },
];

export default function InspirationView() {
  const [postIts, setPostIts] = useState<PostItNote[]>(DEFAULT_POSTITS);
  const [newNote, setNewNote] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-yellow-100 border-yellow-200 text-yellow-800');

  const colorOptions = [
    { value: 'bg-yellow-100 border-yellow-200 text-yellow-800', label: '노랑 💛' },
    { value: 'bg-pink-100 border-pink-200 text-pink-800', label: '핑크 💖' },
    { value: 'bg-blue-100 border-blue-200 text-blue-800', label: '블루 💙' },
    { value: 'bg-emerald-100 border-emerald-200 text-emerald-800', label: '그린 💚' },
  ];

  const handleAddPostIt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const rotClasses = ['rotate-1', '-rotate-2', 'rotate-2', '-rotate-1', 'rotate-3', '-rotate-3'];
    const randomRotation = rotClasses[Math.floor(Math.random() * rotClasses.length)];

    const note: PostItNote = {
      id: Math.random().toString(36).substring(2, 9),
      text: newNote.trim(),
      color: selectedColor,
      rotation: randomRotation
    };

    setPostIts([...postIts, note]);
    setNewNote('');
  };

  const handleDeletePostIt = (id: string) => {
    setPostIts(postIts.filter(n => n.id !== id));
  };

  return (
    <div className="w-full max-w-[900px] mx-auto mt-6 md:mt-16 px-4 pb-16">
      <div className="bg-white rounded-3xl p-6 md:p-12 border border-stone-200/50 shadow-sm min-h-[900px] relative">
        
        {/* Binder details */}
        <div className="absolute top-10 left-10 flex gap-1 select-none pointer-events-none opacity-10">
          <Quote className="w-24 h-24 text-secondary" />
        </div>

        <div className="mb-8 ml-4 md:ml-10 relative z-10">
          <h1 className="font-serif text-3xl md:text-4xl font-black text-on-background tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-secondary" />
            스타일 인스퍼레이션
          </h1>
          <p className="font-serif text-sm text-stone-500 italic mt-1">
            멋진 패션 조각들과 아이디어들로 나만의 스타일 감성을 확장해 보세요.
          </p>
        </div>

        {/* Board grid splits into Post-its section and Image Clippings section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 ml-4 md:ml-10 mt-10">
          
          {/* Left Column: Interactive Post-its */}
          <div className="space-y-6">
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/60">
              <h3 className="text-sm font-bold text-on-background mb-3 flex items-center gap-1.5">
                📌 아이디어 메모 보드
              </h3>
              <form onSubmit={handleAddPostIt} className="space-y-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="새로운 패션 영감이나 입고 싶은 스타일을 적어보세요..."
                  rows={3}
                  className="w-full p-3 text-xs border border-stone-200 focus:outline-none focus:border-secondary rounded-xl bg-white font-medium"
                ></textarea>
                
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {colorOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedColor(option.value)}
                        className={`text-[10px] px-2 py-1 rounded-md border font-semibold ${
                          selectedColor === option.value
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-secondary-container'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-secondary text-white font-bold text-xs rounded-lg hover:opacity-95 active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    붙이기
                  </button>
                </div>
              </form>
            </div>

            {/* Render Post-its */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {postIts.map(note => (
                <div
                  key={note.id}
                  className={`p-5 rounded-lg border shadow-xs relative hover:scale-105 hover:rotate-0 transition-transform ${note.color} ${note.rotation}`}
                >
                  <Pin className="w-4 h-4 absolute -top-2 left-1/2 -translate-x-1/2 text-stone-500 fill-stone-400" />
                  
                  <button
                    onClick={() => handleDeletePostIt(note.id)}
                    className="absolute top-2 right-2 opacity-0 hover:opacity-100 group-hover:opacity-100 text-stone-400 hover:text-red-500 p-0.5 rounded transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  <p className="font-serif text-xs font-semibold leading-relaxed">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Aesthetic Clippings */}
          <div className="space-y-10">
            <h3 className="text-sm font-bold text-on-background flex items-center gap-1.5 ml-4">
              ✨ 시즌 스타일 클리핑
            </h3>

            <div className="space-y-8">
              {INSPIRATIONS.map((ins, idx) => {
                const tilts = ['rotate-1', '-rotate-2'];
                const tapeColors = ['washi-tape', 'bg-blue-100/80'];
                return (
                  <div
                    key={idx}
                    className={`bg-white p-4 polaroid border border-stone-200/40 relative w-fit mx-auto ${tilts[idx % tilts.length]}`}
                  >
                    {/* Tape holding clipping */}
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-6 opacity-85 z-10 shadow-xxs ${tapeColors[idx % tapeColors.length]}`}></div>
                    
                    <div className="w-64 h-64 overflow-hidden bg-stone-50 border border-stone-100">
                      <img
                        alt={ins.title}
                        className="w-full h-full object-cover"
                        src={ins.image}
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <span className="font-serif text-sm font-black text-secondary uppercase tracking-widest">{ins.title}</span>
                      <p className="text-[10px] text-stone-400 mt-1 font-serif font-semibold italic">{ins.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
