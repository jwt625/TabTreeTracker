// =============================================================================
// Cluster Boundaries - Visual Domain Boundaries for Cluster Visualization
// =============================================================================

/**
 * Calculate convex hull for a set of points using Graham scan algorithm
 * @param {Array} points - Array of {x, y} points
 * @returns {Array} - Array of points forming the convex hull
 */
export function calculateConvexHull(points) {
  if (points.length < 3) return points;

  // Find the bottom-most point (and leftmost in case of tie)
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < points[start].y || 
        (points[i].y === points[start].y && points[i].x < points[start].x)) {
      start = i;
    }
  }

  // Sort points by polar angle with respect to start point
  const startPoint = points[start];
  const sortedPoints = points.filter((_, i) => i !== start)
    .sort((a, b) => {
      const angleA = Math.atan2(a.y - startPoint.y, a.x - startPoint.x);
      const angleB = Math.atan2(b.y - startPoint.y, b.x - startPoint.x);
      if (angleA === angleB) {
        // If angles are equal, sort by distance
        const distA = Math.sqrt((a.x - startPoint.x) ** 2 + (a.y - startPoint.y) ** 2);
        const distB = Math.sqrt((b.x - startPoint.x) ** 2 + (b.y - startPoint.y) ** 2);
        return distA - distB;
      }
      return angleA - angleB;
    });

  // Graham scan
  const hull = [startPoint];
  
  for (const point of sortedPoints) {
    // Remove points that make a clockwise turn
    while (hull.length > 1 && 
           crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
      hull.pop();
    }
    hull.push(point);
  }

  return hull;
}

/**
 * Calculate cross product for three points (used in convex hull)
 * @param {Object} o - Origin point {x, y}
 * @param {Object} a - Point A {x, y}
 * @param {Object} b - Point B {x, y}
 * @returns {number} - Cross product
 */
function crossProduct(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Create a padded boundary around points
 * @param {Array} points - Array of {x, y} points
 * @param {number} padding - Padding distance
 * @returns {Array} - Array of padded boundary points
 */
export function createPaddedBoundary(points, padding = 20) {
  if (points.length === 0) return [];
  if (points.length === 1) {
    // Create a circle around single point
    const center = points[0];
    const circlePoints = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * 2 * Math.PI;
      circlePoints.push({
        x: center.x + Math.cos(angle) * padding,
        y: center.y + Math.sin(angle) * padding
      });
    }
    return circlePoints;
  }

  const hull = calculateConvexHull(points);
  if (hull.length < 3) return hull;

  // Calculate centroid
  const centroid = {
    x: hull.reduce((sum, p) => sum + p.x, 0) / hull.length,
    y: hull.reduce((sum, p) => sum + p.y, 0) / hull.length
  };

  // Expand each point outward from centroid
  return hull.map(point => {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) {
      return { x: point.x + padding, y: point.y };
    }
    
    const factor = (distance + padding) / distance;
    return {
      x: centroid.x + dx * factor,
      y: centroid.y + dy * factor
    };
  });
}

/**
 * Create smooth curved boundary using cardinal spline
 * @param {Array} points - Array of boundary points
 * @param {number} tension - Curve tension (0-1)
 * @returns {string} - SVG path string
 */
export function createSmoothBoundary(points, tension = 0.3) {
  if (points.length < 3) return '';

  const line = d3.line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveCardinalClosed.tension(tension));

  return line(points);
}

/**
 * Cluster boundary manager class
 */
export class ClusterBoundaryManager {
  constructor(clustersGroup, options = {}) {
    this.clustersGroup = clustersGroup;
    this.options = {
      padding: 25,
      smoothing: true,
      tension: 0.3,
      showLabels: true,
      animationDuration: 500,
      boundaryOpacity: 0.1,
      strokeOpacity: 0.3,
      strokeWidth: 2,
      ...options
    };

    this.boundaries = new Map();
  }

  /**
   * Update cluster boundaries based on node positions
   * @param {Map} domainGroups - Domain groups with nodes
   * @param {Array} nodes - Array of positioned nodes
   */
  updateBoundaries(domainGroups, nodes) {
    const boundaryData = [];

    domainGroups.forEach((group, domain) => {
      // Get positioned nodes for this domain
      const domainNodes = nodes.filter(n => n.domain === domain);
      
      if (domainNodes.length === 0) return;

      // Extract positions
      const positions = domainNodes.map(n => ({ x: n.x, y: n.y }));
      
      // Create boundary
      const paddedBoundary = createPaddedBoundary(positions, this.options.padding);
      
      if (paddedBoundary.length > 0) {
        const pathData = this.options.smoothing 
          ? createSmoothBoundary(paddedBoundary, this.options.tension)
          : this.createPolygonPath(paddedBoundary);

        // Calculate centroid for label positioning
        const centroid = this.calculateCentroid(positions);

        boundaryData.push({
          domain,
          path: pathData,
          color: group.color,
          nodeCount: domainNodes.length,
          centroid,
          nodes: domainNodes
        });
      }
    });

    this.renderBoundaries(boundaryData);
  }

