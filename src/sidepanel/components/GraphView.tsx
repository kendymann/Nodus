import { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphData, GraphNode, GraphLink } from '../../types';

interface GraphViewProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode | null) => void;
  onLinkClick?: (link: GraphLink | null) => void;
}

const GROUP_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

export function GraphView({ data, onNodeClick, onLinkClick }: GraphViewProps) {
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-150);
      fgRef.current.d3Force('link')?.distance(50);
      
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 20);
      }, 100);
    }
  }, [data]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (onNodeClick) {
      onNodeClick(node);
      if (onLinkClick) onLinkClick(null);
    }
  }, [onNodeClick, onLinkClick]);

  const handleLinkClick = useCallback((link: GraphLink) => {
    if (onLinkClick) {
      onLinkClick(link);
      if (onNodeClick) onNodeClick(null);
    }
  }, [onNodeClick, onLinkClick]);

  const handleBackgroundClick = useCallback(() => {
    if (onNodeClick) onNodeClick(null);
    if (onLinkClick) onLinkClick(null);
  }, [onNodeClick, onLinkClick]);

  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px 'Geist Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const color = GROUP_COLORS[(node.group - 1) % GROUP_COLORS.length];
    
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, 8, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2 / globalScale;
    ctx.stroke();

    if (globalScale > 1.5) {
      const textY = node.y! + 15;
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText(label, node.x!, textY);
      
      const metrics = ctx.measureText(label);
      const textWidth = metrics.width;
      ctx.fillStyle = 'rgba(9, 9, 11, 0.8)';
      ctx.fillRect(
        node.x! - textWidth / 2 - 4,
        textY - fontSize / 2 - 2,
        textWidth + 8,
        fontSize + 4
      );
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText(label, node.x!, textY);
    }
  }, []);

  return (
    <div className="w-full h-full bg-zinc-950">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        nodeLabel=""
        linkLabel=""
        nodeRelSize={8}
        cooldownTicks={100}
        cooldownTime={3000}
        onEngineStop={() => fgRef.current?.zoomToFit(400, 20)}
        nodeCanvasObject={paintNode}
        linkColor={() => 'rgba(113, 113, 122, 0.3)'}
        linkWidth={1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={() => 'rgba(113, 113, 122, 0.5)'}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onBackgroundClick={handleBackgroundClick}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}

