import type { ThesaurusNode, ThesaurusEdge, GraphViewport, Point } from './types';

export class GraphCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewport: GraphViewport = { x: 0, y: 0, scale: 1 };

  private readonly EDGE_COLORS = {
    broader: '#93c5fd',    // Light blue
    narrower: '#6ee7b7',   // Light green
    related: '#fcd34d',    // Light yellow/orange
  };

  private readonly EDGE_WIDTH = 2;
  private readonly FONT_SIZE = 12;
  private readonly FONT_FAMILY = 'var(--font-interface)';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;

    // Set canvas size to match container
    this.resize();

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }

  /**
   * Resize canvas to match container
   */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Center viewport on first resize
    if (this.viewport.x === 0 && this.viewport.y === 0) {
      this.viewport.x = rect.width / 2;
      this.viewport.y = rect.height / 2;
    }
  }

  /**
   * Clear the entire canvas
   */
  clear(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  /**
   * Render nodes and edges
   */
  render(nodes: Map<string, ThesaurusNode>, edges: ThesaurusEdge[]): void {
    this.clear();

    // Save context state
    this.ctx.save();

    // Apply viewport transform
    this.ctx.translate(this.viewport.x, this.viewport.y);
    this.ctx.scale(this.viewport.scale, this.viewport.scale);

    // Draw edges first (behind nodes)
    this.drawEdges(edges, nodes);

    // Draw nodes
    this.drawNodes(nodes);

    // Draw labels (on top)
    this.drawLabels(nodes);

    // Restore context state
    this.ctx.restore();
  }

  /**
   * Draw all edges
   */
  private drawEdges(edges: ThesaurusEdge[], nodes: Map<string, ThesaurusNode>): void {
    for (const edge of edges) {
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);

      if (!source || !target) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(source.x, source.y);
      this.ctx.lineTo(target.x, target.y);

      this.ctx.strokeStyle = this.EDGE_COLORS[edge.type];
      this.ctx.lineWidth = this.EDGE_WIDTH;
      this.ctx.globalAlpha = 0.6;
      this.ctx.stroke();

      this.ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Draw all nodes
   */
  private drawNodes(nodes: Map<string, ThesaurusNode>): void {
    for (const node of nodes.values()) {
      // Draw node circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
      this.ctx.fillStyle = node.color;
      this.ctx.fill();

      // Draw outline
      this.ctx.strokeStyle = node.isFocused ? '#fff' : 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = node.isFocused ? 3 : 2;
      this.ctx.stroke();

      // Draw hover effect
      if (node.isHovered) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.size + 4, 0, Math.PI * 2);
        this.ctx.strokeStyle = node.color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
      }
    }
  }

  /**
   * Draw node labels
   */
  private drawLabels(nodes: Map<string, ThesaurusNode>): void {
    this.ctx.font = `${this.FONT_SIZE}px ${this.FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const node of nodes.values()) {
      // Only show labels for focused, hovered, or larger nodes
      const showLabel = node.isFocused || node.isHovered || node.size > 15;

      if (!showLabel) continue;

      // Truncate long labels
      let label = node.label;
      if (label.length > 20) {
        label = label.substring(0, 17) + '...';
      }

      // Draw text shadow for readability
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillText(label, node.x + 1, node.y + node.size + 14);

      // Draw text
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(label, node.x, node.y + node.size + 13);

      // Draw book count for focused/hovered nodes
      if ((node.isFocused || node.isHovered) && node.bookCount > 0) {
        const countText = `${node.bookCount} books`;
        this.ctx.font = `${this.FONT_SIZE - 2}px ${this.FONT_FAMILY}`;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText(countText, node.x, node.y + node.size + 27);
        this.ctx.font = `${this.FONT_SIZE}px ${this.FONT_FAMILY}`;
      }
    }
  }

  /**
   * Convert screen coordinates to world coordinates (accounting for viewport)
   */
  screenToWorld(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.viewport.x) / this.viewport.scale,
      y: (screenY - this.viewport.y) / this.viewport.scale,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): Point {
    return {
      x: worldX * this.viewport.scale + this.viewport.x,
      y: worldY * this.viewport.scale + this.viewport.y,
    };
  }

  /**
   * Set viewport (for zoom/pan)
   */
  setViewport(x: number, y: number, scale: number): void {
    this.viewport.x = x;
    this.viewport.y = y;
    this.viewport.scale = Math.max(0.1, Math.min(3, scale)); // Clamp scale
  }

  /**
   * Get viewport
   */
  getViewport(): GraphViewport {
    return { ...this.viewport };
  }

  /**
   * Zoom to fit all nodes in view
   */
  zoomToFit(nodes: Map<string, ThesaurusNode>, padding: number = 50): void {
    if (nodes.size === 0) return;

    const nodeArray = Array.from(nodes.values());

    // Calculate bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodeArray) {
      minX = Math.min(minX, node.x - node.size);
      minY = Math.min(minY, node.y - node.size);
      maxX = Math.max(maxX, node.x + node.size);
      maxY = Math.max(maxY, node.y + node.size);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate scale to fit with padding
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = (rect.width - padding * 2) / width;
    const scaleY = (rect.height - padding * 2) / height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1:1

    // Center on bounding box
    this.viewport.scale = scale;
    this.viewport.x = rect.width / 2 - centerX * scale;
    this.viewport.y = rect.height / 2 - centerY * scale;
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }
}
