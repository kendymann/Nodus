import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import * as d3 from "d3";
import type { GraphData, GraphNode, GraphLink } from "../../types";

type ThemeType = "whiteout" | "classic" | "greyscale";

interface GraphViewProps {
	data: GraphData;
	selectedNode?: GraphNode | null;
	theme?: ThemeType;
	onNodeClick?: (node: GraphNode | null) => void;
	onLinkClick?: (link: GraphLink | null) => void;
}

export function GraphView({
	data,
	selectedNode,
	theme = "classic",
	onNodeClick,
	onLinkClick,
}: GraphViewProps) {
	const fgRef = useRef<any>();
	const [dimensions, setDimensions] = useState({ width: 400, height: 600 });

	// Calculate connectivity (degree) for each node
	const nodeDegrees = useMemo(() => {
		const degrees = new Map<string, number>();
		data.nodes.forEach((node) => degrees.set(node.id, 0));
		data.links.forEach((link) => {
			const sourceId =
				typeof link.source === "string"
					? link.source
					: (link.source as any).id || link.source;
			const targetId =
				typeof link.target === "string"
					? link.target
					: (link.target as any).id || link.target;
			degrees.set(sourceId, (degrees.get(sourceId) || 0) + 1);
			degrees.set(targetId, (degrees.get(targetId) || 0) + 1);
		});
		return degrees;
	}, [data]);

	// Identify Root Node (highest number of connections)
	const rootNode = useMemo(() => {
		let maxDegree = -1;
		let rootId = "";
		nodeDegrees.forEach((degree, nodeId) => {
			if (degree > maxDegree) {
				maxDegree = degree;
				rootId = nodeId;
			}
		});
		return data.nodes.find((node) => node.id === rootId) || data.nodes[0];
	}, [data, nodeDegrees]);

	// Calculate active node IDs (selected node + its neighbors)
	const activeNodeIds = useMemo(() => {
		const activeIds = new Set<string>();
		if (selectedNode) {
			activeIds.add(selectedNode.id);
			data.links.forEach((link) => {
				const sourceId =
					typeof link.source === "string"
						? link.source
						: (link.source as any).id || link.source;
				const targetId =
					typeof link.target === "string"
						? link.target
						: (link.target as any).id || link.target;
				if (sourceId === selectedNode.id) {
					activeIds.add(targetId);
				} else if (targetId === selectedNode.id) {
					activeIds.add(sourceId);
				}
			});
		}
		return activeIds;
	}, [selectedNode, data.links]);

	useEffect(() => {
		const updateDimensions = () => {
			setDimensions({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		updateDimensions();
		window.addEventListener("resize", updateDimensions);
		return () => window.removeEventListener("resize", updateDimensions);
	}, []);

	useEffect(() => {
		if (fgRef.current && rootNode) {
			fgRef.current.d3Force("charge")?.strength(-150);
			fgRef.current.d3Force("link")?.distance(50);

			// Center the Root Node: Use radial force to pull Root Node to center (0, 0)
			fgRef.current.d3Force(
				"radial",
				d3.forceRadial(
					(d: any) => {
						if (d.id === rootNode.id) {
							return 0; // Root Node at center
						}
						// Other nodes arranged in layers
						const degree = nodeDegrees.get(d.id) || 0;
						const maxDegree = Math.max(...Array.from(nodeDegrees.values()), 1);
						const normalizedDegree = degree / maxDegree;
						const minRadius = 60;
						const maxRadius = 200;
						return minRadius + (1 - normalizedDegree) * (maxRadius - minRadius);
					},
					0,
					0,
				),
			);

			// Fix root node at center
			const rootNodeData = data.nodes.find((n) => n.id === rootNode.id);
			if (rootNodeData) {
				rootNodeData.fx = 0;
				rootNodeData.fy = 0;
			}

			setTimeout(() => {
				fgRef.current?.zoomToFit(400, 20);
			}, 100);
		}
	}, [data, rootNode, nodeDegrees]);

	const handleNodeClick = useCallback(
		(node: GraphNode) => {
			// Stable Interaction: Simply call parent handler, no camera movement
			if (onNodeClick) {
				onNodeClick(node);
				if (onLinkClick) onLinkClick(null);
			}
		},
		[onNodeClick, onLinkClick],
	);

	const handleLinkClick = useCallback(
		(link: GraphLink) => {
			if (onLinkClick) {
				onLinkClick(link);
				if (onNodeClick) onNodeClick(null);
			}
		},
		[onNodeClick, onLinkClick],
	);

	const handleBackgroundClick = useCallback(() => {
		if (onNodeClick) onNodeClick(null);
		if (onLinkClick) onLinkClick(null);
	}, [onNodeClick, onLinkClick]);

	const paintNode = useCallback(
		(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
			const label = node.label;
			const isRoot = node.id === rootNode.id;

			if (selectedNode) {
				ctx.globalAlpha = activeNodeIds.has(node.id) ? 1.0 : 0.1;
			} else {
				ctx.globalAlpha = 1.0; // Reset to full brightness if nothing is selected
			}
			// Dynamic Node Radius: Based on connectivity (degree)
			const degree = nodeDegrees.get(node.id) || 0;
			const radius = isRoot
				? 12 // Root Node (Main Subject): 12px
				: Math.max(6, Math.min(11, 5 + degree * 1.2)); // Others: scaled based on degree

			const fontSize = 12 / globalScale;
			ctx.font = `${fontSize}px 'Geist Mono', monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			// Theme-based node color
			let color: string;
			let strokeColor: string;

			if (theme === "whiteout") {
				// Whiteout: All nodes are white
				color = "#FFFFFF";
				strokeColor = "#3f3f46"; // Zinc-700 for subtle border
			} else if (theme === "greyscale") {
				// Greyscale: Root is Zinc-100, others are Zinc-500
				color = isRoot ? "#F4F4F5" : "#52525B";
				strokeColor = "#09090b";
			} else {
				// Classic: Use original group colors
				const groupColors = [
					"#3b82f6",
					"#ef4444",
					"#10b981",
					"#f59e0b",
					"#8b5cf6",
					"#ec4899",
					"#06b6d4",
					"#84cc16",
					"#f97316",
					"#6366f1",
				];
				color = groupColors[(node.group - 1) % groupColors.length];
				strokeColor = "#09090b";
			}

			if (isRoot) {
				color = "#FFFFFF";
				strokeColor = "#facc15"; // Yellow outline for root node
			}

			ctx.beginPath();
			ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
			ctx.fillStyle = color;
			ctx.fill();
			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = 2 / globalScale;
			ctx.stroke();

			// Typography: Position labels outside the radius to avoid overlap
			// Text Contrast: Ensure labels remain legible (Zinc-200 or White) regardless of theme
			if (globalScale > 1.5) {
				const textY = node.y! + radius + 15; // Offset based on actual radius
				// Use high-contrast label color for all themes
				const labelColor = "#e4e4e7"; // Zinc-200 for good contrast on dark background
				ctx.fillStyle = labelColor;
				ctx.fillText(label, node.x!, textY);

				const metrics = ctx.measureText(label);
				const textWidth = metrics.width;
				// Background for text readability
				ctx.fillStyle = "rgba(9, 9, 11, 0.8)";
				ctx.fillRect(
					node.x! - textWidth / 2 - 4,
					textY - fontSize / 2 - 2,
					textWidth + 8,
					fontSize + 4,
				);
				ctx.fillStyle = labelColor;
				ctx.fillText(label, node.x!, textY);
			}
		},
		[rootNode, nodeDegrees, selectedNode, activeNodeIds, theme],
	);

	return (
		<div className="w-full h-full bg-zinc-950">
			<ForceGraph2D
				ref={fgRef}
				graphData={data as any}
				nodeLabel=""
				linkLabel=""
				nodeRelSize={8}
				cooldownTicks={100}
				cooldownTime={3000}
				d3AlphaDecay={0.06}
				onEngineStop={() => fgRef.current?.zoomToFit(400, 20)}
				nodeCanvasObject={paintNode}
				linkColor={(link: GraphLink) => {
					if (!selectedNode) {
						return "rgba(113, 113, 122, 0.3)";
					}
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as any).id || link.source;
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as any).id || link.target;
					if (sourceId === selectedNode.id || targetId === selectedNode.id) {
						// Theme-based highlight color
						return theme === "greyscale" ? "#a1a1aa" : "#6366f1"; // Zinc-400 for greyscale, Indigo-500 otherwise
					}
					return "rgba(63, 63, 70, 0.1)";
				}}
				linkWidth={(link: GraphLink) => {
					if (!selectedNode) {
						return 1;
					}
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as any).id || link.source;
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as any).id || link.target;
					if (sourceId === selectedNode.id || targetId === selectedNode.id) {
						return 3;
					}
					return 1;
				}}
				linkDirectionalArrowLength={4}
				linkDirectionalArrowRelPos={1}
				linkDirectionalArrowColor={(link: GraphLink) => {
					if (!selectedNode) {
						return "rgba(113, 113, 122, 0.5)";
					}
					const sourceId =
						typeof link.source === "string"
							? link.source
							: (link.source as any).id || link.source;
					const targetId =
						typeof link.target === "string"
							? link.target
							: (link.target as any).id || link.target;
					if (sourceId === selectedNode.id || targetId === selectedNode.id) {
						// Theme-based highlight color
						return theme === "greyscale" ? "#a1a1aa" : "#6366f1"; // Zinc-400 for greyscale, Indigo-500 otherwise
					}
					return "rgba(63, 63, 70, 0.1)";
				}}
				onNodeClick={handleNodeClick}
				onLinkClick={handleLinkClick}
				onBackgroundClick={handleBackgroundClick}
				width={dimensions.width}
				height={dimensions.height}
			/>
		</div>
	);
}
