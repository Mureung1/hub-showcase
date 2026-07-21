import "./App.css";
import { useEffect, useState } from "react";
import Header from "./components/Header";
import { useNavigation } from "./navigation";
import ActivityPage from "./pages/ActivityPage";
import GroupBuysPage from "./pages/GroupBuysPage";
import GroupBuyDetailPage from "./pages/GroupBuyDetailPage";
import HomePage from "./pages/HomePage";
import PickupPage from "./pages/PickupPage";
import LoginPage from "./pages/LoginPage";
import { getMe } from "./services/groupBuysApi";

const pages = { "/": HomePage, "/group-buys": GroupBuysPage, "/activity": ActivityPage, "/pickup": PickupPage };

function App() {
  const { pathname, navigate } = useNavigation();
  const [user, setUser] = useState(null);
  useEffect(() => { if (localStorage.getItem("campus-cart-token")) getMe().then(setUser).catch(() => localStorage.removeItem("campus-cart-token")); }, []);
  function loggedIn(result) { localStorage.setItem("campus-cart-token", result.accessToken); setUser(result.user); }
  function logout() { localStorage.removeItem("campus-cart-token"); setUser(null); navigate("/"); }
  const detailId = pathname.startsWith("/group-buys/") ? pathname.split("/").at(-1) : null;
  const Page = pathname === "/login" ? LoginPage : detailId ? GroupBuyDetailPage : pages[pathname] ?? HomePage;
  return <div className="app-shell"><Header activePath={detailId ? "/group-buys" : pathname} onNavigate={navigate} onLogout={logout} user={user} /><Page groupBuyId={detailId} onLogin={loggedIn} onNavigate={navigate} user={user} /></div>;
}

export default App;
