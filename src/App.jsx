import React, { useState, useEffect } from "react";
import "./index.css";
import { selectNextAgenda, MAX_ROUNDS, SIZES, COLORS, EMOJIS, loadAgendas } from "./agendas";
import { VictoryScreen } from "./VictoryScreen";

// --- domain data ------------------------------------------------------------

const GRID_SIZE = 5;

// --- helper to find objects at a position -----------------------------------

function getObjectAt(objects, row, col) {
  return objects.find((o) => o.row === row && o.col === col);
}

// --- main component ---------------------------------------------------------

// --- helpers for random board generation ----------------------------------

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomObjects(roundIndex) {
  // If roundIndex === 0, generate the special initial configuration requested:
  // - at least two snails (one green, one blue)
  // - two squares in different columns
  // - one empty row
  // - two dinosaurs
  // - no food
  if (roundIndex === 0) {
    const objects = [];

    // pick an empty row
    const emptyRow = Math.floor(Math.random() * GRID_SIZE);

    // build all available positions excluding the empty row
    const positions = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (r === emptyRow) continue;
      for (let c = 0; c < GRID_SIZE; c++) positions.push({ row: r, col: c });
    }

    // shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    let i = 0;
    const nextPos = () => positions[i++];

    // place two snails: one green, one blue
    const snail1Pos = nextPos();
    const snail2Pos = nextPos();
    objects.push({
      id: Date.now() + "-snail1",
      type: "animal",
      name: "snail",
      size: pickRandom(SIZES),
      color: "green",
      row: snail1Pos.row,
      col: snail1Pos.col,
    });
    objects.push({
      id: Date.now() + "-snail2",
      type: "animal",
      name: "snail",
      size: pickRandom(SIZES),
      color: "blue",
      row: snail2Pos.row,
      col: snail2Pos.col,
    });

    // place two squares in different columns
    // ensure we pick positions with different cols
    let squarePosA = nextPos();
    let squarePosB = nextPos();
    // if same column, try to find an alternative for B
    if (squarePosA.col === squarePosB.col) {
      for (let k = i; k < positions.length; k++) {
        if (positions[k].col !== squarePosA.col) {
          squarePosB = positions[k];
          // swap used position into current index so it's not reused
          [positions[k], positions[i]] = [positions[i], positions[k]];
          i++;
          break;
        }
      }
    }

    objects.push({
      id: Date.now() + "-sq1",
      type: "shape",
      name: "square",
      size: pickRandom(SIZES),
      color: pickRandom(COLORS.map((c) => c.key)),
      row: squarePosA.row,
      col: squarePosA.col,
    });
    objects.push({
      id: Date.now() + "-sq2",
      type: "shape",
      name: "square",
      size: pickRandom(SIZES),
      color: pickRandom(COLORS.map((c) => c.key)),
      row: squarePosB.row,
      col: squarePosB.col,
    });

    // place two dinosaurs
    const dino1Pos = nextPos();
    const dino2Pos = nextPos();
    objects.push({
      id: Date.now() + "-d1",
      type: "animal",
      name: "dinosaur",
      size: pickRandom(SIZES),
      color: pickRandom(COLORS.map((c) => c.key)),
      row: dino1Pos.row,
      col: dino1Pos.col,
    });
    objects.push({
      id: Date.now() + "-d2",
      type: "animal",
      name: "dinosaur",
      size: pickRandom(SIZES),
      color: pickRandom(COLORS.map((c) => c.key)),
      row: dino2Pos.row,
      col: dino2Pos.col,
    });

    // Done — ensure no food was placed (we only used animal/shape)
    return objects;
  }

  // default random generation (no constraints)
  const min = 4;
  const max = 7;
  const count = Math.floor(Math.random() * (max - min + 1)) + min;

  // build all available positions and shuffle/select
  const positions = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      positions.push({ row: r, col: c });
    }
  }

  // simple shuffle (Fisher-Yates)
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const types = Object.keys(EMOJIS);
  const colorKeys = COLORS.map((c) => c.key);

  const objects = [];
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const pos = positions[i];
    const type = pickRandom(types);
    const names = Object.keys(EMOJIS[type]);
    const name = pickRandom(names);
    const size = pickRandom(SIZES);
    const color = pickRandom(colorKeys);

    objects.push({
      id: Date.now() + "-" + Math.random().toString(36).slice(2) + "-" + i,
      type,
      name,
      size,
      color,
      row: pos.row,
      col: pos.col,
    });
  }

  return objects;
}

