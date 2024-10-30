# Tab Tree Tracker

A Chrome extension that visualizes your browser tab navigation history as an interactive tree structure. Track, analyze, and visualize how your browsing sessions evolve over time.

(Mostly written by Claude.)

## Features

### Tree Visualization
- Real-time tracking of tab relationships and navigation paths
- Interactive D3.js-based visualization
- Vertical and horizontal layout options
- Advanced zoom controls (mouse wheel + axis-specific zoom)
- Detailed hover information for each node

### Tab Tracking
- Tracks parent-child relationships between tabs
- Records timestamps for tab creation and closure
- Analyzes page content for frequently used words
- Maintains complete navigation history
- [] Add thumbnail

### Data Management
- Save/Load tree data as JSON
- Configurable domain exclusions
- Session management
- Timezone support

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

### Basic Controls
- Click the extension icon to open the popup, toggle tracking, clear & save the tree
- Use the viewer to explore your tab tree
- Hover over nodes to see detailed information
- Click nodes to open the corresponding URLs

### Viewer Controls
- Mouse wheel to zoom in/out
- Toggle between vertical/horizontal layouts
- Save current tree as JSON
- Load previously saved trees
- [] X/Y axis specific zoom controls
- [] Hide nodes
- [] Search & select, and assign different visual effects to selected nodes

### Configuration
- Set excluded domains in the options page
- Configure timezone settings
- Manage tracking preferences

## Screenshots

[Placeholder for screenshots showing:]
1. Main tree visualization
2. Hover details panel
3. Different layouts (vertical/horizontal)
4. Zoom levels
5. Options page

## Demo

[Placeholder for GIF demonstrations of:]
1. Basic tab tracking in action
2. Tree navigation and interaction
3. Layout switching
4. Zoom functionality
5. Save/Load operations

## Technical Details

### Architecture
- Background service worker for tab tracking
- D3.js for tree visualization
- Chrome Storage API for data persistence
- Content script for page analysis

### Data Structure
```javascript
{
  tabTree: {
    nodeId: {
      id: string,
      tabId: number,
      url: string,
      title: string,
      createdAt: timestamp,
      closedAt: timestamp,
      children: array,
      topWords: array
    }
  }
}
```

## License

This project is licensed under the MIT License:

```
MIT License

Copyright (c) 2024 [your name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

This extension uses the following open-source libraries:
- [D3.js](https://d3js.org/) - BSD 3-Clause License