  /**
   * Render cluster boundaries
   * @param {Array} boundaryData - Array of boundary data objects
   */
  renderBoundaries(boundaryData) {
    // Bind data
    const boundaries = this.clustersGroup
      .selectAll('.cluster-boundary')
      .data(boundaryData, d => d.domain);

    // Remove old boundaries
    boundaries.exit()
      .transition()
      .duration(this.options.animationDuration)
      .style('opacity', 0)
      .remove();

    // Add new boundaries
    const boundariesEnter = boundaries.enter()
      .append('g')
      .attr('class', 'cluster-boundary')
      .style('opacity', 0);

    // Add boundary path
    boundariesEnter.append('path')
      .attr('class', 'boundary-fill')
      .attr('fill', d => d.color)
      .attr('fill-opacity', this.options.boundaryOpacity)
      .attr('stroke', d => d.color)
      .attr('stroke-width', this.options.strokeWidth)
      .attr('stroke-opacity', this.options.strokeOpacity)
      .attr('stroke-dasharray', '5,5');

    // Add domain label if enabled
    if (this.options.showLabels) {
      const labelGroup = boundariesEnter.append('g')
        .attr('class', 'boundary-label');

      // Label background
      labelGroup.append('rect')
        .attr('class', 'label-background')
        .attr('fill', 'white')
        .attr('fill-opacity', 0.8)
        .attr('stroke', d => d.color)
        .attr('stroke-width', 1)
        .attr('rx', 4);

      // Label text
      labelGroup.append('text')
        .attr('class', 'label-text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', d => d.color)
        .text(d => d.domain);

      // Node count
      labelGroup.append('text')
        .attr('class', 'node-count')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.5em')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(d => `${d.nodeCount} node${d.nodeCount !== 1 ? 's' : ''}`);
    }

    // Update existing boundaries
    const boundariesUpdate = boundaries.merge(boundariesEnter);

    boundariesUpdate
      .transition()
      .duration(this.options.animationDuration)
      .style('opacity', 1);

    // Update paths
    boundariesUpdate.select('.boundary-fill')
      .transition()
      .duration(this.options.animationDuration)
      .attr('d', d => d.path);

    // Update labels
    if (this.options.showLabels) {
      const labels = boundariesUpdate.select('.boundary-label')
        .attr('transform', d => `translate(${d.centroid.x}, ${d.centroid.y})`);

      // Update label background size
      labels.select('.label-background')
        .each(function(_d) {
          const textElement = d3.select(this.parentNode).select('.label-text').node();
          if (textElement) {
            const bbox = textElement.getBBox();
            d3.select(this)
              .attr('x', -bbox.width / 2 - 4)
              .attr('y', -bbox.height / 2 - 2)
              .attr('width', bbox.width + 8)
              .attr('height', bbox.height + 16);
          }
        });
    }
  }

  /**
   * Create polygon path from points
   * @param {Array} points - Array of {x, y} points
   * @returns {string} - SVG path string
   */
  createPolygonPath(points) {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    path += ' Z';
    
    return path;
  }

  /**
   * Calculate centroid of points
   * @param {Array} points - Array of {x, y} points
   * @returns {Object} - Centroid {x, y}
   */
  calculateCentroid(points) {
    if (points.length === 0) return { x: 0, y: 0 };
    
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 });

    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  }

  /**
   * Highlight specific domain boundary
   * @param {string} domain - Domain to highlight
   */
  highlightDomain(domain) {
    this.clustersGroup.selectAll('.cluster-boundary')
      .classed('highlighted', d => d.domain === domain)
      .select('.boundary-fill')
      .transition()
      .duration(200)
      .attr('fill-opacity', d => d.domain === domain ? 0.2 : 0.05)
      .attr('stroke-opacity', d => d.domain === domain ? 0.8 : 0.2);
  }

  /**
   * Clear all highlights
   */
  clearHighlights() {
    this.clustersGroup.selectAll('.cluster-boundary')
      .classed('highlighted', false)
      .select('.boundary-fill')
      .transition()
      .duration(200)
      .attr('fill-opacity', this.options.boundaryOpacity)
      .attr('stroke-opacity', this.options.strokeOpacity);
  }

  /**
   * Update boundary options
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    Object.assign(this.options, newOptions);
  }

  /**
   * Show/hide domain labels
   * @param {boolean} show - Whether to show labels
   */
  toggleLabels(show) {
    this.options.showLabels = show;
    this.clustersGroup.selectAll('.boundary-label')
      .style('display', show ? 'block' : 'none');
  }

  /**
   * Clear all boundaries
   */
  clear() {
    this.clustersGroup.selectAll('.cluster-boundary').remove();
    this.boundaries.clear();
  }
}
