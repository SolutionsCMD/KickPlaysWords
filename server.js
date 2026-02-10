import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { DICTIONARY, WORD_HINTS } from './dictionary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

function genRoomId() { return 'r_' + crypto.randomBytes(4).toString('hex'); }
function genAdminToken() { return 'atk_' + crypto.randomBytes(16).toString('hex'); }
function genModToken() { return 'mtk_' + crypto.randomBytes(16).toString('hex'); }

// MOD TOKEN LOOKUP
const modTokenToRoom = new Map(); // modToken -> { room, modEntry }

// SLUR BLACKLIST
const BLACKLIST_FILE = path.join(__dirname, 'blacklist.json');
function loadBlacklist() {
  const builtIn = ['nigger','nigga','nigg','niga','faggot','fag','fagot','retard','retarded','spic','spick','kike','chink','gook','wetback','beaner','coon','darkie','honky','cracker','tranny','dyke','twink'];
  let custom = [];
  try { if (fs.existsSync(BLACKLIST_FILE)) custom = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8')); } catch(e){}
  return new Set([...builtIn, ...custom].map(w => w.toLowerCase()));
}
let BLACKLISTED_WORDS = loadBlacklist();
function isBlacklisted(word) {
  const w = word.toLowerCase();
  if (BLACKLISTED_WORDS.has(w)) return true;
  for (const slur of BLACKLISTED_WORDS) { if (slur.length >= 3 && w.includes(slur)) return true; }
  return false;
}

// Chat is relayed from admin browser via WebSocket (no server-side Pusher connection)

const DEFAULT_WORD_LISTS = {
  4: ['word','game','chat','kick','live','fire','star','moon','king','fish','bird','tree','snow','rain','wind','sand','rock','wave','duck','bear','wolf','frog','lion','deer','seal','crab','hawk','lynx','mole','newt','lamp','door','book','bell','ship','coin','drum','harp','leaf','palm','cage','bomb','dust','flag','gear','gift','glow','glue','halo','helm','hook','horn','iron','jade','keys','kite','knot','lace','lock','maze','nail','nest','oven','pipe','pool','ruby','safe','soap','tank','tape','tile','tool','trap','tube','vase','vent','wand','wire','arch','barn','cafe','cave','city','club','dome','farm','ford','fort','gate','gulf','hall','home','jail','lake','lane','loft','mall','mine','moat','park','path','pier','pond','port','road','roof','room','tent','tomb','town','wall','yard','zone','bold','calm','cold','dark','deep','fair','fear','fond','glad','grim','hate','hope','keen','kind','lazy','lone','love','mean','mild','mood','numb','pain','pure','rage','rare','warm','weak','wild','wise','acid','atom','beam','byte','cell','chip','code','coil','core','data','disc','dose','drop','flux','form','fuel','gene','germ','grid','heat','lens','load','loop','mass','mesh','mode','node','peak','plot','pole','pump','rate','ring','root','scan','seed','slot','sort','stem','test','tone','unit','volt','weld','band','bass','beat','blue','cast','clay','clip','cord','draw','edit','epic','fade','film','folk','font','gold','haze','hero','hymn','icon','jazz','jest','lore','lure','lute','mask','mime','muse','myth','note','opus','pace','play','poem','poet','role','rune','saga','show','sing','skit','solo','song','soul','tale','text','tune','type','vibe','yarn'],
  5: ['guess','sport','music','dance','power','earth','ocean','snake','tiger','mouse','horse','shark','eagle','plant','stone','clock','movie','magic','sword','crown','quest','storm','flame','frost','ghost','demon','angel','beast','spell','charm','brain','dream','night','light','heart','beach','blaze','brave','chain','chase','clash','climb','cloud','coral','crash','cross','crush','drift','feast','flash','float','forge','frame','gleam','globe','grace','grand','grasp','guard','haven','haunt','honor','jewel','judge','knock','latch','lunar','march','mercy','noble','orbit','peace','pearl','pixel','plume','pride','prize','psalm','pulse','queen','rapid','realm','reign','ridge','rival','royal','saint','scale','scope','scout','shade','sharp','shelf','shift','shine','siege','skill','skull','slide','solar','spark','spear','spine','spoke','staff','stain','stand','steal','steam','steel','steer','stern','stick','sting','swear','sweep','swift','thief','thorn','torch','tower','trace','trail','trend','trick','trust','truth','twist','unity','valor','vault','vigor','vital','watch','weave','wheel','witch','world','wound','wrath','yield'],
  6: ['stream','gamer','coffee','artist','dragon','castle','forest','island','planet','rocket','spider','wizard','knight','pirate','jungle','desert','winter','summer','spring','autumn','legend','empire','palace','temple','mystic','cosmic','energy','spirit','shadow','sacred','absorb','anchor','arctic','banner','beacon','bitter','bounty','breeze','bridge','bronze','candle','canyon','carpet','cipher','cobalt','combat','copper','cradle','crisis','dagger','decode','divine','double','elixir','escape','exotic','falcon','famine','fathom','ferret','fiddle','frenzy','frozen','galaxy','garlic','gentle','goblet','golden','gothic','gravel','hammer','harbor','hollow','hunter','hustle','impact','jigsaw','jostle','kindle','ladder','lagoon','locket','magnet','marble','meadow','mellow','mirror','mosaic','needle','orphan','outlaw','oyster','pardon','peril','plague','pledge','plunge','poison','portal','powder','prison','puzzle','quartz','radish','random','ransom','ravine','reason','ribbon','riddle','ripple','rustic','saddle','safari','scroll','secret','sentry','shrine','signal','silver','sketch','socket','sorrow','stolen','struck','summit','sunset','tangle','tender','thirst','throne','ticket','timber','toggle','trophy','tumble','turret','undone','unlock','upward','vandal','velvet','vessel','vision','volume','vortex','voyage','wander','weapon','wealth','wicked','wonder','wraith','zenith'],
  7: ['chicken','monster','penguin','rainbow','dolphin','element','diamond','volcano','thunder','phoenix','griffin','unicorn','kingdom','emperor','mystery','fantasy','destiny','harmony','freedom','justice','warrior','sorcery','ancient','eternal','crystal','phantom','journey','triumph','miracle','abandon','absolve','academy','alchemy','almanac','antenna','archive','arsenal','balance','bandage','banquet','baptism','barrier','bastion','battery','beastly','beloved','benefit','bizarre','blanket','blossom','boulder','brigade','broaden','brother','buffalo','cabinet','caliber','captain','capture','caravan','cascade','catalog','caution','ceramic','certain','chamber','channel','chapter','chariot','chemist','chimney','circuit','citadel','climate','cluster','coastal','coaster','cockpit','combine','comfort','command','compact','compass','complex','compose','concept','concert','conduct','confess','confine','conquer','contour','control','convert','costume','cottage','council','country','courage','crafter','creator','cricket','crimson','crusade','cuisine','culture','cumulus','current','curtain','custard','customs','cyclone','cypress','decrypt','default','defense','deliver','despair','destroy','develop','devoted','digital','display','dispute','distant','disturb','dungeon','earlier','eclipse','economy','educate','elegant','embrace','emerald','emotion','enchant','endless','enforce','engrave','episode','erosion','essence','evasion','evident','examine','example','excited','exhibit','expense','explain','exploit','explore','express','extinct','extreme','factory','farming','fashion','feature','fiction','firefly','fixture','flannel','flutter','foliage','foreign','formula','fortune','founder','foxhole','fragile','freight','furnace','gateway','gazelle','general','genuine','giraffe','glacier','gladden','glimpse','glitter','gondola','gorilla','grandma','gravity','grizzly','grounds','habitat','halcyon','hamster','handler','harvest','heading','healthy','heather','heroism','highway','history','horizon','hostile','housing','however','hundred','iceberg','imagine','immense','inquiry','instant','involve','javelin','journal','kinetic','kitchen','lantern','leather','leopard','liberty','lighter','limited','lobster','lottery','luggage','machine','maestro','mammoth','manager','mandate','mansion','marshal','mastery','medical','memento','mercury','methods','militia','mineral','mission','mixture','modular','monitor','moonlit','morning','mundane','narwhal','natural','network','neutron','notable','nuclear','nursery','obscure','october','offense','opinion','optimal','organic','origins','outlook','overall','ovation','pacific','package','pageant','panther','passage','patriot','pattern','payment','peasant','penalty','pension','perfect','picture','pilgrim','pioneer','plastic','playful','plumber','pointer','pottery','poultry','premium','present','primate','private','problem','proceed','produce','profile','program','project','promise','prolong','promote','prophet','prosper','protect','protest','provide','prowler','publish','pyramid','quarter','quarrel','radical','rampart','reactor','reality','rebuild','receive','recover','recruit','reflect','refugee','regular','remains','removal','renewal','replace','request','reserve','resolve','restore','retreat','reunion','revenge','reverse','revolve','rooster','routine','royalty','rupture','rushing','rustler','salvage','samurai','scholar','seaside','section','shelter','shimmer','silence','skeptic','slender','society','soldier','sparrow','special','sponsor','station','stealth','stellar','stirrup','storage','strange','stretch','striker','subject','success','sunrise','support','supreme','surface','surplus','survive','suspect','sustain','swindle','tactics','tempest','tendril','terrain','terrace','thimble','thought','tonnage','tornado','torpedo','tourism','tracker','trading','tragedy','trainer','transit','trawler','tribune','tribute','trigger','trouble','trumpet','tsunami','turbine','typical','umbrage','uncover','uniform','unknown','unravel','uranium','vaccine','vagrant','vanilla','variety','venture','verdict','version','veteran','victory','village','vintage','virtual','vulture','walkway','warlock','warrant','weather','western','whisker','whistle','wildcat','witness','worship','wrangle','written']
};

// 10x WORD LIST (morewords.txt)
const MORE_WORDS_FILE = path.join(__dirname, 'morewords.txt');
let _moreWordsCache = null;
let _moreWordsMtime = 0;
function loadMoreWords() {
  try {
    if (!fs.existsSync(MORE_WORDS_FILE)) return new Set();
    const stat = fs.statSync(MORE_WORDS_FILE);
    if (_moreWordsCache && stat.mtimeMs === _moreWordsMtime) return _moreWordsCache;
    const text = fs.readFileSync(MORE_WORDS_FILE, 'utf8');
    _moreWordsCache = new Set(text.split(/[\r\n,]+/).map(w => w.trim().toLowerCase()).filter(w => w.length >= 2 && /^[a-z]+$/.test(w)));
    _moreWordsMtime = stat.mtimeMs;
    console.log('[DICT] Loaded ' + _moreWordsCache.size + ' 10x words from morewords.txt');
    return _moreWordsCache;
  } catch(e) { return new Set(); }
}
let MORE_WORDS = loadMoreWords();

// ALLOWED GUESSES
const ALLOWED_GUESSES_FILE = path.join(__dirname, 'allowed-guesses.txt');
let _allowedGuessesCache = null;
let _allowedGuessesMtime = 0;
function loadAllowedGuesses() {
  try {
    if (!fs.existsSync(ALLOWED_GUESSES_FILE)) return new Set();
    const stat = fs.statSync(ALLOWED_GUESSES_FILE);
    if (_allowedGuessesCache && stat.mtimeMs === _allowedGuessesMtime) return _allowedGuessesCache;
    const text = fs.readFileSync(ALLOWED_GUESSES_FILE, 'utf8');
    _allowedGuessesCache = new Set(text.split(/[\r\n,]+/).map(w => w.trim().toLowerCase()).filter(w => w.length >= 2 && /^[a-z]+$/.test(w)));
    _allowedGuessesMtime = stat.mtimeMs;
    console.log('[DICT] Loaded ' + _allowedGuessesCache.size + ' allowed guesses');
    return _allowedGuessesCache;
  } catch(e) { return new Set(); }
}
let ALLOWED_GUESSES = loadAllowedGuesses();
function isValidGuess(word) { return DICTIONARY.has(word) || ALLOWED_GUESSES.has(word) || MORE_WORDS.has(word); }

// RANDOM WORD PICKER
function pickRandomWord(room) {
  let len = room.preferredWordLength;
  if (room.shuffleWordLength) {
    const lengths = [4, 5, 6, 7];
    len = lengths[Math.floor(Math.random() * lengths.length)];
  }
  if (room.expandedWordPool && ALLOWED_GUESSES.size > 0) {
    const all = [...ALLOWED_GUESSES].filter(w => !isBlacklisted(w) && w.length === len);
    if (all.length > 0) return all[Math.floor(Math.random() * all.length)];
    // Fallback: any length if none match
    const fallback = [...ALLOWED_GUESSES].filter(w => !isBlacklisted(w) && w.length >= 2);
    if (fallback.length > 0) return fallback[Math.floor(Math.random() * fallback.length)];
  }
  if (room.tenXWordPool && MORE_WORDS.size > 0) {
    const all = [...MORE_WORDS].filter(w => !isBlacklisted(w) && w.length === len);
    if (all.length > 0) return all[Math.floor(Math.random() * all.length)];
    const fallback = [...MORE_WORDS].filter(w => !isBlacklisted(w) && w.length >= 2);
    if (fallback.length > 0) return fallback[Math.floor(Math.random() * fallback.length)];
  }
  const words = DEFAULT_WORD_LISTS[len] || DEFAULT_WORD_LISTS[5];
  return words[Math.floor(Math.random() * words.length)];
}

// LEADERBOARD (saved to disk per roomId)
const LEADERBOARD_DIR = path.join(__dirname, 'leaderboards');
if (!fs.existsSync(LEADERBOARD_DIR)) fs.mkdirSync(LEADERBOARD_DIR);
function leaderboardFile(roomId) { return path.join(LEADERBOARD_DIR, roomId + '.json'); }
function loadLeaderboard(roomId) { try { const f = leaderboardFile(roomId); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch(e){} return {}; }
function saveLeaderboard(roomId, lb) { try { fs.writeFileSync(leaderboardFile(roomId), JSON.stringify(lb, null, 2)); } catch(e){} }
function recordWin(roomId, username, word, totalGuesses) {
  const lb = loadLeaderboard(roomId);
  if (!lb[username]) lb[username] = { wins: 0, words: [], totalGuessesWhenWon: 0, fastestWin: Infinity };
  lb[username].wins++; lb[username].words.push(word); lb[username].totalGuessesWhenWon += totalGuesses;
  if (totalGuesses < lb[username].fastestWin) lb[username].fastestWin = totalGuesses;
  saveLeaderboard(roomId, lb);
}
function getLeaderboardForClient(roomId) {
  const lb = loadLeaderboard(roomId);
  return Object.entries(lb).map(([u, d]) => ({ username: u, wins: d.wins, words: d.words, avgGuesses: d.wins > 0 ? Math.round(d.totalGuessesWhenWon / d.wins) : 0, fastestWin: d.fastestWin === Infinity ? 0 : d.fastestWin })).sort((a, b) => b.wins - a.wins).slice(0, 50);
}

// HINTS
function generateHints(word) {
  const category = WORD_HINTS.get(word.toLowerCase());
  const mid = Math.floor(word.length / 2);
  const hints = [];
  if (category) hints.push({ text: category });
  hints.push({ text: 'Starts with "' + word[0].toUpperCase() + '"' });
  hints.push({ text: 'Ends with "' + word[word.length - 1].toUpperCase() + '"' });
  hints.push({ text: 'Letter ' + (mid + 1) + ' is "' + word[mid].toUpperCase() + '"' });
  return hints;
}

// ROOM PERSISTENCE (survives server restarts + page refreshes)
const ROOMS_FILE = path.join(__dirname, 'rooms-persist.json');
function saveRoomsToDisk() {
  try {
    const data = {};
    for (const [id, room] of rooms) {
      data[id] = {
        id: room.id, adminToken: room.adminToken,
        channelUsername: room.channelUsername, chatroomId: room.chatroomId, channelDisplayName: room.channelDisplayName,
        autoRestart: room.autoRestart, autoRestartSeconds: room.autoRestartSeconds || 60, shuffleWordLength: room.shuffleWordLength, expandedWordPool: room.expandedWordPool, tenXWordPool: room.tenXWordPool, hideLetterCount: room.hideLetterCount, prizeAmount: room.prizeAmount || '',
        preferredWordLength: room.preferredWordLength, winnerHistory: room.winnerHistory,
        chatParticipants: [...room.chatParticipants],
        lastMode: room.game.mode,
        modTokens: (room.modTokens || []).filter(m => m.expires > Date.now()),
        wordleSettings: room.game.wordleSettings,
        noHintsSettings: { hintsEnabled: room.game.noHintsSettings.hintsEnabled, hintMinutes: room.game.noHintsSettings.hintMinutes, timerEnabled: !!room.game.noHintsSettings.timerEnabled, timerMinutes: room.game.noHintsSettings.timerMinutes || 10 }
      };
    }
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(data, null, 2));
  } catch(e) { console.error('[PERSIST] Save error:', e.message); }
}
function loadRoomsFromDisk() {
  try {
    if (!fs.existsSync(ROOMS_FILE)) return;
    const data = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
    for (const [id, saved] of Object.entries(data)) {
      const room = {
        id: saved.id, adminToken: saved.adminToken,
        game: { active: false, stopped: false, mode: saved.lastMode || 'noHints', word: '', wordLength: 5, guesses: [], winner: null, startTime: null, endTime: null,
          wordleSettings: saved.wordleSettings || { allowDuplicates: true, cooldownEnabled: false, cooldownSeconds: 5, maxGuessesPerUser: 0, timerEnabled: false, timerMinutes: 10 },
          noHintsSettings: { hintsEnabled: saved.noHintsSettings?.hintsEnabled !== false, hintMinutes: saved.noHintsSettings?.hintMinutes || [3,6,9,12], timerEnabled: !!saved.noHintsSettings?.timerEnabled, timerMinutes: saved.noHintsSettings?.timerMinutes || 10, hints: [], hintsRevealed: [] },
          userLastGuess: {}, stats: { totalGuesses: 0, uniquePlayers: new Set() }, bestLetterStatus: {}, revealedWord: null,
          lockedGreens: {}, positionYellows: {}, knownInWord: new Set(), triedLetters: new Set(), lastGuessResult: null },
        channelUsername: saved.channelUsername || '', chatroomId: saved.chatroomId || null, channelDisplayName: saved.channelDisplayName || '',
        clients: new Set(), hintTimers: [], chatRelayConnected: false,
        autoRestart: !!saved.autoRestart, autoRestartTimer: null, autoRestartCountdown: 0, autoRestartSeconds: saved.autoRestartSeconds || 60,
        shuffleWordLength: !!saved.shuffleWordLength, expandedWordPool: !!saved.expandedWordPool, tenXWordPool: !!saved.tenXWordPool, hideLetterCount: !!saved.hideLetterCount, prizeAmount: saved.prizeAmount || '',
        preferredWordLength: saved.preferredWordLength || 5, winnerHistory: saved.winnerHistory || [],
        chatParticipants: new Set(saved.chatParticipants || []),
        winnerChatLog: [],
        modTokens: (saved.modTokens || []).filter(m => m.expires > Date.now())
      };
      rooms.set(id, room);
      tokenToRoom.set(saved.adminToken, room);
      // Rebuild mod token lookup
      for (const mod of room.modTokens) modTokenToRoom.set(mod.token, { room, modEntry: mod });
    }
    console.log('[PERSIST] Restored ' + rooms.size + ' rooms');
  } catch(e) { console.error('[PERSIST] Load error:', e.message); }
}

// ROOMS
const rooms = new Map();
const tokenToRoom = new Map();
loadRoomsFromDisk();

function createRoom() {
  const roomId = genRoomId();
  const adminToken = genAdminToken();
  const room = {
    id: roomId, adminToken,
    game: { active: false, stopped: false, mode: 'noHints', word: '', wordLength: 5, guesses: [], winner: null, startTime: null, endTime: null,
      wordleSettings: { allowDuplicates: true, cooldownEnabled: false, cooldownSeconds: 5, maxGuessesPerUser: 0, timerEnabled: false, timerMinutes: 10 },
      noHintsSettings: { hintsEnabled: true, hintMinutes: [3, 6, 9, 12], hints: [], hintsRevealed: [], timerEnabled: false, timerMinutes: 10 },
      userLastGuess: {}, stats: { totalGuesses: 0, uniquePlayers: new Set() }, bestLetterStatus: {}, revealedWord: null,
      lockedGreens: {}, positionYellows: {}, knownInWord: new Set(), triedLetters: new Set(), lastGuessResult: null },
    channelUsername: '', chatroomId: null, channelDisplayName: '',
    clients: new Set(), hintTimers: [], chatRelayConnected: false,
    autoRestart: false, autoRestartTimer: null, autoRestartCountdown: 0, autoRestartSeconds: 60,
    shuffleWordLength: false, expandedWordPool: false, tenXWordPool: false, hideLetterCount: false, prizeAmount: '',
    preferredWordLength: 5, winnerHistory: [],
    chatParticipants: new Set(),
    winnerChatLog: [],
    modTokens: []
  };
  rooms.set(roomId, room);
  tokenToRoom.set(adminToken, room);
  console.log('[ROOM] Created ' + roomId);
  saveRoomsToDisk();
  return room;
}
function getRoom(roomId) { return rooms.get(roomId); }
function getRoomByToken(token) { return tokenToRoom.get(token); }
function requireAdmin(token) { return token ? (tokenToRoom.get(token) || null) : null; }

// CHAT
function processRelayedChat(room, username, message) {
  if (!username || username === 'Anonymous') return;
  room.chatParticipants.add(username);
  // Capture winner's chat messages after a win
  if (room.game.winner && username.toLowerCase() === room.game.winner.toLowerCase() && message.trim()) {
    const entry = { username, message: message.trim(), timestamp: Date.now() };
    if (!room.winnerChatLog) room.winnerChatLog = [];
    room.winnerChatLog.push(entry);
    if (room.winnerChatLog.length > 50) room.winnerChatLog.shift();
    broadcastToRoom(room, { type: 'winnerChat', entry, log: room.winnerChatLog });
  }
  if (room.game.active && message.trim()) processGuess(room, username, message.trim());
}

// GAME LOGIC
function startRoomGame(room, word, mode, settings) {
  clearAutoRestartTimer(room);
  room.winnerChatLog = []; // clear previous winner's chat
  const hints = generateHints(word.toLowerCase());
  const isFun = mode === 'fun';
  room.game = {
    active: true, stopped: false, mode, word: word.toLowerCase(), wordLength: word.length, guesses: [], winner: null, startTime: Date.now(), endTime: null,
    wordleSettings: (mode === 'wordle' || isFun) ? (isFun ? { cooldownEnabled: false, cooldownSeconds: 0, maxGuessesPerUser: 0, timerEnabled: true, timerMinutes: 1 } : settings) : room.game.wordleSettings,
    noHintsSettings: mode === 'noHints' ? { hintsEnabled: settings.hintsEnabled !== false, hintMinutes: settings.hintMinutes || [3,6,9,12], hints: hints, hintsRevealed: [], timerEnabled: !!settings.timerEnabled, timerMinutes: settings.timerMinutes || 10 } : room.game.noHintsSettings,
    userLastGuess: {}, stats: { totalGuesses: 0, uniquePlayers: new Set() }, bestLetterStatus: {}, revealedWord: null,
    lockedGreens: {}, positionYellows: {}, knownInWord: new Set(), triedLetters: new Set(), lastGuessResult: null,
    funTimer: null, roundTimer: null, timerEndTime: null
  };
  
  // Set up timerEndTime BEFORE broadcast so clients get it immediately
  if (isFun) {
    room.game.timerEndTime = Date.now() + 60000;
  } else if (settings && settings.timerEnabled && settings.timerMinutes > 0) {
    room.game.timerEndTime = Date.now() + (settings.timerMinutes * 60 * 1000);
  }
  
  console.log('[ROOM:' + room.id + '] Game started (' + mode + ', ' + word.length + ' letters)');
  broadcastToRoom(room, { type: 'gameUpdate', game: getRoomGameState(room) });
  if (mode === 'noHints' && room.game.noHintsSettings.hintsEnabled) startRoomHintTimer(room);
  
  // Set up round timer timeouts
  if (isFun) {
    room.game.funTimer = setTimeout(() => {
      if (room.game.active && !room.game.winner) {
        endRoomGame(room, 'revealed');
        startAutoRestartTimer(room, 10);
      }
    }, 60000);
  } else if (settings && settings.timerEnabled && settings.timerMinutes > 0) {
    const timerMs = settings.timerMinutes * 60 * 1000;
    room.game.roundTimer = setTimeout(() => {
      if (room.game.active && !room.game.winner) {
        endRoomGame(room, 'timeout');
        broadcastToRoom(room, { type: 'gameUpdate', game: getRoomGameState(room) });
      }
    }, timerMs);
  }
  
  saveRoomsToDisk();
}

function endRoomGame(room, reason) {
  if (!room.game.active && reason !== 'revealed' && reason !== 'timeout') return;
  if (room.game.funTimer) { clearTimeout(room.game.funTimer); room.game.funTimer = null; }
  if (room.game.roundTimer) { clearTimeout(room.game.roundTimer); room.game.roundTimer = null; }
  if (reason === 'revealed' && !room.game.active) {
    room.game.revealedWord = room.game.word;
    for (let i = 0; i < room.game.word.length; i++) room.game.bestLetterStatus[i] = { letter: room.game.word[i], status: 'correct' };
    broadcastToRoom(room, { type: 'gameEnded', game: getRoomGameState(room), endReason: reason });
    return;
  }
  room.game.endTime = Date.now();
  if (reason === 'won' && room.game.winner) {
    room.winnerHistory.unshift({ username: room.game.winner, word: room.game.word, timestamp: Date.now(), totalGuesses: room.game.stats.totalGuesses, uniquePlayers: room.game.stats.uniquePlayers.size });
    if (room.winnerHistory.length > 50) room.winnerHistory.pop();
  }
  if (reason === 'won' || reason === 'revealed' || reason === 'timeout') {
    room.game.revealedWord = room.game.word;
    for (let i = 0; i < room.game.word.length; i++) room.game.bestLetterStatus[i] = { letter: room.game.word[i], status: 'correct' };
  }
  room.game.active = false;
  if (reason === 'stopped') room.game.stopped = true;
  clearRoomHintTimers(room);
  broadcastToRoom(room, { type: 'gameEnded', game: getRoomGameState(room), endReason: reason });
  logGame(getRoomGameState(room), room.id);
  if ((reason === 'won' || reason === 'timeout') && (room.autoRestart || room.game.mode === 'fun')) startAutoRestartTimer(room, room.game.mode === 'fun' ? 10 : (room.autoRestartSeconds || 60));
  saveRoomsToDisk();
}

function startAutoRestartTimer(room, customSeconds) {
  clearAutoRestartTimer(room);
  const seconds = customSeconds || 60;
  room.autoRestartCountdown = seconds;
  broadcastToRoom(room, { type: 'autoRestart', countdown: seconds });
  room.autoRestartTimer = setInterval(() => {
    room.autoRestartCountdown--;
    if (room.autoRestartCountdown <= 0) { clearAutoRestartTimer(room); autoStartNewGame(room); }
    else broadcastToRoom(room, { type: 'autoRestart', countdown: room.autoRestartCountdown });
  }, 1000);
}
function clearAutoRestartTimer(room) { if (room.autoRestartTimer) { clearInterval(room.autoRestartTimer); room.autoRestartTimer = null; broadcastToRoom(room, { type: 'autoRestart', countdown: 0 }); } room.autoRestartCountdown = 0; }
function autoStartNewGame(room) {
  const mode = room.game.mode || 'noHints';
  let word;
  if (mode === 'fun') {
    // Fun mode always uses expanded pool
    const all = [...ALLOWED_GUESSES].filter(w => !isBlacklisted(w) && w.length >= 2);
    word = all.length > 0 ? all[Math.floor(Math.random() * all.length)] : pickRandomWord(room);
  } else {
    word = pickRandomWord(room);
  }
  const settings = (mode === 'wordle' || mode === 'fun') ? room.game.wordleSettings : { hintsEnabled: room.game.noHintsSettings.hintsEnabled, hintMinutes: room.game.noHintsSettings.hintMinutes, timerEnabled: room.game.noHintsSettings.timerEnabled, timerMinutes: room.game.noHintsSettings.timerMinutes };
  startRoomGame(room, word, mode, settings);
}

function processGuess(room, username, guess) {
  const game = room.game;
  if (!game.active || game.winner) return;
  const g = guess.toLowerCase();
  if (!/^[a-z]+$/.test(g)) return;
  if (isBlacklisted(g)) return;
  if (game.wordleSettings.cooldownEnabled && (game.mode === 'wordle' || game.mode === 'fun')) {
    if (Date.now() - (game.userLastGuess[username] || 0) < game.wordleSettings.cooldownSeconds * 1000) return;
  }
  if (game.wordleSettings.maxGuessesPerUser > 0 && (game.mode === 'wordle' || game.mode === 'fun')) {
    if (game.guesses.filter(x => x.username === username).length >= game.wordleSettings.maxGuessesPerUser) return;
  }
  const isWordleStyle = game.mode === 'wordle' || game.mode === 'fun';
  if (isWordleStyle) {
    if (g.length !== game.word.length) return;
    if (g !== game.word && !isValidGuess(g)) return;
  }
  if (!isWordleStyle && g.length !== game.word.length) {
    const wrongLenResult = { correct: false, letters: g.split('').map(l => ({ letter: l, status: 'none' })), wrongLength: true };
    const guessData = { username, guess: g, result: wrongLenResult, timestamp: Date.now(), isWinner: false };
    game.guesses.push(guessData); game.userLastGuess[username] = Date.now(); game.stats.totalGuesses++; game.stats.uniquePlayers.add(username);
    broadcastToRoom(room, { type: 'newGuess', guess: guessData, game: getRoomGameState(room) });
    return;
  }
  const result = evaluateGuess(game, g);
  if ((game.mode === 'wordle' || game.mode === 'fun') && result.letters) {
    // Track last guess for display
    game.lastGuessResult = result.letters;
    // Track tried letters
    for (const l of result.letters) game.triedLetters.add(l.letter);
    // Update bestLetterStatus
    const pri = { correct: 3, present: 2, absent: 1, none: 0 };
    for (let i = 0; i < result.letters.length; i++) {
      const l = result.letters[i]; const cur = game.bestLetterStatus[i];
      if (!cur || (pri[l.status]||0) > (pri[cur.status]||0)) game.bestLetterStatus[i] = { letter: l.letter, status: l.status };
    }
    // Update lockedGreens, positionYellows, knownInWord
    for (let i = 0; i < result.letters.length; i++) {
      const l = result.letters[i];
      if (l.status === 'correct') {
        game.lockedGreens[i] = l.letter;
        game.knownInWord.add(l.letter);
      } else if (l.status === 'present') {
        if (!game.positionYellows[i]) game.positionYellows[i] = [];
        if (!game.positionYellows[i].includes(l.letter)) game.positionYellows[i].push(l.letter);
        game.knownInWord.add(l.letter);
      }
    }
    // Clean up yellows: remove letter from a position's yellows if it's now green there
    // Also remove yellow entries for letters fully accounted for by greens
    const wordLetterCounts = {};
    for (const ch of game.word) wordLetterCounts[ch] = (wordLetterCounts[ch]||0)+1;
    const correctCounts = {};
    for (let i = 0; i < game.word.length; i++) {
      if (game.lockedGreens[i]) correctCounts[game.lockedGreens[i]] = (correctCounts[game.lockedGreens[i]]||0)+1;
    }
    for (let i = 0; i < game.word.length; i++) {
      if (game.positionYellows[i]) {
        game.positionYellows[i] = game.positionYellows[i].filter(letter => {
          // Remove if this letter is fully accounted for by greens
          return !(correctCounts[letter] >= (wordLetterCounts[letter]||0));
        });
        if (game.positionYellows[i].length === 0) delete game.positionYellows[i];
      }
    }
    // Clean up bestLetterStatus yellows too
    for (let i = 0; i < game.word.length; i++) {
      const s = game.bestLetterStatus[i];
      if (s && s.status === 'present' && correctCounts[s.letter] >= (wordLetterCounts[s.letter]||0)) {
        game.bestLetterStatus[i] = { letter: s.letter, status: 'absent' };
      }
    }
  }
  const guessData = { username, guess: g, result, timestamp: Date.now(), isWinner: result.correct };
  game.guesses.push(guessData); game.userLastGuess[username] = Date.now(); game.stats.totalGuesses++; game.stats.uniquePlayers.add(username);
  if (result.correct) {
    for (let i = 0; i < game.word.length; i++) game.bestLetterStatus[i] = { letter: game.word[i], status: 'correct' };
    game.winner = username; game.revealedWord = game.word;
    game.winnerGuessCount = game.guesses.filter(x => x.username === username).length;
    recordWin(room.id, username, game.word, game.stats.totalGuesses);
    endRoomGame(room, 'won'); broadcastLeaderboard(room); return;
  }
  broadcastToRoom(room, { type: 'newGuess', guess: guessData, game: getRoomGameState(room) });

  // EASTER EGG: Check if all positions are green but nobody guessed the actual word
  if ((game.mode === 'wordle' || game.mode === 'fun') && game.active && !game.winner) {
    const allGreens = game.word.length > 0 && Object.keys(game.lockedGreens).length === game.word.length;
    if (allGreens) {
      // Every position is green — the word was "spelled out" by collective guesses
      broadcastToRoom(room, { type: 'easterEgg', message: 'The word was revealed letter by letter! 🎉 Nobody guessed it, but everyone found the letters!', word: game.word });
      endRoomGame(room, 'revealed');
      if (room.autoRestart || game.mode === 'fun') startAutoRestartTimer(room, game.mode === 'fun' ? 10 : (room.autoRestartSeconds || 60));
    }
  }
}

function evaluateGuess(game, guess) {
  const word = game.word;
  const result = { correct: guess === word, letters: [] };
  if (result.correct) { for (let i = 0; i < guess.length; i++) result.letters.push({ letter: guess[i], status: 'correct' }); return result; }
  if (game.mode === 'wordle' || game.mode === 'fun') {
    const wl = word.split(''), gl = guess.split(''), lc = {};
    for (const l of wl) lc[l] = (lc[l]||0)+1;
    const st = new Array(guess.length).fill('absent');
    for (let i = 0; i < guess.length; i++) { if (gl[i] === wl[i]) { st[i] = 'correct'; lc[gl[i]]--; } }
    for (let i = 0; i < guess.length; i++) { if (st[i] === 'absent' && lc[gl[i]] > 0) { st[i] = 'present'; lc[gl[i]]--; } }
    for (let i = 0; i < guess.length; i++) result.letters.push({ letter: gl[i], status: st[i] });
  } else { for (let i = 0; i < guess.length; i++) result.letters.push({ letter: guess[i], status: 'none' }); }
  return result;
}

// HINT TIMERS
function startRoomHintTimer(room) {
  clearRoomHintTimers(room);
  const s = room.game.noHintsSettings;
  if (!s.hintsEnabled || !s.hints || !s.hintMinutes) return;
  s.hintMinutes.forEach((min, idx) => {
    if (idx < s.hints.length) room.hintTimers.push(setTimeout(() => { if (room.game.active && !room.game.winner) revealRoomHint(room, idx); }, min * 60 * 1000));
  });
}
function clearRoomHintTimers(room) { room.hintTimers.forEach(t => clearTimeout(t)); room.hintTimers = []; }
function revealRoomHint(room, idx) {
  const s = room.game.noHintsSettings;
  if (!s.hints || !s.hints[idx] || s.hintsRevealed.includes(idx)) return;
  s.hintsRevealed.push(idx);
  broadcastToRoom(room, { type: 'hintRevealed', hintIndex: idx, hintText: s.hints[idx].text, game: getRoomGameState(room) });
}

// CLIENT STATE
function getRoomGameState(room) {
  const g = room.game;
  const revealedHints = [];
  if (g.mode === 'noHints' && g.noHintsSettings.hints && g.noHintsSettings.hints.length > 0) {
    for (const idx of (g.noHintsSettings.hintsRevealed || [])) {
      const h = g.noHintsSettings.hints[idx]; if (h && h.text) revealedHints.push(h.text);
    }
  }
  return {
    active: g.active, stopped: g.stopped, mode: g.mode, wordLength: g.wordLength,
    guesses: g.guesses.slice(-50).map(x => ({ username: x.username, guess: x.guess, result: x.result, timestamp: x.timestamp, isWinner: x.isWinner })),
    winner: g.winner, winnerGuessCount: g.winnerGuessCount || 0, startTime: g.startTime, endTime: g.endTime,
    stats: { totalGuesses: g.stats.totalGuesses, uniquePlayers: g.stats.uniquePlayers.size },
    hintsRevealed: revealedHints,
    bestLetterStatus: (g.mode === 'wordle' || g.mode === 'fun' || g.revealedWord) ? g.bestLetterStatus : {},
    lockedGreens: (g.mode === 'wordle' || g.mode === 'fun') ? (g.lockedGreens || {}) : {},
    positionYellows: (g.mode === 'wordle' || g.mode === 'fun') ? (g.positionYellows || {}) : {},
    confirmedAbsent: (g.mode === 'wordle' || g.mode === 'fun') ? [...(g.triedLetters || [])].filter(l => !(g.knownInWord || new Set()).has(l)).sort() : [],
    lastGuessResult: (g.mode === 'wordle' || g.mode === 'fun') ? (g.lastGuessResult || null) : null,
    revealedWord: g.revealedWord,
    channelName: room.channelDisplayName || '',
    roomId: room.id, autoRestart: room.autoRestart, autoRestartSeconds: room.autoRestartSeconds || 60,
    expandedWordPool: room.expandedWordPool,
    tenXWordPool: room.tenXWordPool,
    hideLetterCount: room.hideLetterCount,
    prizeAmount: room.prizeAmount || '',
    winnerChatLog: room.winnerChatLog || [],
    funTimeLeft: g.mode === 'fun' && g.active ? Math.max(0, 60 - Math.floor((Date.now() - g.startTime) / 1000)) : null,
    timerEndTime: g.timerEndTime || null
  };
}
function getRoomAdminState(room) {
  return { ...getRoomGameState(room), actualWord: room.game.word,
    allHints: (room.game.noHintsSettings.hints || []).map(h => ({ text: h ? h.text : '' })),
    hintMinutes: room.game.noHintsSettings.hintMinutes || [],
    hintsRevealedIndices: room.game.noHintsSettings.hintsRevealed || [],
    winnerHistory: room.winnerHistory, preferredWordLength: room.preferredWordLength,
    channelUsername: room.channelUsername, chatroomId: room.chatroomId,
    chatParticipantCount: room.chatParticipants.size,
    expandedWordPool: room.expandedWordPool,
    tenXWordPool: room.tenXWordPool,
    shuffleWordLength: room.shuffleWordLength,
    hideLetterCount: room.hideLetterCount,
    prizeAmount: room.prizeAmount || '',
    allowedGuessesCount: ALLOWED_GUESSES.size, moreWordsCount: MORE_WORDS.size };
}
function getModAdminState(room, perms) {
  const state = getRoomAdminState(room);
  if (!perms.setWord) state.actualWord = '(hidden)';
  return state;
}

// WEBSOCKET
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws, request) => {
  const url = new URL(request.url, 'http://' + request.headers.host);
  const roomId = url.searchParams.get('room');
  const token = url.searchParams.get('token');
  let room, isAdmin = false, isMod = false, modPerms = null;
  if (token) {
    room = getRoomByToken(token);
    if (room) { isAdmin = true; }
    else {
      // Check mod token
      const mod = modTokenToRoom.get(token);
      if (mod && mod.modEntry.expires > Date.now()) { room = mod.room; isMod = true; modPerms = mod.modEntry.permissions; }
      else { ws.close(4001, 'Invalid admin token'); return; }
    }
  } else if (roomId) {
    room = getRoom(roomId);
    if (!room) { ws.close(4002, 'Room not found'); return; }
  } else { ws.close(4003, 'No room or token'); return; }
  room.clients.add(ws); ws._roomId = room.id; ws._isAdmin = isAdmin; ws._isMod = isMod; ws._modPerms = modPerms; ws._modToken = isMod ? token : null;
  const stateForClient = isAdmin ? getRoomAdminState(room) : (isMod ? getModAdminState(room, modPerms) : getRoomGameState(room));
  ws.send(JSON.stringify({ type: 'gameUpdate', game: stateForClient }));
  ws.send(JSON.stringify({ type: 'leaderboard', data: getLeaderboardForClient(room.id) }));
  ws.send(JSON.stringify({ type: 'chatStatus', channelName: room.channelDisplayName || '', connected: room.chatRelayConnected }));
  if (room.autoRestartCountdown > 0) ws.send(JSON.stringify({ type: 'autoRestart', countdown: room.autoRestartCountdown }));
  // Send mod permissions so admin UI knows what to show/hide
  if (isMod) ws.send(JSON.stringify({ type: 'modPermissions', permissions: modPerms }));
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'chatMessage' && (ws._isAdmin || (ws._isMod && ws._modPerms && ws._modPerms.connectChat))) {
        processRelayedChat(room, msg.username, msg.message);
      }
      if (msg.type === 'chatRelayStatus' && (ws._isAdmin || ws._isMod)) {
        room.chatRelayConnected = !!msg.connected;
        broadcastToRoom(room, { type: 'chatStatus', channelName: room.channelDisplayName || '', connected: room.chatRelayConnected });
      }
    } catch(e) {}
  });
  ws.on('close', () => { room.clients.delete(ws); });
  ws.on('error', () => {});
});

