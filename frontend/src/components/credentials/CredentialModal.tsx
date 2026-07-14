"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Field, TextField } from "@/components/ui/Field";
import type { CredentialType } from "@/lib/types";

const TYPES: { key: CredentialType; label: string }[] = [
  { key: "career", label: "경력" },
  { key: "certificate", label: "자격증" },
  { key: "portfolio", label: "포트폴리오" },
  { key: "company", label: "회사" },
];

/** 디자인.md 5.6 — 유형 칩 + 동적 필드 */
export function CredentialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<CredentialType>("career");

  return (
    <Modal open={open} title="이력 추가" onClose={onClose}>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <Chip key={t.key} active={type === t.key} onClick={() => setType(t.key)}>
            {t.label}
          </Chip>
        ))}
      </div>

      {type === "career" && (
        <>
          <Field label="회사명" placeholder="예: 카카오페이" />
          <Field label="직무" placeholder="예: 백엔드 개발자" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작" type="month" />
            <Field label="종료" type="month" />
          </div>
          <TextField label="한 일" rows={3} placeholder="맡은 일과 성과를 한 줄씩 적어주세요." />
        </>
      )}

      {type === "certificate" && (
        <>
          <Field label="자격증명" placeholder="예: 정보처리기사" />
          <Field label="발급 기관" placeholder="예: 한국산업인력공단" />
          <Field label="취득일" type="month" />
        </>
      )}

      {type === "portfolio" && (
        <>
          <Field label="제목" placeholder="예: 실시간 알림 서버" />
          <Field label="링크" placeholder="https://github.com/..." />
          <TextField label="설명" rows={3} placeholder="무엇을 만들었고, 어떤 기술을 썼는지 적어주세요." />
        </>
      )}

      {type === "company" && (
        <>
          <Field label="회사명" placeholder="예: 카카오페이" />
          <Field label="산업" placeholder="예: 핀테크" />
          <Field label="규모" placeholder="예: 500~1000명" />
        </>
      )}

      <div className="mt-1 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          취소
        </Button>
        <Button onClick={onClose}>이력 저장</Button>
      </div>
    </Modal>
  );
}
