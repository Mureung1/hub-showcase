import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HospitalSearchPage } from "./pages/HospitalSearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HospitalSearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
