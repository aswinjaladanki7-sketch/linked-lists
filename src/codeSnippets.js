/**
 * C Code Snippet Repository for Live Visualization Code Panel
 * Singly Linked List (SLL) Implementation
 */

export const CODE_SNIPPETS = {
  singly: {
    insertHead: [
      { line: 1, text: "SNode *newNode = (SNode*)malloc(sizeof(SNode));" },
      { line: 2, text: "if (!newNode) return false;" },
      { line: 3, text: "newNode->data = val;" },
      { line: 4, text: "newNode->next = head;" },
      { line: 5, text: "head = newNode;" },
      { line: 6, text: "return true;" }
    ],
    insertTail: [
      { line: 1, text: "SNode *newNode = (SNode*)malloc(sizeof(SNode));" },
      { line: 2, text: "newNode->data = val; newNode->next = NULL;" },
      { line: 3, text: "if (!head) { head = newNode; return true; }" },
      { line: 4, text: "SNode *curr = head;" },
      { line: 5, text: "while (curr->next != NULL) curr = curr->next;" },
      { line: 6, text: "curr->next = newNode;" },
      { line: 7, text: "return true;" }
    ],
    insertPos: [
      { line: 1, text: "if (pos == 1) return sll_insert_head(val);" },
      { line: 2, text: "SNode *curr = head; int i = 1;" },
      { line: 3, text: "while (curr && i < pos - 1) { curr = curr->next; i++; }" },
      { line: 4, text: "if (!curr) return false;" },
      { line: 5, text: "SNode *newNode = (SNode*)malloc(sizeof(SNode));" },
      { line: 6, text: "newNode->data = val; newNode->next = curr->next;" },
      { line: 7, text: "curr->next = newNode;" },
      { line: 8, text: "return true;" }
    ],
    deleteHead: [
      { line: 1, text: "if (!head) return false;" },
      { line: 2, text: "SNode *temp = head;" },
      { line: 3, text: "head = head->next;" },
      { line: 4, text: "free(temp);" },
      { line: 5, text: "return true;" }
    ],
    deleteTail: [
      { line: 1, text: "if (!head) return false;" },
      { line: 2, text: "if (!head->next) { free(head); head = NULL; return true; }" },
      { line: 3, text: "SNode *curr = head;" },
      { line: 4, text: "while (curr->next->next != NULL) curr = curr->next;" },
      { line: 5, text: "free(curr->next); curr->next = NULL;" },
      { line: 6, text: "return true;" }
    ],
    deleteVal: [
      { line: 1, text: "if (!head) return false;" },
      { line: 2, text: "if (head->data == target) return sll_delete_head();" },
      { line: 3, text: "SNode *curr = head;" },
      { line: 4, text: "while (curr->next && curr->next->data != target) curr = curr->next;" },
      { line: 5, text: "if (!curr->next) return false;" },
      { line: 6, text: "SNode *toDel = curr->next; curr->next = toDel->next;" },
      { line: 7, text: "free(toDel); return true;" }
    ],
    search: [
      { line: 1, text: "SNode *curr = head; int idx = 0;" },
      { line: 2, text: "while (curr != NULL) {" },
      { line: 3, text: "    if (curr->data == val) return idx; // Match found!" },
      { line: 4, text: "    curr = curr->next; idx++;" },
      { line: 5, text: "}" },
      { line: 6, text: "return -1; // Not found" }
    ],
    reverse: [
      { line: 1, text: "SNode *prev = NULL, *curr = head, *nxt = NULL;" },
      { line: 2, text: "while (curr != NULL) {" },
      { line: 3, text: "    nxt = curr->next; // Store next node" },
      { line: 4, text: "    curr->next = prev; // Reverse pointer" },
      { line: 5, text: "    prev = curr; curr = nxt; // Advance pointers" },
      { line: 6, text: "}" },
      { line: 7, text: "head = prev;" }
    ],
    sort: [
      { line: 1, text: "/* Bubble Sort with Value Swap */" },
      { line: 2, text: "for (SNode *i = head; i != NULL; i = i->next) {" },
      { line: 3, text: "    for (SNode *j = i->next; j != NULL; j = j->next) {" },
      { line: 4, text: "        if (i->data > j->data) {" },
      { line: 5, text: "            int temp = i->data; i->data = j->data; j->data = temp;" },
      { line: 6, text: "        }" },
      { line: 7, text: "    }" },
      { line: 8, text: "}" }
    ],
    cycle: [
      { line: 1, text: "/* Floyd's Cycle-Finding Algorithm (Tortoise & Hare) */" },
      { line: 2, text: "SNode *slow = head, *fast = head;" },
      { line: 3, text: "while (fast && fast->next) {" },
      { line: 4, text: "    slow = slow->next; fast = fast->next->next;" },
      { line: 5, text: "    if (slow == fast) return true; // Cycle detected!" },
      { line: 6, text: "}" },
      { line: 7, text: "return false; // No cycle" }
    ]
  }
};

export function getCodeSnippet(_listTypeIndex, opKey) {
  return CODE_SNIPPETS.singly[opKey] || CODE_SNIPPETS.singly.insertHead;
}
