import { useRef, useState } from "react";

function PhotoQuestion({ onChange }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    onChange(file.name);
  };

  return (
    <div className="flex flex-col items-center gap-md py-lg">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="업로드한 사진 미리보기"
          className="w-40 h-40 object-cover rounded-xl border border-outline-variant"
        />
      ) : (
        <div className="w-40 h-40 rounded-xl bg-surface-container flex items-center justify-center text-outline">
          <span className="material-symbols-outlined text-[40px]">image</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="px-lg py-sm border border-primary text-primary font-bold rounded-lg hover:bg-primary-fixed/20 transition-colors flex items-center gap-xs"
      >
        <span className="material-symbols-outlined text-[18px]">upload</span>
        사진 업로드
      </button>
    </div>
  );
}

export default PhotoQuestion;
