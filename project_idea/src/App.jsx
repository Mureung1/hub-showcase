import { useState } from "react";
import "./App.css";
import StepHeader from "./StepHeader";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import CandidateListScreen from "./CandidateListScreen";
import GroupChatScreen from "./GroupChatScreen";
import RatingScreen from "./RatingScreen";

function App() {
  const [step, setStep] = useState(0);
  const [registration, setRegistration] = useState(null);
  const [joinedCandidate, setJoinedCandidate] = useState(null);

  function handleFinish() {
    setStep(0);
    setRegistration(null);
    setJoinedCandidate(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <StepHeader step={step} />
      {step === 0 && <LoginScreen onLogin={() => setStep(1)} />}
      {step === 1 && (
        <RegisterScreen
          onBack={() => setStep(0)}
          onSubmit={(data) => {
            setRegistration(data);
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <CandidateListScreen
          genderOnly={registration?.genderOnly}
          onBack={() => setStep(1)}
          onJoin={(candidate) => {
            setJoinedCandidate(candidate);
            setStep(3);
          }}
        />
      )}
      {step === 3 && (
        <GroupChatScreen candidate={joinedCandidate} onComplete={() => setStep(4)} />
      )}
      {step === 4 && <RatingScreen candidate={joinedCandidate} onFinish={handleFinish} />}
    </div>
  );
}

export default App;
