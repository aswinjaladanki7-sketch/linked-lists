/**
 * Main Application Controller for Menu-Driven Singly Linked List Visualizer
 * Powered by C & WebAssembly Runtime
 */

import { wasmBridge } from './wasmLoader.js';
import { LinkedListRenderer } from './renderer.js';

class LinkedListApp {
  constructor() {
    this.listType = 0; // Singly Linked List (SLL)
    this.steps = [];
    this.currentStepIdx = 0;
    this.isPlaying = false;
    this.playbackTimer = null;
    this.speed = 2; // Fast 2x default
    this.currentOp = 'insert';

    // DOM Elements
    this.container = document.getElementById('list-container');
    this.svgOverlay = document.getElementById('arrows-svg');
    this.renderer = new LinkedListRenderer(this.container, this.svgOverlay);

    this.initDOMRefs();
    this.bindEvents();
  }

  initDOMRefs() {
    // Stage & Playback
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.stepTitleEl = document.getElementById('step-title');
    this.stepDescEl = document.getElementById('step-description');
    this.stepBadgeEl = document.getElementById('step-badge');
    this.complexityBadgeEl = document.getElementById('complexity-badge');
    this.actionBadgeEl = document.getElementById('action-badge');
    this.pointersDisplayEl = document.getElementById('active-pointers');
    this.stepSlider = document.getElementById('step-slider');
    this.stepCounterEl = document.getElementById('step-counter');
    this.playBtn = document.getElementById('btn-play');
    this.prevBtn = document.getElementById('btn-prev');
    this.nextBtn = document.getElementById('btn-next');
    this.speedSlider = document.getElementById('speed-slider');
    this.speedLabel = document.getElementById('speed-label');

    // Feedback Banner
    this.feedbackBanner = document.getElementById('feedback-banner');
    this.feedbackMsg = document.getElementById('feedback-msg');

    // Operation Menu Tabs
    this.menuBtns = document.querySelectorAll('.op-menu-btn');
    this.opViews = document.querySelectorAll('.op-view');

    // 1. Insertion Elements
    this.insertValInput = document.getElementById('input-insert-val');
    this.insertPosInput = document.getElementById('input-insert-pos');
    this.posMaxIndicator = document.getElementById('pos-max-indicator');
    this.insertPosConvention = document.getElementById('insert-pos-convention');
    this.btnDoInsert = document.getElementById('btn-do-insert');

    // 2. Deletion Elements
    this.deleteValInput = document.getElementById('input-delete-val');
    this.btnDoDelete = document.getElementById('btn-do-delete');

    // 3. Traversal Elements
    this.btnDoTraverse = document.getElementById('btn-do-traverse');

    // 4. Searching Elements
    this.searchValInput = document.getElementById('input-search-val');
    this.btnDoSearch = document.getElementById('btn-do-search');
    this.searchOutputPill = document.getElementById('search-output-pill');

    // 5. Updating Elements
    this.updateOldInput = document.getElementById('input-update-old');
    this.updateNewInput = document.getElementById('input-update-new');
    this.btnDoUpdate = document.getElementById('btn-do-update');

    // 6. Display List Elements
    this.formattedChainCard = document.getElementById('formatted-chain-card');
    this.btnDoDisplay = document.getElementById('btn-do-display');

    // 7. Clear List Elements
    this.clearConfirmCard = document.getElementById('clear-confirm-card');
    this.btnShowClearPrompt = document.getElementById('btn-show-clear-prompt');
    this.btnConfirmClear = document.getElementById('btn-confirm-clear');
    this.btnCancelClear = document.getElementById('btn-cancel-clear');

    // Heap Memory Telemetry
    this.statAllocs = document.getElementById('stat-allocs');
    this.statFrees = document.getElementById('stat-frees');
    this.statActive = document.getElementById('stat-active');
    this.statBytes = document.getElementById('stat-bytes');
    this.statLeak = document.getElementById('stat-leak');
  }

