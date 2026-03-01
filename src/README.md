# Local development

Use this guide for running the extension locally.

## Prerequisites

- Node.js 18+ and npm
- Chrome browser
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Build the extension:

```bash
npm run build
```

3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project
