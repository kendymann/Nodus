import { GoogleGenerativeAI } from '@google/generative-ai';

// Type definitions for the graph structure
export interface GraphNode {
  id: string;
  label: string;
  summary: string;
  group: number;
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

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Available Gemini models for graph generation
const AVAILABLE_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
let PREFERRED_MODEL_INDEX = 0; // Default to first model; can be updated via future user selection
/*
function setPreferredModel(modelName: string): void {
  const index = AVAILABLE_MODELS.indexOf(modelName);
  if (index !== -1) {
    PREFERRED_MODEL_INDEX = index;
    console.log(`Preferred model set to: ${modelName}`);
  } else {
    console.warn(`Model ${modelName} not found in available models`);
  }
}
*/


const GEMINI_PROMPT = `# ROLE
You are a "Semantic Architect" specializing in graph theory and information synthesis. Your goal is to convert long-form articles into high-density, causal knowledge graphs.

# OUTPUT FORMAT: STRICT JSON
You must return only raw JSON that adheres to this schema:
{
  "nodes": [{"id": "string", "label": "string", "summary": "string", "group": "number"}],
  "links": [{"source": "string", "target": "string", "reason": "string"}]
}

# EXTRACTION RULES
1. LIMIT: Extract exactly 8-12 core concepts. Quality over quantity.
2. GROUPING: Assign numeric IDs (1, 2, 3...) to nodes based on thematic clusters (e.g., all technical terms in group 1, all applications in group 2).
3. SUMMARIES:
   - Node Summary: Exactly 2 sentences. Focus on the definition within this context.
   - Link Reason: Exactly 1 sentence. Explain the causal or logical dependency (e.g., "A is the mathematical foundation for B").
4. SHAPE: Ensure the graph is highly interconnected. Do not create "islands" (isolated nodes).

# CONSTRAINTS
- Articles may be extremely long; focus only on the most significant architectural concepts.
- No conversational text, no markdown wrappers, just the JSON object.

Focus on the architectural connections. If Node A is a requirement for Node B, create a link. Edges must be directional where appropriate.

Article content:
`
async function generateGraph(articleText: string): Promise<GraphData> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  const generationStarted = Date.now();
  const fullPrompt = GEMINI_PROMPT + articleText.substring(0, 100000);

  const preferredModel = AVAILABLE_MODELS[PREFERRED_MODEL_INDEX];

  if (!preferredModel) {
    throw new Error('No Gemini model available to generate graph.');
  }

  console.log('Using Gemini model:', preferredModel);

  try {
    const model = genAI.getGenerativeModel({ model: preferredModel });

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
    console.log(`[timing] Gemini ${preferredModel} response: ${Date.now() - apiStarted}ms`);

    const response = result.response;
    const jsonText = response.text();
    const cleanJson = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const graphData: GraphData = JSON.parse(cleanJson);

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

async function getArticleText(tabId: number): Promise<string> {
  const started = Date.now();
  try {
    try {
      const extractResponse = await chrome.tabs.sendMessage(tabId, {
        type: 'GET_EXTRACTED_TEXT',
      });
      
      if (extractResponse && extractResponse.text) {
        return extractResponse.text;
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
          return extractResponse.text;
        }
      }
      throw e;
    } 
    
    throw new Error('Failed to extract article text');
  } catch (error: any) {
    console.error('Error getting article text:', error);
    throw new Error('Failed to extract article text. Make sure you are on a valid webpage with readable content.');
  } finally {
    console.log(`[timing] getArticleText: ${Date.now() - started}ms`);
  }
}

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === MSG_EXTRACT) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        const pipelineStart = Date.now();
        try {
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

          const graphData = await generateGraph(articleText);
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

