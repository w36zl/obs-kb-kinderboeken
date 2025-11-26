import type { ThesaurusNode, ThesaurusEdge } from './types';

export interface ForceConfig {
  repulsion: number;      // How strongly nodes push each other away
  attraction: number;     // How strongly connected nodes pull together
  centerGravity: number;  // Gravity toward center
  damping: number;        // Friction to slow down movement
  minDistance: number;    // Minimum distance between nodes (collision)
}

export class ForceDirectedLayout {
  private config: ForceConfig = {
    repulsion: 5000,
    attraction: 0.01,
    centerGravity: 0.01,
    damping: 0.8,
    minDistance: 30,
  };

  private centerX: number;
  private centerY: number;
  private isRunning: boolean = false;

  constructor(centerX: number, centerY: number, config?: Partial<ForceConfig>) {
    this.centerX = centerX;
    this.centerY = centerY;

    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Run one iteration of the force simulation
   */
  tick(nodes: Map<string, ThesaurusNode>, edges: ThesaurusEdge[]): number {
    const nodeArray = Array.from(nodes.values());

    // Reset forces
    for (const node of nodeArray) {
      node.vx = 0;
      node.vy = 0;
    }

    // Apply repulsion between all node pairs
    this.applyRepulsion(nodeArray);

    // Apply attraction along edges
    this.applyAttraction(nodeArray, edges, nodes);

    // Apply gravity toward center
    this.applyCenterGravity(nodeArray);

    // Update positions and calculate total energy
    let totalEnergy = 0;

    for (const node of nodeArray) {
      // Apply damping
      node.vx *= this.config.damping;
      node.vy *= this.config.damping;

      // Update position
      node.x += node.vx;
      node.y += node.vy;

      // Calculate energy (for convergence detection)
      totalEnergy += Math.abs(node.vx) + Math.abs(node.vy);
    }

    return totalEnergy;
  }

  /**
   * Apply repulsive force between all node pairs
   * F = k / d^2 (Coulomb's law)
   */
  private applyRepulsion(nodes: ThesaurusNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distanceSquared = dx * dx + dy * dy;

        // Avoid division by zero
        if (distanceSquared < 1) continue;

        const distance = Math.sqrt(distanceSquared);

        // Repulsion force (inversely proportional to distance squared)
        const force = this.config.repulsion / distanceSquared;

        // Normalize direction
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        // Apply force (push apart)
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }
  }

  /**
   * Apply attractive force along edges
   * F = k * d (Hooke's law - spring force)
   */
  private applyAttraction(
    nodeArray: ThesaurusNode[],
    edges: ThesaurusEdge[],
    nodes: Map<string, ThesaurusNode>
  ): void {
    for (const edge of edges) {
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);

      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Avoid division by zero
      if (distance < 1) continue;

      // Attraction force (proportional to distance)
      const force = distance * this.config.attraction * edge.strength;

      // Normalize direction
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      // Apply force (pull together)
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }
  }

  /**
   * Apply gravity toward center (prevents graph from drifting away)
   */
  private applyCenterGravity(nodes: ThesaurusNode[]): void {
    for (const node of nodes) {
      const dx = this.centerX - node.x;
      const dy = this.centerY - node.y;

      node.vx += dx * this.config.centerGravity;
      node.vy += dy * this.config.centerGravity;
    }
  }

  /**
   * Apply collision detection (prevent nodes from overlapping)
   */
  private applyCollision(nodes: ThesaurusNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const minDistance = nodeA.size + nodeB.size + this.config.minDistance;

        if (distance < minDistance && distance > 0) {
          // Push nodes apart to minimum distance
          const overlap = minDistance - distance;
          const moveDistance = overlap / 2;

          const moveX = (dx / distance) * moveDistance;
          const moveY = (dy / distance) * moveDistance;

          nodeA.x -= moveX;
          nodeA.y -= moveY;
          nodeB.x += moveX;
          nodeB.y += moveY;
        }
      }
    }
  }

  /**
   * Run simulation until convergence or max iterations
   */
  async simulate(
    nodes: Map<string, ThesaurusNode>,
    edges: ThesaurusEdge[],
    options?: {
      maxIterations?: number;
      energyThreshold?: number;
      onProgress?: (iteration: number, energy: number) => void;
    }
  ): Promise<void> {
    const maxIterations = options?.maxIterations ?? 500;
    const energyThreshold = options?.energyThreshold ?? 0.1;

    console.log(`[ForceLayout] Starting simulation with ${nodes.size} nodes, ${edges.length} edges`);

    this.isRunning = true;

    for (let i = 0; i < maxIterations && this.isRunning; i++) {
      const energy = this.tick(nodes, edges);

      // Callback for progress
      if (options?.onProgress) {
        options.onProgress(i, energy);
      }

      // Check convergence
      if (energy < energyThreshold) {
        console.log(`[ForceLayout] Converged at iteration ${i} (energy: ${energy.toFixed(4)})`);
        break;
      }

      // Yield to prevent blocking UI (every 10 iterations)
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.isRunning = false;
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Update center point
   */
  setCenter(x: number, y: number): void {
    this.centerX = x;
    this.centerY = y;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ForceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ForceConfig {
    return { ...this.config };
  }
}
