// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore/lite";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "ascii-snake-game.firebaseapp.com",
  projectId: "ascii-snake-game",
  storageBucket: "ascii-snake-game.appspot.com",
  messagingSenderId: "1867701705",
  appId: "1:1867701705:web:eb8fb53be68038924adc18",
  measurementId: "G-EXDHJY3RJW",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Requests

export type Leader = {
  id: string;
  player: string;
  food: number;
  date: string;
};

export async function getLeaderboard(): Promise<Leader[]> {
  try {
    const colRef = collection(db, "leaderboard");
    const q = query(
      colRef,
      orderBy("food", "desc"), // Sorting by time in ascending order
      limit(10) // Limiting the results to 10
    );
    const docsRef = await getDocs(q);

    return (
      docsRef.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Leader)) || []
    );
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function addPayerToLeaderboard(player: string, food: number) {
  try {
    if (!food || !player || Number.isNaN(+food)) {
      throw new Error("Invalid request body");
    }
    const docRef = await addDoc(collection(db, "leaderboard"), {
      player,
      food,
      date: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.log(error);
  }
}

// Analytics

export function trackGameStart() {
  logEvent(analytics, "snake_game_start");
}

export function trackGameFinish(food: number) {
  logEvent(analytics, "snake_game_finish", { food });
}

export function trackSignGame(player: string, food: number) {
  logEvent(analytics, "snake_sign_game", { player, food });
}
