import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { X, Search, Edit, Save, XCircle } from "lucide-react";
import type { GraphNode, GraphLink } from "../../types";
import { MSG_FIND_TEXT } from "../../types";

type ThemeType = "whiteout" | "classic" | "greyscale";
type PanelPosition = "right" | "left" | "bottom";

interface DetailPanelProps {
	node?: GraphNode;
	link?: GraphLink;
	nodes: GraphNode[];
	links: GraphLink[];
	theme?: ThemeType;
	position?: PanelPosition;
	onClose: () => void;
	onUpdateNode?: (nodeId: string, newSummary: string) => void;
	onUpdateConnection?: (sourceId: string, targetId: string, newReason: string) => void;
	onUpdateSourceQuote?: (nodeId: string, newQuote: string) => void;
}

export function DetailPanel({
	node,
	link,
	nodes,
	links,
	theme = "classic",
	position = "right",
	onClose,
	onUpdateNode,
	onUpdateConnection,
	onUpdateSourceQuote,
}: DetailPanelProps) {
	if (!node && !link) return null;

	// Theme prop is available for future theme-aware styling
	// Currently DetailPanel uses Zinc colors which work for all themes
	void theme; // Acknowledge theme prop for consistency

	const [panelWidth, setPanelWidth] = useState(320);
	const [panelHeight, setPanelHeight] = useState(260);
	const resizeActiveRef = useRef(false);
	const resizeStartXRef = useRef(0);
	const resizeStartYRef = useRef(0);
	const resizeStartWidthRef = useRef(320);
	const resizeStartHeightRef = useRef(260);
	const minWidth = 240;
	const maxWidth = 520;
	const minHeight = 200;
	const maxHeight = 420;
	const baseScale = position === "bottom" ? panelHeight / 260 : panelWidth / 320;
	const scale = Math.max(0.85, Math.min(1.2, baseScale));

	const [jumpStatus, setJumpStatus] = useState<"idle" | "searching" | "not-found">(
		"idle",
	);
	const [isEditing, setIsEditing] = useState(false);
	const [editedSummary, setEditedSummary] = useState("");
	const [editingConnectionIndex, setEditingConnectionIndex] = useState<number | null>(
		null,
	);
	const [editedConnectionReason, setEditedConnectionReason] = useState("");
	const [editingSourceQuote, setEditingSourceQuote] = useState(false);
	const [editedSourceQuote, setEditedSourceQuote] = useState("");

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			if (!resizeActiveRef.current) return;
			if (position === "bottom") {
				const delta = resizeStartYRef.current - event.clientY;
				const nextHeight = Math.max(
					minHeight,
					Math.min(maxHeight, resizeStartHeightRef.current + delta),
				);
				setPanelHeight(nextHeight);
				return;
			}

			const delta =
				position === "left"
					? event.clientX - resizeStartXRef.current
					: resizeStartXRef.current - event.clientX;
			const nextWidth = Math.max(
				minWidth,
				Math.min(maxWidth, resizeStartWidthRef.current + delta),
			);
			setPanelWidth(nextWidth);
		};

		const handleMouseUp = () => {
			if (!resizeActiveRef.current) return;
			resizeActiveRef.current = false;
			document.body.style.cursor = "";
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [maxHeight, maxWidth, minHeight, minWidth, position]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const handleResizeMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
		resizeActiveRef.current = true;
		resizeStartXRef.current = event.clientX;
		resizeStartYRef.current = event.clientY;
		resizeStartWidthRef.current = panelWidth;
		resizeStartHeightRef.current = panelHeight;
		document.body.style.cursor = position === "bottom" ? "row-resize" : "col-resize";
	};

	const handleEdit = () => {
		if (node) {
			setEditedSummary(node.summary);
			setIsEditing(true);
		}
	};

	const handleSave = () => {
		if (node && onUpdateNode) {
			onUpdateNode(node.id, editedSummary);
			setIsEditing(false);
		}
	};

	const handleCancel = () => {
		setIsEditing(false);
		setEditedSummary("");
	};

	const handleEditConnection = (index: number, reason: string) => {
		setEditedConnectionReason(reason);
		setEditingConnectionIndex(index);
	};

	const handleSaveConnection = (connection: { neighbor: GraphNode; reason: string }) => {
		if (node && onUpdateConnection) {
			onUpdateConnection(node.id, connection.neighbor.id, editedConnectionReason);
			setEditingConnectionIndex(null);
			setEditedConnectionReason("");
		}
	};

	const handleCancelConnection = () => {
		setEditingConnectionIndex(null);
		setEditedConnectionReason("");
	};

	const handleEditSourceQuote = () => {
		if (node?.sourceQuote) {
			setEditedSourceQuote(node.sourceQuote);
			setEditingSourceQuote(true);
		}
	};

	const handleSaveSourceQuote = () => {
		if (node && onUpdateSourceQuote) {
			onUpdateSourceQuote(node.id, editedSourceQuote);
			setEditingSourceQuote(false);
		}
	};

	const handleCancelSourceQuote = () => {
		setEditingSourceQuote(false);
		setEditedSourceQuote("");
	};

	const handleJumpToSource = async () => {
		if (!node?.sourceQuote) {
			setJumpStatus("not-found");
			setTimeout(() => setJumpStatus("idle"), 2000);
			return;
		}

		setJumpStatus("searching");

		try {
			const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
			if (tabs[0]?.id) {
				const response = await chrome.tabs.sendMessage(tabs[0].id, {
					type: MSG_FIND_TEXT,
					payload: { quote: node.sourceQuote },
				});

				if (response?.found) {
					setJumpStatus("idle");
				} else {
					setJumpStatus("not-found");
					setTimeout(() => setJumpStatus("idle"), 2000);
				}
			} else {
				setJumpStatus("not-found");
				setTimeout(() => setJumpStatus("idle"), 2000);
			}
		} catch (error) {
			console.error("Error jumping to source:", error);
			setJumpStatus("not-found");
			setTimeout(() => setJumpStatus("idle"), 2000);
		}
	};

	// Helper to get node ID from link source/target (handles both string and object)
	const getNodeId = (linkEnd: string | GraphNode): string => {
		return typeof linkEnd === "string" ? linkEnd : linkEnd.id;
	};

	// Get all connections for the selected node
	const getNodeConnections = (selectedNode: GraphNode) => {
		const connections: Array<{ neighbor: GraphNode; reason: string }> = [];

		links.forEach((link) => {
			const sourceId = getNodeId(link.source);
			const targetId = getNodeId(link.target);

			if (sourceId === selectedNode.id) {
				const neighbor = nodes.find((n) => n.id === targetId);
				if (neighbor) {
					connections.push({ neighbor, reason: link.reason });
				}
			} else if (targetId === selectedNode.id) {
				const neighbor = nodes.find((n) => n.id === sourceId);
				if (neighbor) {
					connections.push({ neighbor, reason: link.reason });
				}
			}
		});

		return connections;
	};

	return (
		<div
			className={`relative bg-zinc-900/40 backdrop-blur-xl flex flex-col shrink-0 z-50 ${
				position === "bottom"
					? "w-full border-t border-white/10"
					: position === "left"
						? "h-full border-r border-white/10"
						: "h-full border-l border-white/10"
			}`}
			style={position === "bottom" ? { height: panelHeight } : { width: panelWidth }}>
			<div
				className={`absolute bg-white/5 hover:bg-white/10 transition-colors ${
					position === "bottom"
						? "left-0 top-0 h-2 w-full cursor-row-resize"
						: position === "left"
							? "right-0 top-0 h-full w-2 cursor-col-resize"
							: "left-0 top-0 h-full w-2 cursor-col-resize"
				}`}
				onMouseDown={handleResizeMouseDown}
				aria-label="Resize details panel"
				role="separator"
			/>
			<div className="p-6 flex-1 overflow-y-auto" style={{ zoom: scale }}>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-lg font-semibold text-zinc-50 font-sans">Details</h2>
					<button
						onClick={onClose}
						className="text-zinc-400 hover:text-zinc-200 transition-colors"
						aria-label="Close panel">
						<X className="w-5 h-5" />
					</button>
				</div>

				{node && (
					<div>
						<h3 className="text-xl font-semibold text-zinc-50 mb-3 font-sans">
							{node.label}
						</h3>

						{/* Summary with Edit Capability */}
						<div className="mb-6">
							{isEditing ? (
								<div className="space-y-3">
									<textarea
										value={editedSummary}
										onChange={(e) => setEditedSummary(e.target.value)}
										className="w-full min-h-[120px] px-3 py-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 text-zinc-300 text-sm leading-relaxed font-sans rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 resize-y"
										placeholder="Enter node summary..."
									/>
									<div className="flex gap-2">
										<button
											onClick={handleSave}
											className="px-3 py-1.5 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded-lg transition-colors text-sm font-sans flex items-center gap-1.5">
											<Save className="w-3.5 h-3.5" />
											Save
										</button>
										<button
											onClick={handleCancel}
											className="px-3 py-1.5 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-zinc-400 hover:text-white rounded-lg transition-colors text-sm font-sans flex items-center gap-1.5">
											<XCircle className="w-3.5 h-3.5" />
											Cancel
										</button>
									</div>
								</div>
							) : (
								<div>
									<p className="text-zinc-300 text-sm leading-relaxed font-sans mb-2">
										{node.summary}
									</p>
									{onUpdateNode && (
										<button
											onClick={handleEdit}
											className="px-2 py-1 text-xs bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-zinc-400 hover:text-white rounded transition-colors font-sans flex items-center gap-1.5">
											<Edit className="w-3 h-3" />
											Edit
										</button>
									)}
								</div>
							)}
						</div>

						{/* Connections Section */}
						{getNodeConnections(node).length > 0 && (
							<div className="mt-6 pt-6 border-t border-white/10">
								<h4 className="text-sm font-semibold text-zinc-50 mb-4 font-sans uppercase tracking-wide">
									Connections
								</h4>
								<div className="space-y-4">
									{getNodeConnections(node).map((connection, index) => (
										<div
											key={index}
											className="pb-4 border-b border-white/5 last:border-b-0 last:pb-0">
											<div className="text-sm font-medium text-zinc-300 mb-1.5 font-sans">
												{connection.neighbor.label}
											</div>
											{editingConnectionIndex === index ? (
												<div className="space-y-2">
													<textarea
														value={editedConnectionReason}
														onChange={(e) => setEditedConnectionReason(e.target.value)}
														className="w-full min-h-[60px] px-2 py-1.5 bg-zinc-900/40 backdrop-blur-xl border border-white/10 text-zinc-300 text-xs leading-relaxed font-sans rounded focus:outline-none focus:ring-2 focus:ring-zinc-700 resize-y"
														placeholder="Enter connection reason..."
													/>
													<div className="flex gap-2">
														<button
															onClick={() => handleSaveConnection(connection)}
															className="px-2 py-1 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded transition-colors text-xs font-sans flex items-center gap-1">
															<Save className="w-3 h-3" />
															Save
														</button>
														<button
															onClick={handleCancelConnection}
															className="px-2 py-1 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-zinc-400 hover:text-white rounded transition-colors text-xs font-sans flex items-center gap-1">
															<XCircle className="w-3 h-3" />
															Cancel
														</button>
													</div>
												</div>
											) : (
												<div>
													<p className="text-xs text-zinc-400 leading-relaxed font-sans mb-1">
														{connection.reason}
													</p>
													{onUpdateConnection && (
														<button
															onClick={() =>
																handleEditConnection(index, connection.reason)
															}
															className="px-1.5 py-0.5 text-xs bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-zinc-400 hover:text-white rounded transition-colors font-sans flex items-center gap-1">
															<Edit className="w-2.5 h-2.5" />
															Edit
														</button>
													)}
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Source Evidence Section */}
						<div className="mt-6 pt-6 border-t border-white/5">
							<h4 className="text-sm font-semibold text-zinc-50 mb-4 font-sans uppercase tracking-wide">
								SOURCE EVIDENCE
							</h4>
							{node.sourceQuote ? (
								<div className="space-y-2">
									{editingSourceQuote ? (
										<div className="space-y-2">
											<textarea
												value={editedSourceQuote}
												onChange={(e) => setEditedSourceQuote(e.target.value)}
												className="w-full min-h-[80px] px-2 py-1.5 bg-zinc-900/40 backdrop-blur-xl border border-white/10 text-zinc-300 text-xs italic leading-relaxed font-sans rounded focus:outline-none focus:ring-2 focus:ring-zinc-700 resize-y"
												placeholder="Enter source quote..."
											/>
											<div className="flex gap-2">
												<button
													onClick={handleSaveSourceQuote}
													className="px-2 py-1 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded transition-colors text-xs font-sans flex items-center gap-1">
													<Save className="w-3 h-3" />
													Save
												</button>
												<button
													onClick={handleCancelSourceQuote}
													className="px-2 py-1 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-zinc-400 hover:text-white rounded transition-colors text-xs font-sans flex items-center gap-1">
													<XCircle className="w-3 h-3" />
													Cancel
												</button>
											</div>
										</div>
									) : (
										<>
											<p className="text-xs text-zinc-400 italic leading-relaxed font-sans">
												"{node.sourceQuote}"
											</p>
											<div className="flex gap-2">
												<button
													onClick={handleJumpToSource}
													disabled={jumpStatus === "searching"}
													className="px-2 py-1 text-xs bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded transition-colors font-sans flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
													aria-label="Jump to source">
													<Search className="w-3 h-3" />
													<span>
														{jumpStatus === "searching"
															? "Searching..."
															: jumpStatus === "not-found"
																? "Source not found"
																: "Jump to Source"}
													</span>
												</button>
												{onUpdateSourceQuote && (
													<button
														onClick={handleEditSourceQuote}
														className="px-2 py-1 text-xs bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-zinc-400 hover:text-white rounded transition-colors font-sans flex items-center gap-1">
														<Edit className="w-3 h-3" />
														Edit
													</button>
												)}
											</div>
										</>
									)}
								</div>
							) : (
								<p className="text-xs text-zinc-500 italic leading-relaxed font-sans">
									Source context unavailable.
								</p>
							)}
						</div>
					</div>
				)}

				{link && (
					<div>
						<h3 className="text-lg font-semibold text-zinc-50 mb-3 font-sans">
							Connection
						</h3>
						<div className="mb-3">
							<span className="text-zinc-300 font-medium">
								{nodes.find((n) => n.id === getNodeId(link.source))?.label ||
									getNodeId(link.source)}
							</span>
							<span className="text-zinc-500 mx-2">→</span>
							<span className="text-zinc-300 font-medium">
								{nodes.find((n) => n.id === getNodeId(link.target))?.label ||
									getNodeId(link.target)}
							</span>
						</div>
						<p className="text-zinc-300 text-sm leading-relaxed font-sans">
							{link.reason}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
