import { AppProvider, useApp } from './context/AppContext';
import RoughenFilter from './components/RoughenFilter';
import PhoneFrame from './components/PhoneFrame';
import BottomTabBar from './components/BottomTabBar';
import IngredientSheet from './components/IngredientSheet';
import TipSheet from './components/TipSheet';

import Home from './pages/Home';
import Fridge from './pages/Fridge';
import AddItem from './pages/AddItem';
import ReceiptCamera from './pages/ReceiptCamera';
import ReceiptResult from './pages/ReceiptResult';
import ExpiryCheck from './pages/ExpiryCheck';
import RecipeList from './pages/RecipeList';
import RecipeDetail from './pages/RecipeDetail';
import Cooking from './pages/Cooking';
import CookDone from './pages/CookDone';
import ShoppingSets from './pages/ShoppingSets';
import ShoppingList from './pages/ShoppingList';
import EtcMenu from './pages/EtcMenu';
import ExpiryAlerts from './pages/ExpiryAlerts';
import MealPlanPicker from './pages/MealPlanPicker';
import MealPlan from './pages/MealPlan';
import MealShoppingList from './pages/MealShoppingList';
import Prices from './pages/Prices';
import ServingSizeSetting from './pages/ServingSizeSetting';

const SCREENS = {
  home: Home,
  fridge: Fridge,
  'add-item': AddItem,
  'receipt-camera': ReceiptCamera,
  'receipt-result': ReceiptResult,
  'expiry-check': ExpiryCheck,
  'recipe-list': RecipeList,
  'recipe-detail': RecipeDetail,
  cooking: Cooking,
  'cook-done': CookDone,
  'shopping-sets': ShoppingSets,
  'shopping-list': ShoppingList,
  'etc-menu': EtcMenu,
  'expiry-alerts': ExpiryAlerts,
  'meal-plan-picker': MealPlanPicker,
  'meal-plan': MealPlan,
  'meal-shopping-list': MealShoppingList,
  prices: Prices,
  'serving-size-setting': ServingSizeSetting,
};

function Screen() {
  const { screen } = useApp();
  const Current = SCREENS[screen] || Home;
  return <Current />;
}

export default function App() {
  return (
    <AppProvider>
      <RoughenFilter />
      <PhoneFrame>
        <Screen />
        <IngredientSheet />
        <TipSheet />
        <BottomTabBar />
      </PhoneFrame>
    </AppProvider>
  );
}
