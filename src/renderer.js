/**
 * Visual Renderer for Singly Linked List
 * Handles dynamic DOM generation, SVG arrow paths, pointer badges, HEAD indicator, and NULL terminal.
 */

export class LinkedListRenderer {
  constructor(containerEl, svgOverlayEl) {
    this.container = containerEl;
    this.svg = svgOverlayEl;
    this.cachedNodes = [];
    this.resizeObserver = new ResizeObserver(() => this.drawArrows());
    this.resizeObserver.observe(this.container);
    window.addEventListener('resize', () => this.drawArrows());
  }

  render(snapshot) {
    if (!snapshot) {
      this.container.innerHTML = `
        <div class="empty-list-placeholder">
          <div class="list-chain-preview">
            <span class="chain-head">HEAD</span>
            <span class="chain-arrow">➔</span>
            <span class="chain-null">NULL</span>
          </div>
          <p class="empty-desc">List is currently empty (0 nodes). Choose <strong>Insertion</strong> from the menu to add the first element.</p>
        </div>
      `;
      this.clearArrows();
      return;
    }

    const { nodes = [], highlight_idx = -1, highlight_role = '', temp_val = -1, temp_addr = 0, pointers = '' } = snapshot;
    this.cachedNodes = nodes;

    if (nodes.length === 0 && temp_val === -1) {
      this.container.innerHTML = `
        <div class="empty-list-placeholder">
          <div class="list-chain-preview">
            <span class="chain-head">HEAD</span>
            <span class="chain-arrow">➔</span>
            <span class="chain-null">NULL</span>
          </div>
          <p class="empty-desc">List is currently empty (0 nodes). Memory is clean and deallocated.</p>
        </div>
      `;
      this.clearArrows();
      return;
    }

    let html = `<div class="nodes-track" id="nodes-track">`;

    // Floating temporary node (e.g. newly allocated node during insertion)
    if (temp_val !== -1) {
      const tempAddrHex = '0x' + (temp_addr ? temp_addr.toString(16).toUpperCase() : '----');
      html += `
        <div class="temp-node-wrapper">
          <div class="temp-node-badge">NEW NODE (ALLOCATED)</div>
          <div class="node-card temp-node animate-float">
            <div class="node-header">
              <span class="addr-label">addr:</span>
              <span class="addr-value">${tempAddrHex}</span>
            </div>
            <div class="node-body">
              <div class="node-val">${temp_val}</div>
            </div>
            <div class="node-footer">
              <span class="pointer-field">newNode*</span>
            </div>
          </div>
        </div>
      `;
    }

    // HEAD Pointer Indicator
    const headTargetAddr = nodes.length > 0 ? ('0x' + nodes[0].addr.toString(16).toUpperCase()) : 'NULL';
    html += `
      <div class="head-anchor-item" id="head-anchor">
        <div class="head-pill-badge">HEAD POINTER</div>
        <div class="head-pointer-box">
          <span class="head-title">head</span>
          <span class="head-addr" title="Head target address">${headTargetAddr}</span>
        </div>
      </div>
    `;

    // Active pointer parsed badges (e.g. head=0x1010, curr=0x1028)
    const pointerMap = this._parsePointers(pointers);

    nodes.forEach((node, idx) => {
      const addrHex = '0x' + (node.addr ? node.addr.toString(16).toUpperCase() : '----');
      const nextHex = node.next ? '0x' + node.next.toString(16).toUpperCase() : 'NULL';

      const isHighlighted = (idx === highlight_idx);
      const highlightClass = isHighlighted ? `highlight-${(highlight_role || 'curr').toLowerCase()}` : '';
      
      const isHead = (idx === 0);
      const isTail = (idx === nodes.length - 1);

      // Determine active role tags
      const badges = [];
      if (isHead) badges.push({ text: 'HEAD', cls: 'badge-head' });
      if (isTail) badges.push({ text: 'TAIL', cls: 'badge-tail' });
      if (pointerMap.curr === node.addr) badges.push({ text: 'CURR', cls: 'badge-curr' });
      if (pointerMap.target === node.addr) badges.push({ text: 'TARGET', cls: 'badge-target' });
      if (pointerMap.slow === node.addr) badges.push({ text: 'SLOW 🐢', cls: 'badge-slow' });
      if (pointerMap.fast === node.addr) badges.push({ text: 'FAST 🐇', cls: 'badge-fast' });

      html += `
        <div class="node-item" id="node-item-${idx}" data-idx="${idx}" data-addr="${node.addr}">
          <div class="pointer-badges">
            ${badges.map(b => `<span class="pointer-badge ${b.cls}">${b.text}</span>`).join('')}
          </div>

          <div class="node-card ${highlightClass}">
            <div class="node-header">
              <span class="node-index">Pos #${idx + 1}</span>
              <span class="addr-value" title="Simulated Heap Memory Address">${addrHex}</span>
            </div>

            <div class="node-body">
              <div class="node-part data-part" title="Node Value (data)">
                <span class="part-label">data</span>
                <span class="data-val">${node.val}</span>
              </div>

              <div class="node-part next-part" title="Next Pointer Address">
                <span class="part-label">next</span>
                <span class="part-val">${nextHex}</span>
              </div>
            </div>

            <div class="node-footer">
              <span class="role-desc">${isHighlighted && highlight_role ? highlight_role : `Index [${idx}]`}</span>
            </div>
          </div>
        </div>
      `;
    });

    // NULL Terminal Indicator at the end of the chain
    html += `
      <div class="null-terminal-item" id="null-terminal">
        <div class="null-box" title="End of Singly Linked List (next == NULL)">
          <span class="null-symbol">⏚</span>
          <span class="null-text">NULL</span>
        </div>
      </div>
    `;

    html += `</div>`;
    this.container.innerHTML = html;

    // Draw connecting SVG arrows after DOM paint
    requestAnimationFrame(() => this.drawArrows());
  }

