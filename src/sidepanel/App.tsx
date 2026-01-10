import { useState, useEffect } from 'react';
import { GraphView } from './components/GraphView';
import { DetailPanel } from './components/DetailPanel';
import { Loader } from './components/Loader';
import { Sparkles } from 'lucide-react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { useCurrentTab } from '../hooks/useCurrentTab';
import type { GraphData, GraphNode, GraphLink, Message } from '../types';
import { MSG_EXTRACT, MSG_EXTRACTED, MSG_GRAPH_DATA, MSG_ERROR } from '../types';

export function App() {
  const currentUrl = useCurrentTab();
  const [storedGraph, setStoredGraph] = useChromeStorage(currentUrl);
  const [graphData, setGraphData] = useState<GraphData | null>(storedGraph);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

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

  const handleGenerate = () => {
    setError(null);
    setExtracting(true);
    setSelectedNode(null);
    setSelectedLink(null);
    
    chrome.runtime.sendMessage({
      type: MSG_EXTRACT,
    });
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

  if (loading || extracting) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <Loader />
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
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Sparkles className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2 font-sans">
            Welcome to LexiGraph
          </h2>
          <p className="text-zinc-400 text-sm mb-6 font-sans">
            Transform this article into an interactive knowledge graph. Click the button below to extract and visualize the concepts.
          </p>
          <button
            onClick={handleGenerate}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-sans flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            Generate Graph
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-zinc-950 relative overflow-hidden">
      <GraphView
        data={graphData}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
      />
      {(selectedNode || selectedLink) && (
        <DetailPanel
          node={selectedNode || undefined}
          link={selectedLink || undefined}
          nodes={graphData.nodes}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

