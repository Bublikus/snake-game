import { useCallback, useEffect, useState, useRef } from "react";
import { InputHandler } from "./handlers/InputHandler";

// Types

type Size = { x: number; y: number };
type Coords = { x: number; y: number };
type Snake = Coords[];
type CellSymbol = (typeof SYMBOLS)[keyof typeof SYMBOLS];
type Cell = { symbol: CellSymbol };
type Row = Cell[];
type Matrix = Row[];
type Config = {
  areaSize?: Size;
  snakeSize?: number;
  onGameEnd?: (food: number) => void;
};
type UseSnakeGame = (config?: Config) => {
  score: number;
  matrix: Matrix;
  restart: () => void;
};

// Constants

const SYMBOLS = {
  empty: " ",
  full: "█",
  top: "▀",
  bottom: "▄",
} as const;

const DEFAULT_MAX_TICK_INTERVAL: number = 200;
const DEFAULT_MIN_TICK_INTERVAL: number = 100;
const DEFAULT_AREA_SIZE: Size = { x: 20, y: 20 };
const DEFAULT_SNAKE_SIZE: number = 2;

// Variables

let snake: Snake = [];
let deltaX: number = 0;
let deltaY: number = 0;
let score: number = 0;
let point: Coords | undefined = undefined;
let pause: boolean = false;
let time: number = 0;
let isGameStarted: boolean = false;
let isEndGame: boolean = false;
let tickInterval: number = DEFAULT_MAX_TICK_INTERVAL;
let startTime: number = 0;

// Hooks

export const useSnakeGame: UseSnakeGame = (config = {}) => {
  const areaSize = config.areaSize ?? DEFAULT_AREA_SIZE;
  const snakeSize = config.snakeSize ?? DEFAULT_SNAKE_SIZE;
  const onGameEnd = config.onGameEnd ?? (() => {});

  const prevMatrixRef = useRef<Matrix>();
  const [matrix, setMatrix] = useState<Matrix>(getMatrix(areaSize));

  const tick = useCallback(() => {
    if (pause || isEndGame) return;
    if (!snake.length) snake = createSnake(snakeSize, areaSize);
    if (!point) point = createPoint(areaSize);

    if ((deltaX || deltaY) && isGameStarted) {
      if (!startTime) startTime = Date.now();
      // reduce tick interval by 1ms every 2 seconds
      if (Date.now() - startTime > 2000) {
        startTime = Date.now();
        tickInterval = Math.max(tickInterval - 1, DEFAULT_MIN_TICK_INTERVAL);
      }
    }

    snake = moveSnake(snake, areaSize);

    checkIsAtePoint(areaSize);
    const isEnd = checkIsEndGame(snake, areaSize);

    if (isEnd) {
      isEndGame = true;

      if (isGameStarted) {
        isGameStarted = false;
        onGameEnd(score);
      }

      return;
    }

    const currMatrix = getMatrix(areaSize);

    if (isSameMatrix(currMatrix, prevMatrixRef.current)) return;

    prevMatrixRef.current = currMatrix;
    setMatrix(currMatrix);
    time++;
  }, []);

  useGameLoop(tick, tickInterval);
  useKeydown();

  return { score, matrix, restart: resetVariables };
};

function useGameLoop(cb: Function, interval: number): void {
  const tickRef = useRef<Function>(cb);
  tickRef.current = cb;

  useEffect(() => {
    const tickId = setInterval(tickRef.current, interval);
    return () => clearInterval(tickId);
  }, [interval]);
}

function useKeydown(): void {
  useEffect(() => {
    const actionHandler = (
      action: "up" | "down" | "left" | "right" | "pause"
    ) => {
      if (!snake.length) return;

      const canGoX = snake[0].x === snake[1].x;
      const canGoY = snake[0].y === snake[1].y;
      const canPause = (deltaX || deltaY) && isGameStarted;

      isGameStarted = true;

      const goUp = () => ((deltaY = -1), (deltaX = 0));
      const goDown = () => ((deltaY = 1), (deltaX = 0));
      const goLeft = () => ((deltaX = -1), (deltaY = 0));
      const goRight = () => ((deltaX = 1), (deltaY = 0));
      const play = () => (pause = false);

      const callback: Record<typeof action, () => void> = {
        up: () => canGoY && (goUp(), play()),
        down: () => canGoY && (goDown(), play()),
        left: () => canGoX && (goLeft(), play()),
        right: () => canGoX && (goRight(), play()),
        pause: () => canPause && (pause = !pause),
      };

      callback[action]?.();
    };

    const controlUp = document.getElementById("control-up");
    const controlDown = document.getElementById("control-down");
    const controlLeft = document.getElementById("control-left");
    const controlRight = document.getElementById("control-right");

    const handleUp = () => actionHandler("up");
    const handleDown = () => actionHandler("down");
    const handleLeft = () => actionHandler("left");
    const handleRight = () => actionHandler("right");

    controlUp?.addEventListener("touchstart", handleUp);
    controlDown?.addEventListener("touchstart", handleDown);
    controlLeft?.addEventListener("touchstart", handleLeft);
    controlRight?.addEventListener("touchstart", handleRight);

    const handler = new InputHandler({
      swipeTickThresholdPX: 10,
    }).handleActions({
      ArrowUp: () => actionHandler("up"),
      ArrowDown: () => actionHandler("down"),
      ArrowLeft: () => actionHandler("left"),
      ArrowRight: () => actionHandler("right"),

      KeyW: () => actionHandler("up"),
      KeyS: () => actionHandler("down"),
      KeyA: () => actionHandler("left"),
      KeyD: () => actionHandler("right"),

      // swipeUp: () => actionHandler("up"),
      // swipeDown: () => actionHandler("down"),
      // swipeLeft: () => actionHandler("left"),
      // swipeRight: () => actionHandler("right"),

      // Space: () => actionHandler("pause"),
      // tap: () => actionHandler("pause"),
    });

    return () => {
      handler.destroy();
      controlUp?.removeEventListener("touchstart", handleUp);
      controlDown?.removeEventListener("touchstart", handleDown);
      controlLeft?.removeEventListener("touchstart", handleLeft);
      controlRight?.removeEventListener("touchstart", handleRight);
    }
  }, []);
}

