import { GoogleGenerativeAI } from '@google/generative-ai';

// Type definitions for the graph structure
export interface GraphNode {
  id: string;
  label: string;
  summary: string;
  group: number;
  sourceQuote?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  reason: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Message {
  type: string;
  payload?: any;
}

export const MSG_EXTRACT = 'MSG_EXTRACT';
export const MSG_EXTRACTED = 'MSG_EXTRACTED';
export const MSG_GRAPH_DATA = 'MSG_GRAPH_DATA';
export const MSG_ERROR = 'MSG_ERROR';
export const MSG_VALIDATE_KEY = 'MSG_VALIDATE_KEY';

const GEMINI_API_KEY_STORAGE_KEY = 'geminiApiKey';

// Available Gemini models for graph generation
const AVAILABLE_MODELS: string[] = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];


const GEMINI_PROMPT = `# ROLE
You are a "Knowledge Architect" specializing in hierarchical information synthesis. Your goal is to convert long-form articles into structured, two-tier knowledge graphs that reflect the natural hierarchy of ideas.

# OUTPUT FORMAT: STRICT JSON
Strict Requirement: Your output must be a single JSON object. Do not include any introductory text, markdown code blocks, or trailing explanations. Return ONLY the raw JSON object, nothing else.
{
  "nodes": [{"id": "string", "label": "string", "summary": "string", "group": "number", "sourceQuote": "string"}],
  "links": [{"source": "string", "target": "string", "reason": "string"}]
}

# HIERARCHICAL PILLAR EXTRACTION STRATEGY

## The Architecture:

### THE ROOT (id: "root")
Create one central node representing the main subject or title of the article. This must have the highest degree of connectivity.

### TIER 1: PILLARS (3-5 nodes)
Identify the high-level themes, chapters, or core concepts that support the Root.

### TIER 2: DETAILS (2-4 nodes per Pillar)
Specific facts, examples, or sub-concepts that substantiate each Pillar.

## CONNECTIVITY RULES:

1. ROOT AT CENTER: All Pillar nodes MUST connect to the "root" node.

2. DETAIL-TO-PILLAR: Every Detail node MUST link to its parent Pillar node. The reason should explain how this detail supports the pillar.

3. PILLAR-TO-PILLAR: Link Pillars to each other ONLY if there is a direct thematic bridge or dependency.

4. VISUAL HIERARCHY: Ensure Pillar nodes naturally gain more connections than Detail nodes so they appear larger in the force-directed graph.

## EXTRACTION REQUIREMENTS:

1. NODE SUMMARY: Exactly 2 sentences. Focus on the definition within this context using actual article content.

2. SOURCE QUOTES: Every node (Root, Pillar, or Detail) MUST have a verbatim "sourceQuote" from the text for the citation feature. If no quote exists, use "".

3. GROUPING: Root = 0, Pillars = 1, Details = 2+ (Group details based on which Pillar they support).

4. LINK REASONS: Exactly 1 sentence explaining the hierarchical relationship for the sidebar context.

## CONSTRAINTS:
- Articles may be long; focus only on the most significant structural concepts.
- No conversational text. No markdown. Just the JSON object.

Article content:
`
async function generateGraph(articleText: string, modelType: string | undefined, apiKey: string): Promise<GraphData> {
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add your key in the Nodus side panel.');
  }

  const generationStarted = Date.now();
  const fullPrompt = GEMINI_PROMPT + articleText.substring(0, 100000);

  // Use provided modelType or default to first model
  const selectedModel = modelType && AVAILABLE_MODELS.includes(modelType) 
    ? modelType 
    : AVAILABLE_MODELS[0];

  if (!selectedModel) {
    throw new Error('No Gemini model available to generate graph.');
  }

  console.log('Using Gemini model:', selectedModel);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: selectedModel });

    const apiStarted = Date.now();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });
    console.log(`[timing] Gemini ${selectedModel} response: ${Date.now() - apiStarted}ms`);

    const response = result.response;
    const jsonText = response.text();
    const cleanJson = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let graphData: GraphData;
    try {
      graphData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', jsonText);
      throw new Error('The AI returned invalid JSON. Please try regenerating the graph.');
    }

    // Safety check to prevent .filter() crashes
    if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.links)) {
      console.error("Invalid AI response structure:", graphData);
      throw new Error("The AI returned a malformed graph. Please try regenerating.");
    }

    if (!graphData.nodes || graphData.nodes.length < 3) {
      throw new Error('Insufficient content: Generated graph has fewer than 3 nodes');
    }

    const nodeIds = new Set(graphData.nodes.map(n => n.id));
    graphData.links = graphData.links.filter(link =>
      nodeIds.has(link.source) && nodeIds.has(link.target)
    );

    console.log(`[timing] generateGraph total: ${Date.now() - generationStarted}ms`);
    return graphData;
  } catch (error: any) {
    console.error('Gemini generation failed:', error?.message || error);
    throw new Error(error?.message || 'Failed to generate graph with Gemini.');
  }
}

