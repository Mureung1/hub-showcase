import { Outlet } from 'react-router-dom';

function TerminalFrame() {
    return (
        <div className="terminal-frame">
            <div className="terminal-titlebar">
                <span className="terminal-dot red" aria-hidden="true" />
                <span className="terminal-dot yellow" aria-hidden="true" />
                <span className="terminal-dot green" aria-hidden="true" />
                <span className="terminal-titlebar-text">student@cs-dict: ~</span>
            </div>
            <div className="terminal-body">
                <Outlet />
            </div>
        </div>
    );
}

export default TerminalFrame;
