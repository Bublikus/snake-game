import React from "react";
// @ts-ignore
import swipeImg from "./swipe-all-directions.png";
// @ts-ignore
import tapImg from './tap.png';
import "./styles.css";

interface LeaderboardProps {
  open: boolean;
  onClose(): void;
}

export const Instructions: React.FC<LeaderboardProps> = ({ open, onClose }) => {
  return !open ? null : (
    <div role="button" className="instruction" onClick={onClose}>
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
  );
};
