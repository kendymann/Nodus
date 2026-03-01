# Nodus | AI Article Concept Mapper

Nodus transforms dense, linear articles into interactive, non-linear knowledge graphs. It
is designed to help you understand complex reading faster by turning long-form content
into a visual map of concepts and relationships. Open an article, generate a graph, and
explore summaries and source quotes for each node to reinforce understanding and
retention.

![Nodus Image](public/nodus.png)

## Install

Install Nodus from the Chrome Web Store and pin it to your toolbar for quick access. After
installation, open any article and click the Nodus icon to launch the side panel.

## Description

Nodus converts any readable article into a visual concept map so you can quickly see the
structure of ideas, drill into summaries, and revisit key points later. It is useful for
students, researchers, writers, and anyone who reads long-form content and wants a faster,
clearer way to understand it.

## Usage

1. Navigate to any article or blog post
2. Click the Nodus extension icon in the Chrome toolbar
3. The side panel will open
4. Enter your Gemini API key in the welcome screen
5. Click "Generate Graph" to transform the article into a knowledge graph
6. Click on nodes or edges to see detailed summaries

## Support

This repository is the official support site for Nodus. If you need help, start here
before opening an issue.

### FAQ

- **What data is sent to the API?** The extension sends the extracted article text to the
  Gemini API to generate the graph. Your API key is stored locally in Chrome.
- **Why do I need an API key?** The Gemini API powers the concept extraction and
  summaries.
- **Does Nodus work on every page?** It works best on readable article pages like wiki's.
  Paywalled and heavily scripted pages may not yield enough text. PDF pages are not
  transcribable by Nodus.

### Troubleshooting

- **"API key not configured"**: Add your Gemini API key in the side panel welcome screen.
- **"Failed to extract article"**: Confirm the page is an article with readable text and
  reload.
- **Graph not showing**: Open the extension page in `chrome://extensions`, check for
  errors, and verify your network connection.
- **Slow generation**: Larger articles may take longer; try a shorter article to verify
  setup.

### Getting help

If the issue persists:

1. Open an issue in this repo.
2. Include the page URL (if shareable), steps to reproduce, and any console errors from
   `chrome://extensions`.

## Features

- Automatic article text extraction
- AI-powered concept extraction (8-12 nodes per article)
- Interactive force-directed graph visualization
- Color-coded node groups
- Detailed summaries for nodes and edges
- Graph persistence across tab switches
- Empty state handling for insufficient content

## Local development and deployment

If you want to run the extension locally, build it yourself, or package it for
distribution, see the [developer guide](src/README.md).
