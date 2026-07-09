import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { Category, ClothesItem } from '../types';

interface UploadModalProps {
  onClose: () => void;
  onAdd: (item: ClothesItem) => void;
}

export default function UploadModal({ onClose, onAdd }: UploadModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('top');
  const [imageUrl, setImageUrl] = useState('');
  const [tag, setTag] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewImage(event.target.result as string);
        setImageUrl(''); // Clear text url if file is selected
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = previewImage || imageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=500&q=80';
    const finalName = name.trim() || '새 옷';

    const newItem: ClothesItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: finalName,
      image: finalImage,
      category,
      tag: tag.trim() || undefined,
      dateAdded: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      isFavorite: false,
    };

    onAdd(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-secondary-container relative animate-[fadeIn_0.2s_ease-out]">
        
        {/* Washi Tape Accent on Modal Top */}
        <div className="w-32 h-8 washi-tape absolute -top-3 left-1/2 -translate-x-1/2 rotate-1 z-10 opacity-90 shadow-sm pointer-events-none"></div>

        <div className="p-6 pt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-serif text-2xl font-bold text-secondary">나의 옷장 업로드</h3>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-secondary-container/30 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-primary" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Clothes Name */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">옷 이름</label>
              <input
                type="text"
                required
                placeholder="예: 격자무늬 체크 셔츠, 베이비 핑크 가디건"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-secondary-container/60 rounded-xl focus:border-secondary focus:outline-none bg-pink-50/10 text-on-background font-serif"
              />
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">카테고리</label>
              <div className="grid grid-cols-4 gap-2">
                {(['top', 'bottom', 'outer', 'acc'] as const).map((cat) => {
                  const labels: Record<Category, string> = {
                    top: '상의',
                    bottom: '하의',
                    outer: '아우터',
                    acc: '악세서리'
                  };
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 rounded-xl border-2 transition-all font-semibold text-sm ${
                        category === cat
                          ? 'border-secondary bg-secondary-container text-on-secondary-container shadow-xs'
                          : 'border-secondary-container/40 hover:border-secondary-container/80 text-primary bg-white'
                      }`}
                    >
                      {labels[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Tag */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">스타일 태그 / 무드</label>
              <input
                type="text"
                placeholder="예: 캐주얼, 빈티지, 러블리, 프렌치시크"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-4 py-2 border-2 border-secondary-container/60 rounded-xl focus:border-secondary focus:outline-none bg-pink-50/10 text-on-background text-sm"
              />
            </div>

            {/* Image Selector / Uploader */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">사진 업로드</label>
              
              {/* Drag and Drop Container */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-3 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                  isDragging
                    ? 'border-secondary bg-secondary-container/20 scale-[0.99]'
                    : previewImage
                    ? 'border-secondary-container bg-white'
                    : 'border-secondary-container/60 hover:border-secondary bg-pink-50/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {previewImage ? (
                  <div className="relative w-full h-28 flex justify-center items-center">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="max-h-full rounded-lg object-contain border border-secondary-container"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(null);
                      }}
                      className="absolute top-0 right-1/2 translate-x-12 bg-secondary text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-secondary mb-2 animate-bounce" />
                    <p className="text-xs font-semibold text-on-background">이미지를 끌어다 놓거나 클릭하여 업로드</p>
                    <p className="text-[10px] text-primary/70 mt-1">PNG, JPG, GIF 지원</p>
                  </>
                )}
              </div>

              {/* Or URL input */}
              {!previewImage && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] bg-secondary-container/50 flex-grow"></div>
                    <span className="text-[10px] text-primary/60 font-semibold uppercase">또는 웹 이미지 링크</span>
                    <div className="h-[1px] bg-secondary-container/50 flex-grow"></div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-secondary-container/30 px-2 flex items-center justify-center rounded-lg border border-secondary-container">
                      <ImageIcon className="w-4 h-4 text-secondary" />
                    </span>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-secondary-container/60 rounded-lg focus:border-secondary focus:outline-none text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-3 rounded-xl border border-secondary-container/80 text-primary font-bold hover:bg-secondary-container/20 active:scale-95 transition-all text-sm"
              >
                취소
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-xl bg-secondary text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm text-sm"
              >
                옷장에 넣기 🎀
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
