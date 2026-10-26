# Singly Linked List Visualizer (C + WebAssembly)

An interactive, menu-driven **Singly Linked List Visualizer** built for college Data Structures and Algorithms (DSA) coursework. Powered by a native **C** data structure engine compiled to **WebAssembly (WASM)** with real-time memory telemetry and step-by-step visual animation.

---

## ⚡ Features

- **Individual Input System:** Add elements one at a time using the "Enter Value" input field. Immediate visualization update on each insertion without requiring batch input.
- **4 Core Operations Menu:** Clean, focused operation interface displaying only the controls needed for the active task:
  1. **Insertion:** 1-based indexing, supporting beginning (new `HEAD`), end, and interior positions.
  2. **Deletion:** Deletes first matching node by value with safety guards for empty lists.
  3. **Traversal:** Sequentially visits and highlights every node from `HEAD` to `NULL`.
  4. **Searching:** Linear search with zero-based index and 1-based position output.
- **Native C Implementation:** Core linked list logic, pointer manipulation, and memory management implemented in pure C (`c_src/singly_linked_list.c`).
- **WebAssembly Engine:** C source compiled via Emscripten to WebAssembly (`wasm/linked_list.wasm`) for high-performance in-browser execution.
- **Simulated Heap Telemetry:** Live tracking of dynamic allocations (`malloc`), deallocations (`free`), active heap nodes, and memory leak detection.
- **Interactive SVG Visuals:** Dark glassmorphic theme with glowing node cards, memory addresses, pointer tags, and SVG connectors.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [GCC / MinGW](https://www.mingw-w64.org/) (optional, for running native C tests)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

### 3. Build for Production
```bash
npm run build
```

---

## 🧪 Testing the Native C Implementation

A standalone C CLI test runner is included to test and verify the linked list implementation independently of the browser:

```bash
# Compile and run with GCC (MinGW on Windows)
gcc -Wall -Wextra -O2 c_src/memory_manager.c c_src/step_recorder.c c_src/singly_linked_list.c c_src/test_cli.c -o test_runner.exe
./test_runner.exe
```

The test runner validates the 9-step DSA sequence:
1. Insert 10
2. Insert 20
3. Insert 30
4. Traverse list
5. Search for 20
6. Update 20 to 25
7. Delete 10
8. Display final list (`25 -> 30 -> NULL`)
9. Clear all nodes (verifies 0 active heap leaks)

---

## 📂 Project Structure

```text
├── c_src/
│   ├── linked_list.h         # Common DSA structs and function prototypes
│   ├── singly_linked_list.c  # Core C implementation of Singly Linked List
│   ├── memory_manager.c      # Tracked heap allocation (malloc/free telemetry)
│   ├── step_recorder.c       # Visual animation snapshot recording
│   ├── wasm_api.c            # Emscripten exported C-to-JS bridge functions
│   └── test_cli.c            # Native C test suite
├── wasm/
│   ├── linked_list.wasm      # Compiled WebAssembly binary
│   └── linked_list.js        # Emscripten JS loader glue code
├── src/
│   ├── app.js                # Frontend controller & operation menu logic
│   ├── renderer.js           # SVG arrow rendering & DOM node cards
│   ├── wasmLoader.js         # WebAssembly instantiation & bridge
│   └── style.css             # Glassmorphism dark mode stylesheet
├── index.html                # Main application UI layout
├── vite.config.js            # Vite bundler configuration
└── package.json              # Project scripts and configuration
```

---

## 📜 License

MIT License. Designed for academic and college DSA demonstrations.