// Helpers

function getMatrix(areaSize: Size): Matrix {
  const rows = getIndexedArray(areaSize.y);
  const cols = getIndexedArray(areaSize.x);

  const matrix = rows.map((y) =>
    cols.map((x) => getMatrixCellForCoords(snake, { x, y }))
  );

  const renderMatrix = getRenderedMatrix(matrix);
  return renderMatrix;
}

function getRenderedMatrix(matrix: Matrix): Matrix {
  return matrix.reduce<Matrix>((acc, row, i, arr) => {
    if (i % 2) return acc;
    const mergedRows = getMergedRows(row, arr[i + 1]);
    acc.push(mergedRows);
    return acc;
  }, []);
}

function getMergedRows(rowA: Row, rowB?: Row): Row {
  return rowA.map((cell, i) => ({
    symbol: getMergedSymbol(cell.symbol, rowB?.[i].symbol),
  }));
}

function getMergedSymbol(smblA?: CellSymbol, smblB?: CellSymbol): CellSymbol {
  const valueToSymbol = {
    [`${SYMBOLS.full}`]: SYMBOLS.full,
    [`${SYMBOLS.full}${SYMBOLS.full}`]: SYMBOLS.full,
    [`${SYMBOLS.full}${SYMBOLS.empty}`]: SYMBOLS.top,
    [`${SYMBOLS.empty}${SYMBOLS.full}`]: SYMBOLS.bottom,
  };
  return valueToSymbol[`${smblA || ""}${smblB || ""}`] ?? SYMBOLS.empty;
}

function getMatrixCellForCoords(snake: Snake, coords: Coords): Cell {
  const isPoint = point?.x === coords.x && point?.y === coords.y && time % 2;
  const isSnake = isSnakeInCoords(snake, coords);
  return {
    symbol: isSnake || isPoint ? SYMBOLS.full : SYMBOLS.empty,
  };
}

function createSnake(snakeSize: number, areaSize: Size): Snake {
  const initCoords = {
    x: Math.floor(areaSize.x / 2),
    y: Math.floor(areaSize.y / 2),
  };
  return getIndexedArray(snakeSize).map(() => initCoords);
}

function moveSnake(snake: Snake, areaSize: Size): Snake {
  const newSnake = [{ ...snake[0] }, ...snake.slice(0, -1)];
  newSnake[0].x += deltaX;
  newSnake[0].y += deltaY;
  return newSnake;
}

function isSnakeInCoords(snake: Coords[], { x, y }: Coords): boolean {
  return snake.some((coords) => coords.x === x && coords.y === y);
}

function createPoint(areaSize: Size): Coords {
  const newPoint = {
    x: Math.floor(Math.random() * areaSize.x),
    y: Math.floor(Math.random() * areaSize.y),
  };
  if (isSnakeInCoords(snake, newPoint)) return createPoint(areaSize);
  return newPoint;
}

function checkIsAtePoint(areaSize: Size): void {
  const isAtePoint = snake[0].x === point?.x && snake[0].y === point?.y;
  if (!isAtePoint) return;

  score++;
  point = createPoint(areaSize);
  snake.push(<Coords>snake.slice().pop());
}

function checkIsEndGame(snake: Snake, areaSize: Size): boolean {
  const { x: headX, y: headY } = snake[0];
  const isGameStarted = !!deltaX || !!deltaY;
  const body = snake.slice(1);
  const isHeadInBody = body.some(({ x, y }) => headX === x && headY === y);

  const isEnd = [
    headX <= -1,
    headY <= -1,
    headX >= areaSize.x,
    headY >= areaSize.y,
    isHeadInBody && isGameStarted,
  ].some(Boolean);

  return isEnd;
}

function resetVariables(): void {
  isGameStarted = false;
  isEndGame = false;
  pause = false;
  snake = [];
  deltaX = 0;
  deltaY = 0;
  score = 0;
  time = 0;
  point = undefined;
  tickInterval = DEFAULT_MAX_TICK_INTERVAL;
  startTime = 0;
}

// Utils

function isSameMatrix(
  matrixA: Matrix | undefined,
  matrixB: Matrix | undefined
): boolean {
  return JSON.stringify(matrixA) === JSON.stringify(matrixB);
}

function getIndexedArray(length: number): number[] {
  return [...Array(length)].map((_, i) => i);
}