  async start() {
    try {
      this.updateLoadingStatus('Initializing WebAssembly C Engine...');
      await wasmBridge.init();
      this.updateLoadingStatus('WASM Engine Ready! Starting Singly Linked List...');

      // Initialize empty singly linked list
      const res = wasmBridge.initList(0);
      this.updateMemoryDisplay(res.stats);
      this.renderer.render(null);

      this.updatePositionHelper();
      this.updateDisplayCard();
      this.setFeedback('Ready. Select an operation from the menu above to begin.', 'info');

      // Hide loading overlay
      setTimeout(() => {
        if (this.loadingOverlay) {
          this.loadingOverlay.classList.add('hidden');
        }
      }, 200);
    } catch (err) {
      console.error('Initialization error:', err);
      this.updateLoadingStatus(`Initialization Error: ${err.message}`, true);
    }
  }

  updateLoadingStatus(msg, isError = false) {
    const textEl = document.getElementById('loading-text');
    if (textEl) {
      textEl.textContent = msg;
      if (isError) textEl.style.color = '#F43F5E';
    }
  }

  setFeedback(message, type = 'info') {
    if (!this.feedbackBanner || !this.feedbackMsg) return;
    this.feedbackMsg.textContent = message;
    this.feedbackBanner.className = `feedback-banner ${type}`;
  }

  shakeInput(inputEl) {
    if (!inputEl) return;
    inputEl.classList.add('shake-error');
    setTimeout(() => inputEl.classList.remove('shake-error'), 400);
    inputEl.focus();
  }

  updatePositionHelper() {
    const size = wasmBridge.getSize();
    const maxPos = size + 1;
    if (this.posMaxIndicator) {
      this.posMaxIndicator.textContent = String(maxPos);
    }
    if (this.insertPosInput) {
      this.insertPosInput.min = '1';
      this.insertPosInput.max = String(maxPos);
      this.insertPosInput.value = String(maxPos);
    }
    if (this.insertPosConvention) {
      if (size === 0) {
        this.insertPosConvention.innerHTML = `📌 <strong>List is Empty:</strong> Enter Position 1 to insert the first element (HEAD).`;
      } else {
        this.insertPosConvention.innerHTML = `📌 <strong>Position Convention (1-Based):</strong> Valid range: <strong>1 to ${maxPos}</strong>. Position 1 inserts at beginning (new HEAD), Position ${maxPos} appends at end.`;
      }
    }
  }

  updateDisplayCard() {
    if (!this.formattedChainCard) return;
    const size = wasmBridge.getSize();
    const nodes = this.renderer.cachedNodes || [];

    if (size === 0 || nodes.length === 0) {
      this.formattedChainCard.innerHTML = `<span class="chain-prefix">HEAD</span> -> <span class="chain-empty">NULL</span> <em style="color: var(--text-faint); margin-left: 10px;">(List is empty)</em>`;
      return;
    }

    const chainParts = nodes.map(n => `[${n.val}]`).join(' -> ');
    this.formattedChainCard.innerHTML = `<span class="chain-prefix">HEAD</span> -> ${chainParts} -> <span class="chain-null">NULL</span>`;
  }

