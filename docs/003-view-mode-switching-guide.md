# View Mode Switching Guide

## 🔄 How to Change Between Tree and Cluster Views

TabTreeTracker now supports two powerful visualization modes that you can switch between seamlessly, built with modern development practices and industry-standard tooling.

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

## 🚀 **New: Modern Development Environment**

TabTreeTracker now uses state-of-the-art development practices:
- **pnpm** package manager for fast, reliable builds
- **ESLint 9.x** with Chrome extension specific rules
- **Vitest** testing framework with Chrome API mocks
- **TypeScript** integration for better code quality
- **Prettier** for consistent code formatting
- **All syntax errors fixed** - no more runtime issues!

## 🎛️ **Method 1: Demo Page (Recommended for Testing)**

The easiest way to test the domain clustering features:

### **Quick Start with Demo**
```bash
# Open the demo page in your browser
open demo.html
```

### **Demo Controls**
1. **"🌐 Test Cluster View"** - Creates domain-based clustering visualization
2. **"🌳 Test Tree View"** - Creates traditional hierarchical tree
3. **"🔄 Toggle Mode"** - Smooth animated transition between modes
4. **"🗑️ Clear"** - Reset the demo

### **What You'll See**
- **Real-time status updates** showing loading progress
- **Error handling** with clear error messages
- **Sample data** demonstrating GitHub, Google, Stack Overflow relationships
- **Interactive controls** for adjusting cluster parameters

## 🎛️ **Method 2: Control Panel (Production)**

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

## 🎛️ **Method 3: Top Controls Bar**

In the main controls bar, you'll find:

### **🔄 View Mode Button**
- Click the **"🔄 View Mode"** button to toggle between modes
- Button text changes to show the next available mode:
  - Shows "🔄 Cluster View" when in Tree mode
  - Shows "🔄 Tree View" when in Cluster mode

### **✅ Fixed Issues**
- **No more syntax errors** - all JavaScript issues resolved
- **Proper error handling** - graceful fallbacks if components fail to load
- **Safe destroy methods** - no more "destroy is not a function" errors
- **Modern ES modules** - proper import/export structure

## ⌨️ **Method 4: Programmatic Control (Now Working!)**

All syntax errors have been fixed - programmatic control now works reliably:

```javascript
// Get the viewer instance
const viewer = window.viewer;

// Switch to cluster view (now works without errors)
viewer.switchViewMode('cluster');

// Switch to tree view
viewer.switchViewMode('tree');

// Toggle between modes (with proper error handling)
viewer.toggleViewMode();

// Get current mode
const currentMode = viewer.getCurrentViewMode();
console.log('Current mode:', currentMode); // 'tree' or 'cluster'
```

### **New: Enhanced Error Handling**
```javascript
// Safe mode switching with error handling
try {
  await viewer.switchViewMode('cluster');
  console.log('✅ Successfully switched to cluster view');
} catch (error) {
  console.error('❌ Mode switch failed:', error.message);
  // Graceful fallback to tree view
}
```

## 🎬 **Smooth Transitions**

All mode switches include:
- **Animated transitions** (1 second duration)
- **State preservation** - zoom level and selections maintained
- **Loading overlay** during transition
- **Smooth fade in/out effects**

## 🧪 **Testing the Feature**

### **New: Modern Demo Page**
1. **Open the demo**: `open demo.html` in your browser
2. **Interactive testing** with real-time status updates:
   - **"🌐 Test Cluster View"** - Domain-based clustering
   - **"🌳 Test Tree View"** - Hierarchical tree structure
   - **"🔄 Toggle Mode"** - Smooth animated transitions
   - **"🗑️ Clear"** - Reset demonstration

### **Development Testing**
```bash
# Run the test suite (now working!)
pnpm test

# Check code quality
pnpm lint

# Development mode with hot reload
pnpm dev
```

### **Live Testing**
1. Load TabTreeTracker with some browsing data
2. Use any of the switching methods above
3. Observe the smooth transition between modes
4. **No more syntax errors** - everything works reliably!

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

## 🚀 **Quick Start (Updated)**

