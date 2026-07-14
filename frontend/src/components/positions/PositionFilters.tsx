"use client";
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";

const FILTERS = ["전체", "백엔드", "프론트엔드", "데이터", "적합도 60% 이상"];

export function PositionFilters({ onChange }: { onChange?: (f: string) => void }) {
  const [active, setActive] = useState("전체");

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <Chip
          key={f}
          active={active === f}
          onClick={() => {
            setActive(f);
            onChange?.(f);
          }}
        >
          {f}
        </Chip>
      ))}
    </div>
  );
}
