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
  fx?: number | undefined;
  fy?: number | undefined;
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
export const MSG_FIND_TEXT = 'MSG_FIND_TEXT';
export const MSG_VALIDATE_KEY = 'MSG_VALIDATE_KEY';