function App() {
  const [objects, setObjects] = useState(() => generateRandomObjects(0));
  const [selectedCell, setSelectedCell] = useState(null); // {row, col}
  const [editingObject, setEditingObject] = useState(null); // object id
  const [modalPos, setModalPos] = useState(null); // {x,y}
  const [completedAgendaIds, setCompletedAgendaIds] = useState([]);
  const [agendasList, setAgendasList] = useState([]);
  const [currentAgenda, setCurrentAgenda] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameStats, setGameStats] = useState({
    startTime: Date.now(),
    totalMoves: 0,
    objectsPlaced: 0,
  });

  // handle victory condition (only consider complete when agendas are loaded)
  const actualMaxRounds = Math.min(MAX_ROUNDS, agendasList.length || 0);
  const isGameComplete = !isLoading && agendasList.length > 0 && (!currentAgenda || completedAgendaIds.length >= actualMaxRounds);

  // Load agendas metadata from public/agendas.json on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadAgendas();
      if (!mounted) return;
      setAgendasList(loaded);
      // initialize the first agenda
      setCurrentAgenda(selectNextAgenda(loaded, []));
      setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Update timer for stats
  const [timeTaken, setTimeTaken] = useState("0:00");
  useEffect(() => {
    if (isGameComplete) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - gameStats.startTime) / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setTimeTaken(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameComplete, gameStats.startTime]);

  function handleRestart() {
    setCompletedAgendaIds([]);
    setCurrentAgenda(selectNextAgenda(agendasList, []));
    setObjects(generateRandomObjects(0));
    setGameStats({
      startTime: Date.now(),
      totalMoves: 0,
      objectsPlaced: 0
    });
  }

  const agendaCheck = currentAgenda?.check(objects) || { ok: false, hints: [] };

  function handleCellClick(row, col, e) {
    const x = e?.clientX || null;
    const y = e?.clientY || null;

    const existing = getObjectAt(objects, row, col);

    // If the edit modal is already open for this object's id and the same
    // cell is clicked again, treat it as a Remove action.
    if (editingObject && existing && existing.id === editingObject) {
      handleRemoveObject(existing.id);
      return;
    }

    // Otherwise clear any existing modals and open the appropriate one for
    // the clicked cell (either edit existing object or open place-object).
    setSelectedCell(null);
    setEditingObject(null);
    setModalPos(null);

    if (existing) {
      setEditingObject(existing.id);
      setModalPos({ x, y });
    } else {
      setSelectedCell({ row, col, x, y });
      setModalPos({ x, y });
    }
  }

  function handlePlaceObject(type, name) {
    if (!selectedCell) return;
    const newObj = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2),
      type,
      name,
      size: "M",
      color: "blue",
      row: selectedCell.row,
      col: selectedCell.col,
    };
    setObjects((prev) => [...prev, newObj]);
    setSelectedCell(null);
    setModalPos(null);
    setGameStats(prev => ({
      ...prev,
      totalMoves: prev.totalMoves + 1,
      objectsPlaced: prev.objectsPlaced + 1
    }));
  }

  function handleUpdateObject(id, changes) {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...changes } : o)));
    setGameStats(prev => ({
      ...prev,
      totalMoves: prev.totalMoves + 1
    }));
  }

  function handleRemoveObject(id) {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    setEditingObject(null);
    setModalPos(null);
    setGameStats(prev => ({
      ...prev,
      totalMoves: prev.totalMoves + 1
    }));
  }

  function handleNextRound() {
    // mark current agenda as completed
    setCompletedAgendaIds(prev => [...prev, currentAgenda.id]);
    // select next agenda based on completion history
    const nextAgenda = selectNextAgenda(agendasList, [...completedAgendaIds, currentAgenda.id]);
    setCurrentAgenda(nextAgenda);
    setSelectedCell(null);
    setEditingObject(null);

    // If this was the last agenda, ensure we show the victory screen
    if (!nextAgenda || completedAgendaIds.length + 1 >= Math.min(MAX_ROUNDS, agendasList.length || 0)) {
      setCurrentAgenda(null);
    }
  }

  // Close any open modals
  const handleOutsideClick = () => {
    if (selectedCell || editingObject) {
      setSelectedCell(null);
      setEditingObject(null);
      setModalPos(null);
    }
  };

  return (
    <div className="game-shell" onClick={handleOutsideClick}>
      <header className="game-header">
        <h1>prop.agenda</h1>
        <div className="game-progress">
            <p>
            Agenda {completedAgendaIds.length + 1} of {Math.min(MAX_ROUNDS, agendasList.length || 0)}: {currentAgenda?.title}
            {currentAgenda && (
              <span className="difficulty" title="Agenda difficulty">
                (Difficulty: {currentAgenda.difficulty.toFixed(1)})
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="game-body">
        {isLoading ? (
          <div className="loading">Loading agendas...</div>
        ) : (
          <>
            <Board objects={objects} onCellClick={handleCellClick} />

            <div className="side-panel">
              {!isGameComplete && (
            <>
              <AgendaPanel agenda={currentAgenda} agendaCheck={agendaCheck} />
              {agendaCheck.ok && (
                <button className="next-btn" onClick={handleNextRound}>
                  ✅ Agenda satisfied {completedAgendaIds.length + 1 < Math.min(MAX_ROUNDS, agendasList.length || 0) ? '– Next agenda' : '– Complete Game'}
                </button>
              )}
            </>
          )}
        </div>
        </>
        )}
      </div>

      {isGameComplete && (
        <VictoryScreen
          onRestart={handleRestart}
          stats={{
            totalMoves: gameStats.totalMoves,
            objectsPlaced: gameStats.objectsPlaced,
            timeTaken: timeTaken
          }}
          totalAgendas={Math.min(MAX_ROUNDS, agendasList.length || 0)}
        />
      )}

      {selectedCell && (
        <PlaceObjectModal
          onClose={() => { setSelectedCell(null); setModalPos(null); }}
          onPlace={handlePlaceObject}
          emojis={EMOJIS}
          position={modalPos}
        />
      )}

      {editingObject && (
        <EditObjectModal
          object={objects.find((o) => o.id === editingObject)}
          onClose={() => { setEditingObject(null); setModalPos(null); }}
          onUpdate={handleUpdateObject}
          onRemove={handleRemoveObject}
          position={modalPos}
        />
      )}
    </div>
  );
}

// --- Board ------------------------------------------------------------------

function Board({ objects, onCellClick }) {
  const handleCellClick = (e, row, col) => {
    e.stopPropagation(); // Prevent event from bubbling up to game-shell
    onCellClick(row, col, e);
  };
  
  const rows = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const cells = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const obj = getObjectAt(objects, r, c);
        cells.push(
          <Cell key={c} row={r} col={c} object={obj} onClick={(e) => handleCellClick(e, r, c)} />
        );
      }
    rows.push(
      <div key={r} className="board-row">
        {cells}
      </div>
    );
  }

  return <div className="board">{rows}</div>;
}

