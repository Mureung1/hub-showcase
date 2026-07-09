import React, { useState } from 'react';
import { Shirt, Trash2, Heart, Plus, Calendar, Tag, Filter } from 'lucide-react';
import { Category, ClothesItem } from '../types';

interface WardrobeViewProps {
  clothes: ClothesItem[];
  onAddClick: () => void;
  onDeleteClothes: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export default function WardrobeView({
  clothes,
  onAddClick,
  onDeleteClothes,
  onToggleFavorite,
}: WardrobeViewProps) {
  const [filter, setFilter] = useState<Category | 'all'>('all');

  const filteredClothes = filter === 'all'
    ? clothes
    : clothes.filter(c => c.category === filter);

  const categories: { id: Category | 'all'; label: string }[] = [
    { id: 'all', label: '전체 보기 🌈' },
    { id: 'top', label: '상의 👕' },
    { id: 'bottom', label: '하의 👖' },
    { id: 'outer', label: '아우터 🧥' },
    { id: 'acc', label: '악세서리 🎒' },
  ];

  return (
    <div className="w-full max-w-[900px] mx-auto mt-6 md:mt-16 px-4 pb-16">
      <div className="bg-white rounded-3xl p-6 md:p-12 border border-stone-200/50 shadow-sm min-h-[900px] relative">
        
        {/* Binder accent lines */}
        <div className="absolute top-10 right-10 flex gap-2 opacity-50">
          <div className="w-4 h-4 rounded-full bg-secondary-container"></div>
          <div className="w-4 h-4 rounded-full bg-pink-100"></div>
        </div>

        <div className="mb-8 ml-4 md:ml-10">
          <h1 className="font-serif text-3xl md:text-4xl font-black text-on-background tracking-tight flex items-center gap-2">
            <Shirt className="w-8 h-8 text-secondary" />
            나의 디지털 옷장
          </h1>
          <p className="font-serif text-sm text-stone-500 italic mt-1">
            소중한 옷들을 모아 나만의 스타일 도서관을 꾸며보세요.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="mb-10 ml-4 md:ml-10 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-stone-400 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> 분류:
          </span>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                filter === cat.id
                  ? 'bg-secondary text-white border-secondary shadow-xs scale-105'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-secondary-container'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid of Polaroid clothes */}
        {filteredClothes.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
            <Shirt className="w-16 h-16 text-stone-300 mb-4 animate-bounce" />
            <p className="font-serif text-lg font-bold text-stone-600">이 카테고리에는 옷이 없습니다.</p>
            <p className="text-xs text-stone-400 mt-2 max-w-xs">나의 소중한 의류 아이템 사진을 찍거나 웹 주소를 넣어 채워보세요!</p>
            <button
              onClick={onAddClick}
              className="mt-6 px-5 py-2.5 bg-secondary text-white font-bold text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              첫 의류 업로드하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 ml-4 md:ml-10 items-start">
            
            {/* Direct Upload placeholder inside the grid */}
            <div 
              onClick={onAddClick}
              className="bg-stone-50 border-3 border-dashed border-secondary-container/60 hover:border-secondary rounded-2xl p-6 min-h-[300px] flex flex-col items-center justify-center cursor-pointer hover:bg-pink-50/10 transition-all text-center group"
            >
              <Plus className="w-10 h-10 text-secondary group-hover:scale-110 transition-transform mb-3" />
              <p className="font-serif font-bold text-stone-600 text-sm">새 의류 등록</p>
              <p className="text-[11px] text-stone-400 mt-1 px-4">상의, 하의, 아우터 등 옷장에 새 아이템 추가</p>
            </div>

            {filteredClothes.map((item, index) => {
              // Alternate polaroid rotations slightly for scrapbook realism
              const rotations = ['rotate-1', '-rotate-2', 'rotate-2', '-rotate-1', 'rotate-0'];
              const rotationClass = rotations[index % rotations.length];

              return (
                <div
                  key={item.id}
                  className={`bg-white p-4 polaroid ${rotationClass} hover:rotate-0 hover:scale-[1.03] transition-all duration-300 border border-stone-200/40 relative group w-fit mx-auto`}
                >
                  {/* Miniature tape on top */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-16 h-6 washi-tape opacity-80 z-10 shadow-xxs"></div>

                  {/* Card Actions Hover Overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onToggleFavorite(item.id)}
                      className="p-1.5 bg-white/90 hover:bg-white text-secondary rounded-full shadow-xs hover:scale-110 transition-transform"
                    >
                      <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-secondary text-secondary' : 'text-stone-500'}`} />
                    </button>
                    <button
                      onClick={() => onDeleteClothes(item.id)}
                      className="p-1.5 bg-white/90 hover:bg-red-50 text-red-500 rounded-full shadow-xs hover:scale-110 transition-transform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Image wrapper */}
                  <div className="w-48 h-48 overflow-hidden bg-stone-50 border border-stone-100">
                    <img
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={item.image}
                    />
                  </div>

                  {/* Polaroid text details */}
                  <div className="mt-4 text-center">
                    <h4 className="handwritten text-on-background text-md font-bold truncate max-w-[170px] mx-auto">
                      {item.name}
                    </h4>
                    
                    <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-stone-400">
                      <span className="flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" />
                        {item.tag || '의류'}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {item.dateAdded}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
