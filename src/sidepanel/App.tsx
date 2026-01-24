import { useState, useEffect, useRef } from 'react';
import { GraphView } from './components/GraphView';
import { DetailPanel } from './components/DetailPanel';
import { NodusLogo } from './components/NodusLogo';
import { ArrowLeft, RefreshCw, ChevronDown, Settings } from 'lucide-react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { useCurrentTab } from '../hooks/useCurrentTab';
import type { GraphData, GraphNode, GraphLink, Message } from '../types';
import { MSG_EXTRACT, MSG_EXTRACTED, MSG_GRAPH_DATA, MSG_ERROR } from '../types';

type ModelOption = 'gemini-2.5-flash-lite' | 'gemini-2.5-flash';
type ThemeType = 'normal' | 'classic' | 'monochrome';

const MODEL_OPTIONS: { value: ModelOption; label: string; description: string }[] = [
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Fast' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Detailed' },
];

const THEME_OPTIONS: { value: ThemeType; label: string; description: string }[] = [
  { value: 'normal', label: 'Normal', description: 'Minimalist White' },
  { value: 'classic', label: 'Classic', description: 'Clustered Colors' },
  { value: 'monochrome', label: 'Monochrome', description: 'Zinc Scale' },
];

export function App() {
  const currentUrl = useCurrentTab();
  const [storedGraph, setStoredGraph] = useChromeStorage(currentUrl);
  const [graphData, setGraphData] = useState<GraphData | null>(storedGraph);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>('gemini-2.5-flash-lite');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeType>('normal');
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storedGraph) {
      setGraphData(storedGraph);
      setError(null);
    } else {
      setGraphData(null);
    }
  }, [storedGraph, currentUrl]);

  useEffect(() => {
    const messageListener = (message: Message) => {
      if (message.type === MSG_EXTRACTED) {
        setExtracting(false);
        setLoading(true);
      } else if (message.type === MSG_GRAPH_DATA) {
        setLoading(false);
        setExtracting(false);
        setError(null);
        if (message.payload?.graphData) {
          const data = message.payload.graphData as GraphData;
          if (data.nodes.length < 3) {
            setError('Insufficient content: The article does not contain enough concepts to generate a meaningful graph.');
          } else {
            setGraphData(data);
            setStoredGraph(data);
          }
        }
      } else if (message.type === MSG_ERROR) {
        setLoading(false);
        setExtracting(false);
        setError(message.payload?.error || 'An error occurred while processing the article.');
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [setStoredGraph]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };

    if (dropdownOpen || themeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen, themeDropdownOpen]);

  const handleGenerate = () => {
    setError(null);
    setExtracting(true);
    setSelectedNode(null);
    setSelectedLink(null);
    setDropdownOpen(false);

    chrome.runtime.sendMessage({
      type: MSG_EXTRACT,
      payload: { modelType: selectedModel },
    });
  };

  const handleBack = () => {
    setGraphData(null);
    setSelectedNode(null);
    setSelectedLink(null);
    setError(null);
  };

  const handleModelSelect = (model: ModelOption) => {
    setSelectedModel(model);
    setDropdownOpen(false);
  };

  const handleThemeSelect = (selectedTheme: ThemeType) => {
    setTheme(selectedTheme);
    setThemeDropdownOpen(false);
  };

  const handleNodeClick = (node: GraphNode | null) => {
    setSelectedNode(node);
    if (node) setSelectedLink(null);
  };

  const handleLinkClick = (link: GraphLink | null) => {
    setSelectedLink(link);
    if (link) setSelectedNode(null);
  };

  const handleCloseDetail = () => {
    setSelectedNode(null);
    setSelectedLink(null);
  };

  // Helper to prepare graph data for storage
  // D3 mutates links to have object references, we need to convert back to string IDs
  const prepareForStorage = (data: GraphData): GraphData => {
    return {
      nodes: data.nodes.map(node => ({
        id: node.id,
        label: node.label,
        summary: node.summary,
        group: node.group,
        sourceQuote: node.sourceQuote,
        // Include D3 simulation properties
        x: node.x,
        y: node.y,
        vx: node.vx,
        vy: node.vy,
        fx: node.fx,
        fy: node.fy,
      })),
      links: data.links.map(link => ({
        source: typeof link.source === 'string' ? link.source : (link.source as any).id,
        target: typeof link.target === 'string' ? link.target : (link.target as any).id,
        reason: link.reason,
      })),
    };
  };

  const handleUpdateNode = (nodeId: string, newSummary: string) => {
    if (!graphData) return;

    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      // Mutate the node directly
      node.summary = newSummary;

      // Update selectedNode to trigger DetailPanel re-render
      setSelectedNode({ ...node });

      // Save to storage with proper serialization
      setStoredGraph(prepareForStorage(graphData));
    }
  };

  const handleUpdateConnection = (sourceId: string, targetId: string, newReason: string) => {
    if (!graphData) return;

    // Find the link between these nodes
    const link = graphData.links.find(l => {
      const src = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const tgt = typeof l.target === 'string' ? l.target : (l.target as any).id;
      return (src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId);
    });

    if (link) {
      // Mutate the link's reason
      link.reason = newReason;

      // Trigger DetailPanel re-render
      if (selectedNode) {
        setSelectedNode({ ...selectedNode });
      }

      // Save to storage with proper serialization
      setStoredGraph(prepareForStorage(graphData));
    }
  };

  const handleUpdateSourceQuote = (nodeId: string, newQuote: string) => {
    if (!graphData) return;

    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      // Mutate the node's sourceQuote
      node.sourceQuote = newQuote;

      // Trigger DetailPanel re-render
      setSelectedNode({ ...node });

      // Save to storage with proper serialization
      setStoredGraph(prepareForStorage(graphData));
    }
  };

  if (loading || extracting) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16">
          <NodusLogo className="w-full h-full text-zinc-400" isAnimating={true} />
        </div>
        <p className="mt-6 text-zinc-400 text-sm font-mono">Mapping Concepts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4 text-sm font-mono">{error}</div>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-sans"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col">
        {/* Solid Glass Header */}
        <header className="w-full bg-zinc-900/40 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-center shrink-0">
          <NodusLogo className="w-6 h-6 text-zinc-400" isAnimating={false} />
        </header>

        {/* Welcome Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <NodusLogo className="w-12 h-12 text-zinc-400 mx-auto mb-4" isAnimating={false} />
            <h2 className="text-xl font-semibold text-white mb-2 font-sans">
              Welcome to Nodus
            </h2>
            <p className="text-zinc-400 text-sm mb-6 font-sans">
              Transform this article into an interactive knowledge graph. Click the button below to extract and visualize the concepts.
            </p>

            {/* Split Glass Button */}
            <div className="relative inline-flex" ref={dropdownRef}>
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded-l-lg transition-colors font-sans flex items-center gap-2"
              >
                Generate Graph
              </button>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-3 bg-zinc-900/40 backdrop-blur-xl border border-white/10 border-l-0 hover:bg-zinc-900/60 text-white rounded-r-lg transition-colors"
                aria-label="Select model"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden z-[100]">
                  {MODEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleModelSelect(option.value)}
                      className={`w-full px-4 py-3 text-left hover:bg-zinc-900/60 transition-colors border-b border-white/5 last:border-b-0 ${selectedModel === option.value ? 'bg-zinc-900/60' : ''
                        }`}
                    >
                      <div className="text-white text-sm font-medium">{option.label}</div>
                      <div className="text-zinc-400 text-xs mt-0.5">{option.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col overflow-hidden">
      {/* Solid Glass Header with Navigation */}
      <header className="relative z-50 w-full bg-zinc-900/40 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <NodusLogo className="w-6 h-6 text-zinc-400" isAnimating={false} />
        </div>
        <div className="flex items-center gap-2">
          {/* Theme Dropdown */}
          <div className="relative" ref={themeDropdownRef}>
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="px-3 py-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded-lg transition-colors text-sm font-sans flex items-center gap-2"
              aria-label="Select theme"
            >
              <Settings className="w-4 h-4" />
              <span>Theme</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${themeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {themeDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden z-[100]">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleThemeSelect(option.value)}
                    className={`w-full px-4 py-3 text-left hover:bg-zinc-900/60 transition-colors border-b border-white/5 last:border-b-0 ${theme === option.value ? 'bg-zinc-900/60' : ''
                      }`}
                  >
                    <div className="text-white text-sm font-medium">{option.label}</div>
                    <div className="text-zinc-400 text-xs mt-0.5">{option.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleBack}
            className="p-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded-lg transition-colors"
            aria-label="Back to welcome"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleGenerate}
            className="p-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded-lg transition-colors"
            aria-label="Regenerate graph"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Graph View and Sidebar Container */}
      <div className="relative z-0 flex-1 flex overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <GraphView
            data={graphData}
            selectedNode={selectedNode}
            theme={theme}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
          />
        </div>
        {(selectedNode || selectedLink) && (
          <DetailPanel
            node={selectedNode || undefined}
            link={selectedLink || undefined}
            nodes={graphData.nodes}
            links={graphData.links}
            theme={theme}
            onClose={handleCloseDetail}
            onUpdateNode={handleUpdateNode}
            onUpdateConnection={handleUpdateConnection}
            onUpdateSourceQuote={handleUpdateSourceQuote}
          />
        )}
      </div>
    </div>
  );
}

