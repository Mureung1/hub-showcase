import { useState } from "react";
import { supabase } from "./supabaseClient";

const GENDER_OPTIONS = [
  { value: "male", label: "남" },
  { value: "female", label: "여" },
];

function ProfileScreen({ userId, email, existingProfile, onSaved, onBack }) {
  const isEdit = !!existingProfile;
  const [name, setName] = useState(existingProfile?.name ?? "");
  const [college, setCollege] = useState(existingProfile?.college ?? "");
  const [gender, setGender] = useState(existingProfile?.gender ?? null);
  const [hideGender, setHideGender] = useState(existingProfile?.hide_gender ?? false);
  const [avatarUrl, setAvatarUrl] = useState(existingProfile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState("");
  const isGuest = !email;

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("사진 업로드에 실패했어요.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // 같은 경로로 덮어써도 브라우저가 이전 사진을 캐시하지 않도록 매번 다른 쿼리스트링을 붙임
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!gender) {
      setError("성별을 선택해주세요.");
      return;
    }
    if (password && password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    setSaving(true);
    setError(null);

    // 게스트(익명) 로그인은 이메일이 없어서, users.email의 NOT NULL + UNIQUE 제약을 만족시킬 대체 값을 씀
    const effectiveEmail = email || `guest-${userId}@ridesplit.local`;

    const { error: saveError } = await supabase.from("users").upsert({
      id: userId,
      email: effectiveEmail,
      name,
      college,
      gender,
      hide_gender: hideGender,
      avatar_url: avatarUrl,
    });

    if (saveError) {
      setError("저장하지 못했어요. 다시 시도해주세요.");
      setSaving(false);
      return;
    }

    if (password) {
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) {
        setError("프로필은 저장됐지만 비밀번호 설정에는 실패했어요.");
        setSaving(false);
        return;
      }
      setPassword("");
    }

    onSaved({ name, college, gender, hide_gender: hideGender, avatar_url: avatarUrl });
  }

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ alignSelf: "flex-start", border: "none", background: "none", color: "#8A7A76", fontSize: 13, padding: "14px 0", cursor: "pointer" }}
        >
          ‹ 이전
        </button>
      )}

      <h1 style={{ fontSize: 20, fontWeight: 800, margin: onBack ? "10px 0 4px" : "40px 0 4px" }}>
        {isEdit ? "내 프로필" : "프로필을 알려주세요"}
      </h1>
      <p style={{ fontSize: 13, color: "#8A7A76", margin: "0 0 24px" }}>
        {isEdit ? "동행자에게 보여지는 정보예요." : "동행자에게 보여질 정보예요. 최초 1회만 입력해요."}
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <label style={{ position: "relative", cursor: "pointer" }}>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} style={{ display: "none" }} />
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", opacity: uploading ? 0.5 : 1 }}
            />
          ) : (
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: "#EFE7E3",
                color: "#8A7A76",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 700,
                opacity: uploading ? 0.5 : 1,
              }}
            >
              {name ? name[0] : "+"}
            </div>
          )}
          <span
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#C8102E",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              border: "2px solid #FBF5F1",
            }}
          >
            {uploading ? "…" : "✎"}
          </span>
        </label>
      </div>

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

      {!isGuest && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>
            비밀번호 설정 (선택)
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="다음부터 이메일 인증 없이 빠르게 로그인해요"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(36,21,18,0.12)", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
      )}

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
        disabled={saving || uploading}
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
        {saving ? "저장 중..." : isEdit ? "저장하기" : "시작하기"}
      </button>
    </div>
  );
}

export default ProfileScreen;
