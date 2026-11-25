# SortRush

A web-based categorization race with real-time progress tracking, built with React, Vite, and Tailwind CSS.

## Run in VS Code
1. Extract the folder and open it in **VS Code** (`File → Open Folder`).
2. Open the integrated terminal (`Ctrl + ~`).
3. Install dependencies and start the local server:
   ```bash
   npm install
   npm run dev
   ```
4. `Ctrl + Click` the `http://localhost:5173` link in the terminal.

## Testing Real-Time 1v1 Locally
- **Solo vs. Bot:** Pick a deck and difficulty (`Easy`, `Medium`, `Hard`), then click **Start Practice Race**.
- **1v1 Live Room (2 Browser Tabs):**
  1. Open `http://localhost:5173` in **Tab 1** and click **Host New Room** to get a 4-character room code.
  2. Open `http://localhost:5173` in **Tab 2**, enter the room code, and click **Join**.
  3. Inside the lobby, both players can pick their desired **Category Deck**:
     - If both pick the **same deck**, the match starts directly on that deck once both click **Ready Up**.
     - If they pick **different decks**, a **Random Deck Roulette** spins between the two picks and launches the match on the winning deck.
  4. During a match, click **Quit** (or press `Esc`) to confirm quitting or return to the game. If a player quits mid-match, the other player gets a popup returning them to the main menu.
