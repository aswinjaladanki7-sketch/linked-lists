/**
 * ============================================================================
 * Linked List Interactive Visualizer - Main JavaScript Driver
 * Bridges HTML/CSS UI with Authoritative C WebAssembly Engine
 * Supports Singly, Doubly, and Circular Linked Lists
 * ============================================================================
 * 
 * Strict Architectural Rule:
 *  - ZERO duplicate linked list structures in JavaScript.
 *  - The C code compiled in linked_list.wasm is the single source of truth.
 *  - JavaScript only invokes exported C functions and renders the authoritative
 *    serialized list returned by get_serialized_list().
 */

(function () {
  'use strict';

  // State Management
  let Module = null;
  let isWasmLoaded = false;
  let isAnimationRunning = false;
  let isSimulationMode = false;

  // C Status Code Constants (Matches linked_list.c)
  const STATUS = {
    SUCCESS: 0,
    ERR_EMPTY_LIST: -1,
    ERR_INVALID_POSITION: -2,
    ERR_VALUE_NOT_FOUND: -3,
    ERR_MALLOC_FAILED: -4,
    ERR_INVALID_INPUT: -5,
    ERR_BUFFER_OVERFLOW: -6
  };

  const STATUS_LABELS = {
    [STATUS.SUCCESS]: 'STATUS_SUCCESS (0)',
    [STATUS.ERR_EMPTY_LIST]: 'ERR_EMPTY_LIST (-1)',
    [STATUS.ERR_INVALID_POSITION]: 'ERR_INVALID_POSITION (-2)',
    [STATUS.ERR_VALUE_NOT_FOUND]: 'ERR_VALUE_NOT_FOUND (-3)',
    [STATUS.ERR_MALLOC_FAILED]: 'ERR_MALLOC_FAILED (-4)',
    [STATUS.ERR_INVALID_INPUT]: 'ERR_INVALID_INPUT (-5)',
    [STATUS.ERR_BUFFER_OVERFLOW]: 'ERR_BUFFER_OVERFLOW (-6)'
  };

  // C Source Code Snippets from linked_list.c
  const C_SNIPPETS = {
    struct_node: `/* Node Structure Definition for Singly, Doubly & Circular Lists */
struct Node {
    int data;           /* Integer payload */
    struct Node *prev;  /* Pointer to previous node (used in Doubly Linked List) */
    struct Node *next;  /* Pointer to next node (in Circular List, tail points to head) */
};

/* Global authoritative head pointer & list type */
static struct Node *head = NULL;
static int current_list_type = LIST_TYPE_SINGLY;`,

    set_list_type: `/* Dynamically converts and adapts list type in C memory - O(n) */
int set_list_type(int type) {
    if (type < 0 || type > 2) return ERR_INVALID_INPUT;
    if (current_list_type == type) return STATUS_SUCCESS;

    /* Break circular cycle before restructuring */
    if (current_list_type == LIST_TYPE_CIRCULAR && head != NULL) {
        struct Node *curr = head;
        while (curr->next != NULL && curr->next != head) curr = curr->next;
        curr->next = NULL;
    }

    current_list_type = type;

    if (current_list_type == LIST_TYPE_SINGLY) {
        struct Node *curr = head;
        while (curr != NULL) { curr->prev = NULL; curr = curr->next; }
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        struct Node *prev_node = NULL, *curr = head;
        while (curr != NULL) { curr->prev = prev_node; prev_node = curr; curr = curr->next; }
    } else if (current_list_type == LIST_TYPE_CIRCULAR && head != NULL) {
        struct Node *curr = head;
        while (curr->next != NULL) { curr->prev = NULL; curr = curr->next; }
        curr->prev = NULL; curr->next = head; /* Close circle to head */
    }
    return STATUS_SUCCESS;
}`,

    insert_beginning: `/* Inserts a new node at the beginning of the list */
int insert_beginning(int value) {
    struct Node *newNode = create_node(value);
    if (newNode == NULL) return ERR_MALLOC_FAILED;

    if (head == NULL) {
        if (current_list_type == LIST_TYPE_CIRCULAR) newNode->next = newNode;
        head = newNode;
        return STATUS_SUCCESS;
    }

    if (current_list_type == LIST_TYPE_SINGLY) {
        newNode->next = head;
        head = newNode;
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        newNode->next = head;
        head->prev = newNode;
        head = newNode;
    } else if (current_list_type == LIST_TYPE_CIRCULAR) {
        struct Node *tail = head;
        while (tail->next != head) tail = tail->next;
        newNode->next = head;
        tail->next = newNode;
        head = newNode;
    }
    return STATUS_SUCCESS;
}`,

    insert_end: `/* Inserts a new node at the end of the list - O(n) */
int insert_end(int value) {
    if (head == NULL) return insert_beginning(value);

    struct Node *newNode = create_node(value);
    if (newNode == NULL) return ERR_MALLOC_FAILED;

    if (current_list_type == LIST_TYPE_SINGLY) {
        struct Node *current = head;
        while (current->next != NULL) current = current->next;
        current->next = newNode;
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        struct Node *current = head;
        while (current->next != NULL) current = current->next;
        current->next = newNode;
        newNode->prev = current;
    } else if (current_list_type == LIST_TYPE_CIRCULAR) {
        struct Node *current = head;
        while (current->next != head) current = current->next;
        current->next = newNode;
        newNode->next = head; /* Maintain circular loop */
    }
    return STATUS_SUCCESS;
}`,

    insert_at_position: `/* Inserts a new node at specified 1-based position - O(n) */
int insert_at_position(int value, int position) {
    if (position < 1) return ERR_INVALID_POSITION;
    if (position == 1) return insert_beginning(value);

    int count = get_node_count();
    if (position > count + 1) return ERR_INVALID_POSITION;
    if (position == count + 1) return insert_end(value);

    struct Node *current = head;
    int current_pos = 1;
    while (current != NULL && current_pos < position - 1) {
        current = current->next;
        current_pos++;
    }

    struct Node *newNode = create_node(value);
    if (newNode == NULL) return ERR_MALLOC_FAILED;

    if (current_list_type == LIST_TYPE_DOUBLY) {
        newNode->next = current->next;
        newNode->prev = current;
        if (current->next != NULL) current->next->prev = newNode;
        current->next = newNode;
    } else {
        newNode->next = current->next;
        current->next = newNode;
    }
    return STATUS_SUCCESS;
}`,

    insert_after_value: `/* Inserts a new node immediately after target_value - O(n) */
int insert_after_value(int target_value, int value) {
    if (head == NULL) return ERR_EMPTY_LIST;

    struct Node *current = head;
    int found = 0;
    if (current_list_type == LIST_TYPE_CIRCULAR) {
        do {
            if (current->data == target_value) { found = 1; break; }
            current = current->next;
        } while (current != head);
    } else {
        while (current != NULL) {
            if (current->data == target_value) { found = 1; break; }
            current = current->next;
        }
    }
    if (!found) return ERR_VALUE_NOT_FOUND;

    struct Node *newNode = create_node(value);
    if (newNode == NULL) return ERR_MALLOC_FAILED;

    newNode->next = current->next;
    if (current_list_type == LIST_TYPE_DOUBLY) {
        newNode->prev = current;
        if (current->next != NULL) current->next->prev = newNode;
    }
    current->next = newNode;
    return STATUS_SUCCESS;
}`,

    delete_beginning: `/* Deletes the first node (HEAD) and frees heap memory */
int delete_beginning(int *out_deleted_val) {
    if (head == NULL) return ERR_EMPTY_LIST;

    struct Node *temp = head;
    if (out_deleted_val != NULL) *out_deleted_val = temp->data;

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        if (head->next == head) {
            head = NULL;
        } else {
            struct Node *tail = head;
            while (tail->next != head) tail = tail->next;
            head = head->next;
            tail->next = head;
        }
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        head = head->next;
        if (head != NULL) head->prev = NULL;
    } else {
        head = head->next;
    }

    free(temp); /* Release allocated memory */
    return STATUS_SUCCESS;
}`,

    delete_end: `/* Deletes the last node (TAIL) and frees heap memory - O(n) */
int delete_end(int *out_deleted_val) {
    if (head == NULL) return ERR_EMPTY_LIST;

    if ((current_list_type == LIST_TYPE_CIRCULAR && head->next == head) ||
        (current_list_type != LIST_TYPE_CIRCULAR && head->next == NULL)) {
        return delete_beginning(out_deleted_val);
    }

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        struct Node *current = head;
        while (current->next->next != head) current = current->next;
        struct Node *temp = current->next;
        if (out_deleted_val != NULL) *out_deleted_val = temp->data;
        current->next = head;
        free(temp);
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        struct Node *current = head;
        while (current->next != NULL) current = current->next;
        if (out_deleted_val != NULL) *out_deleted_val = current->data;
        current->prev->next = NULL;
        free(current);
    } else {
        struct Node *current = head;
        while (current->next->next != NULL) current = current->next;
        struct Node *temp = current->next;
        if (out_deleted_val != NULL) *out_deleted_val = temp->data;
        current->next = NULL;
        free(temp);
    }
    return STATUS_SUCCESS;
}`,

    delete_at_position: `/* Deletes node at specified 1-based position - O(n) */
int delete_at_position(int position, int *out_deleted_val) {
    if (head == NULL) return ERR_EMPTY_LIST;
    if (position < 1) return ERR_INVALID_POSITION;

    int count = get_node_count();
    if (position > count) return ERR_INVALID_POSITION;

    if (position == 1) return delete_beginning(out_deleted_val);
    if (position == count) return delete_end(out_deleted_val);

    struct Node *current = head;
    for (int i = 1; i < position - 1; i++) current = current->next;

    struct Node *temp = current->next;
    if (out_deleted_val != NULL) *out_deleted_val = temp->data;

    if (current_list_type == LIST_TYPE_DOUBLY) {
        current->next = temp->next;
        if (temp->next != NULL) temp->next->prev = current;
    } else {
        current->next = temp->next;
    }

    free(temp);
    return STATUS_SUCCESS;
}`,

    delete_by_value: `/* Deletes the first node matching target_value - O(n) */
int delete_by_value(int target_value, int *out_position) {
    if (head == NULL) return ERR_EMPTY_LIST;

    if (head->data == target_value) {
        if (out_position != NULL) *out_position = 1;
        return delete_beginning(NULL);
    }

    struct Node *prev = head, *current = head->next;
    int position = 2, found = 0;

    while (current != NULL && (current_list_type != LIST_TYPE_CIRCULAR || current != head)) {
        if (current->data == target_value) { found = 1; break; }
        prev = current; current = current->next; position++;
    }

    if (!found) return ERR_VALUE_NOT_FOUND;
    if (out_position != NULL) *out_position = position;

    prev->next = current->next;
    if (current_list_type == LIST_TYPE_DOUBLY && current->next != NULL) {
        current->next->prev = prev;
    }
    free(current);
    return STATUS_SUCCESS;
}`,

    update_at_position: `/* Updates data payload of node at 1-based position - O(n) */
int update_at_position(int position, int new_value) {
    if (head == NULL) return ERR_EMPTY_LIST;
    if (position < 1) return ERR_INVALID_POSITION;

    int count = get_node_count();
    if (position > count) return ERR_INVALID_POSITION;

    struct Node *current = head;
    for (int i = 1; i < position; i++) {
        current = current->next;
    }
    current->data = new_value; /* In-place data update */
    return STATUS_SUCCESS;
}`,

    update_value: `/* Updates first node matching old_value to new_value - O(n) */
int update_value(int old_value, int new_value) {
    if (head == NULL) return ERR_EMPTY_LIST;

    struct Node *current = head;
    int position = 1;

    do {
        if (current->data == old_value) {
            current->data = new_value;
            return position; /* Return 1-based position updated */
        }
        position++;
        current = current->next;
    } while (current != NULL && (current_list_type != LIST_TYPE_CIRCULAR || current != head));

    return ERR_VALUE_NOT_FOUND;
}`,

    search_value: `/* Searches for target_value; returns 1-based index or -3 - O(n) */
int search_value(int target_value) {
    if (head == NULL) return ERR_VALUE_NOT_FOUND;

    int position = 1;
    struct Node *current = head;
    do {
        if (current->data == target_value) return position;
        position++;
        current = current->next;
    } while (current != NULL && (current_list_type != LIST_TYPE_CIRCULAR || current != head));

    return ERR_VALUE_NOT_FOUND;
}`,

    reverse_list: `/* Reverses list iteratively in-place across all list types - O(n) */
int reverse_list(void) {
    if (head == NULL) return STATUS_SUCCESS;

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        if (head->next == head) return STATUS_SUCCESS;
        struct Node *prev = NULL, *current = head, *next_node = NULL;
        do {
            next_node = current->next;
            current->next = prev;
            prev = current;
            current = next_node;
        } while (current != head);
        head->next = prev;
        head = prev;
        return STATUS_SUCCESS;
    }

    if (current_list_type == LIST_TYPE_DOUBLY) {
        struct Node *temp = NULL, *current = head;
        while (current != NULL) {
            temp = current->prev;
            current->prev = current->next;
            current->next = temp;
            current = current->prev;
        }
        if (temp != NULL) head = temp->prev;
        return STATUS_SUCCESS;
    }

    /* Singly list reversal */
    struct Node *prev = NULL, *current = head, *next_node = NULL;
    while (current != NULL) {
        next_node = current->next;
        current->next = prev;
        prev = current;
        current = next_node;
    }
    head = prev;
    return STATUS_SUCCESS;
}`,

    clear_list: `/* Frees all allocated nodes and sets head = NULL - O(n) */
void clear_list(void) {
    if (head == NULL) return;

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        struct Node *tail = head;
        while (tail->next != head) tail = tail->next;
        tail->next = NULL; /* Break loop before freeing */
    }

    struct Node *current = head;
    while (current != NULL) {
        struct Node *temp = current;
        current = current->next;
        free(temp); /* Guarantee zero memory leaks */
    }
    head = NULL;
}`,

    init_list: `/* Initializes list from a delimiter-separated string - O(n) */
int init_list(const char *values_str) {
    clear_list();
    if (values_str == NULL) return 0;

    int count = 0;
    const char *p = values_str;
    while (*p != '\\0') {
        while (*p != '\\0' && (isspace((unsigned char)*p) || *p == ',' || *p == ';')) p++;
        if (*p == '\\0') break;

        char *endptr;
        long val = strtol(p, &endptr, 10);
        if (p == endptr) { p++; continue; }

        insert_end((int)val);
        count++;
        p = endptr;
    }
    return count;
}`,

    get_serialized_list: `/* Serializes C heap state to JSON returned to JavaScript */
const char* get_serialized_list(void) {
    int count = get_node_count();
    const char *typeName = (current_list_type == LIST_TYPE_DOUBLY) ? "doubly" :
                           (current_list_type == LIST_TYPE_CIRCULAR) ? "circular" : "singly";

    int offset = snprintf(serialization_buffer, SERIALIZE_BUF_SIZE,
        "{\\"listType\\":%d,\\"typeName\\":\\"%s\\",\\"count\\":%d,\\"nodes\\":[",
        current_list_type, typeName, count);

    /* Formats each node with pos, data, addr, nextAddr, prevAddr */
    ...
    return serialization_buffer;
}`
  };

  // DOM Elements
  const elWasmStatus = document.getElementById('wasmStatus');
  const elCanvasList = document.getElementById('canvasList');
  const elMetricType = document.getElementById('metricType');
  const elMetricHead = document.getElementById('metricHead');
  const elMetricTail = document.getElementById('metricTail');
  const elMetricCount = document.getElementById('metricCount');
  const elMetricMemory = document.getElementById('metricMemory');
  const elMetricStatus = document.getElementById('metricStatus');
  const elAnimSpeed = document.getElementById('animSpeedSelect');
  const elEduComplexity = document.getElementById('eduComplexity');
  const elEduTitle = document.getElementById('eduTitle');
  const elEduSummary = document.getElementById('eduSummary');
  const elEduStepsList = document.getElementById('eduStepsList');
  const elEduNote = document.getElementById('eduNote');
  const elCodeSelect = document.getElementById('codeSnippetSelect');
  const elCCodeDisplay = document.getElementById('cCodeDisplay');
  const elToastContainer = document.getElementById('toastContainer');
  const elHelpModal = document.getElementById('helpModal');

  // ==========================================================================
  // Helper Utilities: C Memory & WASM Bridging
  // ==========================================================================

  function passStringToC(str) {
    if (!Module || !Module._malloc) return 0;
    if (typeof Module.allocateUTF8 === 'function') {
      return Module.allocateUTF8(str || '');
    }
    const bytes = new TextEncoder().encode((str || '') + '\0');
    const ptr = Module._malloc(bytes.length);
    if (Module.HEAPU8) {
      Module.HEAPU8.set(bytes, ptr);
    } else if (typeof Module.stringToUTF8 === 'function') {
      Module.stringToUTF8(str || '', ptr, bytes.length);
    }
    return ptr;
  }

  function callWithOutInt(cFunc, ...args) {
    if (!Module || !Module._malloc) return { status: STATUS.ERR_MALLOC_FAILED, outVal: 0 };
    const outPtr = Module._malloc(4);
    try {
      const status = cFunc(...args, outPtr);
      let outVal = 0;
      if (typeof Module.getValue === 'function') {
        outVal = Module.getValue(outPtr, 'i32');
      } else if (Module.HEAP32) {
        outVal = Module.HEAP32[outPtr >> 2];
      } else if (Module.HEAPU8) {
        outVal = new DataView(Module.HEAPU8.buffer).getInt32(outPtr, true);
      }
      return { status, outVal };
    } finally {
      Module._free(outPtr);
    }
  }

  function getCListState() {
    if (!isWasmLoaded || !Module._get_serialized_list) {
      return { listType: 0, typeName: 'singly', count: 0, nodes: [] };
    }
    const jsonPtr = Module._get_serialized_list();
    const jsonStr = typeof Module.UTF8ToString === 'function' ? Module.UTF8ToString(jsonPtr) : String(jsonPtr);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse C serialized list JSON:', jsonStr, e);
      return { listType: 0, typeName: 'singly', count: 0, nodes: [] };
    }
  }

  function sleep(ms) {
    const factor = parseInt(elAnimSpeed.value, 10) || 500;
    const actual = (ms / 500) * factor;
    return new Promise(resolve => setTimeout(resolve, actual));
  }

  // ==========================================================================
  // Toast Notifications
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    elToastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================================================
  // Execution Status Recorder
  // ==========================================================================
  function logExecution(opName, params, statusCode, summary, count) {
    const statusText = STATUS_LABELS[statusCode] || `Code: ${statusCode}`;
    if (elMetricStatus) {
      elMetricStatus.textContent = statusText;
      elMetricStatus.className = `metric-value code-font ${statusCode === 0 ? 'status-ok' : 'status-err'}`;
    }
  }

  // ==========================================================================
  // Educational Explanation and Code Sync
  // ==========================================================================
  function updateEducation(info) {
    if (info.complexity) elEduComplexity.textContent = info.complexity;
    if (info.title) elEduTitle.textContent = info.title;
    if (info.summary) elEduSummary.textContent = info.summary;
    if (info.note) elEduNote.innerHTML = info.note;

    if (info.steps && Array.isArray(info.steps)) {
      elEduStepsList.innerHTML = info.steps.map(s => `<li>${s}</li>`).join('');
    }

    if (info.snippetKey && C_SNIPPETS[info.snippetKey]) {
      elCodeSelect.value = info.snippetKey;
      renderCCodeSnippet(info.snippetKey);
    }
  }

  function renderCCodeSnippet(key) {
    const raw = C_SNIPPETS[key] || '/* Snippet not found */';
    let highlighted = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\/\*[\s\S]*?\*\//g, m => `<span class="token-comment">${m}</span>`)
      .replace(/\b(int|void|struct|char|long|unsigned)\b/g, m => `<span class="token-type">${m}</span>`)
      .replace(/\b(if|else|while|return|break|continue|sizeof|NULL)\b/g, m => `<span class="token-kw">${m}</span>`)
      .replace(/\b(malloc|free|insert_beginning|insert_end|insert_at_position|insert_after_value|delete_beginning|delete_end|delete_at_position|delete_by_value|update_at_position|update_value|search_value|reverse_list|clear_list|init_list|get_serialized_list|set_list_type|get_list_type|snprintf|strtol)\b/g, m => `<span class="token-fn">${m}</span>`)
      .replace(/\b(\d+)\b/g, m => `<span class="token-num">${m}</span>`);

    elCCodeDisplay.innerHTML = highlighted;
  }

  // ==========================================================================
  // Rendering the Authoritative C List
  // ==========================================================================
  function renderVisualization(highlightConfig = {}) {
    const listData = getCListState();
    const { listType, typeName, count, nodes } = listData;

    // Update Ribbon Metrics
    elMetricCount.textContent = count;
    elMetricHead.textContent = nodes.length > 0 ? nodes[0].addr : 'NULL';
    elMetricTail.textContent = nodes.length > 0 ? nodes[nodes.length - 1].addr : 'NULL';
    
    const typeLabel = listType === 1 ? 'Doubly List' : listType === 2 ? 'Circular List' : 'Singly List';
    if (elMetricType) elMetricType.textContent = typeLabel;

    // Node size: Singly=8B, Doubly=12B, Circular=8B
    const bytesPerNode = listType === 1 ? 12 : 8;
    const estimatedBytes = count * bytesPerNode;
    elMetricMemory.textContent = `${estimatedBytes} Bytes (${count} × ${bytesPerNode}B)`;

    elCanvasList.innerHTML = '';

    // Handle Empty List State
    if (nodes.length === 0) {
      elCanvasList.innerHTML = `
        <div id="emptyListState" class="empty-state">
          <div class="empty-illustration">
            <span class="head-badge">HEAD</span>
            <span class="arrow-symbol">&rarr;</span>
            <span class="null-badge">NULL</span>
          </div>
          <p class="empty-text">List is currently empty (<code>head == NULL</code>)</p>
          <p class="empty-hint">Use the <strong>Initialize</strong> panel or insert operations to construct nodes in C heap.</p>
        </div>
      `;
      return;
    }

    // Doubly Linked List leading NULL block
    if (listType === 1) {
      const doublyLead = document.createElement('div');
      doublyLead.className = 'doubly-null-lead';
      doublyLead.innerHTML = `
        <div class="null-terminus"><span>NULL</span></div>
        <div class="arrow-line-bi"></div>
      `;
      elCanvasList.appendChild(doublyLead);
    }

    // 1. Render HEAD pointer badge
    const headBlock = document.createElement('div');
    headBlock.className = 'head-pointer-block';
    headBlock.innerHTML = `
      <span class="head-tag">HEAD</span>
      <div class="head-arrow-down"></div>
    `;
    elCanvasList.appendChild(headBlock);

    // 2. Render each node in the chain
    nodes.forEach((node, idx) => {
      const nodeItem = document.createElement('div');
      nodeItem.className = 'node-item';
      nodeItem.id = `node-${node.pos}`;

      let cardClass = 'node-card';
      if (highlightConfig.visitingPos === node.pos) cardClass += ' highlight-visiting';
      if (highlightConfig.foundPos === node.pos) cardClass += ' highlight-found';
      if (highlightConfig.deletingPos === node.pos) cardClass += ' highlight-deleting';
      if (highlightConfig.insertedPos === node.pos) cardClass += ' highlight-inserted';

      const nextLabel = node.nextAddr === 'NULL' ? 'NULL' : node.nextAddr;
      const prevLabel = node.prevAddr || 'NULL';

      // Differ between Doubly tri-cell and Singly/Circular dual-cell
      if (listType === 1) {
        // Doubly Linked List Node: [ PREV | DATA | NEXT ]
        nodeItem.innerHTML = `
          <div class="${cardClass}">
            <div class="node-meta">
              <span class="node-pos">#${node.pos}</span>
              <span class="node-addr" title="Actual C Heap Address">${node.addr}</span>
            </div>
            <div class="node-cells tri-cell">
              <div class="cell-prev" title="Previous Node: ${prevLabel}">
                <span class="cell-label">PREV</span>
                <span class="prev-addr-text">${prevLabel}</span>
              </div>
              <div class="cell-data">
                <span class="cell-label">DATA</span>
                <span class="cell-value">${node.value}</span>
              </div>
              <div class="cell-next" title="Next Node: ${nextLabel}">
                <span class="cell-label">NEXT</span>
                <span class="next-addr-text">${nextLabel}</span>
              </div>
            </div>
          </div>
          <div class="node-connector">
            <span class="connector-label">prev &harr; next</span>
            <div class="arrow-line-bi"></div>
          </div>
        `;
      } else {
        // Singly & Circular Node: [ DATA | NEXT ]
        nodeItem.innerHTML = `
          <div class="${cardClass}">
            <div class="node-meta">
              <span class="node-pos">#${node.pos}</span>
              <span class="node-addr" title="Actual C Heap Address">${node.addr}</span>
            </div>
            <div class="node-cells">
              <div class="cell-data">
                <span class="cell-label">DATA</span>
                <span class="cell-value">${node.value}</span>
              </div>
              <div class="cell-next" title="Next Node Pointer Address: ${nextLabel}">
                <span class="cell-label">NEXT</span>
                <span class="next-addr-text">${nextLabel}</span>
              </div>
            </div>
          </div>
          ${idx < nodes.length - 1 ? `
            <div class="node-connector">
              <span class="connector-label">next</span>
              <div class="arrow-line"></div>
            </div>
          ` : ''}
        `;
      }

      elCanvasList.appendChild(nodeItem);
    });

    // 3. Render Terminal Block based on list type
    if (listType === 2) {
      // Circular Linked List: Tail connects back to HEAD
      const circBlock = document.createElement('div');
      circBlock.style.display = 'flex';
      circBlock.style.alignItems = 'center';
      circBlock.innerHTML = `
        <div class="node-connector">
          <span class="connector-label">tail &rarr; head</span>
          <div class="arrow-line"></div>
        </div>
        <div class="circular-terminus" title="Loops back to first node: ${nodes[0].addr}">
          <span class="circular-icon">&circlearrowright;</span>
          <span>HEAD</span>
          <span class="code-font" style="font-size:0.68rem;opacity:0.85;">(${nodes[0].addr})</span>
        </div>
      `;
      elCanvasList.appendChild(circBlock);
    } else {
      // Singly & Doubly: Terminal NULL Block
      const nullBlock = document.createElement('div');
      nullBlock.className = 'null-terminus';
      nullBlock.innerHTML = `
        <span>NULL</span>
        <span class="null-icon">&#x23DA;</span>
      `;
      elCanvasList.appendChild(nullBlock);
    }
  }

  // ==========================================================================
  // Operations Implementation (Calling Authoritative C WebAssembly Module)
  // ==========================================================================

  /**
   * 0. Switch Linked List Type (Singly, Doubly, Circular)
   */
  function handleSetListType(type) {
    if (!isWasmLoaded) return;
    const typeNames = ['Singly Linked List', 'Doubly Linked List', 'Circular Linked List'];
    if (Module._set_list_type) {
      Module._set_list_type(type);
    }

    document.querySelectorAll('.type-pill').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.type, 10) === type);
    });

    const count = Module._get_node_count();
    renderVisualization();
    showToast(`Switched active structure to ${typeNames[type]}.`, 'info');
    logExecution('Switch List Type', `type=${typeNames[type]}`, STATUS.SUCCESS, `Adapted ${count} node(s) to ${typeNames[type]} links`, count);

    const typeSnippets = ['struct_node', 'set_list_type', 'circular_linked_list'];
    updateEducation({
      complexity: type === 1 ? 'Time: O(1) bi-directional | Space: O(1)' : type === 2 ? 'Time: O(n) loop cycle | Space: O(1)' : 'Time: O(1) forward | Space: O(1)',
      title: `${typeNames[type]} Mode Active`,
      summary: type === 1 
        ? `Nodes now maintain both 'prev' and 'next' pointers, allowing forward and backward traversal.`
        : type === 2
        ? `The last node in the chain links back to HEAD, creating an endless circular structure without a NULL terminus.`
        : `Nodes maintain a single 'next' pointer pointing forward to the next node, terminating with NULL.`,
      steps: type === 1 ? [
        `Rebuilt <code>prev</code> pointers across all ${count} nodes in C memory.`,
        `<code>head->prev</code> is set to <code>NULL</code>.`,
        `Each node satisfies <code>node->next->prev == node</code>.`,
        `Visualized with dual-headed arrows & 3-cell nodes [PREV | DATA | NEXT].`
      ] : type === 2 ? [
        `Tail node next pointer points directly to <code>head</code> (${elMetricHead.textContent}).`,
        `Traversals loop continuously; termination requires checking <code>current == head</code>.`,
        `No node in the circular list points to <code>NULL</code>.`
      ] : [
        `Linear singly linked list structure restored.`,
        `Tail node next pointer points to <code>NULL</code>.`,
        `Backward pointers are disconnected.`
      ],
      note: type === 1 
        ? '<strong>College DSA Takeaway:</strong> Doubly linked lists require extra memory for the prev pointer, but enable O(1) deletion given a node pointer and bi-directional traversal.'
        : type === 2
        ? '<strong>College DSA Takeaway:</strong> Circular linked lists are ideal for round-robin CPU scheduling and recurring ring buffers.'
        : '<strong>College DSA Takeaway:</strong> Singly linked lists have minimal memory overhead per node.',
      snippetKey: type === 1 ? 'set_list_type' : 'struct_node'
    });
  }

  /**
   * 1. Initialize List from Comma-Separated Values
   */
  function handleInitList(inputStr) {
    if (!isWasmLoaded) return;
    const cleanStr = (inputStr || '').trim();

    const ptr = passStringToC(cleanStr);
    const count = Module._init_list(ptr);
    Module._free(ptr);

    renderVisualization();
    showToast(`List initialized with ${count} nodes in C WebAssembly memory.`, 'success');
    logExecution('Initialize List', `"${cleanStr}"`, STATUS.SUCCESS, `Constructed ${count} node(s) on C heap`, count);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: 'Initialize List from Values',
      summary: `Cleared any existing nodes and sequentially inserted ${count} values into the C linked list by invoking malloc() for each item.`,
      steps: [
        'Cleared existing list by invoking <code>free()</code> on every existing node.',
        `Parsed input string <code>"${cleanStr}"</code> using standard C <code>strtol()</code> delimiters.`,
        `Called <code>insert_end()</code> for each valid integer to maintain FIFO order.`,
        `Head pointer now points to: <code>${elMetricHead.textContent}</code>.`
      ],
      note: '<strong>College DSA Takeaway:</strong> In C, parsing strings requires tracking delimiters and integer boundaries safely to avoid memory faults.',
      snippetKey: 'init_list'
    });
  }

  /**
   * 2. Insert Beginning (Value)
   */
  function handleInsertBeginning(val) {
    if (!isWasmLoaded) return;
    if (isNaN(val)) {
      showToast('Please enter a valid integer for insertion.', 'warning');
      return;
    }

    const status = Module._insert_beginning(val);
    const count = Module._get_node_count();

    renderVisualization({ insertedPos: 1 });
    showToast(`Inserted value ${val} at the beginning of the list.`, 'success');
    logExecution('Insert Beginning', `val=${val}`, status, `Allocated node for ${val} at front`, count);

    updateEducation({
      complexity: 'Time: O(1) [O(n) for Circular] | Space: O(1)',
      title: 'Insert at Beginning (Prepend)',
      summary: `Allocated node on the C heap for value ${val}, adjusted pointer connections, and updated HEAD.`,
      steps: [
        `Executed <code>malloc(sizeof(struct Node))</code> to allocate node on C heap.`,
        `Assigned <code>newNode->data = ${val};</code>.`,
        `Set <code>newNode->next = head;</code> to point to current first node.`,
        `Updated <code>head = newNode;</code> to establish the new starting node.`,
        `In Circular mode, tail next pointer is also updated to point to new HEAD.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Inserting at the front is an O(1) operation because it does not require traversing the list.',
      snippetKey: 'insert_beginning'
    });
  }

  /**
   * 3. Insert End (Value) - O(n)
   */
  function handleInsertEnd(val) {
    if (!isWasmLoaded) return;
    if (isNaN(val)) {
      showToast('Please enter a valid integer for insertion.', 'warning');
      return;
    }

    const status = Module._insert_end(val);
    const count = Module._get_node_count();

    renderVisualization({ insertedPos: count });
    showToast(`Inserted value ${val} at the end of the list.`, 'success');
    logExecution('Insert End', `val=${val}`, status, `Appended node for ${val} at tail`, count);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: 'Insert at End (Append)',
      summary: `Traversed list to find the final node, allocated new node with data=${val}, and linked it as the new tail.`,
      steps: [
        `Traversed from head to the last node.`,
        `Allocated new node: <code>struct Node *newNode = (struct Node*)malloc(sizeof(struct Node));</code>.`,
        `Set <code>newNode->data = ${val};</code>.`,
        `Linked former tail's next to <code>newNode</code>.`,
        `In Circular mode, <code>newNode->next</code> points back to <code>head</code>.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Appending to a linked list without a separate tail pointer requires O(n) traversal.',
      snippetKey: 'insert_end'
    });
  }

  /**
   * 4. Insert at Position (Value, Position) - O(n)
   */
  function handleInsertAtPosition(val, pos) {
    if (!isWasmLoaded) return;
    if (isNaN(val) || isNaN(pos) || pos < 1) {
      showToast('Please enter valid integer value and 1-based position (>= 1).', 'warning');
      return;
    }

    const currentCount = Module._get_node_count();
    if (pos > currentCount + 1) {
      showToast(`Position ${pos} is out of bounds. Valid positions: 1 to ${currentCount + 1}.`, 'error');
      logExecution('Insert at Position', `val=${val}, pos=${pos}`, STATUS.ERR_INVALID_POSITION, `Pos ${pos} > count+1`, currentCount);
      return;
    }

    const status = Module._insert_at_position(val, pos);
    const newCount = Module._get_node_count();

    renderVisualization({ insertedPos: pos });
    showToast(`Inserted value ${val} at 1-based position ${pos}.`, 'success');
    logExecution('Insert at Position', `val=${val}, pos=${pos}`, status, `Inserted node at position #${pos}`, newCount);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: `Insert at Position #${pos}`,
      summary: `Traversed to position #${pos - 1}, spliced in new node with value ${val}, and preserved pointer continuity.`,
      steps: [
        `Validated bounds: 1 <= ${pos} <= ${currentCount + 1}.`,
        pos === 1 ? 'Delegated to <code>insert_beginning()</code>.' : `Traversed to node #${pos - 1}.`,
        `Allocated new node on heap: <code>malloc(sizeof(struct Node))</code>.`,
        `Connected <code>newNode->next = current->next;</code>.`,
        `Re-pointed <code>current->next = newNode;</code>.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Pointer splicing order is critical! Connect the new node\'s next pointer before updating the predecessor\'s next pointer.',
      snippetKey: 'insert_at_position'
    });
  }

  /**
   * 5. Insert After Value (Target Value, New Value) - O(n)
   */
  function handleInsertAfterValue(targetVal, val) {
    if (!isWasmLoaded) return;
    if (isNaN(targetVal) || isNaN(val)) {
      showToast('Please enter valid target value and new value.', 'warning');
      return;
    }

    const currentCount = Module._get_node_count();
    if (currentCount === 0) {
      showToast('Cannot insert: List is empty.', 'warning');
      logExecution('Insert After Value', `target=${targetVal}, val=${val}`, STATUS.ERR_EMPTY_LIST, 'List is empty', 0);
      return;
    }

    const status = Module._insert_after_value(targetVal, val);
    const newCount = Module._get_node_count();

    if (status === STATUS.ERR_VALUE_NOT_FOUND) {
      showToast(`Target value ${targetVal} was not found in the linked list.`, 'error');
      logExecution('Insert After Value', `target=${targetVal}, val=${val}`, status, `Target ${targetVal} not found`, currentCount);
      return;
    }

    const insertedPos = Module._search_value(val);
    renderVisualization({ insertedPos: insertedPos > 0 ? insertedPos : 1 });
    showToast(`Inserted value ${val} immediately after ${targetVal}.`, 'success');
    logExecution('Insert After Value', `target=${targetVal}, val=${val}`, status, `Inserted ${val} after target ${targetVal}`, newCount);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: `Insert After Target (${targetVal})`,
      summary: `Linearly searched for ${targetVal}, allocated new node for ${val}, and spliced it immediately after the target.`,
      steps: [
        `Searched sequentially from head for <code>current->data == ${targetVal}</code>.`,
        `Found target node. Allocated new node via <code>malloc()</code>.`,
        `Set <code>newNode->next = targetNode->next;</code>.`,
        `Set <code>targetNode->next = newNode;</code>.`
      ],
      note: '<strong>College DSA Takeaway:</strong> If duplicates exist, standard implementations insert after the first occurrence.',
      snippetKey: 'insert_after_value'
    });
  }

  /**
   * 6. Delete Beginning - O(1)
   */
  async function handleDeleteBeginning() {
    if (!isWasmLoaded || isAnimationRunning) return;
    const currentCount = Module._get_node_count();

    if (currentCount === 0) {
      showToast('Cannot delete from beginning: List is already empty.', 'warning');
      logExecution('Delete Beginning', '-', STATUS.ERR_EMPTY_LIST, 'List is empty (head == NULL)', 0);
      return;
    }

    renderVisualization({ deletingPos: 1 });
    await sleep(400);

    const { status, outVal } = callWithOutInt(Module._delete_beginning);
    const newCount = Module._get_node_count();

    renderVisualization();
    showToast(`Deleted first node (value: ${outVal}) and freed its memory.`, 'success');
    logExecution('Delete Beginning', '-', status, `Deleted head node [${outVal}] and freed memory`, newCount);

    updateEducation({
      complexity: 'Time: O(1) [O(n) for Circular] | Space: O(1)',
      title: 'Delete Beginning (Pop Front)',
      summary: `Stored temporary pointer to current head, advanced head, and executed free(temp) to reclaim memory.`,
      steps: [
        `Checked <code>head != NULL</code> to prevent null pointer dereference.`,
        `Stored old head in <code>struct Node *temp = head;</code> (value: ${outVal}).`,
        `Advanced head pointer: <code>head = head->next;</code>.`,
        `Called <code>free(temp);</code> to return memory to the OS heap and avoid memory leaks.`,
        `Operation finished in O(1) time.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Always save a temporary pointer to the node being deleted before shifting <code>head</code> to call <code>free()</code>.',
      snippetKey: 'delete_beginning'
    });
  }

  /**
   * 7. Delete End - O(n)
   */
  async function handleDeleteEnd() {
    if (!isWasmLoaded || isAnimationRunning) return;
    const currentCount = Module._get_node_count();

    if (currentCount === 0) {
      showToast('Cannot delete from end: List is already empty.', 'warning');
      logExecution('Delete End', '-', STATUS.ERR_EMPTY_LIST, 'List is empty (head == NULL)', 0);
      return;
    }

    renderVisualization({ deletingPos: currentCount });
    await sleep(400);

    const { status, outVal } = callWithOutInt(Module._delete_end);
    const newCount = Module._get_node_count();

    renderVisualization();
    showToast(`Deleted last node (value: ${outVal}) and freed its memory.`, 'success');
    logExecution('Delete End', '-', status, `Deleted tail node [${outVal}] and freed memory`, newCount);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: 'Delete End (Pop Tail)',
      summary: `Traversed to second-to-last node, severed next link, and called free() on old tail.`,
      steps: [
        currentCount === 1
          ? `List only had 1 node; called <code>free(head)</code> and set <code>head = NULL</code>.`
          : `Iterated until second-to-last node.`,
        currentCount > 1 ? `Stored old tail in <code>struct Node *temp = current->next;</code>.` : 'Single node cleared.',
        currentCount > 1 ? `Terminated list: <code>current->next = NULL;</code>.` : 'Head set to NULL.',
        `Called <code>free(temp);</code> to release heap memory.`,
        `Required O(n) traversal through all ${currentCount} nodes.`
      ],
      note: '<strong>College DSA Takeaway:</strong> In singly linked lists, deleting tail requires traversing to penultimate node to update its next pointer.',
      snippetKey: 'delete_end'
    });
  }

  /**
   * 8. Delete at Position - O(n)
   */
  async function handleDeleteAtPosition(pos) {
    if (!isWasmLoaded || isAnimationRunning) return;
    if (isNaN(pos) || pos < 1) {
      showToast('Please enter a valid 1-based position (>= 1).', 'warning');
      return;
    }

    const currentCount = Module._get_node_count();
    if (currentCount === 0) {
      showToast('Cannot delete: List is empty.', 'warning');
      logExecution('Delete at Position', `pos=${pos}`, STATUS.ERR_EMPTY_LIST, 'List is empty', 0);
      return;
    }

    if (pos > currentCount) {
      showToast(`Position ${pos} is out of bounds. Current list has ${currentCount} node(s).`, 'error');
      logExecution('Delete at Position', `pos=${pos}`, STATUS.ERR_INVALID_POSITION, `Position ${pos} > count ${currentCount}`, currentCount);
      return;
    }

    renderVisualization({ deletingPos: pos });
    await sleep(400);

    const { status, outVal } = callWithOutInt(Module._delete_at_position, pos);
    const newCount = Module._get_node_count();

    renderVisualization();
    showToast(`Deleted node at position #${pos} (value: ${outVal}).`, 'success');
    logExecution('Delete at Position', `pos=${pos}`, status, `Deleted node #${pos} [${outVal}] and freed memory`, newCount);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: `Delete at Position #${pos}`,
      summary: `Traversed to node #${pos - 1}, bypassed node #${pos}, and invoked free() on the removed node.`,
      steps: [
        `Validated bounds: 1 <= ${pos} <= ${currentCount}.`,
        pos === 1 ? 'Handled by delete_beginning.' : `Traversed to position #${pos - 1}.`,
        `Stored node to delete: <code>struct Node *temp = current->next;</code> (value: ${outVal}).`,
        `Bypassed node: <code>current->next = temp->next;</code>.`,
        `Executed <code>free(temp);</code> to prevent memory leak.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Always bypass the target node in the chain before calling <code>free()</code>.',
      snippetKey: 'delete_at_position'
    });
  }

  /**
   * 9. Delete by Value - O(n)
   */
  async function handleDeleteByValue(targetVal) {
    if (!isWasmLoaded || isAnimationRunning) return;
    if (isNaN(targetVal)) {
      showToast('Please enter a valid integer value to delete.', 'warning');
      return;
    }

    const currentCount = Module._get_node_count();
    if (currentCount === 0) {
      showToast('Cannot delete: List is empty.', 'warning');
      logExecution('Delete by Value', `val=${targetVal}`, STATUS.ERR_EMPTY_LIST, 'List is empty', 0);
      return;
    }

    const foundPos = Module._search_value(targetVal);
    if (foundPos === STATUS.ERR_VALUE_NOT_FOUND || foundPos < 1) {
      showToast(`Value ${targetVal} was not found in the list.`, 'error');
      logExecution('Delete by Value', `val=${targetVal}`, STATUS.ERR_VALUE_NOT_FOUND, `Value ${targetVal} not found`, currentCount);
      return;
    }

    renderVisualization({ deletingPos: foundPos });
    await sleep(400);

    const { status, outVal: deletedPos } = callWithOutInt(Module._delete_by_value, targetVal);
    const newCount = Module._get_node_count();

    renderVisualization();
    showToast(`Deleted first occurrence of value ${targetVal} (was at position #${deletedPos}).`, 'success');
    logExecution('Delete by Value', `val=${targetVal}`, status, `Deleted first node with value ${targetVal} at pos #${deletedPos}`, newCount);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: `Delete by Value (${targetVal})`,
      summary: `Traversed to find first node matching ${targetVal}, unlinked it from chain, and freed its memory.`,
      steps: [
        `Maintained <code>prev</code> and <code>current</code> pointers.`,
        `Compared <code>current->data == ${targetVal}</code> at each node.`,
        `Found match at position #${deletedPos}.`,
        `Unlinked: <code>prev->next = current->next;</code>.`,
        `Reclaimed heap memory: <code>free(current);</code>.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Only the first occurrence is removed, preserving subsequent duplicates.',
      snippetKey: 'delete_by_value'
    });
  }

  /**
   * 10. Update at Position - O(n)
   */
  function handleUpdateAtPosition(pos, newVal) {
    if (!isWasmLoaded) return;
    if (isNaN(pos) || pos < 1 || isNaN(newVal)) {
      showToast('Please enter a valid 1-based position and new integer value.', 'warning');
      return;
    }

    const currentCount = Module._get_node_count();
    if (currentCount === 0) {
      showToast('Cannot update: List is empty.', 'warning');
      logExecution('Update at Position', `pos=${pos}, val=${newVal}`, STATUS.ERR_EMPTY_LIST, 'List is empty', 0);
      return;
    }

    if (pos > currentCount) {
      showToast(`Position ${pos} is out of bounds. Current list has ${currentCount} node(s).`, 'error');
      logExecution('Update at Position', `pos=${pos}, val=${newVal}`, STATUS.ERR_INVALID_POSITION, `Pos ${pos} > count ${currentCount}`, currentCount);
      return;
    }

    const status = Module._update_at_position(pos, newVal);
    renderVisualization({ foundPos: pos });
    showToast(`Updated node #${pos} to value ${newVal}.`, 'success');
    logExecution('Update at Position', `pos=${pos}, val=${newVal}`, status, `Updated data at position #${pos}`, currentCount);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: 'Update Node at Position',
      summary: `Traversed to node #${pos} in C memory and replaced its data value with ${newVal} in-place without reallocating nodes.`,
      steps: [
        `Validated bounds: 1 <= position (${pos}) <= node count (${currentCount}).`,
        `Advanced pointer from head to node #${pos}.`,
        `Executed <code>current->data = ${newVal};</code> directly modifying heap memory.`,
        `No pointer adjustments or malloc/free calls were needed.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Updating a node\'s data in a linked list takes O(n) time to locate the node by index, but O(1) once at the pointer location.',
      snippetKey: 'update_at_position'
    });
  }

  /**
   * 11. Update by Value - O(n)
   */
  function handleUpdateValue(oldVal, newVal) {
    if (!isWasmLoaded) return;
    if (isNaN(oldVal) || isNaN(newVal)) {
      showToast('Please enter valid integers for old and new values.', 'warning');
      return;
    }

    const currentCount = Module._get_node_count();
    if (currentCount === 0) {
      showToast('Cannot update: List is empty.', 'warning');
      logExecution('Update by Value', `old=${oldVal}, new=${newVal}`, STATUS.ERR_EMPTY_LIST, 'List is empty', 0);
      return;
    }

    const resultPos = Module._update_value(oldVal, newVal);
    if (resultPos === STATUS.ERR_VALUE_NOT_FOUND || resultPos < 0) {
      showToast(`Value ${oldVal} not found in the list.`, 'error');
      logExecution('Update by Value', `old=${oldVal}, new=${newVal}`, STATUS.ERR_VALUE_NOT_FOUND, `Value ${oldVal} not found`, currentCount);
      return;
    }

    renderVisualization({ foundPos: resultPos });
    showToast(`Updated node #${resultPos} (old value ${oldVal} &rarr; ${newVal}).`, 'success');
    logExecution('Update by Value', `old=${oldVal}, new=${newVal}`, STATUS.SUCCESS, `Replaced ${oldVal} with ${newVal} at pos #${resultPos}`, currentCount);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: 'Update Node by Value',
      summary: `Linearly searched for value ${oldVal}, located first occurrence at node #${resultPos}, and updated its data to ${newVal}.`,
      steps: [
        `Started traversal from head pointer.`,
        `Compared <code>current->data == ${oldVal}</code> at each node.`,
        `Found target at 1-based position #${resultPos}.`,
        `Updated: <code>current->data = ${newVal};</code>.`
      ],
      note: '<strong>College DSA Takeaway:</strong> By convention, searching or updating by value affects the first occurrence. Subsequent duplicates are unchanged.',
      snippetKey: 'update_value'
    });
  }

  /**
   * 12. Search Value - O(n) with Stepped Animation
   */
  async function handleSearchValue(targetVal) {
    if (!isWasmLoaded || isAnimationRunning) return;
    if (isNaN(targetVal)) {
      showToast('Please enter a valid integer to search for.', 'warning');
      return;
    }

    const currentCount = Module._get_node_count();
    if (currentCount === 0) {
      showToast('Cannot search: List is empty.', 'warning');
      logExecution('Search Value', `target=${targetVal}`, STATUS.ERR_EMPTY_LIST, 'List is empty', 0);
      return;
    }

    isAnimationRunning = true;
    showToast(`Beginning linear search for value ${targetVal}...`, 'info');

    const foundPos = Module._search_value(targetVal);

    // Step-by-step traversal animation
    const maxSteps = foundPos > 0 ? foundPos : currentCount;
    for (let pos = 1; pos <= maxSteps; pos++) {
      renderVisualization({ visitingPos: pos });
      await sleep(350);
    }

    if (foundPos > 0) {
      renderVisualization({ foundPos });
      showToast(`Found target ${targetVal} at 1-based position #${foundPos}!`, 'success');
      logExecution('Search Value', `target=${targetVal}`, STATUS.SUCCESS, `Target found at position #${foundPos}`, currentCount);
    } else {
      renderVisualization();
      showToast(`Target value ${targetVal} was not found in the list.`, 'error');
      logExecution('Search Value', `target=${targetVal}`, STATUS.ERR_VALUE_NOT_FOUND, `Searched all ${currentCount} nodes, target not found`, currentCount);
    }

    isAnimationRunning = false;

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: `Linear Search for ${targetVal}`,
      summary: `Traversed node by node starting from head pointer until target was found or end reached.`,
      steps: [
        `Initialized traversal pointer: <code>struct Node *current = head;</code>.`,
        `Compared <code>current->data == ${targetVal}</code> sequentially.`,
        foundPos > 0 ? `Matched at 1-based position #${foundPos}.` : `Reached terminus without finding target.`,
        `Total comparisons made: ${maxSteps}.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Because linked lists cannot be indexed in O(1) time like arrays, binary search cannot be applied efficiently even if sorted.',
      snippetKey: 'search_value'
    });
  }

  /**
   * 13. Traverse Full List Animation - O(n)
   */
  async function handleTraverseList() {
    if (!isWasmLoaded || isAnimationRunning) return;
    const currentCount = Module._get_node_count();

    if (currentCount === 0) {
      showToast('Cannot traverse: List is empty.', 'warning');
      logExecution('Traverse List', '-', STATUS.ERR_EMPTY_LIST, 'List is empty', 0);
      return;
    }

    isAnimationRunning = true;
    showToast(`Starting sequential pointer traversal of ${currentCount} node(s)...`, 'info');

    for (let pos = 1; pos <= currentCount; pos++) {
      renderVisualization({ visitingPos: pos });
      await sleep(350);
    }

    renderVisualization();
    isAnimationRunning = false;

    showToast(`Traversal complete. Inspected all ${currentCount} nodes.`, 'success');
    logExecution('Traverse List', '-', STATUS.SUCCESS, `Traversed all ${currentCount} nodes in sequence`, currentCount);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: 'Full List Traversal',
      summary: `Visited every node in sequential order from HEAD by following each node's next pointer.`,
      steps: [
        `Started at <code>current = head</code>.`,
        `Repeatedly read <code>current->data</code> and advanced <code>current = current->next</code>.`,
        `Terminated when condition reached. Total nodes visited: ${currentCount}.`
      ],
      note: '<strong>College DSA Takeaway:</strong> Traversal is the foundational pattern for display, search, size computation, and memory deallocation.',
      snippetKey: 'struct_node'
    });
  }

  /**
   * 14. Query Node Count
   */
  function handleCountNodes() {
    if (!isWasmLoaded) return;
    const count = Module._get_node_count();
    showToast(`Authoritative C node count: ${count}`, 'info');
    logExecution('Query Count', '-', STATUS.SUCCESS, `Counted ${count} node(s) on C heap`, count);
  }

  /**
   * 15. Peek First (HEAD)
   */
  function handlePeekFirst() {
    if (!isWasmLoaded) return;
    const { status, outVal } = callWithOutInt(Module._get_first_node);
    const count = Module._get_node_count();

    if (status === STATUS.ERR_EMPTY_LIST) {
      showToast('Cannot inspect HEAD: List is empty.', 'warning');
      logExecution('Peek First', '-', status, 'List is empty', 0);
      return;
    }

    renderVisualization({ foundPos: 1 });
    showToast(`First node (HEAD): value = ${outVal}, address = ${elMetricHead.textContent}`, 'info');
    logExecution('Peek First', '-', status, `HEAD node has value [${outVal}] at ${elMetricHead.textContent}`, count);
  }

  /**
   * 16. Peek Last (TAIL)
   */
  function handlePeekLast() {
    if (!isWasmLoaded) return;
    const { status, outVal } = callWithOutInt(Module._get_last_node);
    const count = Module._get_node_count();

    if (status === STATUS.ERR_EMPTY_LIST) {
      showToast('Cannot inspect TAIL: List is empty.', 'warning');
      logExecution('Peek Last', '-', status, 'List is empty', 0);
      return;
    }

    renderVisualization({ foundPos: count });
    showToast(`Last node (TAIL): value = ${outVal}, address = ${elMetricTail.textContent}`, 'info');
    logExecution('Peek Last', '-', status, `TAIL node has value [${outVal}] at ${elMetricTail.textContent}`, count);
  }

  /**
   * 17. Reverse List (In-Place) - O(n)
   */
  function handleReverseList() {
    if (!isWasmLoaded) return;
    const count = Module._get_node_count();

    if (count === 0) {
      showToast('Cannot reverse: List is empty.', 'warning');
      logExecution('Reverse List', '-', STATUS.ERR_EMPTY_LIST, 'List is empty', 0);
      return;
    }

    const status = Module._reverse_list();
    renderVisualization();
    showToast(`Linked list reversed in-place in C memory!`, 'success');
    logExecution('Reverse List', '-', status, `Reversed pointer links for ${count} node(s)`, count);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: 'In-Place Pointer Reversal',
      summary: `Iteratively reversed pointer directions in C memory using O(1) auxiliary space.`,
      steps: [
        'Maintained 3 pointer variables: <code>prev = NULL</code>, <code>current = head</code>, and <code>next_node = NULL</code>.',
        'At each step: saved <code>next_node = current->next</code>.',
        'Reversed link: <code>current->next = prev</code> (in Doubly mode, swapped prev and next).',
        'Advanced pointers: <code>prev = current</code>, <code>current = next_node</code>.',
        'Finally updated <code>head = prev</code> to complete the reversal.'
      ],
      note: '<strong>College DSA Takeaway:</strong> In-place reversal does not copy or allocate new nodes. It solely modifies pointer memory addresses.',
      snippetKey: 'reverse_list'
    });
  }

  /**
   * 18. Clear & Reset List - O(n)
   */
  function handleClearList() {
    if (!isWasmLoaded) return;
    const oldCount = Module._get_node_count();

    Module._clear_list();
    renderVisualization();
    showToast(`Freed memory for all ${oldCount} node(s). List is now empty.`, 'info');
    logExecution('Clear List', '-', STATUS.SUCCESS, `Invoked free() on ${oldCount} node(s) and set head = NULL`, 0);

    updateEducation({
      complexity: 'Time: O(n) | Space: O(1)',
      title: 'Clear & Reset List',
      summary: `Executed free() on every node in C WebAssembly memory to guarantee zero memory leaks and reset head = NULL.`,
      steps: [
        `Traversed through all ${oldCount} nodes sequentially.`,
        'Stored <code>struct Node *temp = current;</code>.',
        'Advanced <code>current = current->next;</code> before deallocation.',
        'Called <code>free(temp);</code> to return heap memory to the OS.',
        'Set <code>head = NULL;</code>.'
      ],
      note: '<strong>College DSA Takeaway:</strong> In languages without garbage collection like C, failing to call <code>free()</code> causes persistent memory leaks.',
      snippetKey: 'clear_list'
    });
  }

  // ==========================================================================
  // UI Event Listeners
  // ==========================================================================
  function setupUIEventListeners() {
    // 0. Linked List Type Pills
    document.getElementById('btnTypeSingly')?.addEventListener('click', () => handleSetListType(0));
    document.getElementById('btnTypeDoubly')?.addEventListener('click', () => handleSetListType(1));
    document.getElementById('btnTypeCircular')?.addEventListener('click', () => handleSetListType(2));

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        const targetPanelId = button.getAttribute('data-tab');
        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });

    // Preset quick chips
    document.querySelectorAll('.btn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const preset = chip.getAttribute('data-preset');
        document.getElementById('initInput').value = preset;
        handleInitList(preset);
      });
    });

    // 1. Initialize List Button
    document.getElementById('btnInitList').addEventListener('click', () => {
      const val = document.getElementById('initInput').value;
      handleInitList(val);
    });

    // 2. Insert Operations
    document.getElementById('btnInsertBeg').addEventListener('click', () => {
      const val = parseInt(document.getElementById('insertBegVal').value, 10);
      handleInsertBeginning(val);
    });

    document.getElementById('btnInsertEnd').addEventListener('click', () => {
      const val = parseInt(document.getElementById('insertEndVal').value, 10);
      handleInsertEnd(val);
    });

    document.getElementById('btnInsertPos').addEventListener('click', () => {
      const val = parseInt(document.getElementById('insertPosVal').value, 10);
      const pos = parseInt(document.getElementById('insertPosIdx').value, 10);
      handleInsertAtPosition(val, pos);
    });

    document.getElementById('btnInsertAfter').addEventListener('click', () => {
      const target = parseInt(document.getElementById('insertAfterTarget').value, 10);
      const val = parseInt(document.getElementById('insertAfterVal').value, 10);
      handleInsertAfterValue(target, val);
    });

    // 3. Delete Operations
    document.getElementById('btnDeleteBeg').addEventListener('click', handleDeleteBeginning);
    document.getElementById('btnDeleteEnd').addEventListener('click', handleDeleteEnd);

    document.getElementById('btnDeletePos').addEventListener('click', () => {
      const pos = parseInt(document.getElementById('deletePosIdx').value, 10);
      handleDeleteAtPosition(pos);
    });

    document.getElementById('btnDeleteVal').addEventListener('click', () => {
      const val = parseInt(document.getElementById('deleteValTarget').value, 10);
      handleDeleteByValue(val);
    });

    // 4. Update Operations
    document.getElementById('btnUpdatePos')?.addEventListener('click', () => {
      const pos = parseInt(document.getElementById('updatePosIdx').value, 10);
      const val = parseInt(document.getElementById('updatePosVal').value, 10);
      handleUpdateAtPosition(pos, val);
    });

    document.getElementById('btnUpdateVal')?.addEventListener('click', () => {
      const oldVal = parseInt(document.getElementById('updateOldVal').value, 10);
      const newVal = parseInt(document.getElementById('updateNewVal').value, 10);
      handleUpdateValue(oldVal, newVal);
    });

    // 5. Query & Traverse Operations
    document.getElementById('btnSearch').addEventListener('click', () => {
      const val = parseInt(document.getElementById('searchTargetVal').value, 10);
      handleSearchValue(val);
    });

    document.getElementById('btnTraverse').addEventListener('click', handleTraverseList);
    document.getElementById('btnCountNodes').addEventListener('click', handleCountNodes);
    document.getElementById('btnPeekFirst').addEventListener('click', handlePeekFirst);
    document.getElementById('btnPeekLast').addEventListener('click', handlePeekLast);

    // 6. Manipulate Operations
    document.getElementById('btnReverse').addEventListener('click', handleReverseList);
    document.getElementById('btnClear').addEventListener('click', handleClearList);

    // Zoom / Center Viewport
    document.getElementById('btnZoomFit').addEventListener('click', () => {
      const viewport = document.getElementById('viewport');
      viewport.scrollTo({ left: 0, behavior: 'smooth' });
    });



    // Code Snippet Selector Dropdown
    elCodeSelect.addEventListener('change', (e) => {
      renderCCodeSnippet(e.target.value);
    });

    // Copy C Code button
    document.getElementById('btnCopyCode').addEventListener('click', () => {
      const code = elCCodeDisplay.textContent;
      navigator.clipboard.writeText(code).then(() => {
        const copyText = document.getElementById('copyCodeText');
        copyText.textContent = 'Copied!';
        setTimeout(() => copyText.textContent = 'Copy', 2000);
        showToast('C source code copied to clipboard!', 'info');
      }).catch(() => {
        showToast('Failed to copy code to clipboard.', 'error');
      });
    });

    // Help Modal Triggers
    const btnHelp = document.getElementById('btnHelp');
    const btnCloseHelp = document.getElementById('btnCloseHelp');
    const btnCloseHelpBtn = document.getElementById('btnCloseHelpBtn');

    btnHelp?.addEventListener('click', () => elHelpModal.removeAttribute('hidden'));
    btnCloseHelp?.addEventListener('click', () => elHelpModal.setAttribute('hidden', ''));
    btnCloseHelpBtn?.addEventListener('click', () => elHelpModal.setAttribute('hidden', ''));
    elHelpModal?.addEventListener('click', (e) => {
      if (e.target === elHelpModal) elHelpModal.setAttribute('hidden', '');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==========================================================================
  // Fallback In-Memory C Engine Simulator (for file:// protocol preview)
  // ==========================================================================
  function createFallbackCModule() {
    let simHead = null;
    let simType = 0;
    let baseAddr = 0x812000;

    function SimNode(val) {
      this.data = val;
      this.prev = null;
      this.next = null;
      this.addr = '0x' + (baseAddr += 16).toString(16);
    }

    return {
      _malloc: (sz) => 1,
      _free: (ptr) => {},
      allocateUTF8: (str) => str,
      UTF8ToString: (ptr) => typeof ptr === 'string' ? ptr : String(ptr),
      getValue: (ptr, type) => 0,
      _set_list_type: (type) => {
        simType = type;
        if (!simHead) return 0;
        if (type === 0) {
          let curr = simHead;
          while (curr) { curr.prev = null; curr = curr.next; }
        } else if (type === 1) {
          let prev = null, curr = simHead;
          while (curr) { curr.prev = prev; prev = curr; curr = curr.next; }
        } else if (type === 2) {
          let curr = simHead;
          while (curr.next) { curr.prev = null; curr = curr.next; }
          curr.next = simHead;
        }
        return 0;
      },
      _get_list_type: () => simType,
      _get_node_count: () => {
        if (!simHead) return 0;
        let count = 0, curr = simHead;
        if (simType === 2) {
          do { count++; curr = curr.next; } while (curr && curr !== simHead);
        } else {
          while (curr) { count++; curr = curr.next; }
        }
        return count;
      },
      _is_empty: () => simHead ? 0 : 1,
      _get_first_node: (outPtr) => {
        if (!simHead) return -1;
        if (outPtr) outPtr.val = simHead.data;
        return 0;
      },
      _get_last_node: (outPtr) => {
        if (!simHead) return -1;
        let curr = simHead;
        if (simType === 2) {
          while (curr.next && curr.next !== simHead) curr = curr.next;
        } else {
          while (curr.next) curr = curr.next;
        }
        if (outPtr) outPtr.val = curr.data;
        return 0;
      },
      _insert_beginning: (val) => {
        const n = new SimNode(val);
        if (!simHead) {
          if (simType === 2) n.next = n;
          simHead = n;
          return 0;
        }
        if (simType === 1) {
          n.next = simHead; simHead.prev = n; simHead = n;
        } else if (simType === 2) {
          let tail = simHead;
          while (tail.next !== simHead) tail = tail.next;
          n.next = simHead; tail.next = n; simHead = n;
        } else {
          n.next = simHead; simHead = n;
        }
        return 0;
      },
      _insert_end: (val) => {
        if (!simHead) return Module._insert_beginning(val);
        const n = new SimNode(val);
        if (simType === 1) {
          let curr = simHead;
          while (curr.next) curr = curr.next;
          curr.next = n; n.prev = curr;
        } else if (simType === 2) {
          let curr = simHead;
          while (curr.next !== simHead) curr = curr.next;
          curr.next = n; n.next = simHead;
        } else {
          let curr = simHead;
          while (curr.next) curr = curr.next;
          curr.next = n;
        }
        return 0;
      },
      _insert_at_position: (val, pos) => {
        if (pos === 1) return Module._insert_beginning(val);
        let curr = simHead;
        for (let i = 1; i < pos - 1 && curr; i++) curr = curr.next;
        if (!curr) return -2;
        const n = new SimNode(val);
        n.next = curr.next;
        if (simType === 1) { n.prev = curr; if (curr.next) curr.next.prev = n; }
        curr.next = n;
        return 0;
      },
      _insert_after_value: (target, val) => {
        let curr = simHead;
        while (curr && curr.data !== target) curr = curr.next;
        if (!curr) return -3;
        const n = new SimNode(val);
        n.next = curr.next;
        if (simType === 1) { n.prev = curr; if (curr.next) curr.next.prev = n; }
        curr.next = n;
        return 0;
      },
      _delete_beginning: (outPtr) => {
        if (!simHead) return -1;
        if (outPtr) outPtr.val = simHead.data;
        if (simType === 2) {
          if (simHead.next === simHead) simHead = null;
          else {
            let tail = simHead;
            while (tail.next !== simHead) tail = tail.next;
            simHead = simHead.next; tail.next = simHead;
          }
        } else if (simType === 1) {
          simHead = simHead.next;
          if (simHead) simHead.prev = null;
        } else {
          simHead = simHead.next;
        }
        return 0;
      },
      _delete_end: (outPtr) => {
        if (!simHead) return -1;
        if (!simHead.next || (simType === 2 && simHead.next === simHead)) return Module._delete_beginning(outPtr);
        if (simType === 2) {
          let curr = simHead;
          while (curr.next.next !== simHead) curr = curr.next;
          if (outPtr) outPtr.val = curr.next.data;
          curr.next = simHead;
        } else if (simType === 1) {
          let curr = simHead;
          while (curr.next) curr = curr.next;
          if (outPtr) outPtr.val = curr.data;
          curr.prev.next = null;
        } else {
          let curr = simHead;
          while (curr.next.next) curr = curr.next;
          if (outPtr) outPtr.val = curr.next.data;
          curr.next = null;
        }
        return 0;
      },
      _delete_at_position: (pos, outPtr) => {
        if (pos === 1) return Module._delete_beginning(outPtr);
        let curr = simHead;
        for (let i = 1; i < pos - 1 && curr; i++) curr = curr.next;
        if (!curr || !curr.next) return -2;
        const target = curr.next;
        if (outPtr) outPtr.val = target.data;
        curr.next = target.next;
        if (simType === 1 && target.next) target.next.prev = curr;
        return 0;
      },
      _delete_by_value: (target, outPtr) => {
        if (!simHead) return -1;
        if (simHead.data === target) return Module._delete_beginning(outPtr);
        let curr = simHead, pos = 1;
        while (curr.next && curr.next.data !== target) { curr = curr.next; pos++; }
        if (!curr.next) return -3;
        if (outPtr) outPtr.val = pos + 1;
        curr.next = curr.next.next;
        if (simType === 1 && curr.next) curr.next.prev = curr;
        return 0;
      },
      _update_at_position: (pos, val) => {
        let curr = simHead;
        for (let i = 1; i < pos && curr; i++) curr = curr.next;
        if (!curr) return -2;
        curr.data = val;
        return 0;
      },
      _update_value: (oldVal, newVal) => {
        let curr = simHead, pos = 1;
        while (curr) {
          if (curr.data === oldVal) { curr.data = newVal; return pos; }
          curr = curr.next; pos++;
        }
        return -3;
      },
      _search_value: (target) => {
        let curr = simHead, pos = 1;
        while (curr) {
          if (curr.data === target) return pos;
          curr = curr.next; pos++;
          if (simType === 2 && curr === simHead) break;
        }
        return -3;
      },
      _reverse_list: () => {
        if (!simHead) return 0;
        let prev = null, curr = simHead;
        if (simType === 2) {
          do {
            let next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
          } while (curr !== simHead);
          simHead.next = prev; simHead = prev;
        } else if (simType === 1) {
          let temp = null;
          while (curr) {
            temp = curr.prev; curr.prev = curr.next; curr.next = temp; curr = curr.prev;
          }
          if (temp) simHead = temp.prev;
        } else {
          while (curr) {
            let next = curr.next; curr.next = prev; prev = curr; curr = next;
          }
          simHead = prev;
        }
        return 0;
      },
      _clear_list: () => { simHead = null; },
      _reset_list: () => { simHead = null; },
      _init_list: (str) => {
        simHead = null;
        if (!str) return 0;
        const nums = String(str).split(/[\s,;|]+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        nums.forEach(n => Module._insert_end(n));
        return nums.length;
      },
      _get_serialized_list: () => {
        const count = Module._get_node_count();
        const typeName = simType === 1 ? 'doubly' : simType === 2 ? 'circular' : 'singly';
        const nodes = [];
        let curr = simHead, pos = 1;
        if (curr) {
          do {
            const nextAddr = curr.next ? (simType === 2 && curr.next === simHead ? `${simHead.addr} (HEAD)` : curr.next.addr) : 'NULL';
            const prevAddr = curr.prev ? curr.prev.addr : 'NULL';
            nodes.push({ value: curr.data, pos, addr: curr.addr, nextAddr, prevAddr });
            curr = curr.next; pos++;
          } while (curr && (simType !== 2 || curr !== simHead));
        }
        return JSON.stringify({ listType: simType, typeName, count, nodes });
      }
    };
  }

  // ==========================================================================
  // Initialization & WebAssembly Module Loading
  // ==========================================================================
  async function initApplication() {
    setupUIEventListeners();
    renderCCodeSnippet('struct_node');

    // Robust file locator that works with GitHub Pages subpaths and localhost
    const locateWasm = function (path, scriptDirectory) {
      if (path.endsWith('.wasm')) {
        const clean = path.includes('/') ? path.split('/').pop() : path;
        try {
          return new URL('wasm/' + clean, window.location.href).href;
        } catch (_) {
          return (scriptDirectory || 'wasm/') + clean;
        }
      }
      return (scriptDirectory || '') + path;
    };

    // If loaded via file:// protocol directly
    if (window.location.protocol === 'file:') {
      console.warn('file:// protocol detected. Using Authoritative C Simulator for local file preview.');
      Module = createFallbackCModule();
      isWasmLoaded = true;
      isSimulationMode = true;

      elWasmStatus.className = 'status-indicator';
      elWasmStatus.querySelector('.status-text').textContent = 'Local Preview (file://)';

      handleInitList('10, 20, 30, 40');
      showToast('Visualizer ready in Local Preview Mode.', 'info');
      return;
    }

    try {
      if (typeof createLinkedListModule !== 'function') {
        throw new Error('createLinkedListModule factory function not found. Verify wasm/linked_list.js is loaded.');
      }

      elWasmStatus.className = 'status-indicator loading';
      elWasmStatus.querySelector('.status-text').textContent = 'Initializing WASM...';

      Module = await createLinkedListModule({
        locateFile: locateWasm,
        print: (text) => console.log('[WASM stdout]', text),
        printErr: (text) => console.error('[WASM stderr]', text)
      });

      if (!Module || typeof Module._init_list !== 'function' || typeof Module._get_serialized_list !== 'function') {
        throw new Error('WebAssembly module initialized, but required C exports are missing.');
      }

      isWasmLoaded = true;
      isSimulationMode = false;

      elWasmStatus.className = 'status-indicator';
      elWasmStatus.querySelector('.status-text').textContent = 'WASM Ready (Native C)';

      handleInitList('10, 20, 30, 40');
      showToast('WebAssembly module connected to native C engine successfully!', 'success');

    } catch (err) {
      console.warn('WASM compilation initialization failed, falling back to C Simulator:', err);
      Module = createFallbackCModule();
      isWasmLoaded = true;
      isSimulationMode = true;

      elWasmStatus.className = 'status-indicator';
      elWasmStatus.querySelector('.status-text').textContent = 'Preview Mode';

      handleInitList('10, 20, 30, 40');
      showToast('Running in resilient fallback mode.', 'warning');
    }
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApplication);
  } else {
    initApplication();
  }

})();
