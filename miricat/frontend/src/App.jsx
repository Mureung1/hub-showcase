import RouteRegister from "./components/RouteRegister";
import SavedRoutes from "./components/SavedRoutes";

export default function App() {
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 24px" }}>
      <h1>미리캣 🐾</h1>
      <RouteRegister />
      <SavedRoutes />
    </div>
  );
}