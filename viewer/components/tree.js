export class TreeVisualizer {
  constructor(container, data, options = {}) {
    this.container = container;
    this.data = data;
    this.options = {
      layout: 'vertical',
      nodeSize: 20,
      minNodeSize: 2,      // Add min size
      maxNodeSize: 60,     // Add max size
      nodeSizeStep: 2,     // Add size adjustment step
      maxLineLength: 20,
      maxLines: 2,
      showText: true,
      ...options
    };
    
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.zoomLevel = 1;
    this.axisScales = { x: 1, y: 1 };
    
    // Add property for details panel
    this.detailsPanel = null;
    this.setupKeyboardShortcuts();

    this.init();

    window.addEventListener('resize', () => {
      this.width = container.clientWidth;
      this.height = container.clientHeight;
      this.render();
    });
  }

  init() {
    this.container.innerHTML = '';
    
    // Create details panel
    this.detailsPanel = d3.select(this.container)
      .append('div')
      .attr('class', 'node-details')
      .style('display', 'none');

    // Create SVG container
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    // Create main group for zooming
    this.mainGroup = this.svg.append('g')
      .attr('class', 'main-group');

    // Create groups for links and nodes
    this.linksGroup = this.mainGroup.append('g').attr('class', 'links');
    this.nodesGroup = this.mainGroup.append('g').attr('class', 'nodes');

    // Set up zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.01, 30])
      .on('zoom', (event) => {
        this.handleZoom(event);
      });

    this.svg.call(zoom);
    
    this.render();
  }


  // Add method to update node size
  updateNodeSize(change) {
    const newSize = this.options.nodeSize + change;
    if (newSize >= this.options.minNodeSize && newSize <= this.options.maxNodeSize) {
      this.options.nodeSize = newSize;
      this.render();
    }
  }

  // Add method to reset node size
  resetNodeSize() {
    this.options.nodeSize = 20; // Default size
    this.render();
  }

  // Add text wrapping utility method to TreeVisualizer class
  wrapLongText(text, maxLength = 40, maxLines = 3) {
    if (!text) return '';
    
    // Split into words, keeping URL structure intact
    const words = text.split(/(?<=\/)/); // Split after '/' for URLs
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      // If single word is longer than maxLength, split it
      if (word.length > maxLength) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        
        // Add chunks of the long word
        let remaining = word;
        while (remaining.length > 0 && lines.length < maxLines) {
          lines.push(remaining.slice(0, maxLength));
          remaining = remaining.slice(maxLength);
        }
        
        if (remaining.length > 0) {
          // If we hit maxLines, modify last line to show truncation
          if (lines.length === maxLines) {
            lines[maxLines - 1] = lines[maxLines - 1].slice(0, -3) + '...';
          }
          break;
        }
        continue;
      }

      // Normal word processing
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine.length === 0 ? '' : '') + word;
      } else {
        if (lines.length < maxLines) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines[maxLines - 1] = lines[maxLines - 1].slice(0, -3) + '...';
          break;
        }
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  // Add method to update details panel content
  updateDetailsPanel(d, event) {
    if (!d) {
      this.detailsPanel.style('display', 'none');
      return;
    }

    const data = d.data;
    const nodeData = data.data; // Original node data with all properties
    
    // Format timestamp to local date-time
    const createdAt = new Date(nodeData.createdAt).toLocaleString();
    const closedAt = nodeData.closedAt ? new Date(nodeData.closedAt).toLocaleString() : 'Still open';

    
    // Wrap title and URL
    const wrappedTitle = this.wrapLongText(data.name, 40, 3);
    const wrappedUrl = nodeData.url ? this.wrapLongText(nodeData.url, 40, 3) : 'N/A';

    // Update content
    this.detailsPanel.html(`
      <h4 class="wrapped-text">${wrappedTitle}</h4>
      
      <div class="node-details-section">
        <strong>URL:</strong><br>
        <span class="wrapped-text url-text">${wrappedUrl}</span>
      </div>
      
      <div class="node-details-section">
        <strong>Created:</strong> ${createdAt}<br>
        <strong>Closed:</strong> ${closedAt}
      </div>
      
      ${nodeData.topWords ? `
        <div class="node-details-section">
          <strong>Top Words:</strong>
          <div class="word-stats">
            ${nodeData.topWords.map(w => `
              <div>${w.word}</div>
              <div class="word-count">${w.count}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `);

    // Position the panel near the cursor but not overlapping
    const [x, y] = d3.pointer(event, this.container);
    const panelBox = this.detailsPanel.node().getBoundingClientRect();
    const containerBox = this.container.getBoundingClientRect();
    
    let left = x + 10; // 10px offset from cursor
    let top = y + 10;

    // Adjust if panel would overflow container
    if (left + panelBox.width > containerBox.width) {
      left = x - panelBox.width - 10;
    }
    if (top + panelBox.height > containerBox.height) {
      top = y - panelBox.height - 10;
    }

    this.detailsPanel
      .style('left', `${left}px`)
      .style('top', `${top}px`)
      .style('display', 'block');
  }


  // Add these interface methods to match what other components expect
  setLayout(layout) {
    this.options.layout = layout;
    this.render();
  }

  updateData(newData) {
    this.data = newData;
    this.render();
  }

  // Update this method to handle axis-specific zoom
  updateAxisZoom(scales) {
    this.axisScales = scales;
    this.render(true);
  }

  render(isZoomUpdate = false) {
    console.log('Render called.')
    const isVertical = this.options.layout === 'vertical';
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    
    const width = (this.width - margin.left - margin.right) * this.axisScales.x;
    const height = (this.height - margin.top - margin.bottom) * this.axisScales.y;
    
    // Update tree layout with scaled dimensions
    this.treeLayout = d3.tree()
      .size(isVertical ? [width, height] : [height, width])
      .separation((a, b) => {
        return (a.parent === b.parent ? 1.5 : 2) / Math.min(this.axisScales.x, this.axisScales.y);
      });

    const root = d3.hierarchy(this.data);
    const treeData = this.treeLayout(root);

    // Rest of your existing render code remains the same
    const transition = d3.transition()
      .duration(750)
      .ease(d3.easeQuadInOut);

    // Update all the visual elements with proper stroke width scaling
    const currentScale = this.zoomLevel || 1;

    // Links
    const linkGenerator = isVertical ? 
      d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y) :
      d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x);

    const links = this.linksGroup
      .selectAll('.link')
      .data(treeData.links());

    links.exit()
      .transition(transition)
      .style('opacity', 0)
      .remove();

    const linksEnter = links
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2 / currentScale)
      .attr('fill', 'none')
      .style('opacity', 0)
      .attr('d', d => {
        const o = {
          x: d.source.x0 || d.source.x || 0,
          y: d.source.y0 || d.source.y || 0
        };
        return linkGenerator({source: o, target: o});
      });

    links.merge(linksEnter)
      .transition(transition)
      .style('opacity', 1)
      .attr('d', linkGenerator);

    // Nodes
    const nodes = this.nodesGroup
      .selectAll('.node')
      .data(treeData.descendants());

    nodes.exit()
      .transition(transition)
      .style('opacity', 0)
      .remove();

    const nodesEnter = nodes
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('opacity', 0)
      .attr('transform', d => {
        const x = d.parent?.x0 || d.parent?.x || d.x || 0;
        const y = d.parent?.y0 || d.parent?.y || d.y || 0;
        return isVertical ? 
          `translate(${x},${y})` : 
          `translate(${y},${x})`;
      });

    // Node circles
    nodesEnter
      .append('circle')
      .attr('r', this.options.nodeSize / 2 / currentScale)
      .attr('fill', '#fff')
      .attr('stroke', d => d.data.url ? '#1a73e8' : '#666')
      .attr('stroke-width', 2)
      .style('cursor', d => d.data.url ? 'pointer' : 'default')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.data.url) {
          window.open(d.data.url, '_blank');
        }
      })
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('fill', '#f0f7ff');
        this.updateDetailsPanel(d, event);
      })
      .on('mousemove', (event, d) => {
        this.updateDetailsPanel(d, event);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('fill', '#fff');
        this.updateDetailsPanel(null);
      });

    // Text groups
    const textGroup = nodesEnter
      .append('g')
      .attr('class', 'text-group');

    textGroup.append('g').attr('class', 'text-background');
    textGroup.append('g').attr('class', 'text-foreground');

    const allNodes = nodes.merge(nodesEnter)
      .transition(transition)
      .style('opacity', 1)
      .attr('transform', d => isVertical ?
        `translate(${d.x},${d.y})` :
        `translate(${d.y},${d.x})`
      );

    // Update text
    this.nodesGroup.selectAll('.node').each((d, i, nodes) => {
      const node = d3.select(nodes[i]);
      this.updateNodeText(node, d);
    });

    // Store positions for next transition
    nodes.each(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  
  // Add new method to toggle text visibility
  toggleTextVisibility() {
    this.options.showText = !this.options.showText;
    this.nodesGroup.selectAll('.text-group')
      .style('display', this.options.showText ? 'block' : 'none');
  }
  
  // Updated updateNodeText method with constant text size
  updateNodeText(node, d) {
    const scale = this.zoomLevel || 1;
    const baseOffset = 8; // Base offset distance from node
    const scaledOffset = baseOffset / scale; // Scale offset with zoom level
    
    const textGroup = node.select('.text-group')
      .style('display', this.options.showText ? 'block' : 'none');  // Add this line
    const background = textGroup.select('.text-background');
    const foreground = textGroup.select('.text-foreground');
    
    background.selectAll('*').remove();
    foreground.selectAll('*').remove();

    const lines = this.wrapText(d.data.name);
    const lineHeight = 1.2;
    
    lines.forEach((line, i) => {
      background
        .append('text')
        .attr('dy', `${i * lineHeight}em`)
        .attr('x', d.children ? -scaledOffset : scaledOffset) // Use scaled offset
        .attr('text-anchor', d.children ? 'end' : 'start')
        .attr('stroke', 'white')
        .attr('stroke-width', 3 / scale)
        .style('font-size', `${12 / scale}px`)  // Constant font size
        .text(line);

      foreground
        .append('text')
        .attr('dy', `${i * lineHeight}em`)
        .attr('x', d.children ? -scaledOffset : scaledOffset) // Use scaled offset
        .attr('text-anchor', d.children ? 'end' : 'start')
        .attr('fill', '#000')
        .style('font-size', `${12 / scale}px`)  // Constant font size
        .text(line);
    });

    node.select('title').remove();
    node.append('title')
      .text(d.data.name + (d.data.url ? '\nClick node to open URL' : ''));
  }


  handleZoom(event) {
    const transform = event.transform;
    this.mainGroup.attr('transform', transform);
    
    // Keep node sizes and strokes constant during zoom
    const scale = transform.k;
    this.nodesGroup.selectAll('circle')
      .attr('r', this.options.nodeSize / 2 / scale)
      .attr('stroke-width', 2 );  // Scale stroke width inversely
    
    // Update text positions and scaling
    this.nodesGroup.selectAll('.node').each((d, i, nodes) => {
      const node = d3.select(nodes[i]);
      this.updateNodeText(node, d);
    });
    
    // Scale link stroke width
    this.linksGroup.selectAll('.link')
      .attr('stroke-width', 2 / scale);

    this.zoomLevel = scale;
}

  // Your existing helper methods remain the same
  wrapText(text) {
    if (!text) return [''];
    
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
  
    // First, truncate any long words
    const truncatedWords = words.map(word => 
      word.length > this.options.maxLineLength ? 
        word.slice(0, 15) + '...' : 
        word
    );
    
    for (const word of truncatedWords) {
      if (currentLine.length + word.length + 1 <= this.options.maxLineLength) {
        currentLine += (currentLine.length === 0 ? '' : ' ') + word;
      } else {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = word;
        
        if (lines.length >= this.options.maxLines - 1) {
          lines.push(currentLine + '...');
          return lines;
        }
      }
    }
    
    if (currentLine.length > 0 && lines.length < this.options.maxLines) {
      lines.push(currentLine);
    }
  
    return lines;
  }
  // In TreeVisualizer class, add this method
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Skip if focus is in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch(event.key.toLowerCase()) {
        case 't':
          this.toggleTextVisibility();
          const button = document.getElementById('toggleText');
          if (button) {
            button.textContent = `${this.options.showText ? 'Hide' : 'Show'} Text (T)`;
          }
          break;
        case '=': // Plus key (without shift)
        case '+': // Plus key (with shift)
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.updateNodeSize(this.options.nodeSizeStep);
          }
          break;
        case '-': // Minus key
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.updateNodeSize(-this.options.nodeSizeStep);
          }
          break;
      }
    });
  }

}