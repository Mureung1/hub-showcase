import React, { useState, useRef } from "react";
import { ClothingItem, CategoryType } from "../types";
import { TEMPLATE_PRESETS, TemplatePreset } from "../data/presets";
import { Upload, Plus, Trash2, X, Search, Filter, Sparkles, Check } from "lucide-react";

interface ClosetTabProps {
  closet: ClothingItem[];
  onAddItem: (item: ClothingItem) => void;
  onDeleteItem: (id: string) => void;
}

export default function ClosetTab({ closet, onAddItem, onDeleteItem }: ClosetTabProps) {
  // Add item form state
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<CategoryType>("top");
  const [colorInput, setColorInput] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | CategoryType>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read uploaded file as base64
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Image files only (.png, .jpg, .gif)!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrl(e.target.result as string);
        setErrorMsg("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Add color tag
  const handleAddColor = () => {
    const trimmed = colorInput.trim();
    if (trimmed && !colors.includes(trimmed)) {
      setColors([...colors, trimmed]);
      setColorInput("");
    }
  };

  const handleRemoveColor = (colorToRemove: string) => {
    setColors(colors.filter(c => c !== colorToRemove));
  };

  // Pre-fill from standard template preset
  const handleSelectPreset = (preset: TemplatePreset) => {
    setItemName(preset.name);
    setCategory(preset.category);
    setColors([...preset.colors]);
    setImageUrl(preset.imageUrl);
    setSuccessMsg(`Loaded preset: ${preset.name}!`);
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  // Submit new item
  const handleRegisterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setErrorMsg("Item name is required!");
      return;
    }
    if (!imageUrl) {
      setErrorMsg("Please upload an image, enter a URL, or pick a preset template!");
      return;
    }

    const newItem: ClothingItem = {
      id: "item-" + Date.now(),
      name: itemName.trim(),
      category: category,
      colors: colors.length > 0 ? colors : ["Custom"],
      imageUrl: imageUrl,
      isCustom: true
    };

    onAddItem(newItem);

    // Reset Form
    setItemName("");
    setCategory("top");
    setColors([]);
    setImageUrl("");
    setColorInput("");
    setErrorMsg("");
    setSuccessMsg("UPLOAD SEQUENCE SUCCESSFUL! Added to your closet.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Filter closet list
  const filteredCloset = closet.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.colors.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = selectedFilter === "all" || item.category === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Upper Panel: Log New Item */}
      <div className="bg-surface border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative flex flex-col">
        {/* Title Bar */}
        <div className="bg-primary text-on-primary px-3 py-2 flex justify-between items-center border-b-4 border-primary">
          <div className="font-label-sm text-label-sm uppercase flex items-center space-x-2 font-bold">
            <span className="material-symbols-outlined text-[16px]">file_upload</span>
            <span>LOG NEW ITEM (아이템 등록)</span>
          </div>
          <div className="flex space-x-1">
            <div className="w-3.5 h-3.5 bg-surface border-2 border-on-primary"></div>
            <div className="w-3.5 h-3.5 bg-surface border-2 border-on-primary"></div>
            <div className="w-3.5 h-3.5 bg-error border-2 border-on-primary"></div>
          </div>
        </div>

        {/* Form Grid */}
        <div className="p-6 md:p-8 bg-surface bg-notebook grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Image Area */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container-lowest border-2 border-dashed border-primary p-4 relative">
              <h3 className="font-label-sm text-label-sm text-secondary uppercase mb-3 border-b border-dashed border-outline-variant pb-1">
                IMAGE_UPLOAD.EXE
              </h3>

              {/* Drag Drop Field */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-[1/1] border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? "border-secondary bg-surface-container-high scale-[0.98]"
                    : "border-outline-variant bg-surface-container hover:bg-surface-container-low"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {imageUrl ? (
                  <div className="w-full h-full relative flex items-center justify-center p-2">
                    <img
                      src={imageUrl}
                      alt="Uploaded Clothing"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl("");
                      }}
                      className="absolute top-2 right-2 bg-error text-on-error p-1 rounded-none border border-black shadow-[2px_2px_0_0_#000] hover:scale-105"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="mx-auto text-primary animate-bounce" size={32} />
                    <div>
                      <p className="font-label-sm text-on-background text-sm font-bold">DRAG & DROP IMAGE HERE</p>
                      <p className="font-label-sm text-xs text-on-surface-variant mt-1">[ SUPPORTED: JPG, PNG, GIF ]</p>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1 bg-primary text-on-primary font-label-sm text-xs border border-black shadow-[2px_2px_0_0_#000]"
                    >
                      BROWSE FILES
                    </button>
                  </div>
                )}
              </div>

              {/* URL Direct Paste */}
              <div className="mt-4 space-y-1">
                <label className="font-label-sm text-xs text-tertiary block uppercase">Or paste image hotlink URL:</label>
                <input
                  type="text"
                  value={imageUrl.startsWith("data:") ? "" : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/pixel-jacket.png"
                  className="w-full bg-surface border-2 border-outline p-2 font-label-sm text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Template Presets shelf */}
            <div className="border-2 border-outline-variant bg-surface-container-low p-4">
              <h4 className="font-label-sm text-xs text-tertiary uppercase mb-3 flex items-center gap-1.5 font-bold">
                <Sparkles size={12} className="text-secondary" />
                <span>8비트 프리셋 템플릿 (Template Shelf)</span>
              </h4>
              <p className="font-body-md text-xs text-on-surface-variant mb-3">
                이미지가 없을 경우 아래의 귀여운 픽셀 아이템 중 하나를 클릭해 보세요!
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="flex items-center gap-2 p-1.5 bg-surface-container border border-outline hover:border-secondary hover:bg-surface-container-high text-left transition-colors"
                  >
                    <div className="w-8 h-8 bg-surface-container-lowest shrink-0 overflow-hidden border border-primary flex items-center justify-center p-0.5">
                      <img src={preset.imageUrl} alt={preset.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-label-sm text-[10px] text-secondary uppercase truncate font-bold">{preset.category}</p>
                      <p className="font-body-md text-[11px] text-on-surface truncate font-bold leading-tight">{preset.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Metadata Entries */}
          <form onSubmit={handleRegisterItem} className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-5 bg-surface-container-lowest border-2 border-outline-variant p-5">
              <h3 className="font-label-sm text-label-sm text-secondary uppercase border-b border-dashed border-outline-variant pb-1 mb-2">
                METADATA_ENTRY.SYS
              </h3>

              {/* Error & Success Messages */}
              {errorMsg && (
                <div className="bg-error-container text-on-error-container border-2 border-error p-3 font-label-sm text-xs">
                  &gt; ERROR: {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-surface-container-high text-secondary-container border-2 border-secondary-container p-3 font-label-sm text-xs">
                  &gt; SYSTEM: {successMsg}
                </div>
              )}

              {/* Item Name */}
              <div className="space-y-1">
                <label className="font-label-sm text-xs text-tertiary uppercase flex items-center gap-1">
                  <span>D__ ITEM NAME</span>
                  <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Neo Cyber Bomber, Hologram Kicks..."
                  className="w-full bg-surface border-2 border-primary p-3 font-label-sm text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="font-label-sm text-xs text-tertiary uppercase">CATEGORY 분류</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryType)}
                  className="w-full bg-surface border-2 border-primary p-3 font-label-sm text-sm text-on-surface focus:outline-none focus:border-secondary appearance-none cursor-pointer"
                  style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23ecb2ff\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>")', backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat' }}
                >
                  <option value="top">TOP [상의]</option>
                  <option value="bottom">BOTTOM [하의]</option>
                  <option value="shoes">SHOES [신발]</option>
                  <option value="accessories">ACCESSORIES [악세서리]</option>
                </select>
              </div>

              {/* Color tag input */}
              <div className="space-y-1">
                <label className="font-label-sm text-xs text-tertiary uppercase">COLOR TAGS 색상 태그</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddColor();
                      }
                    }}
                    placeholder="e.g. Neon Pink, Black..."
                    className="flex-1 bg-surface border-2 border-primary p-2.5 font-label-sm text-xs text-on-surface focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="bg-primary text-on-primary px-4 border-2 border-on-primary-fixed shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] active:translate-x-[2px]"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Color list chips */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {colors.length === 0 ? (
                    <span className="font-label-sm text-[11px] text-on-surface-variant italic">[No tags added yet]</span>
                  ) : (
                    colors.map((c) => (
                      <span
                        key={c}
                        className="flex items-center gap-1.5 bg-surface-container-high border border-primary px-2 py-0.5 font-label-sm text-[10px] text-primary"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => handleRemoveColor(c)}
                          className="hover:text-error"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Submit Sequence Button */}
            <button
              type="submit"
              className="w-full py-4 bg-secondary-container hover:brightness-110 text-on-secondary-container font-headline-md text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase tracking-widest font-bold flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              <span>INITIALIZE UPLOAD SEQUENCE</span>
            </button>
          </form>
        </div>
      </div>

      {/* Lower Panel: My Closet Records */}
      <div className="bg-surface border-4 border-secondary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        {/* Title Bar */}
        <div className="bg-secondary text-on-secondary-fixed px-3 py-2 flex justify-between items-center border-b-4 border-secondary">
          <div className="font-label-sm text-label-sm uppercase flex items-center space-x-2 font-bold">
            <span className="material-symbols-outlined text-[16px]">checkroom</span>
            <span>CLOSET LOG RECORDS (등록된 나의 옷 목록)</span>
          </div>
          <span className="font-label-sm text-xs font-bold bg-surface px-2 py-0.5 text-secondary border border-secondary">
            TOTAL: {closet.length} ITEMS
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-surface-container p-4 border-b-2 border-outline-variant flex flex-col sm:flex-row gap-4 justify-between items-center">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-outline-variant" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or color..."
              className="w-full bg-surface border border-outline pl-9 pr-4 py-2 font-label-sm text-xs text-on-surface focus:outline-none focus:border-secondary"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            {(["all", "top", "bottom", "shoes", "accessories"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFilter(f)}
                className={`px-3 py-1.5 font-label-sm text-xs uppercase transition-all ${
                  selectedFilter === f
                    ? "bg-secondary text-on-secondary-fixed border-2 border-on-secondary-fixed shadow-[2px_2px_0_0_#000]"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Grid */}
        <div className="p-6 md:p-8 dither-bg min-h-[300px]">
          {filteredCloset.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-outline-variant animate-pulse">checkroom</span>
              <p className="font-headline-md text-xl text-secondary uppercase tracking-wider">No Clothes Registered in Database</p>
              <p className="font-body-md text-sm text-on-surface-variant max-w-md">
                필터를 조정하거나 위의 LOG NEW ITEM 패널에서 새로운 옷을 업로드하여 나만의 옷장을 채워보세요!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filteredCloset.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-container-low border-2 border-primary hover:border-secondary shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all flex flex-col group"
                >
                  {/* Card Image Wrapper */}
                  <div className="aspect-[1/1] bg-surface-container-lowest p-3 border-b-2 border-dashed border-outline-variant flex items-center justify-center relative overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Category sticker overlay */}
                    <span className="absolute top-2 left-2 bg-surface text-secondary border border-secondary px-1.5 py-0.5 font-label-sm text-[8px] uppercase tracking-wider font-bold">
                      {item.category}
                    </span>

                    {/* Delete action overlay */}
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="absolute top-2 right-2 bg-error text-on-error p-1.5 border border-black shadow-[2px_2px_0_0_#000] opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 active:scale-95"
                      title="Delete Item"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-body-md text-sm text-on-surface font-bold line-clamp-1 group-hover:text-primary transition-colors">
                        {item.name}
                      </h4>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {item.colors.map((col) => (
                        <span
                          key={col}
                          className="bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 border border-outline-variant font-label-sm text-[9px]"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
