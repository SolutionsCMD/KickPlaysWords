# Chat Guessing Game

A real-time multiplayer word guessing game designed for Kick streamers and their chat viewers. Players compete to guess the correct word from a list, earning points for speed and accuracy.

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

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use and modify for your streaming needs.

## Credits

Built for Kick streamers who want interactive chat games.
