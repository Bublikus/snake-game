import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  addPayerToLeaderboard,
  getLeaderboard,
  Leader,
  trackGameFinish,
  trackGameRestart,
  trackSignGameFinish,
} from './firebase';
import { PlayerModal } from "./components/PlayerModal";
import { GameContainer } from "./components/GameContainer";
import { Leaderboard } from "./components/Leaderboard";
import { Instructions } from "./components/Instructions";
import { useRemoveSelection } from "./hooks/useRemoveSelection";
import { useBlockGestures } from "./hooks/useBlockGestures";
import { useSnakeGame } from "./useSnakeGame";
import "./style.css";

const isTouch = "touchstart" in window || !!navigator.maxTouchPoints;

const defaultPlayer: Leader = {
  id: "",
  player: `player_${Math.floor(new Date().getTime() / 1000)}`,
  food: 0,
  date: new Date().toLocaleString(),
};

export default function App() {
  const isOverlay = useRef(false);

  const [isEnd, setIsEnd] = useState(false);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [player, setPlayer] = useState<Leader>(defaultPlayer);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [isShownLeaderboard, setIsShownLeaderboard] = useState(false);
  const [isShownInstructions, setIsShownInstructions] = useState(isTouch);

  isOverlay.current = isShownLeaderboard || isShownInstructions;

  const config = useMemo(
    () => ({
      onGameEnd: async (score: number) => {
        trackGameFinish(score);
        setIsEnd(true);
        await new Promise((resolve) => setTimeout(resolve, 200));
        setIsShownLeaderboard(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (+score > 0) setShowPlayerModal(true);
      },
    }),
    []
  );

  const { matrix, score, restart } = useSnakeGame(config);

  const onPlayerModalClose = async (playerName: string) => {
    setShowPlayerModal(false);

    if (score && playerName) {
      const playerId = await addPayerToLeaderboard(playerName, score);
      if (playerId) setPlayer((prev) => ({ ...prev, id: playerId }));
      trackSignGameFinish(score, playerName);
      await getLeaderboard().then(setLeaders);
    }
  };

  const handleRestart = () => {
    setIsEnd(false);
    setIsShownLeaderboard(false);
    setIsShownInstructions(false);
    setPlayer(defaultPlayer);
    trackGameRestart();
    restart();
  };

  useEffect(() => {
    getLeaderboard().then(setLeaders);
  }, []);

  useRemoveSelection(!isOverlay.current);
  useBlockGestures();

  // Fun stuff
  // React.useEffect(() => {
  //   console.clear();
  //   console.log(
  //     matrix
  //       .map((r) => r.map((c) => c.symbol.replace(' ', '.')).join('') + '\n')
  //       .join('')
  //   );
  // }, [matrix]);

  return (
    <GameContainer>
      <Instructions open={isShownInstructions} onClose={() => setIsShownInstructions(false)} />

      <header>
        <h1>Snake</h1>
        <h3>Food: 🍗{score}</h3>
      </header>

      <section>
        {matrix.map((row) => row.map((cell) => cell.symbol).join("") + "\n")}
      </section>

      <footer>
        {isTouch ? (
          <div className="controls">
            <button type="button" id="control-up" disabled={isEnd}>↑</button>
            <div className="controls-sides">
              <button type="button" id="control-left" disabled={isEnd}>←</button>
              <button type="button" id="control-right" disabled={isEnd}>→</button>
            </div>
            <button type="button" id="control-down" disabled={isEnd}>↓</button>
          </div>
        ) : (
          <dl>
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

      <Leaderboard
        open={isShownLeaderboard}
        active={!isShownInstructions && !showPlayerModal}
        player={player}
        leaders={leaders}
        onClose={handleRestart}
      />

      <PlayerModal
        open={showPlayerModal}
        score={score}
        defaultName={defaultPlayer.player}
        onClose={onPlayerModalClose}
      />
    </GameContainer>
  );
}
