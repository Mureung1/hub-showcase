"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Field, TextField } from "@/components/ui/Field";
import { createCredential } from "@/lib/data";
import type { CredentialInput, CredentialType } from "@/lib/types";

const TYPES: { key: CredentialType; label: string }[] = [
    { key: "career", label: "경력" },
    { key: "certificate", label: "자격증" },
    { key: "portfolio", label: "포트폴리오" },
    { key: "company", label: "회사" },
];

type Form = {
    company: string;
    role: string;
    startedOn: string;
    endedOn: string;
    work: string;
    certName: string;
    issuer: string;
    acquiredOn: string;
    portTitle: string;
    portLink: string;
    portDesc: string;
    companyName: string;
    industry: string;
    size: string;
};

const EMPTY: Form = {
    company: "",
    role: "",
    startedOn: "",
    endedOn: "",
    work: "",
    certName: "",
    issuer: "",
    acquiredOn: "",
    portTitle: "",
    portLink: "",
    portDesc: "",
    companyName: "",
    industry: "",
    size: "",
};

/** month input("2023-03") → LocalDate("2023-03-01"). 빈 값이면 null. */
function toDate(month: string): string | null {
    return month ? `${month}-01` : null;
}

/** 화면 입력을 백엔드 SaveRequest(type/title/detail/startedOn/endedOn)로 접는다. */
function toInput(type: CredentialType, f: Form): CredentialInput | null {
    switch (type) {
        case "career":
            if (!f.company.trim()) return null;
            return {
                type,
                title: [f.company, f.role].filter(Boolean).join(" · "),
                detail: f.work,
                startedOn: toDate(f.startedOn),
                endedOn: toDate(f.endedOn),
            };
        case "certificate":
            if (!f.certName.trim()) return null;
            return {
                type,
                title: f.certName,
                detail: f.issuer,
                startedOn: toDate(f.acquiredOn),
                endedOn: null,
            };
        case "portfolio":
            if (!f.portTitle.trim()) return null;
            return {
                type,
                title: f.portTitle,
                detail: [f.portLink, f.portDesc].filter(Boolean).join(" · "),
                startedOn: null,
                endedOn: null,
            };
        case "company":
            if (!f.companyName.trim()) return null;
            return {
                type,
                title: f.companyName,
                detail: [f.industry, f.size].filter(Boolean).join(" · "),
                startedOn: null,
                endedOn: null,
            };
    }
}

/** 디자인.md 5.6 — 유형 칩 + 동적 필드 */
export function CredentialModal({
                                    open,
                                    onClose,
                                    onSaved,
                                }: {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [type, setType] = useState<CredentialType>("career");
    const [form, setForm] = useState<Form>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    function reset() {
        setForm(EMPTY);
        setError(null);
        setType("career");
    }

    async function handleSave() {
        const body = toInput(type, form);
        if (!body) {
            setError("필수 항목을 입력해 주세요.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await createCredential(body);
            reset();
            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            title="이력 추가"
            onClose={() => {
                reset();
                onClose();
            }}
        >
            <div className="mb-4 flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                    <Chip key={t.key} active={type === t.key} onClick={() => setType(t.key)}>
                        {t.label}
                    </Chip>
                ))}
            </div>

            {type === "career" && (
                <>
                    <Field label="회사명" placeholder="예: 카카오페이" value={form.company} onChange={set("company")} />
                    <Field label="직무" placeholder="예: 백엔드 개발자" value={form.role} onChange={set("role")} />
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="시작" type="month" value={form.startedOn} onChange={set("startedOn")} />
                        <Field label="종료" type="month" value={form.endedOn} onChange={set("endedOn")} />
                    </div>
                    <TextField label="한 일" rows={3} placeholder="맡은 일과 성과를 한 줄씩 적어주세요." value={form.work} onChange={set("work")} />
                </>
            )}

            {type === "certificate" && (
                <>
                    <Field label="자격증명" placeholder="예: 정보처리기사" value={form.certName} onChange={set("certName")} />
                    <Field label="발급 기관" placeholder="예: 한국산업인력공단" value={form.issuer} onChange={set("issuer")} />
                    <Field label="취득일" type="month" value={form.acquiredOn} onChange={set("acquiredOn")} />
                </>
            )}

            {type === "portfolio" && (
                <>
                    <Field label="제목" placeholder="예: 실시간 알림 서버" value={form.portTitle} onChange={set("portTitle")} />
                    <Field label="링크" placeholder="https://github.com/..." value={form.portLink} onChange={set("portLink")} />
                    <TextField label="설명" rows={3} placeholder="무엇을 만들었고, 어떤 기술을 썼는지 적어주세요." value={form.portDesc} onChange={set("portDesc")} />
                </>
            )}

            {type === "company" && (
                <>
                    <Field label="회사명" placeholder="예: 카카오페이" value={form.companyName} onChange={set("companyName")} />
                    <Field label="산업" placeholder="예: 핀테크" value={form.industry} onChange={set("industry")} />
                    <Field label="규모" placeholder="예: 500~1000명" value={form.size} onChange={set("size")} />
                </>
            )}

            {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}

            <div className="mt-3 flex justify-end gap-2">
                <Button
                    variant="secondary"
                    onClick={() => {
                        reset();
                        onClose();
                    }}
                >
                    취소
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? "저장 중…" : "이력 저장"}
                </Button>
            </div>
        </Modal>
    );
}