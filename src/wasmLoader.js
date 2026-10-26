/**
 * WebAssembly Module Bridge
 * Loads and interfaces with the compiled C Linked List Engine (linked_list.wasm)
 */

class WasmLinkedListBridge {
  constructor() {
    this.module = null;
    this.isReady = false;
    this.readyPromise = null;
  }

  async init() {
    if (this.isReady) return this;
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = (async () => {
      // Ensure the createLinkedListModule script is loaded
      if (typeof window.createLinkedListModule !== 'function') {
        await this._loadScript('/wasm/linked_list.js');
      }

      if (typeof window.createLinkedListModule !== 'function') {
        throw new Error('createLinkedListModule factory not found on window');
      }

      // Initialize the Emscripten module with locateFile pointing to /wasm/
      this.module = await window.createLinkedListModule({
        locateFile: (path) => {
          if (path.endsWith('.wasm')) {
            return '/wasm/linked_list.wasm';
          }
          return '/wasm/' + path;
        },
        print: (text) => console.log('[WASM C stdout]', text),
        printErr: (text) => console.error('[WASM C stderr]', text)
      });

      this.isReady = true;
      console.log('✅ WebAssembly Linked List Engine initialized successfully!');
      return this;
    })();

    return this.readyPromise;
  }

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (e) => reject(e));
        if (window.createLinkedListModule) return resolve();
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  _decodeString(ptr) {
    if (!ptr || !this.module) return '';
    if (typeof this.module.UTF8ToString === 'function') {
      return this.module.UTF8ToString(ptr);
    }
    let end = ptr;
    while (this.module.HEAPU8 && this.module.HEAPU8[end] !== 0) {
      end++;
    }
    return new TextDecoder().decode(this.module.HEAPU8.subarray(ptr, end));
  }

  _getSteps() {
    if (!this.module) return { step_count: 0, steps: [] };
    const ptr = this.module._wasm_get_steps_json();
    const jsonStr = this._decodeString(ptr);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse WASM steps JSON:', e, jsonStr);
      return { step_count: 0, steps: [] };
    }
  }

  getMemoryStats() {
    if (!this.module) return { allocs: 0, frees: 0, active: 0, bytes: 0 };
    const ptr = this.module._wasm_get_memory_stats_json();
    const jsonStr = this._decodeString(ptr);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse WASM memory JSON:', e, jsonStr);
      return { allocs: 0, frees: 0, active: 0, bytes: 0 };
    }
  }

  // --- List Type & Initialization ---
  setListType(typeIndex) {
    this.module._wasm_set_list_type(typeIndex);
  }

  getListType() {
    return this.module._wasm_get_list_type();
  }

  initList(typeIndex) {
    this.module._wasm_init_list(typeIndex);
    return {
      stats: this.getMemoryStats(),
      stepsData: this._getSteps()
    };
  }

  loadInitialValues(typeIndex, csvString) {
    const str = String(csvString || '').trim();
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    const len = (typeof this.module.lengthBytesUTF8 === 'function')
      ? this.module.lengthBytesUTF8(str) + 1
      : encoded.length + 1;

    let ptr = 0;
    if (typeof this.module._malloc === 'function') {
      ptr = this.module._malloc(len);
      if (typeof this.module.stringToUTF8 === 'function') {
        this.module.stringToUTF8(str, ptr, len);
      } else if (this.module.HEAPU8) {
        this.module.HEAPU8.set(encoded, ptr);
        this.module.HEAPU8[ptr + encoded.length] = 0;
      }
    }

    const count = this.module._wasm_load_initial_values(typeIndex, ptr);
    if (ptr && typeof this.module._free === 'function') {
      this.module._free(ptr);
    }

    return {
      count,
      stats: this.getMemoryStats(),
      stepsData: this._getSteps()
    };
  }

  // --- Insertion Operations ---
  insertHead(val) {
    const success = this.module._wasm_insert_head(Number(val));
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  insertTail(val) {
    const success = this.module._wasm_insert_tail(Number(val));
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  insertAtPosition(val, pos) {
    const success = this.module._wasm_insert_at_position(Number(val), Number(pos));
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  insertBeforeValue(target, val) {
    const success = this.module._wasm_insert_before_value(Number(target), Number(val));
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  insertAfterValue(target, val) {
    const success = this.module._wasm_insert_after_value(Number(target), Number(val));
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  // --- Deletion Operations ---
  deleteHead() {
    const success = this.module._wasm_delete_head();
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  deleteTail() {
    const success = this.module._wasm_delete_tail();
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  deleteAtPosition(pos) {
    const success = this.module._wasm_delete_at_position(Number(pos));
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  deleteByValue(target) {
    const success = this.module._wasm_delete_by_value(Number(target));
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  clearList() {
    const success = this.module._wasm_clear_list();
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  // --- Search & Update ---
  search(val) {
    const foundIndex = this.module._wasm_search(Number(val));
    return { index: foundIndex, stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  updateValue(oldVal, newVal) {
    const success = this.module._wasm_update_value(Number(oldVal), Number(newVal));
    return { success: Boolean(success), stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  // --- Algorithms & Traversal ---
  traverse() {
    this.module._wasm_traverse();
    return { stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  traverseReverse() {
    this.module._wasm_traverse_reverse();
    return { stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  reverse() {
    this.module._wasm_reverse();
    return { stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  sort() {
    this.module._wasm_sort();
    return { stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  detectCycle() {
    this.module._wasm_detect_cycle();
    return { stats: this.getMemoryStats(), stepsData: this._getSteps() };
  }

  getSize() {
    return this.module._wasm_get_size();
  }
}

export const wasmBridge = new WasmLinkedListBridge();