function Cell({ object, onClick }) {
  return (
    <div className="cell" onClick={onClick}>
      {object ? <BoardObject object={object} /> : <span className="plus">＋</span>}
    </div>
  );
}

function BoardObject({ object }) {
  const emoji = EMOJIS[object.type][object.name];
  const sizeMap = {
    S: "1.4rem",
    M: "1.8rem",
    L: "2.3rem",
  };
  const colorMap = {
    red: "#f44336",
    orange: "#ff9800",
    yellow: "#ffeb3b",
    green: "#4caf50",
    blue: "#2196f3",
    purple: "#9c27b0",
  };
  return (
    <div
      className="board-object"
      style={{
        fontSize: sizeMap[object.size] || "1.8rem",
        background: colorMap[object.color] || "transparent",
      }}
    >
      {emoji}
    </div>
  );
}

// --- Modals -----------------------------------------------------------------

function PlaceObjectModal({ onClose, onPlace, emojis, position }) {
  const [stage, setStage] = React.useState("category"); // "category" | "item"
  const [chosen, setChosen] = React.useState(null);
  const ref = React.useRef(null);
  const [posStyle, setPosStyle] = React.useState({});

  function pickCategory(cat) {
    setChosen(cat);
    setStage("item");
  }

  function goBack() {
    setStage("category");
    setChosen(null);
  }

  // compute clamped position so modal never goes off-screen
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!position || !el) {
      setPosStyle({});
      return;
    }

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer placing above the click; if not enough space, place below
    const margin = 8;
    let left = position.x - rect.width / 2;
    let top = position.y - rect.height - 12; // above click

    // If above would go off-screen at top, place below the click
    if (top < margin) {
      top = position.y + 12; // below click
    }

    // Clamp horizontally and vertically within viewport
    left = Math.max(margin, Math.min(left, vw - rect.width - margin));
    top = Math.max(margin, Math.min(top, vh - rect.height - margin));

    setPosStyle({ position: "fixed", left: left + "px", top: top + "px" });

    function handleResize() {
      // recompute on resize
      const r = el.getBoundingClientRect();
      let l = position.x - r.width / 2;
      let t = position.y - r.height - 12;
      if (t < margin) t = position.y + 12;
      l = Math.max(margin, Math.min(l, window.innerWidth - r.width - margin));
      t = Math.max(margin, Math.min(t, window.innerHeight - r.height - margin));
      setPosStyle({ position: "fixed", left: l + "px", top: t + "px" });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal small" style={posStyle} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="modal-row">
          <button className="close-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {stage === "category" && (
          <div className="category-grid">
            {Object.entries(emojis).map(([type, items]) => (
              <button key={type} className="emoji-btn" onClick={() => pickCategory(type)} title={type}>
                {Object.values(items)[0]}
              </button>
            ))}
          </div>
        )}

        {stage === "item" && chosen && (
          <div>
            <div className="modal-row">
              <button className="back-btn" onClick={goBack}>◀</button>
            </div>
            <div className="choice-grid">
              {Object.entries(emojis[chosen]).map(([name, emoji]) => (
                <button key={name} className="emoji-btn" onClick={() => onPlace(chosen, name)} title={name}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditObjectModal({ object, onClose, onUpdate, onRemove, position }) {
  if (!object) return null;

  const ref = React.useRef(null);
  const [posStyle, setPosStyle] = React.useState({});

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!position || !el) {
      setPosStyle({});
      return;
    }

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    let left = position.x - rect.width / 2;
    let top = position.y - rect.height - 12;
    if (top < margin) top = position.y + 12;
    left = Math.max(margin, Math.min(left, vw - rect.width - margin));
    top = Math.max(margin, Math.min(top, vh - rect.height - margin));

    setPosStyle({ position: "fixed", left: left + "px", top: top + "px" });

    function handleResize() {
      const r = el.getBoundingClientRect();
      let l = position.x - r.width / 2;
      let t = position.y - r.height - 12;
      if (t < margin) t = position.y + 12;
      l = Math.max(margin, Math.min(l, window.innerWidth - r.width - margin));
      t = Math.max(margin, Math.min(t, window.innerHeight - r.height - margin));
      setPosStyle({ position: "fixed", left: l + "px", top: t + "px" });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal small" style={posStyle} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="modal-row">
          <button className="close-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="edit-brief">
          <div className="emoji-large">{EMOJIS[object.type][object.name]}</div>
          <div className="meta">{object.type} – {object.name}</div>
        </div>

        <label>Size:</label>
        <div className="choice-row">
          {SIZES.map((s) => (
            <button
              key={s}
              className={object.size === s ? "choice-btn active" : "choice-btn"}
              onClick={() => onUpdate(object.id, { size: s })}
            >
              {s}
            </button>
          ))}
        </div>

        <label>Color:</label>
        <div className="choice-row">
          {COLORS.map((c) => (
            <button
              key={c.key}
              className={object.color === c.key ? "color-btn active" : "color-btn"}
              style={{ background: c.value }}
              onClick={() => onUpdate(object.id, { color: c.key })}
              title={c.label}
            />
          ))}
        </div>

        <div className="edit-actions">
          <button className="danger" onClick={() => onRemove(object.id)}>
            Remove
          </button>
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// --- Agenda panel -----------------------------------------------------------

function AgendaPanel({ agenda, agendaCheck }) {
  return (
    <div className="agenda-panel">
      <h2>Agenda</h2>
      <h3>{agenda.title}</h3>
      <p>{agenda.description}</p>
      <p>
        Status:{" "}
        {agendaCheck.ok ? (
          <span className="status-ok">Satisfied ✅</span>
        ) : (
          <span className="status-bad">Not yet ❌</span>
        )}
      </p>
      {!agendaCheck.ok && agendaCheck.hints && agendaCheck.hints.length > 0 && (
        <>
          <h4>Hints:</h4>
          <ul>
            {agendaCheck.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
