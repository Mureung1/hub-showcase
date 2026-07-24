import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TerminalFrame from './components/TerminalFrame';
import CategoryHomePage from './pages/CategoryHomePage';
import CommandListPage from './pages/CommandListPage';
import CommandDetailPage from './pages/CommandDetailPage';
import ScenarioHomePage from './pages/ScenarioHomePage';
import ScenarioDetailPage from './pages/ScenarioDetailPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<TerminalFrame />}>
                    <Route path="/" element={<CategoryHomePage />} />
                    <Route path="/commands/:id" element={<CommandDetailPage />} />
                    {/* /:category 캐치올보다 먼저 와야 함 — 안 그러면 /scenarios가
                        CommandListPage에 category="scenarios"로 잘못 매칭된다. */}
                    <Route path="/scenarios" element={<ScenarioHomePage />} />
                    <Route path="/scenarios/:id" element={<ScenarioDetailPage />} />
                    <Route path="/:category" element={<CommandListPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
