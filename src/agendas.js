// Each agenda includes:
// - difficulty: 0.0 (easiest) to 10.0 (hardest)
// - check function returns { ok: boolean, hints?: string[] }

// Max rounds in the game (will be reduced if fewer agendas exist)
export const MAX_ROUNDS = 10;

export const agendas = [
  {
    id: "one-small",
    title: "Tiny One",
    description: "An item on the board must be small.",
    difficulty: 2.0,
    check: (objects) => {
      const small = objects.filter(o => o.size === "S");
      return {
        ok: small.length > 0,
        hints: small.length === 0 ? ["No small items found on the board."] : []
      };
    },
  },
  {
    id: "second-column-orange",
    title: "Orange Avenue",
    description: "All items in the second column must be orange.",
    difficulty: 4.0,
    check: (objects) => {
      const inSecondCol = objects.filter(o => o.col === 1);
      const bad = inSecondCol.filter(o => o.color !== "orange");
      return {
        ok: bad.length === 0,
        hints: bad.map(b => `Item at (${b.row + 1},2) is ${b.color}, not orange.`)
      };
    },
  },
  {
    id: "two-in-fourth",
    title: "Fourth Column Duo",
    description: "Have exactly two items on the board, both in the fourth column.",
    difficulty: 4.0,
    check: (objects) => {
      const inFourthCol = objects.filter(o => o.col === 3);
      const total = objects.length;
      const hints = [];
      
      if (total !== 2) {
        hints.push(`Board has ${total} items, needs exactly 2.`);
      }
      if (inFourthCol.length < 2) {
        hints.push(`Only ${inFourthCol.length} items in fourth column, need 2.`);
      }
      const outside = objects.filter(o => o.col !== 3);
      if (outside.length > 0) {
        hints.push(`Found items outside fourth column.`);
      }

      return {
        ok: total === 2 && inFourthCol.length === 2,
        hints
      };
    },
  },
  {
    id: "all-different",
    title: "Variety Show",
    description: "Have at least 3 items, all with different shapes, sizes, and categories.",
    difficulty: 7.0,
    check: (objects) => {
      if (objects.length < 3) {
        return {
          ok: false,
          hints: ["Need at least 3 items (currently have " + objects.length + ")."]
        };
      }

      const shapes = new Set(objects.filter(o => o.type === "shape").map(o => o.name));
      const sizes = new Set(objects.map(o => o.size));
      const categories = new Set(objects.map(o => o.type));

      // Check if any items share properties
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const a = objects[i];
          const b = objects[j];
          const hints = [];
          
          if (a.type === b.type && a.name === b.name) {
            hints.push(`Items at (${a.row + 1},${a.col + 1}) and (${b.row + 1},${b.col + 1}) share the same shape/category.`);
          }
          if (a.size === b.size) {
            hints.push(`Items at (${a.row + 1},${a.col + 1}) and (${b.row + 1},${b.col + 1}) are both size ${a.size}.`);
          }
          
          if (hints.length > 0) {
            return { ok: false, hints };
          }
        }
      }

      return { ok: true, hints: [] };
    },
  },
  {
    id: "one-per-row",
    title: "Every row has something",
    description: "Place at least one object on every row.",
    difficulty: 2.0,
    check: (objects) => {
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
  },
  {
    id: "snails-purple",
    title: "All snails are purple",
    description: "Every 🐌 on the board must have color = purple.",
    difficulty: 4.0,
    check: (objects) => {
      const snails = objects.filter(
        (o) => o.type === "animal" && o.name === "snail"
      );
      const bad = snails.filter((s) => s.color !== "purple");
      return {
        ok: bad.length === 0,
        hints:
          bad.length > 0
            ? bad.map(
                (b) =>
                  `Snail at (${b.row + 1},${b.col + 1}) is ${b.color}, not purple.`
              )
            : [],
      };
    },
  },
  {
    id: "squares-same-column",
    title: "All squares are in the same column",
    description: "Every ⬜️ must share the same column.",
    difficulty: 6.0,
    check: (objects) => {
      const squares = objects.filter(
        (o) => o.type === "shape" && o.name === "square"
      );
      if (squares.length <= 1) return { ok: true, hints: [] };
      const col = squares[0].col;
      const bad = squares.filter((s) => s.col !== col);
      return {
        ok: bad.length === 0,
        hints:
          bad.length > 0
            ? ["Put all squares in column " + (col + 1)]
            : [],
      };
    },
  },
  {
    id: "mysterious",
    title: "Unknown agenda (discover by playing)",
    description:
      "Parts of this agenda will reveal when you accidentally satisfy them.",
    difficulty: 8.0,
    check: (objects) => {
      // We'll define 2 mini-goals:
      // 1) At least 3 foods on the board
      // 2) No dinosaurs
      const foods = objects.filter((o) => o.type === "food");
      const dinos = objects.filter(
        (o) => o.type === "animal" && o.name === "dinosaur"
      );
      const hints = [];
      let ok = true;

      if (foods.length < 3) {
        ok = false;
        // only reveal this hint if they have at least 1 food (progressive reveal)
        if (foods.length > 0) {
          hints.push("There should be more food on the board…");
        }
      }

      if (dinos.length > 0) {
        ok = false;
        hints.push("Something about dinosaurs seems… unwanted.");
      }

      return { ok, hints };
    },
  },
];

// Helper to select next agenda based on completion history
export function selectNextAgenda(completedAgendaIds = []) {
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