import type { ThesaurusNode, Point } from './types';
import { GraphCanvas } from './GraphCanvas';
import { ThesaurusGraph } from './ThesaurusGraph';

export type InteractionCallback = {
  onNodeClick?: (node: ThesaurusNode) => void;
  onNodeDoubleClick?: (node: ThesaurusNode) => void;
  onNodeHover?: (node: ThesaurusNode | null) => void;
  onPan?: (dx: number, dy: number) => void;
  onZoom?: (delta: number, centerX: number, centerY: number) => void;
};

export class GraphInteraction {
  private canvas: HTMLCanvasElement;
  private graphCanvas: GraphCanvas;
  private graph: ThesaurusGraph;
  private callbacks: InteractionCallback;

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private lastMousePos: Point = { x: 0, y: 0 };
  private draggedNode: ThesaurusNode | null = null;
  private hoveredNode: ThesaurusNode | null = null;

  private lastClickTime: number = 0;
  private clickDelay: number = 300; // ms for double-click detection

  constructor(
    canvas: HTMLCanvasElement,
    graphCanvas: GraphCanvas,
    graph: ThesaurusGraph,
    callbacks: InteractionCallback = {}
  ) {
    this.canvas = canvas;
    this.graphCanvas = graphCanvas;
    this.graph = graph;
    this.callbacks = callbacks;

    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Context menu (right-click)
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Mouse down handler
   */
  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert to world coordinates
    const worldPos = this.graphCanvas.screenToWorld(mouseX, mouseY);

    // Check if clicking on a node
    const clickedNode = this.graph.findNodeAtPosition(worldPos.x, worldPos.y);

    if (clickedNode) {
      // Detect double-click
      const now = Date.now();
      const isDoubleClick = now - this.lastClickTime < this.clickDelay;
      this.lastClickTime = now;

      if (isDoubleClick) {
        // Double-click: expand node
        this.callbacks.onNodeDoubleClick?.(clickedNode);
      } else {
        // Single-click: select node (or start dragging)
        this.draggedNode = clickedNode;
        this.isDragging = true;
        this.callbacks.onNodeClick?.(clickedNode);
      }
    } else {
      // Clicking on empty space: start panning
      this.isPanning = true;
    }

    this.lastMousePos = { x: mouseX, y: mouseY };
  }

  /**
   * Mouse move handler
   */
  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (this.isDragging && this.draggedNode) {
      // Drag node
      const worldPos = this.graphCanvas.screenToWorld(mouseX, mouseY);
      this.draggedNode.x = worldPos.x;
      this.draggedNode.y = worldPos.y;

      // Stop velocity
      this.draggedNode.vx = 0;
      this.draggedNode.vy = 0;

    } else if (this.isPanning) {
      // Pan viewport
      const dx = mouseX - this.lastMousePos.x;
      const dy = mouseY - this.lastMousePos.y;

      const viewport = this.graphCanvas.getViewport();
      this.graphCanvas.setViewport(
        viewport.x + dx,
        viewport.y + dy,
        viewport.scale
      );

      this.callbacks.onPan?.(dx, dy);

    } else {
      // Hover detection
      const worldPos = this.graphCanvas.screenToWorld(mouseX, mouseY);
      const hoveredNode = this.graph.findNodeAtPosition(worldPos.x, worldPos.y);

      // Update hover state
      if (hoveredNode !== this.hoveredNode) {
        // Clear previous hover
        if (this.hoveredNode) {
          this.hoveredNode.isHovered = false;
        }

        // Set new hover
        this.hoveredNode = hoveredNode;
        if (hoveredNode) {
          hoveredNode.isHovered = true;
        }

        // Update cursor
        this.canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';

        // Callback
        this.callbacks.onNodeHover?.(hoveredNode);
      }
    }

    this.lastMousePos = { x: mouseX, y: mouseY };
  }

  /**
   * Mouse up handler
   */
  private handleMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
    this.draggedNode = null;

    // Reset cursor
    this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'grab';
  }

  /**
   * Mouse leave handler
   */
  private handleMouseLeave(event: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
    this.draggedNode = null;

    // Clear hover state
    if (this.hoveredNode) {
      this.hoveredNode.isHovered = false;
      this.hoveredNode = null;
      this.callbacks.onNodeHover?.(null);
    }

    this.canvas.style.cursor = 'default';
  }

  /**
   * Mouse wheel handler (zoom)
   */
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Zoom factor
    const delta = -event.deltaY * 0.001;
    const viewport = this.graphCanvas.getViewport();
    const newScale = viewport.scale * (1 + delta);

    // Zoom toward mouse position
    const worldBeforeZoom = this.graphCanvas.screenToWorld(mouseX, mouseY);

    this.graphCanvas.setViewport(viewport.x, viewport.y, newScale);

    const worldAfterZoom = this.graphCanvas.screenToWorld(mouseX, mouseY);

    // Adjust viewport to keep mouse position fixed
    const worldDx = worldAfterZoom.x - worldBeforeZoom.x;
    const worldDy = worldAfterZoom.y - worldBeforeZoom.y;

    const newViewport = this.graphCanvas.getViewport();
    this.graphCanvas.setViewport(
      newViewport.x - worldDx * newViewport.scale,
      newViewport.y - worldDy * newViewport.scale,
      newViewport.scale
    );

    this.callbacks.onZoom?.(delta, mouseX, mouseY);
  }

  /**
   * Touch start handler (mobile)
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Convert to world coordinates
      const worldPos = this.graphCanvas.screenToWorld(touchX, touchY);

      // Check if touching a node
      const touchedNode = this.graph.findNodeAtPosition(worldPos.x, worldPos.y);

      if (touchedNode) {
        this.callbacks.onNodeClick?.(touchedNode);
      } else {
        this.isPanning = true;
      }

      this.lastMousePos = { x: touchX, y: touchY };
    }
  }

  /**
   * Touch move handler (mobile)
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1 && this.isPanning) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Pan viewport
      const dx = touchX - this.lastMousePos.x;
      const dy = touchY - this.lastMousePos.y;

      const viewport = this.graphCanvas.getViewport();
      this.graphCanvas.setViewport(
        viewport.x + dx,
        viewport.y + dy,
        viewport.scale
      );

      this.callbacks.onPan?.(dx, dy);

      this.lastMousePos = { x: touchX, y: touchY };
    }
  }

  /**
   * Touch end handler (mobile)
   */
  private handleTouchEnd(event: TouchEvent): void {
    this.isPanning = false;
    this.draggedNode = null;
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
}
