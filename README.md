# Chat Guessing Game

A real-time multiplayer word guessing game designed for Twitch/Kick streamers and their chat viewers. Players compete to guess the correct word from a list, earning points for speed and accuracy.

## Features

- **Real-time Gameplay**: WebSocket-based live game updates
- **Admin Panel**: Streamers can control game flow, set word lists, and manage rounds
- **Viewer Interface**: Clean, responsive UI for chat participants
- **Point System**: Rewards for correct guesses with time-based bonuses
- **Leaderboard**: Live scoring and rankings
- **Flexible Word Lists**: Customizable word lists with variable round counts

## How It Works

1. Admin creates a word list and starts a round
2. Admin secretly selects the winning word from the list
3. Players race to guess the correct word
4. Points awarded based on guess accuracy and speed
5. Leaderboard tracks cumulative scores across rounds

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chat-guessing-game.git
cd chat-guessing-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Access the application:
   - **Admin Panel**: `http://localhost:3000/admin.html`
   - **Player Interface**: `http://localhost:3000`

## Configuration

By default, the server runs on port 3000. You can modify this in `server.js`:

```javascript
const PORT = process.env.PORT || 3000;
```

## Deployment

For production deployment:

1. Set the `PORT` environment variable
2. Update WebSocket URLs in `admin.html` and `index.html` to point to your production server
3. Consider adding:
   - Rate limiting for WebSocket connections
   - Admin authentication
   - SSL/TLS certificates for secure connections

## Usage

### For Streamers (Admin)

1. Navigate to `/admin.html`
2. Enter words for the round (one per line)
3. Specify number of rounds
4. Click "Create Word List"
5. Select the winning word for each round
6. Click "Start Round" to begin
7. Monitor guesses and end rounds manually or let timer expire

### For Viewers (Players)

1. Navigate to the main page
2. Enter your username
3. Wait for the streamer to start a round
4. View the word list and submit your guess
5. Earn points for correct guesses
6. Track your position on the leaderboard

## Game Rules

- **Correct Guess**: 100 points
- **Time Bonus**: Up to 50 additional points based on guess speed
- **One Guess Per Round**: Choose carefully!
- **Rounds**: Multiple rounds per game with cumulative scoring

## Technology Stack

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Real-time Communication**: WebSockets for live updates

## File Structure

```
chat-guessing-game/
├── server.js           # WebSocket server and game logic
├── index.html          # Player interface
├── admin.html          # Admin control panel
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## Security Notes

- The winning word is never transmitted to clients until the round ends
- All game logic is server-side to prevent manipulation
- Consider adding authentication for admin panel in production

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use and modify for your streaming needs.

## Credits

Built for Twitch/Kick streamers who want interactive chat games.
