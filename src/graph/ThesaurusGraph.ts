import type { ThesaurusNode, ThesaurusEdge, GraphData } from './types';
import { ThesaurusAPI } from './ThesaurusAPI';
import type { KBBookMetadata } from '../types';

export class ThesaurusGraph {
  private nodes: Map<string, ThesaurusNode> = new Map();
  private edges: ThesaurusEdge[] = [];
  private focusNodeId: string | null = null;
  private api: ThesaurusAPI;

  // Constants for node sizing and colors
  private readonly MIN_NODE_SIZE = 8;
  private readonly MAX_NODE_SIZE = 40;
  private readonly NODE_COLORS = {
    focus: '#8b5cf6',      // Purple - current selection
    broader: '#3b82f6',    // Blue - parent concepts
    narrower: '#10b981',   // Green - child concepts
    related: '#f59e0b',    // Orange - siblings
    default: '#6b7280',    // Gray - not directly connected
  };

  constructor() {
    this.api = new ThesaurusAPI();
  }

  /**
   * Build graph from search results
   */
  async buildFromResults(results: KBBookMetadata[]): Promise<void> {
    // Extract unique subjects and count occurrences
    const subjectCounts = new Map<string, number>();

    for (const book of results) {
      if (book.subjects) {
        for (const subject of book.subjects) {
          subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
        }
      }
    }

    if (subjectCounts.size === 0) {
      console.warn('[ThesaurusGraph] No subjects found in results');
      return;
    }

    console.log(`[ThesaurusGraph] Building graph from ${subjectCounts.size} unique subjects`);

    // Fetch concept details from SPARQL (batch query for efficiency)
    const subjects = Array.from(subjectCounts.keys());
    const conceptDetails = await this.api.getConceptsBatch(subjects);

    // Create nodes for seed subjects
    for (const [subject, count] of subjectCounts.entries()) {
      const details = conceptDetails.get(subject);

      if (!details) {
        // Create minimal node without relationships
        this.addNode({
          id: subject,
          label: subject,
          bookCount: count,
          broader: [],
          narrower: [],
          related: [],
        });
        continue;
      }

      // Create full node with relationships
      this.addNode({
        id: details.label,
        label: details.label,
        uri: details.uri,
        bookCount: count,
        broader: details.broader.map((r) => r.label),
        narrower: details.narrower.map((r) => r.label),
        related: details.related.map((r) => r.label),
      });

      // Add 1-hop neighbors as placeholder nodes
      const neighbors = [
        ...details.broader,
        ...details.narrower,
        ...details.related,
      ];

      for (const neighbor of neighbors) {
        if (!this.nodes.has(neighbor.label)) {
          this.addNode({
            id: neighbor.label,
            label: neighbor.label,
            uri: neighbor.uri,
            bookCount: 0, // Unknown until expanded
            broader: [],
            narrower: [],
            related: [],
          });
        }
      }
    }

    // Build edges from relationships
    this.buildEdges();

    // Calculate initial positions
    this.initializePositions();

    console.log(`[ThesaurusGraph] Graph built: ${this.nodes.size} nodes, ${this.edges.length} edges`);
  }

  /**
   * Expand a node by loading its relationships
   */
  async expandNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    if (node.isExpanded) {
      console.log(`[ThesaurusGraph] Node already expanded: ${nodeId}`);
      return;
    }

    console.log(`[ThesaurusGraph] Expanding node: ${nodeId}`);

    // Fetch concept details
    const details = await this.api.getConceptDetails(node.uri || node.label);
    if (!details) {
      console.warn(`[ThesaurusGraph] No details found for: ${nodeId}`);
      return;
    }

    // Update node with full relationship data
    node.uri = details.uri;
    node.broader = details.broader.map((r) => r.label);
    node.narrower = details.narrower.map((r) => r.label);
    node.related = details.related.map((r) => r.label);
    node.isExpanded = true;

    // Add new neighbor nodes
    const neighbors = [
      ...details.broader,
      ...details.narrower,
      ...details.related,
    ];

    for (const neighbor of neighbors) {
      if (!this.nodes.has(neighbor.label)) {
        this.addNode({
          id: neighbor.label,
          label: neighbor.label,
          uri: neighbor.uri,
          bookCount: 0,
          broader: [],
          narrower: [],
          related: [],
        });
      }
    }

    // Rebuild edges
    this.buildEdges();

