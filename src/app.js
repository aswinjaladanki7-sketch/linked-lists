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

    // 1. Insertion Elements (Modes: Beginning, Middle, End)
    this.insertModeBtns = document.querySelectorAll('.insert-mode-btn');
    this.insertSubviews = document.querySelectorAll('.insert-subview');
    this.currentInsertMode = 'beginning';

    // A. Beginning
    this.insertHeadValInput = document.getElementById('input-insert-head-val');
    this.btnInsertHead = document.getElementById('btn-insert-head');

    // B. Middle
    this.insertMidValInput = document.getElementById('input-insert-mid-val');
    this.insertMidPosInput = document.getElementById('input-insert-mid-pos');
    this.btnInsertMid = document.getElementById('btn-insert-mid');
    this.posMaxIndicator = document.getElementById('pos-max-indicator');
    this.insertPosConvention = document.getElementById('insert-pos-convention');

    // C. End
    this.insertTailValInput = document.getElementById('input-insert-tail-val');
    this.btnInsertTail = document.getElementById('btn-insert-tail');

    // 2. Deletion Elements
    this.deleteValInput = document.getElementById('input-delete-val');
    this.btnDoDelete = document.getElementById('btn-do-delete');

    // 3. Traversal Elements
    this.btnDoTraverse = document.getElementById('btn-do-traverse');

    // 4. Searching Elements
    this.searchValInput = document.getElementById('input-search-val');
    this.btnDoSearch = document.getElementById('btn-do-search');
    this.searchOutputPill = document.getElementById('search-output-pill');



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

  switchInsertMode(modeKey) {
    this.currentInsertMode = modeKey;

    this.insertModeBtns.forEach(btn => {
      const match = (btn.getAttribute('data-mode') === modeKey);
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    this.insertSubviews.forEach(view => {
      view.classList.toggle('active', view.id === `subview-${modeKey}`);
    });

    // Auto-focus input for active mode
    if (modeKey === 'beginning' && this.insertHeadValInput) this.insertHeadValInput.focus();
    if (modeKey === 'middle' && this.insertMidValInput) this.insertMidValInput.focus();
    if (modeKey === 'end' && this.insertTailValInput) this.insertTailValInput.focus();
  }

  updatePositionHelper() {
    const size = wasmBridge.getSize();
    if (this.posMaxIndicator) {
      this.posMaxIndicator.textContent = String(size);
    }
    if (this.insertMidPosInput) {
      this.insertMidPosInput.min = '0';
      this.insertMidPosInput.max = String(size);
      if (size === 0) {
        this.insertMidPosInput.value = '0';
      } else {
        const cur = parseInt(this.insertMidPosInput.value, 10);
        if (isNaN(cur) || cur > size) {
          this.insertMidPosInput.value = String(size);
        }
      }
    }
    if (this.insertPosConvention) {
      if (size === 0) {
        this.insertPosConvention.innerHTML = `📌 <strong>List is Empty:</strong> Only Position 0 (HEAD) is valid.`;
      } else {
        this.insertPosConvention.innerHTML = `📌 <strong>0-Based Indexing:</strong> Position 0 is Head. Valid index range: <strong>0 to ${size}</strong> (index ${size} appends at End).`;
      }
    }
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

    // Auto-focus the primary input in the newly active view
    if (opKey === 'insert') {
      if (this.currentInsertMode === 'beginning' && this.insertHeadValInput) this.insertHeadValInput.focus();
      else if (this.currentInsertMode === 'middle' && this.insertMidValInput) this.insertMidValInput.focus();
      else if (this.currentInsertMode === 'end' && this.insertTailValInput) this.insertTailValInput.focus();
    }
    if (opKey === 'delete' && this.deleteValInput) this.deleteValInput.focus();
    if (opKey === 'search' && this.searchValInput) this.searchValInput.focus();
  }

  bindEvents() {
    // Menu Tab Switching
    this.menuBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const op = e.currentTarget.getAttribute('data-op');
        this.switchOperation(op);
      });
    });

    // Insertion Sub-Mode Switching (Beginning, Middle, End)
    this.insertModeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-mode');
        this.switchInsertMode(mode);
      });
    });

    // 1.A INSERTION AT THE BEGINNING
    const handleInsertHead = () => {
      const valStr = this.insertHeadValInput?.value.trim();
      const val = parseInt(valStr, 10);
      if (valStr === '' || isNaN(val)) {
        this.setFeedback('Please enter a valid integer for Insertion at Beginning.', 'error');
        return this.shakeInput(this.insertHeadValInput);
      }

      const res = wasmBridge.insertHead(val);
      this.handleOperationResult(`Insert ${val} at Beginning (Head)`, res);

      const newSize = wasmBridge.getSize();
      this.setFeedback(`✅ Successfully inserted ${val} at the beginning (HEAD). List size: ${newSize}. Time Complexity: O(1).`, 'success');

      if (this.insertHeadValInput) {
        this.insertHeadValInput.value = '';
        this.insertHeadValInput.focus();
      }
      this.updatePositionHelper();
    };

    this.btnInsertHead?.addEventListener('click', handleInsertHead);
    this.insertHeadValInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInsertHead();
    });

    // 1.B INSERTION IN THE MIDDLE
    const handleInsertMiddle = () => {
      const valStr = this.insertMidValInput?.value.trim();
      const val = parseInt(valStr, 10);
      if (valStr === '' || isNaN(val)) {
        this.setFeedback('Please enter a valid integer for Insertion in Middle.', 'error');
        return this.shakeInput(this.insertMidValInput);
      }

      const size = wasmBridge.getSize();
      const posStr = this.insertMidPosInput?.value.trim();
      const pos = parseInt(posStr, 10);

      if (posStr === '' || isNaN(pos) || pos < 0 || pos > size) {
        if (size === 0) {
          this.setFeedback('List is empty. Only position 0 (HEAD) is valid.', 'error');
        } else {
          this.setFeedback(`Invalid position ${pos}. Valid zero-based range is 0 to ${size}.`, 'error');
        }
        return this.shakeInput(this.insertMidPosInput);
      }

      const res = wasmBridge.insertAtPosition(val, pos);
      this.handleOperationResult(`Insert ${val} at Position ${pos}`, res);

      const newSize = wasmBridge.getSize();
      this.setFeedback(`✅ Successfully inserted ${val} at position ${pos} (0-based). List size: ${newSize}. Time Complexity: O(n).`, 'success');

      if (this.insertMidValInput) {
        this.insertMidValInput.value = '';
        this.insertMidValInput.focus();
      }
      this.updatePositionHelper();
    };

    this.btnInsertMid?.addEventListener('click', handleInsertMiddle);
    this.insertMidValInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.insertMidPosInput?.focus();
    });
    this.insertMidPosInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInsertMiddle();
    });

    // 1.C INSERTION AT THE END
    const handleInsertTail = () => {
      const valStr = this.insertTailValInput?.value.trim();
      const val = parseInt(valStr, 10);
      if (valStr === '' || isNaN(val)) {
        this.setFeedback('Please enter a valid integer for Insertion at End.', 'error');
        return this.shakeInput(this.insertTailValInput);
      }

      const res = wasmBridge.insertTail(val);
      this.handleOperationResult(`Insert ${val} at End (Tail)`, res);

      const newSize = wasmBridge.getSize();
      this.setFeedback(`✅ Successfully inserted ${val} at the end (Tail). List size: ${newSize}. Time Complexity: O(n).`, 'success');

      if (this.insertTailValInput) {
        this.insertTailValInput.value = '';
        this.insertTailValInput.focus();
      }
      this.updatePositionHelper();
    };

    this.btnInsertTail?.addEventListener('click', handleInsertTail);
    this.insertTailValInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInsertTail();
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
