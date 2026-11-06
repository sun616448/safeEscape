// Maze generation and movement for the Path Finder game.
// Mazes are seeded by level number, so a level is the same every time it's played.

export type Dir = "up" | "down" | "left" | "right";

/** Each cell is a bitmask of the sides that are OPEN (no wall). */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

const STEP: Record<Dir, { bit: number; back: number; dx: number; dy: number }> = {
  up: { bit: N, back: S, dx: 0, dy: -1 },
  down: { bit: S, back: N, dx: 0, dy: 1 },
  left: { bit: W, back: E, dx: -1, dy: 0 },
  right: { bit: E, back: W, dx: 1, dy: 0 },
};

export interface Maze {
  cols: number;
  rows: number;
  cells: Uint8Array;
}

export interface Point {
  x: number;
  y: number;
}

/** Level 1 is 5×5; each level adds a row and column, up to 20×20. */
export function levelSize(level: number): number {
  return Math.min(4 + level, 20);
}

export function mazeForLevel(level: number): Maze {
  const size = levelSize(level);
  return generateMaze(size, size, level * 7919 + 17);
}

// Small seeded PRNG (mulberry32).
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Recursive-backtracker maze (iterative, so large mazes don't blow the stack). */
export function generateMaze(cols: number, rows: number, seed: number): Maze {
  const cells = new Uint8Array(cols * rows);
  const visited = new Uint8Array(cols * rows);
  const rand = rng(seed);
  const stack: number[] = [0];
  visited[0] = 1;

  while (stack.length) {
    const i = stack[stack.length - 1];
    const x = i % cols;
    const y = Math.floor(i / cols);
    const options: { dir: Dir; j: number }[] = [];
    for (const dir of Object.keys(STEP) as Dir[]) {
      const nx = x + STEP[dir].dx;
      const ny = y + STEP[dir].dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = ny * cols + nx;
      if (!visited[j]) options.push({ dir, j });
    }
    if (!options.length) {
      stack.pop();
      continue;
    }
    const { dir, j } = options[Math.floor(rand() * options.length)];
    cells[i] |= STEP[dir].bit;
    cells[j] |= STEP[dir].back;
    visited[j] = 1;
    stack.push(j);
  }

  return { cols, rows, cells };
}

export function goalOf(maze: Maze): Point {
  return { x: maze.cols - 1, y: maze.rows - 1 };
}

export function canMove(maze: Maze, p: Point, dir: Dir): boolean {
  return (maze.cells[p.y * maze.cols + p.x] & STEP[dir].bit) !== 0;
}

/**
 * Moves in `dir` and keeps going down the corridor until a wall, a side branch,
 * or the goal. One swipe per corridor keeps big mazes playable on a phone.
 */
export function run(maze: Maze, from: Point, dir: Dir): Point[] {
  const goal = goalOf(maze);
  const { dx, dy } = STEP[dir];
  const side: Dir[] = dx === 0 ? ["left", "right"] : ["up", "down"];
  const path: Point[] = [];
  let p = from;

  while (canMove(maze, p, dir)) {
    p = { x: p.x + dx, y: p.y + dy };
    path.push(p);
    if (p.x === goal.x && p.y === goal.y) break;
    if (side.some((d) => canMove(maze, p, d))) break;
  }
  return path;
}

/** SVG path data for every wall, in cell units (one cell = 1×1). */
export function wallPath(maze: Maze): string {
  const { cols, rows, cells } = maze;
  let d = `M0 0H${cols}V${rows}H0Z`;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = cells[y * cols + x];
      if (x < cols - 1 && !(c & E)) d += `M${x + 1} ${y}V${y + 1}`;
      if (y < rows - 1 && !(c & S)) d += `M${x} ${y + 1}H${x + 1}`;
    }
  }
  return d;
}
