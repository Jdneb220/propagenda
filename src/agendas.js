// Each agenda includes:
// - difficulty: 0.0 (easiest) to 10.0 (hardest)
// - check function returns { ok: boolean, hints?: string[] }

// Game constants for use across codebase
export const SIZES = ["S", "M", "L"];

export const COLORS = [
  { key: "red", label: "Red", value: "#f44336" },
  { key: "orange", label: "Orange", value: "#ff9800" },
  { key: "yellow", label: "Yellow", value: "#ffeb3b" },
  { key: "green", label: "Green", value: "#4caf50" },
  { key: "blue", label: "Blue", value: "#2196f3" },
  { key: "purple", label: "Purple", value: "#9c27b0" },
];

export const EMOJIS = {
  shape: {
    square: "⬜️",
    triangle: "🔺",
    circle: "⭕️",
    star: "⭐️",
  },
  animal: {
    snail: "🐌",
    lion: "🦁",
    fish: "🐟",
    monkey: "🐒",
    dinosaur: "🦕",
  },
  food: {
    drumstick: "🍗",
    taco: "🌮",
    icecream: "🍨",
    salad: "🥗",
  },
};

// Max rounds in the game (will be reduced if fewer agendas exist)
export const MAX_ROUNDS = 10;

// The agenda metadata is in public/agendas.json (loaded at runtime).
// We keep the check implementations here and attach them to loaded agenda metadata by id.

// Helper: check function implementations keyed by agenda id
const CHECKS = {
  "one-small": (objects) => {
    const small = objects.filter((o) => o.size === "S");
    return {
      ok: small.length > 0,
      hints: small.length === 0 ? ["No small items found on the board."] : [],
    };
  },

  "second-column-orange": (objects) => {
    const inSecondCol = objects ? objects.filter((o) => o.col === 1) : [];
    if (inSecondCol.length === 0) {
      return { ok: false, hints: ["There are no items in the second column."] };
    }
    const bad = inSecondCol.filter((o) => o.color !== "orange");
    return {
      ok: bad.length === 0,
      hints: bad.map((b) => `Item at (${b.row + 1},2) is ${b.color}, not orange.`),
    };
  },

  "two-in-fourth": (objects) => {
    const inFourthCol = objects.filter((o) => o.col === 3);
    const total = objects.length;
    const hints = [];
    if (total !== 2) {
      hints.push(`Board has ${total} items, needs exactly 2.`);
    }
    if (inFourthCol.length < 2) {
      hints.push(`Only ${inFourthCol.length} items in fourth column, need 2.`);
    }
    const outside = objects.filter((o) => o.col !== 3);
    if (outside.length > 0) {
      hints.push(`Found items outside fourth column.`);
    }
    return {
      ok: total === 2 && inFourthCol.length === 2,
      hints,
    };
  },

  "all-different": (objects) => {
    // Requirement: among placed objects there should be at least three
    // unique sizes and at least three unique object types (e.g. shape/animal/food).
    const hints = [];
    const requiredUnique = 3;

    if (!objects || objects.length < requiredUnique) {
      return { ok: false, hints: [`Need at least ${requiredUnique} items (currently have ${objects ? objects.length : 0}).`] };
    }

    const uniqueSizes = new Set(objects.map((o) => o.size).filter(Boolean));
    const uniqueTypes = new Set(objects.map((o) => o.type).filter(Boolean));
    const uniqueColors = new Set(objects.map((o) => o.color).filter(Boolean));

    if (uniqueSizes.size < requiredUnique) {
      hints.push(
        `Only ${uniqueSizes.size} unique size(s) present; need at least ${requiredUnique}. Found sizes: ${[...uniqueSizes].join(', ') || 'none'}.`
      );
    }

    if (uniqueTypes.size < requiredUnique) {
      hints.push(
        `Only ${uniqueTypes.size} unique object type(s) present; need at least ${requiredUnique}. Found types: ${[...uniqueTypes].join(', ') || 'none'}.`
      );
    }

    if (uniqueColors.size < requiredUnique) {
      hints.push(
        `Only ${uniqueColors.size} unique color type(s) present; need at least ${requiredUnique}. Found types: ${[...uniqueColors].join(', ') || 'none'}.`
      );
    }

    return { ok: hints.length === 0, hints };
  },

  "one-per-row": (objects) => {
    const hints = [];
    let ok = true;
    for (let r = 0; r < 5; r++) {
      const rowHas = objects.some((o) => o.row === r);
      if (!rowHas) {
        ok = false;
        hints.push(`Row ${r + 1} is empty.`);
      }
    }
    return { ok, hints };
  },

  "snails-purple": (objects) => {
    const snails = objects ? objects.filter((o) => o.type === "animal" && o.name === "snail") : [];
    if (snails.length === 0) {
      return { ok: false, hints: ["I don't see any snails..."] };
    }
    const bad = snails.filter((s) => s.color !== "purple");
    return {
      ok: bad.length === 0,
      hints: bad.length > 0 ? bad.map((b) => `Snail at (${b.row + 1},${b.col + 1}) is ${b.color}, not purple.`) : [],
    };
  },

  "squares-same-column": (objects) => {
    const squares = objects ? objects.filter((o) => o.type === "shape" && o.name === "square") : [];
    if (squares.length < 2) return { ok: false, hints: ["We need more squares to share a column..."] };
    const col = squares[0].col;
    const bad = squares.filter((s) => s.col !== col);
    return {
      ok: bad.length === 0,
      hints: bad.length > 0 ? ["Put all squares in column " + (col + 1)] : [],
    };
  },

  "mysterious": (objects) => {
    const foods = objects.filter((o) => o.type === "food");
    const dinos = objects.filter((o) => o.type === "animal" && o.name === "dinosaur");
    const hints = [];
    let ok = true;
    if (foods.length < 3) {
      ok = false;
      if (foods.length > 0) hints.push("There should be more food on the board…");
    }
    if (dinos.length > 0) {
      ok = false;
      hints.push("Something about dinosaurs seems… unwanted.");
    }
    return { ok, hints };
  },
};

