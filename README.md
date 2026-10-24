# Linked List Interactive Visualizer (C + WebAssembly)

[![WebAssembly](https://img.shields.io/badge/WebAssembly-WASM-654FF0?logo=webassembly&logoColor=white)](https://webassembly.org/)
[![C](https://img.shields.io/badge/C-C11-00599C?logo=c&logoColor=white)](https://en.wikipedia.org/wiki/C_(programming_language))
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-222222?logo=github)](https://pages.github.com/)

An interactive, educational web application designed for a college **Data Structures and Algorithms (DSA)** course.

This visualizer uses an **authoritative native C implementation** compiled to **WebAssembly (WASM)** via Emscripten. The browser executes actual C algorithms and manual heap memory management routines (`malloc`, `free`, pointer adjustments), with **zero duplicated linked list logic in JavaScript**.

---

## 🌟 Key Features

### 1. Comprehensive Data Structure Support
* **Singly Linked List**: Linear forward chain where each node holds data and a `next` pointer, terminating at `NULL`.
* **Doubly Linked List**: Bi-directional chain with both `prev` and `next` pointers, enabling two-way traversal and $O(1)$ deletion with a known node pointer.
* **Circular Linked List**: Continuous ring buffer where the final node's `next` pointer links directly back to the `HEAD` node.

### 2. Complete Operation Coverage
* **Initialization**: Construct lists dynamically from any comma-separated, semicolon-separated, or space-separated integer sequence (e.g., `10, 20, 30, 40`). Quick presets include Default, Medium, Signed Integers, and Duplicates.
* **Insertions**:
  * At Beginning (`insert_beginning` - $O(1)$ / $O(n)$ for Circular)
  * At End (`insert_end` - $O(n)$)
  * At Specified 1-based Position (`insert_at_position` - $O(n)$)
  * Immediately After a Target Value (`insert_after_value` - $O(n)$)
* **Deletions**:
  * From Beginning (`delete_beginning` - $O(1)$ / $O(n)$ for Circular)
  * From End (`delete_end` - $O(n)$)
  * At Specified 1-based Position (`delete_at_position` - $O(n)$)
  * By Value (`delete_by_value` - $O(n)$), removing the first occurrence and preserving subsequent duplicates
* **In-Place Updates**:
  * Update at Position (`update_at_position` - $O(n)$)
  * Update by Value (`update_value` - $O(n)$)
* **Queries & Traversals**:
  * Linear search (`search_value` - $O(n)$) with stepped node-by-node animation
  * Full list traversal (`traverse_list` - $O(n)$) with sequential pointer inspection
  * Node count query (`get_node_count` - $O(n)$)
  * Peek HEAD and TAIL values and memory addresses
* **List Manipulation & Memory Cleanup**:
  * Iterative in-place pointer reversal (`reverse_list` - $O(n)$) using 3 pointers (`prev`, `current`, `next`) with $O(1)$ auxiliary space
  * Full memory cleanup and reset (`clear_list` - $O(n)$), invoking `free()` on every node to guarantee zero memory leaks

### 3. Visual & Educational Representation
* **Real C Memory Addresses**: Displays actual 32-bit WebAssembly heap pointers (e.g. `0x00812018`).
* **Dual-Cell & Tri-Cell Layouts**: Dual-cell `[ DATA | NEXT ]` for Singly/Circular lists and tri-cell `[ PREV | DATA | NEXT ]` for Doubly lists.
* **Dynamic Indicators**: Visual `HEAD` badges, bi-directional arrows, `NULL` termini, and animated circular loop return indicators.
* **Synchronized Educational Panels**:
  * **Pointer Walkthrough**: Plain-language breakdown of pointer manipulation and dynamic memory allocation.
  * **Live C Source Code Viewer**: Exact C function definitions from `linked_list.c` displayed alongside time/space complexities.
  * **Execution History Table**: Real-time log tracking timestamps, C function return codes, parameters, and results.

---

## 📊 Time & Space Complexity Reference

| Operation | Singly Linked List | Doubly Linked List | Circular Linked List | Auxiliary Space |
| :--- | :---: | :---: | :---: | :---: |
| **Insert Beginning** | $O(1)$ | $O(1)$ | $O(n)$ *(or $O(1)$ with tail)* | $O(1)$ |
| **Insert End** | $O(n)$ | $O(n)$ *(or $O(1)$ with tail)* | $O(n)$ | $O(1)$ |
| **Insert at Position** | $O(n)$ | $O(n)$ | $O(n)$ | $O(1)$ |
| **Delete Beginning** | $O(1)$ | $O(1)$ | $O(n)$ | $O(1)$ |
| **Delete End** | $O(n)$ | $O(1)$ *(with tail)* / $O(n)$ | $O(n)$ | $O(1)$ |
| **Delete by Value** | $O(n)$ | $O(n)$ | $O(n)$ | $O(1)$ |
| **Update Node** | $O(n)$ | $O(n)$ | $O(n)$ | $O(1)$ |
| **Search Value** | $O(n)$ | $O(n)$ | $O(n)$ | $O(1)$ |
| **Reverse List** | $O(n)$ | $O(n)$ | $O(n)$ | $O(1)$ |

---

## 📁 Project Structure

```text
single linked lists/
├── linked_list.c            # Authoritative Singly, Doubly & Circular Linked List in C
├── index.html               # Main visualizer interface & educational panels
├── style.css                # Modern dark theme & responsive layout
├── app.js                   # JavaScript driver bridging WebAssembly and DOM
├── wasm/
│   ├── linked_list.js       # Emscripten JavaScript glue loader
│   └── linked_list.wasm     # Compiled WebAssembly binary
├── .vscode/
│   └── tasks.json           # VS Code automated tasks (Server, WASM build, GCC test)
├── build_wasm.bat           # Recompiles C to WebAssembly using Emscripten
├── build_native.bat         # Compiles and runs native GCC unit tests
├── start_server.bat         # Launches local HTTP server and opens browser
├── .gitignore               # Excludes build executables and temp files
└── README.md                # Project documentation & run guide
```

---

## 🚀 How to Run Locally on Windows

Web browsers enforce security policies (CORS) that restrict loading WebAssembly binary files (`.wasm`) directly via the `file://` protocol. Therefore, the visualizer should be served via a local HTTP server (though an interactive preview fallback is also provided).

### Option A: One-Click Windows Batch Script (Fastest)
1. Double-click `start_server.bat` in the project folder.
2. It automatically starts Python's HTTP server on port 8000 and launches your default browser at `http://localhost:8000`.

### Option B: Terminal Command (Python)
Open PowerShell or Command Prompt in the project folder:
```powershell
python -m http.server 8000
```
Then open your browser at **[http://localhost:8000](http://localhost:8000)**.

### Option C: VS Code Live Server
1. Open this folder in **VS Code**.
2. Right-click `index.html` in the Explorer panel and click **"Open with Live Server"**.

---

## 🛠️ Compiling & Testing

### 1. Running Native C Unit Tests (GCC)
You can compile and run the native C test harness to verify memory safety and algorithmic correctness independently of the browser:
```powershell
.\build_native.bat
```
Or manually via GCC:
```powershell
gcc -Wall -Wextra linked_list.c -o test_linked_list.exe
.\test_linked_list.exe
```

### 2. Recompiling WebAssembly (Emscripten)
If you modify `linked_list.c`, recompile the WebAssembly artifacts using `build_wasm.bat`:
```powershell
.\build_wasm.bat
```
*(Requires Emscripten SDK `emcc` installed or located in your user profile).*

---

## 🌐 Deploying to GitHub Pages

This project is a static web application that runs directly in the browser and is fully compatible with **GitHub Pages**:

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit of Linked List Visualizer"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```
2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** (tab at the top).
   - In the left sidebar, click **Pages** (under the "Code and automation" section).
   - Under **Build and deployment** > **Branch**:
     - Select branch: `main`
     - Select folder: `/(root)`
   - Click **Save**.
3. **View your deployed website**:
   - GitHub Pages will build and deploy the site in 1–2 minutes.
   - Your live site URL will be:  
     `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`
   - GitHub Pages serves static files over HTTPS and natively serves `.wasm` files with the correct `application/wasm` MIME type.

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
