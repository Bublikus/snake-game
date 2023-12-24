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
  tickInterval?: number;
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

const DEFAULT_TICK_INTERVAL: number = 120;
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

// Hooks

export const useSnakeGame: UseSnakeGame = (config = {}) => {
  const areaSize = config.areaSize ?? DEFAULT_AREA_SIZE;
  const snakeSize = config.snakeSize ?? DEFAULT_SNAKE_SIZE;
  const onGameEnd = config.onGameEnd ?? (() => {});
  const tickInterval = config.tickInterval ?? DEFAULT_TICK_INTERVAL;

  const prevMatrixRef = useRef<Matrix>();
  const [matrix, setMatrix] = useState<Matrix>(getMatrix(areaSize));

  const tick = useCallback(() => {
    if (pause || isEndGame) return;
    if (!snake.length) snake = createSnake(snakeSize, areaSize);
    if (!point) point = createPoint(areaSize);

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
  useEffect(() => {
    const tickId = setInterval(cb, interval);
    return () => clearInterval(tickId);
  }, [cb, interval]);
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

    const handler = new InputHandler({
      swipeTickThresholdPX: 10,
    }).handleActions({
      ArrowUp: () => actionHandler("up"),
      ArrowDown: () => actionHandler("down"),
      ArrowLeft: () => actionHandler("left"),
      ArrowRight: () => actionHandler("right"),
      Space: () => actionHandler("pause"),

      swipeUp: () => actionHandler("up"),
      swipeDown: () => actionHandler("down"),
      swipeLeft: () => actionHandler("left"),
      swipeRight: () => actionHandler("right"),
      tap: () => actionHandler("pause"),
    });

    return () => handler.destroy();
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
  snake = [];
  deltaX = 0;
  deltaY = 0;
  score = 0;
  time = 0;
  point = undefined;
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
