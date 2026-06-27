# Maher Islamic Routine Planner

AI-powered daily planner with DeepSeek integration.

## Setup (2 steps)

**Requirements:** Node.js 18+ (https://nodejs.org)

### 1. Start the server

```bash
node server.js
```

### 2. Open the app

```
http://localhost:3000
```

---

## How the AI works

The app calls your local server at `POST /api/ai`.  
The server proxies to DeepSeek server-side — no CORS issues.

```
Browser → POST /api/ai → server.js → DeepSeek API → reply
```

---

## Change the API key

Either set an environment variable:

```bash
DEEPSEEK_API_KEY=sk-your-key node server.js
```

Or edit line 10 of `server.js` directly:

```js
const DEEPSEEK_API_KEY = 'sk-your-key-here';
```

---

## Files

```
maher-planner/
├── server.js         ← Node backend (runs the server + proxies AI)
├── package.json
├── README.md
└── public/
    └── index.html    ← The full app (all tabs, UI, logic)
```
