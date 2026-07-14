import { Link } from 'react-router-dom';

function CommandCard({ command }) {
    return (
        <Link to={`/commands/${command.id}`} className="command-card">
            <div className="command-card-top">
                <span className="command-card-name">{command.name}</span>
            </div>
            <p className="command-card-summary">{command.summary}</p>
        </Link>
    );
}

export default CommandCard;
