# View Mode Switching Guide

## 🔄 How to Change Between Tree and Cluster Views

TabTreeTracker now supports two powerful visualization modes that you can switch between seamlessly:

### **Tree View** 🌳
- Traditional hierarchical tree structure
- Shows parent-child relationships clearly
- Best for understanding navigation paths
- Familiar tree layout with branches

### **Cluster View** 🌐
- Domain-based clustering with force simulation
- Groups tabs by website domain
- Shows cross-domain relationships
- Similar to Obsidian's graph view

## 🎛️ **Method 1: Control Panel (Recommended)**

When you open the TabTreeTracker viewer, you'll see a **Cluster Controls Panel** in the top-left corner:

### **Visual Controls**
1. **"Tree View" Button** - Switch to hierarchical tree
2. **"Cluster View" Button** - Switch to domain clustering
3. **Active mode is highlighted in blue**

### **Additional Controls**
- **Cluster Strength Slider** - Adjust how tightly domains cluster together
- **Show Domain Boundaries** - Toggle visual boundaries around clusters
- **Show Domain Labels** - Toggle domain names and node counts
- **Domain Filters** - Show/hide specific domains

## 🎛️ **Method 2: Top Controls Bar**

In the main controls bar, you'll find:

### **🔄 View Mode Button**
- Click the **"🔄 View Mode"** button to toggle between modes
- Button text changes to show the next available mode:
  - Shows "🔄 Cluster View" when in Tree mode
  - Shows "🔄 Tree View" when in Cluster mode

## ⌨️ **Method 3: Programmatic Control**

If you're integrating with the system programmatically:

```javascript
// Get the viewer instance
const viewer = window.viewer;

// Switch to cluster view
viewer.switchViewMode('cluster');

// Switch to tree view
viewer.switchViewMode('tree');

// Toggle between modes
viewer.toggleViewMode();

// Get current mode
const currentMode = viewer.getCurrentViewMode();
console.log('Current mode:', currentMode); // 'tree' or 'cluster'
```

## 🎬 **Smooth Transitions**

All mode switches include:
- **Animated transitions** (1 second duration)
- **State preservation** - zoom level and selections maintained
- **Loading overlay** during transition
- **Smooth fade in/out effects**

## 🧪 **Testing the Feature**

### **Integration Test**
1. Open `test/integration-test.html` in your browser
2. Click the test buttons to try different modes:
   - **"Test Tree View"** - Creates tree visualization
   - **"Test Cluster View"** - Creates cluster visualization
   - **"Test Mode Switch"** - Demonstrates animated transition

### **Live Testing**
1. Load TabTreeTracker with some browsing data
2. Use any of the switching methods above
3. Observe the smooth transition between modes

## 🎨 **Visual Differences**

### **Tree View Features:**
- Hierarchical node arrangement
- Clear parent-child connections
- Vertical or horizontal layouts
- Traditional tree navigation

### **Cluster View Features:**
- Nodes grouped by domain color
- Force-directed positioning
- Domain boundary hulls
- Cross-domain relationship lines
- Interactive cluster controls

## 🔧 **Customization Options**

### **Cluster View Settings:**
- **Cluster Strength** (0.0 - 1.0) - How tightly domains cluster
- **Show Boundaries** - Visual domain boundaries on/off
- **Show Labels** - Domain names and statistics
- **Animation Speed** - Transition and simulation speed

### **Layout Algorithms:**
- **Force-Directed** (default) - Natural clustering
- **Circular** - Domains arranged in circles
- **Hierarchical** - Hybrid tree-cluster layout

## 🚀 **Quick Start**

1. **Open TabTreeTracker viewer**
2. **Look for the control panel** in the top-left corner
3. **Click "Cluster View"** to switch from default tree mode
4. **Adjust cluster strength** with the slider
5. **Toggle boundaries and labels** as desired
6. **Click "Tree View"** to switch back

## 💡 **Tips for Best Experience**

### **When to Use Tree View:**
- Understanding specific navigation paths
- Following tab creation sequences
- Analyzing hierarchical relationships
- Traditional tree-like browsing patterns

### **When to Use Cluster View:**
- Exploring domain relationships
- Understanding cross-site navigation
- Analyzing browsing patterns by website
- Large datasets with many domains
- Research workflows across multiple sites

## 🔍 **Troubleshooting**

### **If mode switching doesn't work:**
1. Check browser console for errors
2. Ensure all required files are loaded
3. Verify D3.js library is available
4. Try refreshing the page

### **If transitions are slow:**
1. Reduce animation speed in cluster controls
2. Check for large datasets (>1000 nodes)
3. Consider using tree view for very large datasets

### **If cluster view looks messy:**
1. Increase cluster strength (0.3-0.7 works well)
2. Enable domain boundaries for clarity
3. Filter out domains with few nodes
4. Adjust collision radius in settings

## 📚 **Related Documentation**

- [Domain Clustering Proposal](./002-domain-clustering-proposal.md) - Technical implementation details
- [Improvement Plan](./000-improvement-plan.md) - Overall project roadmap
- Integration test file: `test/integration-test.html`
- Test suite: `test/domain-clustering-test.js`

---

**🎉 Enjoy exploring your browsing patterns with both Tree and Cluster views!**
