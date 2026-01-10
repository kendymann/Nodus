import { X } from 'lucide-react';
import type { GraphNode, GraphLink } from '../../types';

interface DetailPanelProps {
  node?: GraphNode;
  link?: GraphLink;
  nodes: GraphNode[];
  onClose: () => void;
}

export function DetailPanel({ node, link, nodes, onClose }: DetailPanelProps) {
  if (!node && !link) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 p-6 rounded-t-2xl shadow-2xl">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {node && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-2 font-sans">
            {node.label}
          </h3>
          <p className="text-zinc-300 text-sm leading-relaxed font-sans mb-4">
            {node.summary}
          </p>
          <div className="text-xs text-zinc-500 font-mono">
            Group {node.group}
          </div>
        </div>
      )}

      {link && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 font-sans">
            Connection
          </h3>
          <div className="mb-3">
            <span className="text-zinc-300 font-medium">
              {nodes.find(n => n.id === link.source)?.label || link.source}
            </span>
            <span className="text-zinc-500 mx-2">→</span>
            <span className="text-zinc-300 font-medium">
              {nodes.find(n => n.id === link.target)?.label || link.target}
            </span>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed font-sans">
            {link.reason}
          </p>
        </div>
      )}
    </div>
  );
}

