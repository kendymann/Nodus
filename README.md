# Nodus

Transform dense, linear articles into interactive, non-linear knowledge graphs.

## Prerequisites

- Node.js 18+ and npm
- Chrome browser
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API Key:
   
   Create a `.env` file in the root directory:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

5. Add Icons (Optional):
   
   Replace the placeholder files in `public/` with actual PNG icons:
   - `public/icon-16.png` (16x16 pixels)
   - `public/icon-48.png` (48x48 pixels)
   - `public/icon-128.png` (128x128 pixels)

## Usage

1. Navigate to any article or blog post
2. Click the LexiGraph extension icon in the Chrome toolbar
3. The side panel will open
4. Click "Generate Graph" to transform the article into a knowledge graph
5. Click on nodes or edges to see detailed summaries

## Development

Run in development mode:
```bash
npm run dev
```

## Project Structure

- `/src/background` - Service worker for API calls and messaging
- `/src/content` - Content script for extracting article text using Readability.js
- `/src/sidepanel` - React UI for the Chrome side panel
  - `/components/GraphView.tsx` - Force-directed graph visualization
  - `/components/DetailPanel.tsx` - Detail panel for node/edge information
  - `/components/Loader.tsx` - Loading animation
- `/src/hooks` - Custom React hooks
  - `useChromeStorage.ts` - Chrome storage persistence
  - `useCurrentTab.ts` - Current tab URL tracking

## Architecture

The extension follows Manifest V3 architecture:
1. Content Script extracts article text using Readability.js
2. Background Worker sends text to Gemini API and processes response
3. Side Panel displays the interactive graph using react-force-graph-2d
4. Chrome Storage persists graphs per URL for quick access

## Features

- Automatic article text extraction
- AI-powered concept extraction (8-12 nodes per article)
- Interactive force-directed graph visualization
- Color-coded node groups
- Detailed summaries for nodes and edges
- Graph persistence across tab switches
- Empty state handling for insufficient content

## Troubleshooting

- **"API key not configured"**: Ensure `.env` file exists with `VITE_GEMINI_API_KEY`
- **"Failed to extract article"**: Make sure you're on a valid article page with readable content
- **Graph not showing**: Check browser console for errors and ensure you have a stable internet connection