async function getStoredApiKey(): Promise<string> {
  const result = await chrome.storage.local.get(GEMINI_API_KEY_STORAGE_KEY);
  return result[GEMINI_API_KEY_STORAGE_KEY] || '';
}

async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function getArticleText(tabId: number): Promise<string> {
  const started = Date.now();
  try {
    try {
      const extractResponse = await chrome.tabs.sendMessage(tabId, {
        type: 'GET_EXTRACTED_TEXT',
      });
      
      if (extractResponse && extractResponse.text) {
        const text = extractResponse.text.trim();
        if (text.length < 100) {
          throw new Error('Article text too short. This page may be behind a paywall or have no readable content.');
        }
        return text;
      }
    } catch (e: any) {
      if (e.message?.includes('Receiving end does not exist') || 
          e.message?.includes('Could not establish connection')) {
        console.log('Content script not ready, injecting dynamically...');
        
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const extractResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'GET_EXTRACTED_TEXT',
        });
        
        if (extractResponse && extractResponse.text) {
          const text = extractResponse.text.trim();
          if (text.length < 100) {
            throw new Error('Article text too short. This page may be behind a paywall or have no readable content.');
          }
          return text;
        }
      }
      throw e;
    } 
    
    throw new Error('Failed to extract article text. This page may be behind a paywall or have no readable content.');
  } catch (error: any) {
    console.error('Error getting article text:', error);
    const errorMessage = error.message || 'Failed to extract article text. Make sure you are on a valid webpage with readable content.';
    throw new Error(errorMessage);
  } finally {
    console.log(`[timing] getArticleText: ${Date.now() - started}ms`);
  }
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === MSG_VALIDATE_KEY) {
    const apiKey = message.payload?.apiKey || '';
    validateGeminiApiKey(apiKey)
      .then((valid) => sendResponse({ valid }))
      .catch(() => sendResponse({ valid: false }));
    return true;
  }

  if (message.type === MSG_EXTRACT) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        const pipelineStart = Date.now();
        try {
          const apiKey = await getStoredApiKey();
          const extractStart = Date.now();
          const articleText = await getArticleText(tabs[0].id);
          console.log(`[timing] extractArticleText: ${Date.now() - extractStart}ms`);

          if (!articleText || articleText.trim().length < 100) {
            throw new Error('Article text too short or empty. Please ensure you are on a valid article page.');
          }

          chrome.runtime.sendMessage({
            type: MSG_EXTRACTED,
            payload: { text: articleText },
          }).catch(() => {});

          // Extract modelType from message payload
          const modelType = message.payload?.modelType;
          const graphData = await generateGraph(articleText, modelType, apiKey);
          const url = tabs[0].url || '';
          await chrome.storage.local.set({ [url]: graphData });

          chrome.runtime.sendMessage({
            type: MSG_GRAPH_DATA,
            payload: { graphData, url },
          }).catch(() => {});

          console.log(`[timing] pipeline total: ${Date.now() - pipelineStart}ms`);
        } catch (error: any) {
          console.error('Error processing article:', error);
          chrome.runtime.sendMessage({
            type: MSG_ERROR,
            payload: { error: error.message || 'Failed to process article' },
          }).catch(() => {});
        }
      }
    });

    return true;
  }

  return false;
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    const result = await chrome.storage.local.get(tab.url);
    if (result[tab.url]) {
      chrome.runtime.sendMessage({
        type: MSG_GRAPH_DATA,
        payload: { graphData: result[tab.url], url: tab.url },
      }).catch(() => {});
    }
  }
});

