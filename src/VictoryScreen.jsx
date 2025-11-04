import "./VictoryScreen.css";
import { MAX_ROUNDS, agendas } from "./agendas";

export const VictoryScreen = ({ onRestart, stats = {} }) => {
  const actualMaxRounds = Math.min(MAX_ROUNDS, agendas.length);
  
  return (
    <div className="victory-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="victory-modal">
        <h1>🎉 Congratulations! 🎉</h1>
        <p>You've completed all {actualMaxRounds} agendas!</p>
        
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-value">{stats.totalMoves || 0}</div>
            <div className="stat-label">Moves Made</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.objectsPlaced || 0}</div>
            <div className="stat-label">Objects Placed</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {stats.timeTaken
                ? (typeof stats.timeTaken === 'string'
                    ? stats.timeTaken
                    : `${Math.floor(stats.timeTaken / 1000)}s`)
                : '0s'}
            </div>
            <div className="stat-label">Time</div>
          </div>
        </div>

        <button className="restart-btn" onClick={onRestart}>
          Play Again
        </button>
      </div>
    </div>
  );
}