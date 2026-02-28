import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { GraphView } from "./components/GraphView";
import { DetailPanel } from "./components/DetailPanel";
import { NodusLogo } from "./components/NodusLogo";
import {
	ArrowLeft,
	RefreshCw,
	ChevronDown,
	Settings,
	Check,
	HelpCircle,
} from "lucide-react";
import { useChromeStorage } from "../hooks/useChromeStorage";
import { useCurrentTab } from "../hooks/useCurrentTab";
import type { GraphData, GraphNode, GraphLink, Message } from "../types";
import {
	MSG_EXTRACT,
	MSG_EXTRACTED,
	MSG_GRAPH_DATA,
	MSG_ERROR,
	MSG_VALIDATE_KEY,
} from "../types";

type ModelOption = "gemini-2.5-flash-lite" | "gemini-2.5-flash";
type ThemeType = "whiteout" | "classic" | "greyscale";
type PanelPosition = "right" | "left" | "bottom";

const MODEL_OPTIONS: { value: ModelOption; label: string; description: string }[] = [
	{ value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", description: "Fast" },
	{ value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Detailed" },
];

const THEME_OPTIONS: { value: ThemeType; label: string }[] = [
	{ value: "classic", label: "Classic" },
	{ value: "whiteout", label: "Whiteout" },
	{ value: "greyscale", label: "Greyscale" },
];

const GEMINI_API_KEY_HELP_URL = "https://aistudio.google.com/app/apikey";

export function App() {
	const currentUrl = useCurrentTab();
	const [storedGraph, setStoredGraph] = useChromeStorage(currentUrl);
	const [graphData, setGraphData] = useState<GraphData | null>(storedGraph);
	const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
	const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [extracting, setExtracting] = useState(false);
	const [selectedModel, setSelectedModel] = useState<ModelOption>(
		"gemini-2.5-flash-lite",
	);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [theme, setTheme] = useState<ThemeType>("classic");
	const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
	const themeDropdownRef = useRef<HTMLDivElement>(null);
	const [panelPosition, setPanelPosition] = useState<PanelPosition>("right");
	const [apiKey, setApiKey] = useState("");
	const [apiKeyStatus, setApiKeyStatus] = useState<
		"idle" | "checking" | "valid" | "invalid"
	>("idle");
	const [apiKeyTouched, setApiKeyTouched] = useState(false);

	useEffect(() => {
		chrome.storage.local.get("geminiApiKey", (result) => {
			const storedKey = result.geminiApiKey as string | undefined;
			if (storedKey) {
				setApiKey(storedKey);
				setApiKeyStatus("valid");
			}
		});
	}, []);

	useEffect(() => {
		const trimmedKey = apiKey.trim();
		if (!trimmedKey) {
			setApiKeyStatus("idle");
			chrome.storage.local.remove("geminiApiKey");
			return;
		}

		setApiKeyStatus("checking");
		let isActive = true;
		const timer = setTimeout(() => {
			chrome.runtime.sendMessage(
				{ type: MSG_VALIDATE_KEY, payload: { apiKey: trimmedKey } },
				(response) => {
					if (!isActive) return;
					if (chrome.runtime.lastError) {
						setApiKeyStatus("invalid");
						return;
					}
					if (response?.valid) {
						setApiKeyStatus("valid");
						chrome.storage.local.set({ geminiApiKey: trimmedKey });
					} else {
						setApiKeyStatus("invalid");
					}
				},
			);
		}, 400);

		return () => {
			isActive = false;
			clearTimeout(timer);
		};
	}, [apiKey]);

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
						setError(
							"Insufficient content: The article does not contain enough concepts to generate a meaningful graph.",
						);
					} else {
						setGraphData(data);
						setStoredGraph(data);
					}
				}
			} else if (message.type === MSG_ERROR) {
				setLoading(false);
				setExtracting(false);
				setError(
					message.payload?.error || "An error occurred while processing the article.",
				);
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
			if (
				themeDropdownRef.current &&
				!themeDropdownRef.current.contains(event.target as Node)
			) {
				setThemeDropdownOpen(false);
			}
		};

		if (dropdownOpen || themeDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [dropdownOpen, themeDropdownOpen]);

	const handleGenerate = () => {
		if (apiKeyStatus !== "valid") {
			setApiKeyTouched(true);
			return;
		}
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

	const handleApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
		setApiKey(event.target.value);
		setApiKeyTouched(true);
	};

	const handleThemeSelect = (selectedTheme: ThemeType) => {
		setTheme(selectedTheme);
		setThemeDropdownOpen(false);
	};

	const handlePanelPositionSelect = (position: PanelPosition) => {
		setPanelPosition(position);
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
			nodes: data.nodes.map((node) => ({
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
			links: data.links.map((link) => ({
				source: typeof link.source === "string" ? link.source : (link.source as any).id,
				target: typeof link.target === "string" ? link.target : (link.target as any).id,
				reason: link.reason,
			})),
		};
	};

	const handleUpdateNode = (nodeId: string, newSummary: string) => {
		if (!graphData) return;

		const node = graphData.nodes.find((n) => n.id === nodeId);
		if (node) {
			// Mutate the node directly
			node.summary = newSummary;

			// Update selectedNode to trigger DetailPanel re-render
			setSelectedNode({ ...node });

			// Save to storage with proper serialization
			setStoredGraph(prepareForStorage(graphData));
		}
	};

	const handleUpdateConnection = (
		sourceId: string,
		targetId: string,
		newReason: string,
	) => {
		if (!graphData) return;

		// Find the link between these nodes
		const link = graphData.links.find((l) => {
			const src = typeof l.source === "string" ? l.source : (l.source as any).id;
			const tgt = typeof l.target === "string" ? l.target : (l.target as any).id;
			return (
				(src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId)
			);
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

		const node = graphData.nodes.find((n) => n.id === nodeId);
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
						className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-sans">
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
						<NodusLogo
							className="w-12 h-12 text-zinc-400 mx-auto mb-4"
							isAnimating={false}
						/>
						<h2 className="text-xl font-semibold text-white mb-2 font-sans">
							Welcome to Nodus
						</h2>
						<p className="text-zinc-400 text-sm mb-6 font-sans">
							Transform any article into an interactive knowledge graph. Click the
							generate graph button below to visualize the concepts.
						</p>

						<div className="mb-6">
							<div className="relative">
								<input
									type="text"
									value={apiKey}
									onChange={handleApiKeyChange}
									placeholder="Input Gemini API Key"
									className="w-full pr-14 pl-4 py-2.5 bg-zinc-900/40 backdrop-blur-xl border border-white/10 text-zinc-200 text-sm font-sans rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
									aria-label="Gemini API key"
								/>
								<div className="absolute inset-y-0 right-3 flex items-center gap-2">
									{apiKeyStatus === "valid" && (
										<Check className="w-4 h-4 text-emerald-400" />
									)}
									<a
										href={GEMINI_API_KEY_HELP_URL}
										target="_blank"
										rel="noreferrer"
										aria-label="Get Gemini API key"
										className="text-zinc-400 hover:text-zinc-200 transition-colors">
										<HelpCircle className="w-4 h-4" />
									</a>
								</div>
							</div>
							{apiKeyTouched && apiKeyStatus === "invalid" && (
								<p className="mt-2 text-xs text-amber-400 font-sans">
									Invalid Gemini API key.
								</p>
							)}
							{apiKeyTouched && apiKeyStatus === "idle" && (
								<p className="mt-2 text-xs text-amber-400 font-sans">
									Gemini API key is required.
								</p>
							)}
						</div>

						{/* Split Glass Button */}
						<div className="relative inline-flex" ref={dropdownRef}>
							<button
								onClick={handleGenerate}
								className="px-6 py-3 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded-l-lg transition-colors font-sans flex items-center gap-2">
								Generate Graph
							</button>
							<button
								onClick={() => setDropdownOpen(!dropdownOpen)}
								className="px-3 py-3 bg-zinc-900/40 backdrop-blur-xl border border-white/10 border-l-0 hover:bg-zinc-900/60 text-white rounded-r-lg transition-colors"
								aria-label="Select model">
								<ChevronDown
									className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
								/>
							</button>

							{/* Dropdown Menu */}
							{dropdownOpen && (
								<div className="absolute top-full right-0 mt-2 w-full bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden z-[100]">
									{MODEL_OPTIONS.map((option) => (
										<button
											key={option.value}
											onClick={() => handleModelSelect(option.value)}
											className={`w-full px-4 py-3 text-left hover:bg-zinc-900/60 transition-colors border-b border-white/5 last:border-b-0 ${
												selectedModel === option.value ? "bg-zinc-900/60" : ""
											}`}>
											<div className="text-white text-sm font-medium">{option.label}</div>
											<div className="text-zinc-400 text-xs mt-0.5">
												{option.description}
											</div>
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
							aria-label="Select theme">
							<Settings className="w-4 h-4" />
							<ChevronDown
								className={`w-3 h-3 transition-transform ${themeDropdownOpen ? "rotate-180" : ""}`}
							/>
						</button>

						{themeDropdownOpen && (
							<div className="absolute top-full right-0 mt-2 w-60 bg-zinc-900/90 backdrop-blur-3xl border border-white/10 rounded-lg overflow-hidden z-[100]">
								<div className="grid grid-cols-2">
									<div className="flex flex-col">
										<div className="px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-400 border-b border-white/5">
											Theme
										</div>
										{THEME_OPTIONS.map((option) => (
											<button
												key={option.value}
												onClick={() => handleThemeSelect(option.value)}
												className={`w-full px-4 py-3 text-left hover:bg-zinc-900/60 transition-colors border-b border-white/5 last:border-b-0 ${
													theme === option.value ? "bg-zinc-900/60" : ""
												}`}>
												<div className="text-white text-sm font-medium">
													{option.label}
												</div>
											</button>
										))}
									</div>
									<div className="flex flex-col border-l border-white/5">
										<div className="px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-400 border-b border-white/5">
											Info
										</div>
										<button
											onClick={() => handlePanelPositionSelect("right")}
											className={`w-full px-4 py-3 text-left hover:bg-zinc-900/60 transition-colors border-b border-white/5 ${
												panelPosition === "right" ? "bg-zinc-900/60" : ""
											}`}>
											<div className="text-white text-sm font-medium flex items-center gap-2">
												<label className="flex items-center gap-2 cursor-pointer">
													<input
														type="radio"
														name="info-panel"
														checked={panelPosition === "right"}
														onChange={() => handlePanelPositionSelect("right")}
														className="sr-only peer"
														aria-label="Info panel right"
													/>
													<span className="relative h-3.5 w-3.5 rounded-full border border-white/60 before:content-[''] before:absolute before:inset-0 before:m-auto before:h-1.5 before:w-1.5 before:rounded-full before:bg-white before:opacity-0 peer-checked:before:opacity-100" />
													<span>Right</span>
												</label>
											</div>
										</button>
										<button
											onClick={() => handlePanelPositionSelect("left")}
											className={`w-full px-4 py-3 text-left hover:bg-zinc-900/60 transition-colors border-b border-white/5 ${
												panelPosition === "left" ? "bg-zinc-900/60" : ""
											}`}>
											<div className="text-white text-sm font-medium flex items-center gap-2">
												<label className="flex items-center gap-2 cursor-pointer">
													<input
														type="radio"
														name="info-panel"
														checked={panelPosition === "left"}
														onChange={() => handlePanelPositionSelect("left")}
														className="sr-only peer"
														aria-label="Info panel left"
													/>
													<span className="relative h-3.5 w-3.5 rounded-full border border-white/60 before:content-[''] before:absolute before:inset-0 before:m-auto before:h-1.5 before:w-1.5 before:rounded-full before:bg-white before:opacity-0 peer-checked:before:opacity-100" />
													<span>Left</span>
												</label>
											</div>
										</button>
										<button
											onClick={() => handlePanelPositionSelect("bottom")}
											className={`w-full px-4 py-3 text-left hover:bg-zinc-900/60 transition-colors ${
												panelPosition === "bottom" ? "bg-zinc-900/60" : ""
											}`}>
											<div className="text-white text-sm font-medium flex items-center gap-2">
												<label className="flex items-center gap-2 cursor-pointer">
													<input
														type="radio"
														name="info-panel"
														checked={panelPosition === "bottom"}
														onChange={() => handlePanelPositionSelect("bottom")}
														className="sr-only peer"
														aria-label="Info panel bottom"
													/>
													<span className="relative h-3.5 w-3.5 rounded-full border border-white/60 before:content-[''] before:absolute before:inset-0 before:m-auto before:h-1.5 before:w-1.5 before:rounded-full before:bg-white before:opacity-0 peer-checked:before:opacity-100" />
													<span>Bottom</span>
												</label>
											</div>
										</button>
									</div>
								</div>
							</div>
						)}
					</div>

					<button
						onClick={handleBack}
						className="p-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded-lg transition-colors"
						aria-label="Back to welcome">
						<ArrowLeft className="w-4 h-4" />
					</button>
					<button
						onClick={handleGenerate}
						className="p-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 hover:bg-zinc-900/60 text-white rounded-lg transition-colors"
						aria-label="Regenerate graph">
						<RefreshCw className="w-4 h-4" />
					</button>
				</div>
			</header>

			{/* Graph View and Sidebar Container */}
			<div
				className={`relative z-0 flex-1 flex overflow-hidden ${
					panelPosition === "bottom" ? "flex-col" : ""
				}`}>
				{panelPosition === "left" && (selectedNode || selectedLink) && (
					<DetailPanel
						node={selectedNode || undefined}
						link={selectedLink || undefined}
						nodes={graphData.nodes}
						links={graphData.links}
						theme={theme}
						position={panelPosition}
						onClose={handleCloseDetail}
						onUpdateNode={handleUpdateNode}
						onUpdateConnection={handleUpdateConnection}
						onUpdateSourceQuote={handleUpdateSourceQuote}
					/>
				)}
				<div className="flex-1 relative overflow-hidden">
					<GraphView
						data={graphData}
						selectedNode={selectedNode}
						theme={theme}
						onNodeClick={handleNodeClick}
						onLinkClick={handleLinkClick}
					/>
				</div>
				{(selectedNode || selectedLink) && panelPosition !== "left" && (
					<DetailPanel
						node={selectedNode || undefined}
						link={selectedLink || undefined}
						nodes={graphData.nodes}
						links={graphData.links}
						theme={theme}
						position={panelPosition}
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
