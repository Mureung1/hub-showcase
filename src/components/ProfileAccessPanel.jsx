export default function ProfileAccessPanel() {
  function moveToAccount() {
    globalThis.document?.getElementById("account-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="profile-access-panel" id="profile-form" aria-labelledby="profile-access-title">
      <p className="eyebrow">Profile</p>
      <h2 id="profile-access-title">프로필은 계정에 저장됩니다</h2>
      <p>로그인하면 학교, 전공, 활동 가능 지역을 계정별로 안전하게 저장하고 맞춤 판정에 사용할 수 있습니다.</p>
      <button className="primary-button" type="button" onClick={moveToAccount}>로그인 또는 회원가입</button>
    </section>
  );
}