  switchOperation(opKey) {
    this.currentOp = opKey;

    // Update active tab buttons
    this.menuBtns.forEach(btn => {
      const match = (btn.getAttribute('data-op') === opKey);
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    // Toggle active operation view
    this.opViews.forEach(view => {
      view.classList.toggle('active', view.id === `view-${opKey}`);
    });

    // Reset clear confirmation card if switching away
    if (this.clearConfirmCard) {
      this.clearConfirmCard.classList.remove('visible');
    }
    if (this.btnShowClearPrompt) {
      this.btnShowClearPrompt.style.display = 'block';
    }

    // Refresh display card if switching to display
    if (opKey === 'display') {
      this.updateDisplayCard();
    }

    // Auto-focus the primary input in the newly active view
    if (opKey === 'insert' && this.insertValInput) this.insertValInput.focus();
    if (opKey === 'delete' && this.deleteValInput) this.deleteValInput.focus();
    if (opKey === 'search' && this.searchValInput) this.searchValInput.focus();
    if (opKey === 'update' && this.updateOldInput) this.updateOldInput.focus();
  }

  bindEvents() {
    // Menu Tab Switching
    this.menuBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const op = e.currentTarget.getAttribute('data-op');
        this.switchOperation(op);
      });
    });

    // 1. INSERTION EXECUTION
    const handleInsert = () => {
      const valStr = this.insertValInput?.value.trim();
      const val = parseInt(valStr, 10);
      if (valStr === '' || isNaN(val)) {
        this.setFeedback('Please enter a valid integer in "Enter Value".', 'error');
        return this.shakeInput(this.insertValInput);
      }

      const size = wasmBridge.getSize();
      const pos = parseInt(this.insertPosInput?.value, 10);
      if (isNaN(pos) || pos < 1 || pos > size + 1) {
        this.setFeedback(`Invalid position ${pos}. Valid position range is 1 to ${size + 1}.`, 'error');
        return this.shakeInput(this.insertPosInput);
      }

      const res = wasmBridge.insertAtPosition(val, pos);
      this.handleOperationResult(`Insert ${val} at Position ${pos}`, res);

      const newSize = wasmBridge.getSize();
      this.setFeedback(`✅ Successfully inserted ${val} at Position ${pos}. List size: ${newSize}.`, 'success');

      // Clear value input and set focus for next element
      if (this.insertValInput) {
        this.insertValInput.value = '';
        this.insertValInput.focus();
      }
      this.updatePositionHelper();
      this.updateDisplayCard();
    };

    this.btnDoInsert?.addEventListener('click', handleInsert);
    this.insertValInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInsert();
    });
    this.insertPosInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInsert();
    });

    // 2. DELETION EXECUTION
    const handleDelete = () => {
      const size = wasmBridge.getSize();
      if (size === 0) {
        this.setFeedback('Cannot delete: The linked list is currently empty.', 'error');
        return;
      }

      const valStr = this.deleteValInput?.value.trim();
      const target = parseInt(valStr, 10);
      if (valStr === '' || isNaN(target)) {
        this.setFeedback('Please enter a valid integer to delete.', 'error');
        return this.shakeInput(this.deleteValInput);
      }

      const res = wasmBridge.deleteByValue(target);
      this.handleOperationResult(`Delete Value (${target})`, res);

      if (res.success) {
        const newSize = wasmBridge.getSize();
        this.setFeedback(`✅ Successfully deleted element ${target}. List size: ${newSize}.`, 'success');
        if (this.deleteValInput) this.deleteValInput.value = '';
      } else {
        this.setFeedback(`❌ Value ${target} was not found in the linked list.`, 'error');
      }

      this.updatePositionHelper();
      this.updateDisplayCard();
    };

    this.btnDoDelete?.addEventListener('click', handleDelete);
    this.deleteValInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleDelete();
    });

    // 3. TRAVERSAL EXECUTION
    this.btnDoTraverse?.addEventListener('click', () => {
      const size = wasmBridge.getSize();
      if (size === 0) {
        this.setFeedback('List is empty. 0 nodes to traverse.', 'error');
        return;
      }
      const res = wasmBridge.traverse();
      this.handleOperationResult('Traverse List from HEAD to NULL', res);
      this.setFeedback(`➔ Traversed ${size} nodes sequentially from HEAD to NULL.`, 'success');
    });

    // 4. SEARCHING EXECUTION
    const handleSearch = () => {
      const size = wasmBridge.getSize();
      if (size === 0) {
        this.setFeedback('List is empty. Value not found.', 'error');
        if (this.searchOutputPill) {
          this.searchOutputPill.className = 'search-output-pill not-found';
          this.searchOutputPill.textContent = '❌ Value not found (List is empty)';
          this.searchOutputPill.classList.remove('hidden');
        }
        return;
      }

      const valStr = this.searchValInput?.value.trim();
      const val = parseInt(valStr, 10);
      if (valStr === '' || isNaN(val)) {
        this.setFeedback('Please enter a valid target integer to search.', 'error');
        return this.shakeInput(this.searchValInput);
      }

      const res = wasmBridge.search(val);
      this.handleOperationResult(`Search Value (${val})`, res);

      if (this.searchOutputPill) {
        this.searchOutputPill.classList.remove('hidden');
        if (res.index >= 0) {
          const zeroBased = res.index;
          const oneBased = res.index + 1;
          this.searchOutputPill.className = 'search-output-pill';
          this.searchOutputPill.textContent = `🎯 Value ${val} Found! Position: ${oneBased} | Zero-Based Index: ${zeroBased}`;
          this.setFeedback(`🎯 Value ${val} found at Position ${oneBased} (Index #${zeroBased}).`, 'success');
        } else {
          this.searchOutputPill.className = 'search-output-pill not-found';
          this.searchOutputPill.textContent = `❌ Value ${val} not found in linked list.`;
          this.setFeedback(`❌ Value not found: ${val} is not present in the list.`, 'error');
        }
      }
    };

    this.btnDoSearch?.addEventListener('click', handleSearch);
    this.searchValInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });

    // 5. UPDATING EXECUTION
    const handleUpdate = () => {
      const size = wasmBridge.getSize();
      if (size === 0) {
        this.setFeedback('Cannot update: List is currently empty.', 'error');
        return;
      }

      const oldVal = parseInt(this.updateOldInput?.value, 10);
      const newVal = parseInt(this.updateNewInput?.value, 10);

      if (isNaN(oldVal)) {
        this.setFeedback('Please enter a valid existing old value.', 'error');
        return this.shakeInput(this.updateOldInput);
      }
      if (isNaN(newVal)) {
        this.setFeedback('Please enter a valid replacement new value.', 'error');
        return this.shakeInput(this.updateNewInput);
      }

      const res = wasmBridge.updateValue(oldVal, newVal);
      this.handleOperationResult(`Update Value (${oldVal} ➔ ${newVal})`, res);

      if (res.success) {
        this.setFeedback(`✅ Updated first matching node: ${oldVal} is now ${newVal}.`, 'success');
        if (this.updateOldInput) this.updateOldInput.value = '';
        if (this.updateNewInput) this.updateNewInput.value = '';
        this.updateDisplayCard();
      } else {
        this.setFeedback(`❌ Original value ${oldVal} was not found in the list.`, 'error');
      }
    };

    this.btnDoUpdate?.addEventListener('click', handleUpdate);
    this.updateOldInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.updateNewInput?.focus();
    });
    this.updateNewInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleUpdate();
    });

    // 6. DISPLAY LIST EXECUTION
    this.btnDoDisplay?.addEventListener('click', () => {
      this.updateDisplayCard();
      const size = wasmBridge.getSize();
      if (size > 0) {
        const res = wasmBridge.traverse();
        this.handleOperationResult('Displaying Current Linked List', res);
        this.setFeedback(`📋 Displayed current list structure (${size} elements).`, 'success');
      } else {
        this.renderer.render(null);
        this.setFeedback('📋 Current list is empty: HEAD -> NULL.', 'info');
      }
    });

    // 7. CLEAR LIST EXECUTION
    this.btnShowClearPrompt?.addEventListener('click', () => {
      const size = wasmBridge.getSize();
      if (size === 0) {
        this.setFeedback('List is already empty. Nothing to clear.', 'info');
        return;
      }
      if (this.clearConfirmCard) this.clearConfirmCard.classList.add('visible');
      if (this.btnShowClearPrompt) this.btnShowClearPrompt.style.display = 'none';
    });

    this.btnCancelClear?.addEventListener('click', () => {
      if (this.clearConfirmCard) this.clearConfirmCard.classList.remove('visible');
      if (this.btnShowClearPrompt) this.btnShowClearPrompt.style.display = 'block';
      this.setFeedback('Clear list cancelled.', 'info');
    });

    this.btnConfirmClear?.addEventListener('click', () => {
      const res = wasmBridge.clearList();
      this.handleOperationResult('Clear All Nodes', res);

      if (this.clearConfirmCard) this.clearConfirmCard.classList.remove('visible');
      if (this.btnShowClearPrompt) this.btnShowClearPrompt.style.display = 'block';

      this.updatePositionHelper();
      this.updateDisplayCard();
      this.setFeedback('🗑️ List cleared. All nodes have been deallocated from heap memory.', 'success');
    });

    // Playback Controls
    this.playBtn?.addEventListener('click', () => this.togglePlay());
    this.prevBtn?.addEventListener('click', () => this.stepBackward());
    this.nextBtn?.addEventListener('click', () => this.stepForward());

    this.stepSlider?.addEventListener('input', (e) => {
      this.pause();
      this.goToStep(Number(e.target.value));
    });

    this.speedSlider?.addEventListener('input', (e) => {
      this.speed = parseFloat(e.target.value);
      if (this.speedLabel) this.speedLabel.textContent = `${this.speed}x`;
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
    });
  }

  handleOperationResult(opName, result) {
    this.updateMemoryDisplay(result.stats);

    const stepsData = result.stepsData || { step_count: 0, steps: [] };
    this.steps = stepsData.steps || [];

    if (this.stepSlider) {
      this.stepSlider.max = String(Math.max(0, this.steps.length - 1));
      this.stepSlider.value = '0';
    }

    if (this.steps.length === 0) {
      this.renderer.render(null);
      if (this.stepCounterEl) this.stepCounterEl.textContent = 'Step 0 / 0';
      if (this.stepTitleEl) this.stepTitleEl.textContent = opName;
      if (this.stepDescEl) this.stepDescEl.textContent = 'List is empty. 0 steps.';
      return;
    }

    // Go to step 0 and start animation
    this.goToStep(0);
    if (this.steps.length > 1) {
      this.play();
    }
  }

  goToStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStepIdx = index;
    const snap = this.steps[index];

    // Update Slider & Counter
    if (this.stepSlider) this.stepSlider.value = String(index);
    if (this.stepCounterEl) {
      this.stepCounterEl.textContent = `Step ${index + 1} / ${this.steps.length}`;
    }

    // Update Step Info Card
    if (this.stepTitleEl) this.stepTitleEl.textContent = snap.title || 'Step Snapshot';
    if (this.stepDescEl) this.stepDescEl.textContent = snap.desc || '';
    if (this.stepBadgeEl) this.stepBadgeEl.textContent = `Step #${snap.step || (index + 1)}`;
    if (this.complexityBadgeEl) this.complexityBadgeEl.textContent = snap.complexity || 'O(1)';
    if (this.actionBadgeEl) this.actionBadgeEl.textContent = snap.action || 'OP';
    if (this.pointersDisplayEl) {
      this.pointersDisplayEl.textContent = snap.pointers || 'head=active';
    }

    // Render Nodes, HEAD, and NULL
    this.renderer.render(snap);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.currentStepIdx >= this.steps.length - 1) {
      this.currentStepIdx = 0;
    }
    this.isPlaying = true;
    if (this.playBtn) {
      this.playBtn.innerHTML = '❚❚ Pause';
      this.playBtn.classList.add('playing');
    }

    // Animation interval (220ms base divided by speed)
    const interval = Math.max(30, Math.round(220 / this.speed));
    this.playbackTimer = setInterval(() => {
      if (this.currentStepIdx < this.steps.length - 1) {
        this.goToStep(this.currentStepIdx + 1);
      } else {
        this.pause();
      }
    }, interval);
  }

  pause() {
    this.isPlaying = false;
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    if (this.playBtn) {
      this.playBtn.innerHTML = '▶ Play';
      this.playBtn.classList.remove('playing');
    }
  }

  stepForward() {
    this.pause();
    if (this.currentStepIdx < this.steps.length - 1) {
      this.goToStep(this.currentStepIdx + 1);
    }
  }

  stepBackward() {
    this.pause();
    if (this.currentStepIdx > 0) {
      this.goToStep(this.currentStepIdx - 1);
    }
  }

  updateMemoryDisplay(stats) {
    if (!stats) return;
    if (this.statAllocs) this.statAllocs.textContent = stats.allocs ?? 0;
    if (this.statFrees) this.statFrees.textContent = stats.frees ?? 0;
    if (this.statActive) this.statActive.textContent = stats.active ?? 0;
    if (this.statBytes) this.statBytes.textContent = `${stats.bytes ?? 0} B`;

    if (this.statLeak) {
      const active = stats.active ?? 0;
      if (active === 0) {
        this.statLeak.textContent = 'Zero Leaks (0 active)';
        this.statLeak.className = 'leak-badge zero-leaks';
      } else {
        this.statLeak.textContent = `${active} nodes in heap`;
        this.statLeak.className = 'leak-badge active-nodes';
      }
    }
  }
}

// Start application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const app = new LinkedListApp();
  app.start();
  window.__LINKED_LIST_APP__ = app;
});
