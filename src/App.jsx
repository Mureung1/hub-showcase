import "./App.css";
import Header from "./components/Header";
import { useNavigation } from "./navigation";
import ActivityPage from "./pages/ActivityPage";
import GroupBuysPage from "./pages/GroupBuysPage";
import GroupBuyDetailPage from "./pages/GroupBuyDetailPage";
import HomePage from "./pages/HomePage";
import PickupPage from "./pages/PickupPage";

const pages = { "/": HomePage, "/group-buys": GroupBuysPage, "/activity": ActivityPage, "/pickup": PickupPage };

function App() {
  const { pathname, navigate } = useNavigation();
  const detailId = pathname.startsWith("/group-buys/") ? pathname.split("/").at(-1) : null;
  const Page = detailId ? GroupBuyDetailPage : pages[pathname] ?? HomePage;
  return <div className="app-shell"><Header activePath={detailId ? "/group-buys" : pathname} onNavigate={navigate} /><Page groupBuyId={detailId} onNavigate={navigate} /></div>;
}

export default App;