function broadcastToRoom(room, data) {
  const adminData = data.game ? { ...data, game: getRoomAdminState(room) } : data;
  const aMsg = JSON.stringify(adminData), vMsg = JSON.stringify(data);
  room.clients.forEach(c => {
    if (c.readyState !== WebSocket.OPEN) return;
    if (c._isAdmin) c.send(aMsg);
    else if (c._isMod) {
      const modData = data.game ? { ...data, game: getModAdminState(room, c._modPerms) } : data;
      c.send(JSON.stringify(modData));
    } else c.send(vMsg);
  });
}
function broadcastLeaderboard(room) {
  const msg = JSON.stringify({ type: 'leaderboard', data: getLeaderboardForClient(room.id) });
  room.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

// LOGGING
const LOGS_DIR = path.join(__dirname, 'game-logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);
function logGame(d, rid) { const ts = new Date().toISOString().replace(/:/g,'-').split('.')[0]; try{fs.writeFileSync(path.join(LOGS_DIR,'game-'+rid+'-'+ts+'.json'),JSON.stringify(d,null,2));}catch(e){} }

// EXPRESS
app.use(express.json()); app.use(express.static('public'));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use((req, res, next) => { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.sendStatus(204); next(); });

function adminOnly(req, res, next) {
  const token = req.body.token || req.query.token;
  // Check admin token first
  const room = requireAdmin(token);
  if (room) { req.room = room; req.isOwner = true; req.permissions = null; return next(); }
  // Check mod token
  const mod = modTokenToRoom.get(token);
  if (mod && mod.modEntry.expires > Date.now()) { req.room = mod.room; req.isOwner = false; req.permissions = mod.modEntry.permissions; return next(); }
  // Clean up expired mod token
  if (mod && mod.modEntry.expires <= Date.now()) { modTokenToRoom.delete(token); const idx = mod.room.modTokens.indexOf(mod.modEntry); if (idx >= 0) mod.room.modTokens.splice(idx, 1); }
  return res.status(403).json({ error: 'Invalid or missing admin token' });
}
function requirePerm(perm) {
  return function(req, res, next) {
    if (req.isOwner) return next(); // owner can do everything
    if (req.permissions && req.permissions[perm]) return next();
    return res.status(403).json({ error: 'Permission denied: ' + perm });
  };
}

// PUBLIC API
app.post('/api/room/create', (req, res) => {
  const room = createRoom();
  res.json({ roomId: room.id, adminToken: room.adminToken });
});
// Reconnect to existing room by token
app.post('/api/room/reconnect', (req, res) => {
  const token = req.body.token;
  const room = requireAdmin(token);
  if (room) return res.json({ roomId: room.id, adminToken: room.adminToken, channelName: room.channelDisplayName, chatroomId: room.chatroomId });
  // Check mod token
  const mod = modTokenToRoom.get(token);
  if (mod && mod.modEntry.expires > Date.now()) return res.json({ roomId: mod.room.id, adminToken: token, channelName: mod.room.channelDisplayName, chatroomId: mod.room.chatroomId, isMod: true, permissions: mod.modEntry.permissions });
  return res.status(404).json({ error: 'Room not found' });
});
app.get('/api/game', (req, res) => {
  const r = getRoom(req.query.room);
  if (!r) return res.json({ game: { active: false } });
  res.json({ game: getRoomGameState(r) });
});
app.get('/api/leaderboard', (req, res) => res.json({ leaderboard: getLeaderboardForClient(req.query.room || '') }));
// Public leaderboard page
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ADMIN API
app.post('/api/channel/connect', adminOnly, requirePerm('connectChat'), (req, res) => {
  const { chatroomId, channelName } = req.body;
  if (!chatroomId) return res.status(400).json({ error: 'Chatroom ID required' });
  const room = req.room;
  room.channelUsername = (channelName || '').toLowerCase();
  room.chatroomId = parseInt(chatroomId);
  room.channelDisplayName = channelName || 'Channel ' + chatroomId;
  saveRoomsToDisk();
  res.json({ success: true, channelName: room.channelDisplayName, chatroomId: room.chatroomId });
});
app.post('/api/game/start', adminOnly, requirePerm('gameControls'), (req, res) => {
  let { word, mode, settings, autoWord } = req.body;
  // Mods without setWord permission must use random word
  if (!req.isOwner && req.permissions && !req.permissions.setWord) { autoWord = true; word = null; }
  if (!mode) return res.status(400).json({ error: 'Mode required' });
  const room = req.room;
  if (mode === 'fun') {
    // Fun mode: always pick from x100 pool
    const all = [...ALLOWED_GUESSES].filter(w => !isBlacklisted(w) && w.length >= 2);
    word = all.length > 0 ? all[Math.floor(Math.random() * all.length)] : pickRandomWord(room);
    settings = {};
  } else if (autoWord || !word) {
    word = pickRandomWord(room);
  }
  if (!/^[a-z]+$/i.test(word)) return res.status(400).json({ error: 'Letters only' });
  if (!room.expandedWordPool && mode !== 'fun') room.preferredWordLength = word.length;
  startRoomGame(room, word, mode, settings || {});
  const showWord = req.isOwner || (req.permissions && req.permissions.setWord);
  res.json({ success: true, word: showWord ? word : '(hidden)' });
});
app.post('/api/game/stop', adminOnly, requirePerm('gameControls'), (req, res) => {
  clearAutoRestartTimer(req.room); endRoomGame(req.room, 'stopped');
  broadcastToRoom(req.room, { type: 'autoRestart', countdown: 0 });
  res.json({ success: true });
});
app.post('/api/game/reveal', adminOnly, requirePerm('gameControls'), (req, res) => {
  if (!req.room.game.word) return res.status(400).json({ error: 'No game' });
  endRoomGame(req.room, 'revealed'); res.json({ success: true });
});
app.post('/api/game/auto-restart', adminOnly, requirePerm('changeSettings'), (req, res) => {
  req.room.autoRestart = !!req.body.enabled;
  if (req.body.seconds !== undefined) req.room.autoRestartSeconds = Math.max(10, Math.min(300, parseInt(req.body.seconds) || 60));
  if (!req.room.autoRestart) clearAutoRestartTimer(req.room);
  saveRoomsToDisk();
  res.json({ success: true, autoRestart: req.room.autoRestart, autoRestartSeconds: req.room.autoRestartSeconds });
});
app.post('/api/game/shuffle-length', adminOnly, requirePerm('changeSettings'), (req, res) => {
  req.room.shuffleWordLength = !!req.body.enabled;
  saveRoomsToDisk();
  res.json({ success: true });
});
app.post('/api/game/expanded-pool', adminOnly, requirePerm('changeSettings'), (req, res) => {
  req.room.expandedWordPool = !!req.body.enabled;
  saveRoomsToDisk();
  res.json({ success: true, expandedWordPool: req.room.expandedWordPool, wordCount: ALLOWED_GUESSES.size });
});
app.post('/api/game/tenx-pool', adminOnly, requirePerm('changeSettings'), (req, res) => {
  req.room.tenXWordPool = !!req.body.enabled;
  saveRoomsToDisk();
  res.json({ success: true, tenXWordPool: req.room.tenXWordPool, wordCount: MORE_WORDS.size });
});
app.post('/api/game/hide-letter-count', adminOnly, requirePerm('changeSettings'), (req, res) => {
  req.room.hideLetterCount = !!req.body.enabled;
  saveRoomsToDisk();
  broadcastToRoom(req.room, { type: 'gameUpdate', game: getRoomGameState(req.room) });
  res.json({ success: true });
});
app.post('/api/game/prize', adminOnly, requirePerm('changeSettings'), (req, res) => {
  req.room.prizeAmount = (req.body.amount || '').toString().trim();
  saveRoomsToDisk();
  broadcastToRoom(req.room, { type: 'gameUpdate', game: getRoomGameState(req.room) });
  res.json({ success: true });
});
app.post('/api/game/update-hint', adminOnly, requirePerm('editHints'), (req, res) => {
  const { hintIndex, newText } = req.body;
  const h = req.room.game.noHintsSettings.hints;
  if (h && h[hintIndex]) { h[hintIndex].text = newText; broadcastToRoom(req.room, { type: 'gameUpdate', game: getRoomGameState(req.room) }); res.json({ success: true }); }
  else res.status(400).json({ error: 'Invalid hint' });
});
app.post('/api/game/reveal-hint', adminOnly, requirePerm('editHints'), (req, res) => {
  revealRoomHint(req.room, req.body.hintIndex); res.json({ success: true });
});
app.post('/api/leaderboard/reset', adminOnly, requirePerm('dangerZone'), (req, res) => {
  saveLeaderboard(req.room.id, {}); broadcastLeaderboard(req.room); res.json({ success: true });
});
app.post('/api/admin/regenerate-token', adminOnly, (req, res) => {
  if (!req.isOwner) return res.status(403).json({ error: 'Only the room owner can regenerate tokens' });
  const room = req.room;
  const oldToken = room.adminToken;
  const newToken = genAdminToken();
  tokenToRoom.delete(oldToken);
  room.adminToken = newToken;
  tokenToRoom.set(newToken, room);
  saveRoomsToDisk();
  // Close all admin websockets so they must reconnect with new token
  room.clients.forEach(c => { if (c._isAdmin) c.close(4001, 'Token regenerated'); });
  res.json({ success: true, newToken });
});

// MOD LINK MANAGEMENT (owner only)
app.post('/api/admin/create-mod-link', adminOnly, (req, res) => {
  if (!req.isOwner) return res.status(403).json({ error: 'Only the room owner can create mod links' });
  const { label, permissions } = req.body;
  if (!permissions || typeof permissions !== 'object') return res.status(400).json({ error: 'Permissions required' });
  const room = req.room;
  // Limit to 10 active mod links
  room.modTokens = (room.modTokens || []).filter(m => m.expires > Date.now());
  if (room.modTokens.length >= 10) return res.status(400).json({ error: 'Maximum 10 active mod links' });
  const token = genModToken();
  const modEntry = { token, label: label || 'Mod', permissions, created: Date.now(), expires: Date.now() + 3 * 60 * 60 * 1000 };
  room.modTokens.push(modEntry);
  modTokenToRoom.set(token, { room, modEntry });
  saveRoomsToDisk();
  res.json({ success: true, modToken: token, expires: modEntry.expires });
});
app.post('/api/admin/revoke-mod-link', adminOnly, (req, res) => {
  if (!req.isOwner) return res.status(403).json({ error: 'Only the room owner can revoke mod links' });
  const { modToken } = req.body;
  const room = req.room;
  const idx = (room.modTokens || []).findIndex(m => m.token === modToken);
  if (idx < 0) return res.status(404).json({ error: 'Mod link not found' });
  room.modTokens.splice(idx, 1);
  modTokenToRoom.delete(modToken);
  // Kick any connected mod websockets with this token
  room.clients.forEach(c => { if (c._modToken === modToken) c.close(4001, 'Mod link revoked'); });
  saveRoomsToDisk();
  res.json({ success: true });
});
app.get('/api/admin/mod-links', adminOnly, (req, res) => {
  if (!req.isOwner) return res.status(403).json({ error: 'Only the room owner can view mod links' });
  const room = req.room;
  room.modTokens = (room.modTokens || []).filter(m => m.expires > Date.now());
  res.json({ modLinks: room.modTokens.map(m => ({ token: m.token, label: m.label, permissions: m.permissions, created: m.created, expires: m.expires })) });
});
app.get('/api/words/random', (req, res) => {
  const token = req.query.token;
  let room = requireAdmin(token);
  let canSeeWord = true;
  if (!room) {
    const mod = modTokenToRoom.get(token);
    if (mod && mod.modEntry.expires > Date.now()) { room = mod.room; canSeeWord = !!mod.modEntry.permissions.setWord; }
  }
  if (!room) return res.status(403).json({ error: 'Admin token required' });
  const word = pickRandomWord(room);
  res.json({ word: canSeeWord ? word : '(random)', expanded: room.expandedWordPool });
});
app.get('/api/winner-history', (req, res) => {
  const token = req.query.token;
  let room = requireAdmin(token);
  if (!room) { const mod = modTokenToRoom.get(token); if (mod && mod.modEntry.expires > Date.now()) room = mod.room; }
  if (!room) return res.status(403).json({ error: 'Admin token required' });
  res.json({ history: room.winnerHistory });
});
app.get('/api/participants/csv', (req, res) => {
  const token = req.query.token;
  let room = requireAdmin(token);
  if (!room) { const mod = modTokenToRoom.get(token); if (mod && mod.modEntry.expires > Date.now()) room = mod.room; }
  if (!room) return res.status(403).json({ error: 'Admin token required' });
  const names = [...room.chatParticipants];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="' + names.length + '_players.csv"');
  res.send(names.join('\n'));
});
app.post('/api/participants/clear', adminOnly, requirePerm('changeSettings'), (req, res) => {
  req.room.chatParticipants.clear();
  saveRoomsToDisk();
  res.json({ success: true });
});

const server = app.listen(PORT, () => { console.log('\n  Chat Guessing Game Server\n  Port ' + PORT + '\n  Dictionary: ' + DICTIONARY.size + ' words\n  Allowed guesses: ' + ALLOWED_GUESSES.size + '\n  10x words: ' + MORE_WORDS.size + '\n  Rooms restored: ' + rooms.size + '\n  Word lists: ' + Object.entries(DEFAULT_WORD_LISTS).map(([k,v]) => k + '=' + v.length).join(', ') + '\n'); });
server.on('upgrade', (req, socket, head) => { wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req)); });
process.on('SIGINT', () => { saveRoomsToDisk(); for (const r of rooms.values()) { clearRoomHintTimers(r); clearAutoRestartTimer(r); } server.close(() => process.exit(0)); });