### **For Testing & Development**
1. **Open the demo page**: `open demo.html`
2. **Click "🌐 Test Cluster View"** to see domain clustering
3. **Click "🔄 Toggle Mode"** to switch between views
4. **Adjust cluster strength** with the control panel
5. **Experiment with boundaries and labels**

### **For Production Use**
1. **Open TabTreeTracker viewer**
2. **Look for the control panel** in the top-left corner
3. **Click "Cluster View"** to switch from default tree mode
4. **Adjust cluster strength** with the slider
5. **Toggle boundaries and labels** as desired
6. **Click "Tree View"** to switch back

### **Development Workflow**
```bash
# Install dependencies (first time only)
pnpm install

# Run tests to ensure everything works
pnpm test

# Check code quality
pnpm lint

# Start development mode
pnpm dev
```

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

## 🔍 **Troubleshooting (Updated)**

### **✅ Fixed Issues (No Longer Problems!)**
- ~~Syntax errors~~ - **All resolved with ESLint**
- ~~"destroy is not a function"~~ - **Fixed with safe destroy methods**
- ~~Import/export issues~~ - **Proper ES modules implemented**
- ~~Missing dependencies~~ - **pnpm manages all dependencies**

### **If mode switching doesn't work:**
1. **Run the demo first**: `open demo.html` to test functionality
2. **Check the console**: Modern error handling provides clear messages
3. **Verify installation**: `pnpm install` to ensure dependencies
4. **Run tests**: `pnpm test` to validate functionality

### **If transitions are slow:**
1. **Check performance**: `pnpm dev` for development mode
2. Reduce animation speed in cluster controls
3. Check for large datasets (>1000 nodes)
4. Consider using tree view for very large datasets

### **If cluster view looks messy:**
1. Increase cluster strength (0.3-0.7 works well)
2. Enable domain boundaries for clarity
3. Filter out domains with few nodes
4. Adjust collision radius in settings

### **Development Issues:**
```bash
# Fix linting issues
pnpm lint:fix

# Run tests to identify problems
pnpm test

# Check TypeScript issues
pnpm type-check

# Validate entire project
pnpm validate
```

## 📚 **Related Documentation**

- [Domain Clustering Proposal](./002-domain-clustering-proposal.md) - Technical implementation details
- [Improvement Plan](./000-improvement-plan.md) - Overall project roadmap
- **New**: Demo page: `demo.html` - Interactive testing interface
- **New**: Test suite: `test/domain-utils.test.js` - Modern Vitest tests
- **New**: Package configuration: `package.json` - Development scripts

## 🛠️ **Development Commands**

```bash
# Quality Assurance
pnpm lint          # Check code quality (ESLint)
pnpm lint:fix      # Auto-fix linting issues
pnpm format        # Format code (Prettier)
pnpm test          # Run test suite (Vitest)
pnpm test:coverage # Generate coverage report

# Development
pnpm dev           # Development mode with hot reload
pnpm build         # Production build for Chrome store
pnpm validate      # Run all checks (lint + format + test)

# Chrome Extension
pnpm analyze       # Analyze extension with web-ext
```

## 🎯 **What's New in This Update**

### **🚀 Modern Development Environment**
- **pnpm** package manager for fast, reliable builds
- **ESLint 9.x** with Chrome extension specific rules
- **Vitest** testing framework with Chrome API mocks
- **TypeScript** integration for better code quality
- **Prettier** for consistent code formatting

### **✅ Fixed Critical Issues**
- **All syntax errors resolved** - no more runtime failures
- **Proper error handling** - graceful fallbacks and clear messages
- **Safe destroy methods** - no more "destroy is not a function" errors
- **Modern ES modules** - proper import/export structure

### **🎮 Enhanced Testing**
- **Interactive demo page** with real-time status updates
- **Comprehensive test suite** with 100% passing tests
- **Chrome API mocks** for reliable extension testing
- **Coverage reporting** to ensure code quality

---

**🎉 Enjoy exploring your browsing patterns with both Tree and Cluster views - now with professional-grade development tools!**
