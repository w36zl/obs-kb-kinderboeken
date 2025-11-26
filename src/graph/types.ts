// Type definitions for graph visualization

export interface ThesaurusNode {
  id: string;              // Unique identifier (normalized label or URI)
  label: string;           // Display name
  uri?: string;            // KB thesaurus URI (if available)
  bookCount: number;       // Number of books with this subject

  // SKOS relationships
  broader: string[];       // Parent concepts
  narrower: string[];      // Child concepts
  related: string[];       // Sibling/related concepts

  // Visual properties (computed)
  x: number;               // Canvas X position
  y: number;               // Canvas Y position
  vx: number;              // Velocity X (for physics)
  vy: number;              // Velocity Y (for physics)
  size: number;            // Node radius (based on bookCount)
  color: string;           // Node color (based on relationship type)

  // UI state
  isExpanded: boolean;     // Has user expanded this node?
  isFocused: boolean;      // Is this the current selection?
  isHovered: boolean;      // Is mouse hovering?
}

export interface ThesaurusEdge {
  id: string;              // Unique edge ID
  source: string;          // Source node ID
  target: string;          // Target node ID
  type: 'broader' | 'narrower' | 'related';
  strength: number;        // Edge weight for layout
}

export interface GraphData {
  nodes: Map<string, ThesaurusNode>;
  edges: ThesaurusEdge[];
  focusNodeId: string | null;
}

export interface SPARQLBinding {
  type: string;
  value: string;
  'xml:lang'?: string;
}

export interface SPARQLResult {
  [key: string]: SPARQLBinding;
}

export interface ConceptRelationship {
  type: 'broader' | 'narrower' | 'related';
  uri: string;
  label: string;
}

export interface ConceptDetails {
  uri: string;
  label: string;
  broader: ConceptRelationship[];
  narrower: ConceptRelationship[];
  related: ConceptRelationship[];
}

export interface GraphViewport {
  x: number;
  y: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}
