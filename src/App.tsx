import React, { useState, useEffect } from "react";
import { useSnakeGame } from "./useSnakeGame";
// @ts-ignore
import bgImg from "./bg.jpg";
import "./style.css";

const isTouch = "touchstart" in window || navigator.maxTouchPoints;

export default function App() {
  const { matrix, score } = useSnakeGame();
  const [loading, setLoading] = useState(true);

  // Fun stuff
  // React.useEffect(() => {
  //   console.clear();
  //   console.log(
  //     matrix
  //       .map((r) => r.map((c) => c.symbol.replace(' ', '.')).join('') + '\n')
  //       .join('')
  //   );
  // }, [matrix]);

  useEffect(() => {
    const checkSelectionInterval = setInterval(
      () => window.getSelection()?.removeAllRanges?.(),
      20
    );

    const blockGestures = (e: Event) => {
      e.preventDefault();
      (document.body.style as any).zoom = 1;
    };

    document.addEventListener("gesturestart", blockGestures);
    document.addEventListener("gesturechange", blockGestures);
    document.addEventListener("gestureend", blockGestures);

    return () => {
      document.removeEventListener("gesturestart", blockGestures);
      document.removeEventListener("gesturechange", blockGestures);
      document.removeEventListener("gestureend", blockGestures);

      clearInterval(checkSelectionInterval);
    };
  }, []);

  const emoji = [score >= 10 && "😎", "🧐"].find(Boolean);

  return (
    <>
      {loading && <p className="loading">loading...</p>}
      <main className={loading ? "loading" : ""}>
        <img
          className="bg"
          src={bgImg}
          alt="bg"
          onLoad={() => setLoading(false)}
        />

        <header>
          <h1>Snake Game</h1>
          <h3>
            Score: {score} {emoji}
          </h3>
        </header>

        <section>
          {matrix.map((row) => row.map((cell) => cell.symbol).join("") + "\n")}
        </section>

        <footer>
          {isTouch ? (
            <h4>Hint: Tap to pause</h4>
          ) : (
            <dl>
              <strong>Use keys:</strong>
              <kbd>Space</kbd>
              <span>
                <kbd>↑</kbd>
                <div>
                  <kbd>←</kbd>
                  <kbd>↓</kbd>
                  <kbd>→</kbd>
                </div>
              </span>
            </dl>
          )}
        </footer>
      </main>
    </>
  );
}
