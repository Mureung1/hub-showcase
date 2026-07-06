import { LocalTwinIntro } from "./components/LocalTwinIntro.jsx";
import { localTwinIntro } from "./data/localTwinIntro.js";

export default function App() {
  return <LocalTwinIntro project={localTwinIntro} />;
}
