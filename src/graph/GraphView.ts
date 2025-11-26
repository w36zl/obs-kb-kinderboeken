import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import type KBKinderboekenPlugin from '../main';
import type { KBBookMetadata } from '../types';
import { ThesaurusGraph } from './ThesaurusGraph';
import { GraphCanvas } from './GraphCanvas';
import { ForceDirectedLayout } from './ForceLayout';
import { GraphInteraction } from './GraphInteraction';
import type { ThesaurusNode } from './types';

export const VIEW_TYPE_KB_GRAPH = 'kb-graph-view';

export class KBGraphView extends ItemView {
  plugin: KBKinderboekenPlugin;
  private graph: ThesaurusGraph;
  private canvas: GraphCanvas | null = null;
  private layout: ForceDirectedLayout | null = null;
  private interaction: GraphInteraction | null = null;
  private animationFrameId: number | null = null;
  private isSimulating: boolean = false;

  // Source data
  private sourceResults: KBBookMetadata[] = [];
  private selectedNode: ThesaurusNode | null = null;

  // UI elements
  private canvasEl: HTMLCanvasElement | null = null;
  private detailPanelEl: HTMLElement | null = null;
  private controlsEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: KBKinderboekenPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.graph = new ThesaurusGraph();
  }

  getViewType(): string {
    return VIEW_TYPE_KB_GRAPH;
  }

  getDisplayText(): string {
    return 'Subject Graph';
  }

  getIcon(): string {
    return 'git-fork';
  }

  async onOpen() {
    console.log('[KBGraphView] Opening graph view');
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('kb-graph-view');

    // Create header
    const header = container.createDiv('kb-graph-header');
    header.createEl('h2', { text: 'Subject Relationship Graph' });

    // Create controls
    this.controlsEl = container.createDiv('kb-graph-controls');
    this.createControls();

    // Create main content area
    const content = container.createDiv('kb-graph-content');

    // Create canvas
    const canvasContainer = content.createDiv('kb-graph-canvas-container');
    console.log('[KBGraphView] Creating canvas element');
    this.canvasEl = canvasContainer.createEl('canvas', { cls: 'kb-graph-canvas' });
    console.log('[KBGraphView] Initializing GraphCanvas');
    this.canvas = new GraphCanvas(this.canvasEl);
    console.log('[KBGraphView] GraphCanvas created');

    // Create detail panel
    this.detailPanelEl = content.createDiv('kb-graph-detail-panel');
    this.updateDetailPanel(null);

    // Setup interaction handlers
    this.interaction = new GraphInteraction(this.canvasEl, this.canvas, this.graph, {
      onNodeClick: (node) => this.handleNodeClick(node),
      onNodeDoubleClick: (node) => this.handleNodeDoubleClick(node),
      onNodeHover: (node) => this.handleNodeHover(node),
      onPan: () => this.requestRender(),
      onZoom: () => this.requestRender(),
    });

    // Initialize layout
    const dims = this.canvas.getDimensions();
    this.layout = new ForceDirectedLayout(dims.width / 2, dims.height / 2);

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));

    // Show initial message
    this.showEmptyState();
  }

  /**
   * Load graph from search results
   */
  async loadFromResults(results: KBBookMetadata[]): Promise<void> {
    if (results.length === 0) {
      new Notice('No results to visualize');
      return;
    }

    this.sourceResults = results;

    // Show loading state
    this.showLoading();

    try {
      // Build graph
      await this.graph.buildFromResults(results);

      // Zoom to fit
      const data = this.graph.getData();
      if (this.canvas) {
        this.canvas.zoomToFit(data.nodes);
      }

      // Start force simulation
      this.startSimulation();

      new Notice(`Visualizing ${data.nodes.size} subjects`);

    } catch (error) {
      console.error('[KBGraphView] Error loading graph:', error);
      new Notice('Error loading graph visualization');
      this.showErrorState();
    }
  }

  /**
   * Create control buttons
   */
  private createControls(): void {
    if (!this.controlsEl) return;

    this.controlsEl.empty();

    // Zoom controls
    const zoomGroup = this.controlsEl.createDiv('kb-graph-control-group');
    zoomGroup.createEl('span', { text: 'Zoom:' });

    const zoomInBtn = zoomGroup.createEl('button', { text: '+', cls: 'kb-graph-btn' });
    zoomInBtn.onclick = () => this.zoomIn();

    const zoomOutBtn = zoomGroup.createEl('button', { text: '−', cls: 'kb-graph-btn' });
    zoomOutBtn.onclick = () => this.zoomOut();

    const fitBtn = zoomGroup.createEl('button', { text: 'Fit', cls: 'kb-graph-btn' });
    fitBtn.onclick = () => this.zoomToFit();

    // Layout controls
    const layoutGroup = this.controlsEl.createDiv('kb-graph-control-group');
    const restartBtn = layoutGroup.createEl('button', { text: '🔄 Restart Layout', cls: 'kb-graph-btn' });
    restartBtn.onclick = () => this.restartLayout();

    const stopBtn = layoutGroup.createEl('button', { text: '⏸️ Stop', cls: 'kb-graph-btn' });
    stopBtn.onclick = () => this.stopSimulation();
  }

  /**
   * Handle node click
   */
  private handleNodeClick(node: ThesaurusNode): void {
    this.selectedNode = node;
    this.graph.setFocus(node.id);
    this.updateDetailPanel(node);
    this.requestRender();
  }

  /**
   * Handle node double-click (expand)
   */
  private async handleNodeDoubleClick(node: ThesaurusNode): Promise<void> {
    try {
      await this.graph.expandNode(node.id);

      // Restart simulation with new nodes
      this.startSimulation();

      new Notice(`Expanded "${node.label}"`);

    } catch (error) {
      console.error('[KBGraphView] Error expanding node:', error);
      new Notice('Error expanding node');
    }
  }

  /**
   * Handle node hover
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleNodeHover(_node: ThesaurusNode | null): void {
    this.requestRender();
  }

  /**
   * Update detail panel with node info
   */
  private updateDetailPanel(node: ThesaurusNode | null): void {
    if (!this.detailPanelEl) return;

    this.detailPanelEl.empty();

    if (!node) {
      this.detailPanelEl.createEl('p', {
        text: 'Click a node to see details',
        cls: 'kb-graph-hint',
      });
      return;
    }

    // Node title
    this.detailPanelEl.createEl('h3', { text: node.label });

    // Book count
    if (node.bookCount > 0) {
      const countEl = this.detailPanelEl.createEl('p', { cls: 'kb-graph-book-count' });
      countEl.createEl('strong', { text: `${node.bookCount} books` });
    }

    // Relationships
    if (node.broader.length > 0) {
      this.detailPanelEl.createEl('h4', { text: 'Broader (Parent)' });
      const list = this.detailPanelEl.createEl('ul', { cls: 'kb-graph-relationship-list' });
      for (const broader of node.broader) {
        const item = list.createEl('li');
        const link = item.createEl('a', { text: broader, cls: 'kb-graph-link' });
        link.onclick = () => this.navigateToNode(broader);
      }
    }

    if (node.narrower.length > 0) {
      this.detailPanelEl.createEl('h4', { text: 'Narrower (Children)' });
      const list = this.detailPanelEl.createEl('ul', { cls: 'kb-graph-relationship-list' });
      for (const narrower of node.narrower) {
        const item = list.createEl('li');
        const link = item.createEl('a', { text: narrower, cls: 'kb-graph-link' });
        link.onclick = () => this.navigateToNode(narrower);
      }
    }

    if (node.related.length > 0) {
      this.detailPanelEl.createEl('h4', { text: 'Related' });
      const list = this.detailPanelEl.createEl('ul', { cls: 'kb-graph-relationship-list' });
      for (const related of node.related) {
        const item = list.createEl('li');
        const link = item.createEl('a', { text: related, cls: 'kb-graph-link' });
        link.onclick = () => this.navigateToNode(related);
      }
    }

    // Actions
    const actions = this.detailPanelEl.createDiv('kb-graph-actions');

    if (node.bookCount > 0) {
      const viewBooksBtn = actions.createEl('button', {
        text: 'View Books',
        cls: 'mod-cta',
      });
      viewBooksBtn.onclick = () => this.viewBooksForSubject(node.label);
    }

    if (!node.isExpanded) {
      const expandBtn = actions.createEl('button', {
        text: 'Expand',
        cls: 'kb-graph-btn',
      });
      expandBtn.onclick = () => this.handleNodeDoubleClick(node);
    }
  }

  /**
   * Navigate to a node (find and select it)
   */
  private navigateToNode(nodeId: string): void {
    const data = this.graph.getData();
    const node = data.nodes.get(nodeId);

    if (node) {
      this.handleNodeClick(node);

      // Center on node
      if (this.canvas) {
        const dims = this.canvas.getDimensions();
        const viewport = this.canvas.getViewport();
        this.canvas.setViewport(
          dims.width / 2 - node.x * viewport.scale,
          dims.height / 2 - node.y * viewport.scale,
          viewport.scale
        );
      }
    }
  }

  /**
   * View books with selected subject
   */
  private viewBooksForSubject(subject: string): void {
    // Filter source results by subject
    const filtered = this.sourceResults.filter((book) =>
      book.subjects?.includes(subject)
    );

    if (filtered.length === 0) {
      new Notice(`No books found for "${subject}"`);
      return;
    }

    // TODO: Open browse view with filtered results
    // For now, just show a notice
    new Notice(`Found ${filtered.length} books with subject "${subject}"`);
  }

  /**
   * Start force-directed simulation
   */
  private startSimulation(): void {
    if (!this.layout) return;

    this.isSimulating = true;
    this.stopAnimation(); // Stop existing animation

    const data = this.graph.getData();

    // Run simulation in background
    this.layout.simulate(data.nodes, data.edges, {
      maxIterations: 300,
      energyThreshold: 0.5,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onProgress: (iteration, _energy) => {
        // Render every 5 iterations
        if (iteration % 5 === 0) {
          this.requestRender();
        }
      },
    }).then(() => {
      this.isSimulating = false;
      this.requestRender();
    });

    // Start continuous rendering
    this.startAnimation();
  }

  /**
   * Stop simulation
   */
  private stopSimulation(): void {
    if (this.layout) {
      this.layout.stop();
    }
    this.isSimulating = false;
    this.stopAnimation();
  }

  /**
   * Restart layout
   */
  private restartLayout(): void {
    const data = this.graph.getData();

    // Re-initialize node positions
    const nodeArray = Array.from(data.nodes.values());
    const dims = this.canvas?.getDimensions() || { width: 800, height: 600 };
    const radius = Math.min(dims.width, dims.height) / 3;

    nodeArray.forEach((node, index) => {
      const angle = (index / nodeArray.length) * 2 * Math.PI;
      node.x = dims.width / 2 + radius * Math.cos(angle);
      node.y = dims.height / 2 + radius * Math.sin(angle);
      node.vx = 0;
      node.vy = 0;
    });

    // Restart simulation
    this.startSimulation();
  }

  /**
   * Zoom in
   */
  private zoomIn(): void {
    if (!this.canvas) return;

    const viewport = this.canvas.getViewport();
    this.canvas.setViewport(
      viewport.x,
      viewport.y,
      viewport.scale * 1.2
    );
    this.requestRender();
  }

  /**
   * Zoom out
   */
  private zoomOut(): void {
    if (!this.canvas) return;

    const viewport = this.canvas.getViewport();
    this.canvas.setViewport(
      viewport.x,
      viewport.y,
      viewport.scale / 1.2
    );
    this.requestRender();
  }

  /**
   * Zoom to fit all nodes
   */
  private zoomToFit(): void {
    if (!this.canvas) return;

    const data = this.graph.getData();
    this.canvas.zoomToFit(data.nodes);
    this.requestRender();
  }

  /**
   * Start animation loop
   */
  private startAnimation(): void {
    this.stopAnimation();

    const animate = () => {
      if (this.isSimulating && this.layout) {
        const data = this.graph.getData();
        this.layout.tick(data.nodes, data.edges);
      }

      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop animation loop
   */
  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Request a render (debounced)
   */
  private requestRender(): void {
    this.render();
  }

  /**
   * Render the graph
   */
  private render(): void {
    if (!this.canvas) return;

    const data = this.graph.getData();
    this.canvas.render(data.nodes, data.edges);
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (this.canvas) {
      this.canvas.resize();
      this.requestRender();
    }
  }

  /**
   * Show empty state
   */
  private showEmptyState(): void {
    if (!this.detailPanelEl) return;

    this.detailPanelEl.empty();
    this.detailPanelEl.createEl('h3', { text: 'No Graph Loaded' });
    this.detailPanelEl.createEl('p', {
      text: 'Open this view from the Browse View by clicking "Explore Graph" after performing a search.',
    });
  }

  /**
   * Show loading state
   */
  private showLoading(): void {
    if (!this.detailPanelEl) return;

    this.detailPanelEl.empty();
    this.detailPanelEl.createEl('p', { text: 'Loading graph...', cls: 'kb-searching' });
  }

  /**
   * Show error state
   */
  private showErrorState(): void {
    if (!this.detailPanelEl) return;

    this.detailPanelEl.empty();
    this.detailPanelEl.createEl('p', {
      text: 'Error loading graph. Please try again.',
      cls: 'kb-error',
    });
  }

  async onClose() {
    // Cleanup
    this.stopAnimation();
    this.stopSimulation();

    if (this.interaction) {
      this.interaction.destroy();
    }

    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