  _parsePointers(str) {
    const res = {};
    if (!str) return res;
    const parts = str.split(',');
    for (const p of parts) {
      const [k, v] = p.split('=').map(s => s.trim());
      if (k && v) {
        res[k.toLowerCase()] = parseInt(v, 16);
      }
    }
    return res;
  }

  clearArrows() {
    if (this.svg) this.svg.innerHTML = '';
  }

  drawArrows() {
    if (!this.svg || !this.cachedNodes) {
      this.clearArrows();
      return;
    }

    const containerRect = this.container.getBoundingClientRect();
    const count = this.cachedNodes.length;
    let svgContent = `
      <defs>
        <marker id="arrow-forward" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#06B6D4" />
        </marker>
        <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
        </marker>
        <marker id="arrow-rose" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#F43F5E" />
        </marker>
        <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    `;

    if (count > 0) {
      // 1. Arrow from HEAD anchor to Node 0
      const elHead = document.getElementById('head-anchor');
      const elNode0 = document.getElementById('node-item-0');
      if (elHead && elNode0) {
        const rHead = elHead.getBoundingClientRect();
        const r0 = elNode0.getBoundingClientRect();
        const x1 = rHead.right - containerRect.left;
        const y1 = (rHead.top + rHead.bottom) / 2 - containerRect.top;
        const x2 = r0.left - containerRect.left;
        const y2 = (r0.top + r0.bottom) / 2 - containerRect.top;

        svgContent += `
          <line x1="${x1}" y1="${y1}" x2="${x2 - 4}" y2="${y2}" 
                stroke="#10B981" stroke-width="2.5" 
                marker-end="url(#arrow-emerald)" 
                class="svg-arrow head-arrow" />
        `;
      }

      // 2. Consecutive Singly Linked List node connections (next pointers)
      for (let i = 0; i < count - 1; i++) {
        const elA = document.getElementById(`node-item-${i}`);
        const elB = document.getElementById(`node-item-${i + 1}`);
        if (!elA || !elB) continue;

        const rectA = elA.getBoundingClientRect();
        const rectB = elB.getBoundingClientRect();

        const x1 = rectA.right - containerRect.left;
        const y1 = (rectA.top + rectA.bottom) / 2 - containerRect.top;
        const x2 = rectB.left - containerRect.left;
        const y2 = (rectB.top + rectB.bottom) / 2 - containerRect.top;

        svgContent += `
          <line x1="${x1}" y1="${y1}" x2="${x2 - 4}" y2="${y2}" 
                stroke="#06B6D4" stroke-width="2.5" 
                marker-end="url(#arrow-forward)" 
                filter="url(#glow-cyan)"
                class="svg-arrow forward-arrow" />
        `;
      }

      // 3. Arrow from Tail node to NULL terminal
      const elTail = document.getElementById(`node-item-${count - 1}`);
      const elNull = document.getElementById('null-terminal');
      if (elTail && elNull) {
        const rTail = elTail.getBoundingClientRect();
        const rNull = elNull.getBoundingClientRect();
        const x1 = rTail.right - containerRect.left;
        const y1 = (rTail.top + rTail.bottom) / 2 - containerRect.top;
        const x2 = rNull.left - containerRect.left;
        const y2 = (rNull.top + rNull.bottom) / 2 - containerRect.top;

        svgContent += `
          <line x1="${x1}" y1="${y1}" x2="${x2 - 4}" y2="${y2}" 
                stroke="#F43F5E" stroke-width="2.5" 
                marker-end="url(#arrow-rose)" 
                class="svg-arrow null-arrow" />
        `;
      }
    }

    this.svg.innerHTML = svgContent;
  }
}
