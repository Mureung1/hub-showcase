import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TerminalFrame from './components/TerminalFrame';
import CategoryHomePage from './pages/CategoryHomePage';
import CommandListPage from './pages/CommandListPage';
import CommandDetailPage from './pages/CommandDetailPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<TerminalFrame />}>
                    <Route path="/" element={<CategoryHomePage />} />
                    <Route path="/commands/:id" element={<CommandDetailPage />} />
                    <Route path="/:category" element={<CommandListPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
