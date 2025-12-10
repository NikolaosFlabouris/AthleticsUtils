/**
 * Track SVG Renderer
 * Generates an interactive SVG visualization of an athletics track
 */

import { TRACK_400M, SVG_CONFIG, getLaneRadius } from '../data/track-constants.js';
import { getAllMarkings, MARKING_CATEGORIES, CATEGORY_NAMES } from '../data/track-markings-data.js';
import { positionToCoordinates, generateLanePath, generateRoutePath } from '../calculators/track-geometry.js';

/**
 * Track SVG Renderer class
 */
export class TrackSvgRenderer {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      showLabels: options.showLabels !== false,
      interactive: options.interactive !== false,
      waterJumpConfig: options.waterJumpConfig || 'inside',
      onMarkingClick: options.onMarkingClick || null,
      onMarkingHover: options.onMarkingHover || null,
      ...options
    };

    this.svg = null;
    this.markingElements = new Map();
    this.selectedMarkings = new Set();
    this.highlightedRoute = null;

    // Pan/zoom state
    this.viewBox = {
      x: 0,
      y: 0,
      width: SVG_CONFIG.viewBoxWidth,
      height: SVG_CONFIG.viewBoxHeight
    };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.lastPinchDistance = 0;

    this.trackConfig = TRACK_400M;
  }

  /**
   * Render the track SVG
   * @param {Object} options - Render options
   */
  render(options = {}) {
    const waterJumpConfig = options.waterJumpConfig || this.options.waterJumpConfig;

    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${SVG_CONFIG.viewBoxWidth} ${SVG_CONFIG.viewBoxHeight}`);
    this.svg.setAttribute('class', 'track-svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', '400m athletics track with markings');

    // Create layers
    this._createBackground();
    this._createTrackSurface();
    this._createLaneLines();
    this._createMarkings(waterJumpConfig);
    this._createHighlightLayer();
    if (this.options.showLabels) {
      this._createLabels(waterJumpConfig);
    }

    // Add to container
    this.container.innerHTML = '';
    this.container.appendChild(this.svg);

    // Setup interactions
    if (this.options.interactive) {
      this._setupPanZoom();
      this._setupMarkingInteractions();
    }
  }

  /**
   * Create background layer (infield)
   */
  _createBackground() {
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bg.setAttribute('class', 'track-svg__background');

    // Infield grass
    const infield = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    infield.setAttribute('x', '0');
    infield.setAttribute('y', '0');
    infield.setAttribute('width', SVG_CONFIG.viewBoxWidth);
    infield.setAttribute('height', SVG_CONFIG.viewBoxHeight);
    infield.setAttribute('fill', SVG_CONFIG.colors.infield);
    infield.setAttribute('class', 'track-svg__infield');
    bg.appendChild(infield);

    this.svg.appendChild(bg);
  }

  /**
   * Create track surface layer
   */
  _createTrackSurface() {
    const surface = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    surface.setAttribute('class', 'track-svg__surface');

    // Draw all lanes (outer to inner for proper layering)
    for (let lane = this.trackConfig.numLanes; lane >= 1; lane--) {
      const lanePath = this._generateLaneShape(lane);
      const laneEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      laneEl.setAttribute('d', lanePath);
      laneEl.setAttribute('fill', SVG_CONFIG.colors.trackSurface);
      laneEl.setAttribute('class', `track-svg__lane track-svg__lane--${lane}`);
      laneEl.setAttribute('data-lane', lane);
      surface.appendChild(laneEl);
    }

    this.svg.appendChild(surface);
  }

  /**
   * Generate lane shape path (filled track lane)
   */
  _generateLaneShape(lane) {
    const scale = SVG_CONFIG.scale;
    const offsetX = SVG_CONFIG.trackOffsetX;
    const offsetY = SVG_CONFIG.trackOffsetY;
    const straightLen = this.trackConfig.straightLength;

    // Inner and outer radii for this lane
    const innerRadius = getLaneRadius(lane, this.trackConfig) * scale;
    const outerRadius = (getLaneRadius(lane, this.trackConfig) + this.trackConfig.laneWidth) * scale;

    // Center Y of the track
    const centerY = offsetY + getLaneRadius(1, this.trackConfig) * scale;

    // Create a closed path for the lane
    const path = [
      // Start at inner edge, bottom left
      `M ${offsetX} ${centerY + innerRadius}`,
      // Bottom straight (inner) - right
      `L ${offsetX + straightLen * scale} ${centerY + innerRadius}`,
      // Right curve (inner)
      `A ${innerRadius} ${innerRadius} 0 0 0 ${offsetX + straightLen * scale} ${centerY - innerRadius}`,
      // Top straight (inner) - left
      `L ${offsetX} ${centerY - innerRadius}`,
      // Left curve (inner)
      `A ${innerRadius} ${innerRadius} 0 0 0 ${offsetX} ${centerY + innerRadius}`,
      'Z',
      // Now outer edge (counter-clockwise to create ring)
      `M ${offsetX} ${centerY + outerRadius}`,
      // Left curve (outer)
      `A ${outerRadius} ${outerRadius} 0 0 1 ${offsetX} ${centerY - outerRadius}`,
      // Top straight (outer) - right
      `L ${offsetX + straightLen * scale} ${centerY - outerRadius}`,
      // Right curve (outer)
      `A ${outerRadius} ${outerRadius} 0 0 1 ${offsetX + straightLen * scale} ${centerY + outerRadius}`,
      // Bottom straight (outer) - left
      `L ${offsetX} ${centerY + outerRadius}`,
      'Z'
    ];

    return path.join(' ');
  }

  /**
   * Create lane lines layer
   */
  _createLaneLines() {
    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    lines.setAttribute('class', 'track-svg__lane-lines');

    // Draw line for each lane boundary
    for (let lane = 1; lane <= this.trackConfig.numLanes + 1; lane++) {
      const linePath = this._generateLaneLine(lane);
      const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      lineEl.setAttribute('d', linePath);
      lineEl.setAttribute('stroke', SVG_CONFIG.colors.laneLines);
      lineEl.setAttribute('stroke-width', SVG_CONFIG.strokeWidths.laneLine);
      lineEl.setAttribute('fill', 'none');
      lineEl.setAttribute('class', 'track-svg__lane-line');
      lines.appendChild(lineEl);
    }

    this.svg.appendChild(lines);
  }

  /**
   * Generate lane line path
   */
  _generateLaneLine(lane) {
    const scale = SVG_CONFIG.scale;
    const offsetX = SVG_CONFIG.trackOffsetX;
    const offsetY = SVG_CONFIG.trackOffsetY;
    const straightLen = this.trackConfig.straightLength;

    // For lane 1, use inner edge. For others, use outer edge of previous lane
    const radius = lane === 1
      ? this.trackConfig.curveRadius * scale
      : (getLaneRadius(lane - 1, this.trackConfig) + this.trackConfig.laneWidth) * scale;

    const centerY = offsetY + getLaneRadius(1, this.trackConfig) * scale;

    const path = [
      `M ${offsetX} ${centerY + radius}`,
      `L ${offsetX + straightLen * scale} ${centerY + radius}`,
      `A ${radius} ${radius} 0 0 0 ${offsetX + straightLen * scale} ${centerY - radius}`,
      `L ${offsetX} ${centerY - radius}`,
      `A ${radius} ${radius} 0 0 0 ${offsetX} ${centerY + radius}`
    ];

    return path.join(' ');
  }

  /**
   * Create markings layer
   */
  _createMarkings(waterJumpConfig) {
    const markingsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    markingsGroup.setAttribute('class', 'track-svg__markings');

    const markings = getAllMarkings({ waterJumpConfig });

    for (const marking of markings) {
      // Skip markings that don't match current water jump config
      if (marking.waterJumpConfig && marking.waterJumpConfig !== waterJumpConfig) {
        continue;
      }

      const markingEl = this._createMarkingElement(marking);
      if (markingEl) {
        this.markingElements.set(marking.id, markingEl);
        markingsGroup.appendChild(markingEl);
      }
    }

    this.svg.appendChild(markingsGroup);
  }

  /**
   * Create a single marking element
   */
  _createMarkingElement(marking) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'track-svg__marking');
    group.setAttribute('data-id', marking.id);
    group.setAttribute('data-category', marking.category);

    const lane = marking.lane || 1;
    const coords = positionToCoordinates(marking.position, lane, this.trackConfig);

    // Get color based on category
    const color = this._getCategoryColor(marking.category);

    // Create marking line
    const lineLength = marking.lane === 0
      ? this.trackConfig.laneWidth * this.trackConfig.numLanes * SVG_CONFIG.scale
      : this.trackConfig.laneWidth * SVG_CONFIG.scale;

    // Calculate line perpendicular to track direction
    const perpAngle = coords.angle + Math.PI / 2;
    const halfLength = lineLength / 2;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', coords.x - Math.cos(perpAngle) * halfLength);
    line.setAttribute('y1', coords.y - Math.sin(perpAngle) * halfLength);
    line.setAttribute('x2', coords.x + Math.cos(perpAngle) * halfLength);
    line.setAttribute('y2', coords.y + Math.sin(perpAngle) * halfLength);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', SVG_CONFIG.strokeWidths.marking);
    line.setAttribute('class', 'track-svg__mark-line');
    group.appendChild(line);

    // Add small dot at center for clickability
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', coords.x);
    dot.setAttribute('cy', coords.y);
    dot.setAttribute('r', 4);
    dot.setAttribute('fill', color);
    dot.setAttribute('class', 'track-svg__mark-dot');
    group.appendChild(dot);

    // Store marking data
    group._marking = marking;

    return group;
  }

  /**
   * Get color for marking category
   */
  _getCategoryColor(category) {
    const colorMap = {
      [MARKING_CATEGORIES.START_LINE]: SVG_CONFIG.colors.startLine,
      [MARKING_CATEGORIES.FINISH_LINE]: SVG_CONFIG.colors.finishLine,
      [MARKING_CATEGORIES.HURDLE_MARK]: SVG_CONFIG.colors.hurdleMark,
      [MARKING_CATEGORIES.RELAY_ZONE]: SVG_CONFIG.colors.relayZone,
      [MARKING_CATEGORIES.STEEPLE_MARK]: SVG_CONFIG.colors.steepleMark,
      [MARKING_CATEGORIES.DISTANCE_MARKER]: SVG_CONFIG.colors.distanceMarker
    };
    return colorMap[category] || SVG_CONFIG.colors.distanceMarker;
  }

  /**
   * Create highlight layer (for showing routes and selections)
   */
  _createHighlightLayer() {
    const highlights = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    highlights.setAttribute('class', 'track-svg__highlights');
    this.highlightLayer = highlights;
    this.svg.appendChild(highlights);
  }

  /**
   * Create labels for major markings
   */
  _createLabels(waterJumpConfig) {
    const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelsGroup.setAttribute('class', 'track-svg__labels');

    const markings = getAllMarkings({ waterJumpConfig });

    // Only add labels for major markings
    const majorMarkings = markings.filter(m => m.isMajor && (m.lane === 1 || m.lane === 0));

    for (const marking of majorMarkings) {
      if (marking.waterJumpConfig && marking.waterJumpConfig !== waterJumpConfig) {
        continue;
      }

      const label = this._createLabelElement(marking);
      if (label) {
        labelsGroup.appendChild(label);
      }
    }

    this.svg.appendChild(labelsGroup);
  }

  /**
   * Create a label element
   */
  _createLabelElement(marking) {
    const coords = positionToCoordinates(marking.position, marking.lane || 1, this.trackConfig);

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'track-svg__label');

    // Position label offset from the marking
    const offsetX = 0;
    const offsetY = -20;

    // Background rectangle
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', coords.x + offsetX);
    text.setAttribute('y', coords.y + offsetY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'track-svg__label-text');
    text.textContent = marking.shortName || marking.name;

    group.appendChild(text);

    return group;
  }

  /**
   * Setup pan and zoom interactions
   */
  _setupPanZoom() {
    // Mouse wheel zoom
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1.1 : 0.9;
      this._zoom(delta, e.clientX, e.clientY);
    }, { passive: false });

    // Mouse pan
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target.closest('.track-svg__marking')) return;
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.svg.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this._pan(e.clientX - this.panStart.x, e.clientY - this.panStart.y);
      this.panStart = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.svg.style.cursor = '';
    });

    // Touch pan/zoom
    this.svg.addEventListener('touchstart', (e) => {
      if (e.target.closest('.track-svg__marking')) return;
      if (e.touches.length === 1) {
        this.isPanning = true;
        this.panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.lastPinchDistance = this._getPinchDistance(e.touches);
      }
    }, { passive: true });

    this.svg.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isPanning) {
        e.preventDefault();
        const dx = e.touches[0].clientX - this.panStart.x;
        const dy = e.touches[0].clientY - this.panStart.y;
        this._pan(dx, dy);
        this.panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const distance = this._getPinchDistance(e.touches);
        const delta = this.lastPinchDistance / distance;
        const center = this._getPinchCenter(e.touches);
        this._zoom(delta, center.x, center.y);
        this.lastPinchDistance = distance;
      }
    }, { passive: false });

    this.svg.addEventListener('touchend', () => {
      this.isPanning = false;
      this.lastPinchDistance = 0;
    }, { passive: true });

    // Double click to reset view
    this.svg.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.track-svg__marking')) {
        this.resetView();
      }
    });
  }

  /**
   * Pan the view
   */
  _pan(dx, dy) {
    const svgRect = this.svg.getBoundingClientRect();
    const scaleX = this.viewBox.width / svgRect.width;
    const scaleY = this.viewBox.height / svgRect.height;

    this.viewBox.x -= dx * scaleX;
    this.viewBox.y -= dy * scaleY;

    this._updateViewBox();
  }

  /**
   * Zoom the view
   */
  _zoom(delta, clientX, clientY) {
    const svgRect = this.svg.getBoundingClientRect();

    // Get mouse position in viewBox coordinates
    const mouseX = (clientX - svgRect.left) / svgRect.width * this.viewBox.width + this.viewBox.x;
    const mouseY = (clientY - svgRect.top) / svgRect.height * this.viewBox.height + this.viewBox.y;

    // Apply zoom
    const newWidth = Math.min(Math.max(this.viewBox.width * delta, 500), SVG_CONFIG.viewBoxWidth * 2);
    const newHeight = Math.min(Math.max(this.viewBox.height * delta, 300), SVG_CONFIG.viewBoxHeight * 2);

    // Adjust position to zoom towards mouse
    this.viewBox.x = mouseX - (mouseX - this.viewBox.x) * (newWidth / this.viewBox.width);
    this.viewBox.y = mouseY - (mouseY - this.viewBox.y) * (newHeight / this.viewBox.height);
    this.viewBox.width = newWidth;
    this.viewBox.height = newHeight;

    this._updateViewBox();
  }

  /**
   * Update SVG viewBox attribute
   */
  _updateViewBox() {
    this.svg.setAttribute('viewBox',
      `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`
    );
  }

  /**
   * Reset view to default
   */
  resetView() {
    this.viewBox = {
      x: 0,
      y: 0,
      width: SVG_CONFIG.viewBoxWidth,
      height: SVG_CONFIG.viewBoxHeight
    };
    this._updateViewBox();
  }

  /**
   * Get distance between two touch points
   */
  _getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get center point between two touches
   */
  _getPinchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  /**
   * Setup marking click/hover interactions
   */
  _setupMarkingInteractions() {
    this.svg.addEventListener('click', (e) => {
      const markingEl = e.target.closest('.track-svg__marking');
      if (markingEl && this.options.onMarkingClick) {
        const marking = markingEl._marking;
        this.options.onMarkingClick(marking, markingEl);
      }
    });

    this.svg.addEventListener('mouseover', (e) => {
      const markingEl = e.target.closest('.track-svg__marking');
      if (markingEl && this.options.onMarkingHover) {
        const marking = markingEl._marking;
        this.options.onMarkingHover(marking, markingEl, true);
      }
    });

    this.svg.addEventListener('mouseout', (e) => {
      const markingEl = e.target.closest('.track-svg__marking');
      if (markingEl && this.options.onMarkingHover) {
        const marking = markingEl._marking;
        this.options.onMarkingHover(marking, markingEl, false);
      }
    });
  }

  /**
   * Select a marking (visual highlight)
   */
  selectMarking(markingId, isStart = true) {
    const markingEl = this.markingElements.get(markingId);
    if (!markingEl) return;

    markingEl.classList.add('track-svg__marking--selected');
    markingEl.classList.add(isStart ? 'track-svg__marking--start' : 'track-svg__marking--end');
    this.selectedMarkings.add(markingId);
  }

  /**
   * Deselect a marking
   */
  deselectMarking(markingId) {
    const markingEl = this.markingElements.get(markingId);
    if (!markingEl) return;

    markingEl.classList.remove('track-svg__marking--selected');
    markingEl.classList.remove('track-svg__marking--start');
    markingEl.classList.remove('track-svg__marking--end');
    this.selectedMarkings.delete(markingId);
  }

  /**
   * Clear all selections
   */
  clearSelections() {
    for (const markingId of this.selectedMarkings) {
      this.deselectMarking(markingId);
    }
    this.clearHighlights();
  }

  /**
   * Highlight a route between two markings
   */
  highlightRoute(startMarking, endMarking) {
    this.clearHighlights();

    // Generate route path
    const pathData = generateRoutePath(startMarking, endMarking, this.trackConfig);

    const routePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    routePath.setAttribute('d', pathData);
    routePath.setAttribute('class', 'track-svg__route-path');
    routePath.setAttribute('stroke', SVG_CONFIG.colors.highlight);
    routePath.setAttribute('stroke-width', SVG_CONFIG.strokeWidths.routePath);
    routePath.setAttribute('fill', 'none');
    routePath.setAttribute('stroke-dasharray', '10,5');

    this.highlightLayer.appendChild(routePath);
    this.highlightedRoute = routePath;

    // Also select the markings
    this.selectMarking(startMarking.id, true);
    this.selectMarking(endMarking.id, false);
  }

  /**
   * Clear route highlights
   */
  clearHighlights() {
    if (this.highlightLayer) {
      this.highlightLayer.innerHTML = '';
    }
    this.highlightedRoute = null;
  }

  /**
   * Update water jump configuration
   */
  setWaterJumpConfig(config) {
    this.options.waterJumpConfig = config;
    this.render({ waterJumpConfig: config });
  }

  /**
   * Get marking element by ID
   */
  getMarkingElement(markingId) {
    return this.markingElements.get(markingId);
  }

  /**
   * Get all marking elements
   */
  getAllMarkingElements() {
    return this.markingElements;
  }
}

export default TrackSvgRenderer;
