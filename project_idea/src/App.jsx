import { useState, useEffect, useRef } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { API_BASE } from "./apiBase";
import StepHeader from "./StepHeader";
import LoginScreen from "./LoginScreen";
import ProfileScreen from "./ProfileScreen";
import RegisterScreen from "./RegisterScreen";
import CandidateListScreen from "./CandidateListScreen";
import GroupChatScreen from "./GroupChatScreen";
import RatingScreen from "./RatingScreen";

function App() {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [joinedCandidate, setJoinedCandidate] = useState(null);
  const hasResumedRef = useRef(false);

  async function resumeActiveRequest(userId) {
    if (hasResumedRef.current) return;
    hasResumedRef.current = true;

    try {
      const res = await fetch(`${API_BASE}/api/requests/mine/${userId}`);
      const data = await res.json();
      if (!data) {
        setStep((s) => (s === 0 ? 1 : s));
        return;
      }

      const reg = {
        id: data.id,
        userId: data.user_id,
        direction: data.direction,
        departureHub: data.departure_hub_name,
        destHub: data.destination_hub_name,
        time: (data.desired_time ?? "").slice(0, 5),
        arrival: data.arrival_estimate,
        genderOnly: data.gender_only,
      };
      setRegistration(reg);

      if (!data.group_id) {
        setStep(2);
        return;
      }

      const cityHub = reg.direction === "from_school" ? reg.destHub : reg.departureHub;
      const groupRes = await fetch(`${API_BASE}/api/requests/group/${data.group_id}`);
      const members = await groupRes.json();
      const me = Array.isArray(members) ? members.find((m) => m.id === data.id) : null;
      const groupCount = Array.isArray(members) ? members.filter((m) => m.status === "matched").length : 1;

      setJoinedCandidate({
        groupId: data.group_id,
        groupCount,
        myRequestId: data.id,
        pending: me?.status === "pending",
        cityHub,
      });
      setStep(3);
    } catch {
      // 복귀에 실패하면 1단계(이동 등록)부터 다시 시작
      setStep((s) => (s === 0 ? 1 : s));
    }
  }

  useEffect(() => {
    async function handleSession(currentSession) {
      setSession(currentSession);
      if (!currentSession) return;

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (profile) {
        setNeedsProfile(false);
        setMyProfile(profile);
        resumeActiveRequest(currentSession.user.id);
        return;
      }

      // 회원가입 화면에서 미리 입력해둔 프로필이 있으면(이메일 확인 전 임시 저장분), 세션이 생긴 지금 자동으로 저장
      const pendingRaw = localStorage.getItem("ridesplit_pending_profile");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          const effectiveEmail = currentSession.user.email || `guest-${currentSession.user.id}@ridesplit.local`;
          const { data: saved, error: saveError } = await supabase
            .from("users")
            .upsert({ id: currentSession.user.id, email: effectiveEmail, ...pending })
            .select()
            .single();
          localStorage.removeItem("ridesplit_pending_profile");
          if (!saveError) {
            setNeedsProfile(false);
            setMyProfile(saved);
            resumeActiveRequest(currentSession.user.id);
            return;
          }
        } catch {
          localStorage.removeItem("ridesplit_pending_profile");
        }
      }

      setNeedsProfile(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  function updateJoinedCandidate(patch) {
    setJoinedCandidate((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function handleFinish() {
    await supabase.auth.signOut();
    hasResumedRef.current = false;
    setStep(0);
    setNeedsProfile(false);
    setViewingProfile(false);
    setRegistration(null);
    setJoinedCandidate(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <StepHeader
        step={step}
        avatarUrl={myProfile?.avatar_url}
        onProfileClick={session && !needsProfile ? () => setViewingProfile(true) : null}
      />
      {session && needsProfile ? (
        <ProfileScreen
          userId={session.user.id}
          email={session.user.email}
          onSaved={(saved) => {
            setMyProfile({ id: session.user.id, email: session.user.email, ...saved });
            setNeedsProfile(false);
            setStep(1);
          }}
        />
      ) : viewingProfile ? (
        <ProfileScreen
          userId={session.user.id}
          email={session.user.email}
          existingProfile={myProfile}
          onBack={() => setViewingProfile(false)}
          onLogout={handleFinish}
          onSaved={(saved) => {
            setMyProfile((prev) => ({ ...prev, ...saved }));
            setViewingProfile(false);
          }}
        />
      ) : (
        <>
      {step === 0 && <LoginScreen />}
      {step === 1 && (
        <RegisterScreen
          userId={session?.user?.id}
          onSubmit={(data) => {
            setRegistration(data);
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <CandidateListScreen
          myRequest={registration}
          myProfile={myProfile}
          existingJoin={joinedCandidate}
          onBack={() => setStep(1)}
          onJoin={(candidate) => {
            setJoinedCandidate(candidate);
            setStep(3);
          }}
        />
      )}
      {step === 3 && (
        <GroupChatScreen
          candidate={joinedCandidate}
          onBack={() => setStep(2)}
          onComplete={() => setStep(4)}
          onUpdateCandidate={updateJoinedCandidate}
          onLeave={() => {
            setJoinedCandidate(null);
            setStep(2);
          }}
        />
      )}
      {step === 4 && <RatingScreen candidate={joinedCandidate} onBack={() => setStep(3)} onFinish={handleFinish} />}
        </>
      )}
    </div>
  );
}

export default App;