// Load agendas metadata from public/agendas.json at runtime and attach check functions
export async function loadAgendas() {
  try {
    const res = await fetch('/agendas.json');
    if (!res.ok) throw new Error('Failed to fetch agendas.json');
    const meta = await res.json();
    // Attach check functions (if available) to metadata entries
    return meta.map((a) => ({
      ...a,
      check: CHECKS[a.id] || (() => ({ ok: false, hints: ['No check available for this agenda.'] })),
    }));
  } catch (err) {
    console.error('Error loading agendas:', err);
    // Fallback: return empty list
    return [];
  }
}

// Helper to select next agenda based on completion history
export function selectNextAgenda(agendas = [], completedAgendaIds = []) {
  // Stop after MAX_ROUNDS or when all agendas are completed
  const actualMaxRounds = Math.min(MAX_ROUNDS, agendas.length);
  if (completedAgendaIds.length >= actualMaxRounds) return null;

  const remaining = agendas.filter(a => !completedAgendaIds.includes(a.id));
  if (remaining.length === 0) return null;

  // Weight selection based on remaining count:
  // - When many agendas remain, strongly prefer easier ones
  // - As fewer remain, selection becomes more random
  const progress = 1 - (remaining.length / agendas.length);
  
  // Calculate weighted random selection
  // Earlier in the game (progress near 0), we heavily weight toward easy agendas
  // Later in the game (progress near 1), weights become more even
  const weights = remaining.map(agenda => {
    const normalizedDifficulty = agenda.difficulty / 10;
    // Early game: low difficulty gets high weight
    // Late game: weights become more even
    return Math.exp(-(normalizedDifficulty - progress) * 3);
  });

  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return remaining[i];
    }
  }
  
  return remaining[0]; // fallback to first remaining
}