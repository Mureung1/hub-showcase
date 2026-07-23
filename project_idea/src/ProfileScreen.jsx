import { useState } from "react";
import { supabase } from "./supabaseClient";

const GENDER_OPTIONS = [
  { value: "male", label: "남" },
  { value: "female", label: "여" },
];

function ProfileScreen({ userId, email, onSaved }) {
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [gender, setGender] = useState(null);
  const [hideGender, setHideGender] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!gender) {
      setError("성별을 선택해주세요.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("users").insert({
      id: userId,
      email,
      name,
      college,
      gender,
      hide_gender: hideGender,
    });

    if (insertError) {
      setError("저장하지 못했어요. 다시 시도해주세요.");
      setSaving(false);
      return;
    }

    onSaved();
  }

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "40px 0 4px" }}>프로필을 알려주세요</h1>
      <p style={{ fontSize: 13, color: "#8A7A76", margin: "0 0 24px" }}>
        동행자에게 보여질 정보예요. 최초 1회만 입력해요.
      </p>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>이름</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(36,21,18,0.12)", fontSize: 14, boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>단과대</div>
        <input
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          placeholder="예: 경영학과"
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(36,21,18,0.12)", fontSize: 14, boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>성별</div>
        <div style={{ display: "flex", gap: 8 }}>
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGender(opt.value)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                border: gender === opt.value ? "none" : "1px solid rgba(36,21,18,0.12)",
                background: gender === opt.value ? "#C8102E" : "#fff",
                color: gender === opt.value ? "#fff" : "#241512",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          border: "1px solid rgba(36,21,18,0.08)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>다른 사람에게 성별 비공개</span>
        <button
          onClick={() => setHideGender(!hideGender)}
          style={{
            width: 40,
            height: 24,
            borderRadius: 999,
            border: "none",
            background: hideGender ? "#C8102E" : "rgba(36,21,18,0.15)",
            position: "relative",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: hideGender ? 19 : 3,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
            }}
          />
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: "#C8102E", margin: "0 0 8px" }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="btn-primary"
        style={{
          width: "100%",
          padding: 15,
          background: "#C8102E",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.7 : 1,
          marginTop: "auto",
        }}
      >
        {saving ? "저장 중..." : "시작하기"}
      </button>
    </div>
  );
}

export default ProfileScreen;