    console.log(`[ThesaurusGraph] Expanded ${nodeId}: added ${neighbors.length} neighbors`);
  }

  /**
   * Set focus node (highlights it and its connections)
   */
  setFocus(nodeId: string | null): void {
    // Clear previous focus
    for (const node of this.nodes.values()) {
      node.isFocused = false;
    }

    this.focusNodeId = nodeId;

    if (nodeId) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.isFocused = true;
      }
    }

    // Update colors based on new focus
    this.updateNodeColors();
  }

  /**
   * Get current graph data (for rendering)
   */
  getData(): GraphData {
    return {
      nodes: this.nodes,
      edges: this.edges,
      focusNodeId: this.focusNodeId,
    };
  }

  /**
   * Add a node to the graph
   */
  private addNode(partial: Omit<ThesaurusNode, 'x' | 'y' | 'vx' | 'vy' | 'size' | 'color' | 'isExpanded' | 'isFocused' | 'isHovered'>): void {
    if (this.nodes.has(partial.id)) {
      // Update existing node's book count
      const existing = this.nodes.get(partial.id)!;
      if (partial.bookCount > 0) {
        existing.bookCount = partial.bookCount;
        existing.size = this.calculateNodeSize(partial.bookCount);
      }
      return;
    }

    const node: ThesaurusNode = {
      ...partial,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: this.calculateNodeSize(partial.bookCount),
      color: this.NODE_COLORS.default,
      isExpanded: false,
      isFocused: false,
      isHovered: false,
    };

    this.nodes.set(node.id, node);
  }

  /**
   * Build edges from node relationships
   */
  private buildEdges(): void {
    this.edges = [];
    let edgeId = 0;

    for (const node of this.nodes.values()) {
      // Broader edges
      for (const broaderId of node.broader) {
        if (this.nodes.has(broaderId)) {
          this.edges.push({
            id: `edge-${edgeId++}`,
            source: node.id,
            target: broaderId,
            type: 'broader',
            strength: 1.0,
          });
        }
      }

      // Narrower edges
      for (const narrowerId of node.narrower) {
        if (this.nodes.has(narrowerId)) {
          this.edges.push({
            id: `edge-${edgeId++}`,
            source: node.id,
            target: narrowerId,
            type: 'narrower',
            strength: 1.0,
          });
        }
      }

      // Related edges
      for (const relatedId of node.related) {
        if (this.nodes.has(relatedId)) {
          // Only add one edge for bidirectional relationships
          if (node.id < relatedId) {
            this.edges.push({
              id: `edge-${edgeId++}`,
              source: node.id,
              target: relatedId,
              type: 'related',
              strength: 0.8,
            });
          }
        }
      }
    }
  }

  /**
   * Initialize node positions in a circle
   */
  private initializePositions(): void {
    const nodeArray = Array.from(this.nodes.values());
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    nodeArray.forEach((node, index) => {
      const angle = (index / nodeArray.length) * 2 * Math.PI;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
      node.vx = 0;
      node.vy = 0;
    });
  }

  /**
   * Update node colors based on focus and relationships
   */
  private updateNodeColors(): void {
    if (!this.focusNodeId) {
      // No focus - all nodes default color
      for (const node of this.nodes.values()) {
        node.color = this.NODE_COLORS.default;
      }
      return;
    }

    const focusNode = this.nodes.get(this.focusNodeId);
    if (!focusNode) return;

    // Set colors based on relationship to focus node
    for (const node of this.nodes.values()) {
      if (node.id === this.focusNodeId) {
        node.color = this.NODE_COLORS.focus;
      } else if (focusNode.broader.includes(node.id)) {
        node.color = this.NODE_COLORS.broader;
      } else if (focusNode.narrower.includes(node.id)) {
        node.color = this.NODE_COLORS.narrower;
      } else if (focusNode.related.includes(node.id)) {
        node.color = this.NODE_COLORS.related;
      } else {
        node.color = this.NODE_COLORS.default;
      }
    }
  }

  /**
   * Calculate node size based on book count
   */
  private calculateNodeSize(bookCount: number): number {
    if (bookCount === 0) return this.MIN_NODE_SIZE;

    const scale = Math.log(bookCount + 1) * 5;
    return Math.min(this.MAX_NODE_SIZE, this.MIN_NODE_SIZE + scale);
  }

  /**
   * Find node at canvas position (for click detection)
   */
  findNodeAtPosition(x: number, y: number): ThesaurusNode | null {
    for (const node of this.nodes.values()) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= node.size) {
        return node;
      }
    }

    return null;
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.focusNodeId = null;
  }
}
