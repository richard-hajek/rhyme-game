import {useEffect, useState, useRef, useCallback} from "react";
import {generate} from "random-words";
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'

const SCREEN_INTRO = "intro"
const SCREEN_GAME = "game"
const SCREEN_END = "end"

const useGameStore = create(
    immer((set) => ({
        score: 0,
        word: null,
        state: SCREEN_INTRO,
        setScreen: (screen) => set((state) => {
            state.state = screen
        }),
        setScore: (score) => set((state) => {
            state.score = score
        }),
        setWord: (word) => set((state) => {
            state.word = word
        }),
    }))
)

const fetchWord = async () => {
    let word;
    do {
        word = generate();
    } while (typeof word !== "string" || word.length < 3);
    return word;
};

const rhymeCache = new Map();

const validateRhyme = async (input, target) => {
    const key = target.toLowerCase();
    if (!rhymeCache.has(key)) {
        const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${key}`);
        const rhymes = await res.json();
        rhymeCache.set(key, new Set(rhymes.map((w) => w.word.toLowerCase())));
    }
    return rhymeCache.get(key).has(input.toLowerCase());
};

const getValidRhymes = async (target) => {
    const key = target.toLowerCase();
    if (!rhymeCache.has(key)) {
        const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${key}`);
        const rhymes = await res.json();
        rhymeCache.set(key, new Set(rhymes.map((w) => w.word.toLowerCase())));
    }
    return rhymeCache.get(key);
}

function Intro({setGameScreen}) {
    const controller = useGameStore();
    return (
        <div className="game-card">
            <h2>Welcome to Richard's Rhyming Game!</h2>
            <p>Find rhymes as fast as you can to score points.</p>
            <button onClick={() => controller.setScreen(SCREEN_GAME)}>Begin Game</button>
        </div>
    )
}

function Game() {

    const controller = useGameStore();

    const [userInput, setUserInput] = useState("");
    const [timeLeft, setTimeLeft] = useState(60);
    const timerRef = useRef(null);
    const [message, setMessage] = useState("")

    const nextWord = async () => {
        let newWord;
        let rhymes;

        do {
            newWord = await fetchWord();
            rhymes = await getValidRhymes(newWord); // Should return a Set
        } while (!rhymes || rhymes.size <= 10);

        controller.setWord(newWord);
        setUserInput("");
        setTimeLeft(10);
    };

    useEffect(() => {
        if (timeLeft <= 0) {
            controller.setScreen(SCREEN_END)
            return;
        }
        timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
        return () => clearTimeout(timerRef.current);
    }, [setMessage, controller.word, timeLeft, controller]);

    const handleSubmit = async () => {
        const valid = await validateRhyme(userInput.toLowerCase(), controller.word.toLowerCase());
        if (!valid) {
            setMessage(`Not a valid rhyme: ${userInput}`)
            return;
        }
        controller.setScore(controller.score + 1);
        setMessage("")
        nextWord();
    };

    useEffect(() => {
        nextWord();
    }, []);

    return (
        <div className="game-card">
            <div className="score-display">
                ${controller.score * 1000}
            </div>
            <div className="game-header">
                <h2 className="word-prompt">Find a rhyme for: {controller.word}</h2>
                <div className="timer">{timeLeft}s</div>
            </div>
            <div className="input-group">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Enter a rhyme..."
                />
                <button onClick={handleSubmit}>Submit</button>
            </div>
            <div className="message">{message}</div>
        </div>
    );
}

function GameOver() {
    const controller = useGameStore();
    console.log(rhymeCache)
    const words = Array.from(rhymeCache.get(controller.word)).slice(0, 30);
    const columns = 3;
    const rows = Math.ceil(words.length / columns);
    const columnsArray = Array.from({ length: columns }, (_, colIndex) =>
        words.slice(colIndex * rows, colIndex * rows + rows)
    );

    return (
        <div className="game-over">
            <h1>Game Over!</h1>
            <div className="score-display">Final Score: {controller.score}</div>
            <h2>You had: <span style={{color: 'var(--accent-primary)'}}>{controller.word}</span></h2>
            <h3>You could've said:</h3>
            <div className="rhyme-grid">
                {columnsArray.map((col, i) => (
                    <div key={i} className="rhyme-column">
                        <ul>
                            {col.map((word, j) => (
                                <li key={j}>{word}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <button onClick={() => controller.setScreen(SCREEN_INTRO)} style={{marginTop: '2rem'}}>
                Play Again
            </button>
        </div>
    );

}

export function Router() {
    const controller = useGameStore();

    switch (controller.state) {
        case SCREEN_INTRO:
            return <Intro/>
        case SCREEN_GAME:
            return <Game/>
        case SCREEN_END:
            return <GameOver/>
        default:
            return <div>A bug has occured fuck</div>;
    }
}

export default function App() {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            width: "100vw",
            height: "100vh",
            justifyContent: "center",
            alignItems: "center",
            padding: "2rem",
        }}>
            <h1 className="title">Richard's Rumbustious Rhyming Rounds</h1>
            <Router/>
        </div>
    )
}

