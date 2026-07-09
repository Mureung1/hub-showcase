import { useApp } from '../context/AppContext';

const TABS = [
  { id: 'tab-home', ico: '🏠', label: '홈', screen: 'home' },
  { id: 'tab-fridge', ico: '🧊', label: '냉장고', screen: 'fridge' },
  { id: 'tab-recipe', ico: '🍳', label: '레시피', screen: 'recipe-list' },
  { id: 'tab-shop', ico: '🛒', label: '장보기', screen: 'shopping-sets' },
  { id: 'tab-etc', ico: '⚙️', label: '기타', screen: 'etc-menu' },
];

export default function BottomTabBar() {
  const { activeTab, tab } = useApp();
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button key={t.id} className={activeTab === t.id ? 'on' : ''} onClick={() => tab(t.screen)}>
          <span className="ico">{t.ico}</span>{t.label}
        </button>
      ))}
    </nav>
  );
}
