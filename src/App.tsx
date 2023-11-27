import React, { useState, useEffect, useRef } from "react";
import { useSnakeGame } from "./useSnakeGame";
// @ts-ignore
import bgImg from "./bg.jpg";
// @ts-ignore
import swipeImg from "./swipe-all-directions.png";
// @ts-ignore
import tapImg from "./tap.png";
import "./style.css";
import {
  addPayerToLeaderboard,
  getLeaderboard,
  Leader,
  trackGameFinish,
  trackSignGame,
} from "./firebase";

const isTouch = "touchstart" in window || !!navigator.maxTouchPoints;

export default function App() {
  const defaultName = useRef(localStorage.getItem("playerName"));

  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [ownId, setOwnId] = useState("");
  const [isShownLeaderboard, setIsShownLeaderboard] = useState(false);
  const [isShownInstructions, setIsShownInstructions] = useState(isTouch);

  const sortedLeaders = leaders.sort((a, b) => b.food - a.food).slice(0, 10);

  const { matrix, score, restart } = useSnakeGame({
    onGameEnd: async (food: number) => {
      trackGameFinish(food);

      await new Promise((resolve) => setTimeout(resolve, 200));

      setIsShownLeaderboard(true);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const promptPlayer = () => {
        let playerName;

        while (true) {
          const player = prompt(
            `Food: 🍗${food}\n👤Enter your name: `,
            defaultName.current ?? undefined
          );

          playerName = player?.trim().slice(0, 50);

          if (playerName !== null && playerName !== "") break;
        }

        return playerName;
      };

      if (food && !Number.isNaN(+food)) {
        const playerName = promptPlayer();

        if (playerName) {
          const playerId = await addPayerToLeaderboard(playerName, food);

          localStorage.setItem("playerName", playerName);
          defaultName.current = playerName;

          if (playerId) setOwnId(playerId);

          trackSignGame(playerName, food);

          await getLeaderboard().then(setLeaders);
        }
      }
    },
  });

  const handleRestart = () => {
    setIsShownLeaderboard(false);
    setOwnId("");
    restart();
    setIsShownInstructions(false);
  };

  useEffect(() => {
    getLeaderboard().then(setLeaders);
  }, []);

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

  const getPrize = (i: number) => {
    if (i === 0) {
      return "🥇";
    } else if (i === 1) {
      return "🥈";
    } else if (i === 2) {
      return "🥉";
    } else {
      return "";
    }
  };

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

        {isShownInstructions && (
          <div role="button" className="instruction" onTouchStart={() => setIsShownInstructions(false)}>
            <h2>How to play</h2>

            <div className="instruction__images">
              <div className="instruction__image">
                <span className="instruction__image-title">
                  Swipe{"\n"}to{"\n"}control
                </span>
                <img src={swipeImg} alt="swipe" />
              </div>
              <div className="instruction__image">
                <span className="instruction__image-title">
                  Tap{"\n"}to{"\n"}pause
                </span>
                <img src={tapImg} alt="tap" />
              </div>
            </div>

            <h2>Tap to start</h2>
          </div>
        )}

        <header>
          <h1>Snake Game</h1>
          <h3>
            Food: 🍗{score}
          </h3>
        </header>

        <section>
          {matrix.map((row) => row.map((cell) => cell.symbol).join("") + "\n")}
        </section>

        {isShownLeaderboard && (
          <div role="button" className="leaderboard" onTouchStart={handleRestart}>
            <div className="leaderboard-box">
              <h3>Leaderboard</h3>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaders.map((leader, i) => (
                    <tr
                      key={leader.id}
                      className={leader.id === ownId ? "strong" : ""}
                    >
                      <td>
                        {leader.id === ownId ? "→ " : ""}
                        {i + 1}
                        <span>
                          {getPrize(i) || <span className="invisible">🥉</span>}
                        </span>
                      </td>
                      <td>{leader.player.slice(0, 20).padEnd(20, ".")}</td>
                      <td>🍗{leader.food}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
