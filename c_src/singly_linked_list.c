#include "linked_list.h"

static SNode *g_sll_head = NULL;

void sll_init(void) {
    sll_clear_silent();
    g_sll_head = NULL;
}

void sll_clear_silent(void) {
    SNode *curr = g_sll_head;
    while (curr != NULL) {
        SNode *nxt = curr->next;
        mem_track_free(sizeof(SNode));
        free(curr);
        curr = nxt;
    }
    g_sll_head = NULL;
}

int sll_size(void) {
    int count = 0;
    SNode *curr = g_sll_head;
    while (curr != NULL) {
        count++;
        curr = curr->next;
    }
    return count;
}

void sll_snapshot_nodes(StepSnapshot *snap) {
    SNode *curr = g_sll_head;
    int idx = 0;
    while (curr != NULL && idx < MAX_NODES) {
        snap->node_values[idx] = curr->data;
        snap->node_addresses[idx] = curr->address;
        snap->next_addresses[idx] = (curr->next != NULL) ? curr->next->address : 0;
        snap->prev_addresses[idx] = 0; // Not applicable for singly
        idx++;
        curr = curr->next;
    }
    snap->node_count = idx;
}

static SNode* create_snode(int val) {
    SNode *newNode = (SNode*)malloc(sizeof(SNode));
    if (!newNode) return NULL;
    newNode->data = val;
    newNode->address = mem_alloc_addr();
    newNode->next = NULL;
    mem_track_alloc(sizeof(SNode));
    return newNode;
}

bool sll_insert_head(int val) {
    step_recorder_reset();
    char ptr_buf[128];
    snprintf(ptr_buf, sizeof(ptr_buf), "head=0x%X", g_sll_head ? g_sll_head->address : 0);
    
    step_record(
        "Start Insert at Head",
        "Beginning insertion of new node with value at the front of the singly linked list.",
        1, "O(1)", "INIT", ptr_buf, -1, "", -1, 0
    );

    SNode *newNode = create_snode(val);
    if (!newNode) {
        step_record("Memory Error", "malloc() failed to allocate memory.", 2, "O(1)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    snprintf(ptr_buf, sizeof(ptr_buf), "head=0x%X, newNode=0x%X", g_sll_head ? g_sll_head->address : 0, newNode->address);
    step_record(
        "Allocate Node Memory",
        "Allocated sizeof(SNode) on heap using malloc(). Initialized data and next = NULL.",
        3, "O(1)", "ALLOC", ptr_buf, -1, "NEW", val, newNode->address
    );

    newNode->next = g_sll_head;
    snprintf(ptr_buf, sizeof(ptr_buf), "newNode->next=0x%X (current head)", g_sll_head ? g_sll_head->address : 0);
    step_record(
        "Point New Node to Head",
        "newNode->next = head; Linking the new node to point to the current head of the list.",
        4, "O(1)", "POINTER", ptr_buf, 0, "HEAD", val, newNode->address
    );

    g_sll_head = newNode;
    snprintf(ptr_buf, sizeof(ptr_buf), "head=0x%X", g_sll_head->address);
    step_record(
        "Update Head Pointer",
        "head = newNode; The head pointer now points to the newly inserted node.",
        5, "O(1)", "COMPLETE", ptr_buf, 0, "HEAD", -1, 0
    );

    return true;
}

bool sll_insert_tail(int val) {
    step_recorder_reset();
    char ptr_buf[128];
    snprintf(ptr_buf, sizeof(ptr_buf), "head=0x%X", g_sll_head ? g_sll_head->address : 0);

    step_record(
        "Start Insert at Tail",
        "Beginning insertion of node at the end (tail) of the singly linked list.",
        1, "O(n)", "INIT", ptr_buf, -1, "", -1, 0
    );

    SNode *newNode = create_snode(val);
    if (!newNode) return false;

    snprintf(ptr_buf, sizeof(ptr_buf), "head=0x%X, newNode=0x%X", g_sll_head ? g_sll_head->address : 0, newNode->address);
    step_record(
        "Allocate Node Memory",
        "Allocated sizeof(SNode) via malloc(). Assigned value and next pointer = NULL.",
        3, "O(1)", "ALLOC", ptr_buf, -1, "NEW", val, newNode->address
    );

    if (g_sll_head == NULL) {
        g_sll_head = newNode;
        step_record(
            "List Was Empty",
            "Since head was NULL, newNode becomes the first and only node (head = newNode).",
            6, "O(1)", "COMPLETE", "head=newNode", 0, "HEAD", -1, 0
        );
        return true;
    }

    SNode *temp = g_sll_head;
    int idx = 0;
    while (temp->next != NULL) {
        snprintf(ptr_buf, sizeof(ptr_buf), "temp=0x%X, val=%d", temp->address, temp->data);
        step_record(
            "Traversing Towards Tail",
            "temp = temp->next; Moving forward to locate the last node where next == NULL.",
            9, "O(n)", "TRAVERSE", ptr_buf, idx, "CURR", val, newNode->address
        );
        temp = temp->next;
        idx++;
    }

    snprintf(ptr_buf, sizeof(ptr_buf), "temp=0x%X (Tail Node)", temp->address);
    step_record(
        "Tail Node Found",
        "Reached the last node in the list. Its current next pointer is NULL.",
        11, "O(1)", "HIGHLIGHT", ptr_buf, idx, "TAIL", val, newNode->address
    );

    temp->next = newNode;
    snprintf(ptr_buf, sizeof(ptr_buf), "temp->next=0x%X", newNode->address);
    step_record(
        "Link Tail to New Node",
        "temp->next = newNode; The previous last node now points to the new node.",
        12, "O(1)", "POINTER", ptr_buf, idx + 1, "NEW", -1, 0
    );

    step_record(
        "Insertion Complete",
        "Successfully inserted node at tail. Total time complexity: O(n).",
        13, "O(n)", "COMPLETE", "head remains unchanged", idx + 1, "TAIL", -1, 0
    );

    return true;
}

bool sll_insert_at_position(int val, int pos) {
    step_recorder_reset();
    int size = sll_size();
    if (pos < 1 || pos > size + 1) {
        char err[128];
        snprintf(err, sizeof(err), "Invalid position %d. Valid range is 1 to %d.", pos, size + 1);
        step_record("Validation Error", err, 1, "O(1)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    if (pos == 1) {
        return sll_insert_head(val);
    }
    if (pos == size + 1) {
        return sll_insert_tail(val);
    }

    step_record(
        "Start Insert at Position",
        "Target position is in the interior of the list. We must traverse to position - 1.",
        1, "O(n)", "INIT", "", -1, "", -1, 0
    );

    SNode *newNode = create_snode(val);
    step_record(
        "Allocate Node Memory",
        "malloc(sizeof(SNode)) allocated on heap for insertion.",
        3, "O(1)", "ALLOC", "", -1, "NEW", val, newNode->address
    );

    SNode *temp = g_sll_head;
    for (int i = 1; i < pos - 1 && temp != NULL; i++) {
        char ptr_buf[128];
        snprintf(ptr_buf, sizeof(ptr_buf), "temp=0x%X (pos %d)", temp->address, i);
        step_record(
            "Traversing to Preceding Node",
            "temp = temp->next; Moving closer to index (pos - 1).",
            7, "O(n)", "TRAVERSE", ptr_buf, i - 1, "CURR", val, newNode->address
        );
        temp = temp->next;
    }

    char ptr_buf[128];
    snprintf(ptr_buf, sizeof(ptr_buf), "temp=0x%X, temp->next=0x%X", temp->address, temp->next ? temp->next->address : 0);
    step_record(
        "Preceding Node Reached",
        "Found node at pos - 1. We will insert the new node right after this node.",
        9, "O(1)", "HIGHLIGHT", ptr_buf, pos - 2, "CURR", val, newNode->address
    );

    newNode->next = temp->next;
    step_record(
        "Attach newNode->next",
        "newNode->next = temp->next; Preserving the link to the remainder of the list.",
        10, "O(1)", "POINTER", "newNode->next = temp->next", pos - 2, "CURR", val, newNode->address
    );

    temp->next = newNode;
    step_record(
        "Attach temp->next to newNode",
        "temp->next = newNode; Splicing the new node into the list chain.",
        11, "O(1)", "POINTER", "temp->next = newNode", pos - 1, "NEW", -1, 0
    );

    step_record(
        "Position Insertion Completed",
        "Successfully inserted new node at the requested position.",
        12, "O(n)", "COMPLETE", "", pos - 1, "NEW", -1, 0
    );

    return true;
}

bool sll_insert_before_value(int target, int val) {
    step_recorder_reset();
    if (g_sll_head == NULL) {
        step_record("Empty List", "Cannot insert before value in an empty list.", 1, "O(1)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    if (g_sll_head->data == target) {
        return sll_insert_head(val);
    }

    step_record("Search Target Value", "Searching for node with target value to insert before it.", 1, "O(n)", "INIT", "", -1, "", -1, 0);

    SNode *temp = g_sll_head;
    int idx = 0;
    while (temp->next != NULL && temp->next->data != target) {
        step_record("Traversing", "Checking next node value...", 5, "O(n)", "TRAVERSE", "", idx, "CURR", -1, 0);
        temp = temp->next;
        idx++;
    }

    if (temp->next == NULL) {
        char err[128];
        snprintf(err, sizeof(err), "Target value %d was not found in the list.", target);
        step_record("Value Not Found", err, 8, "O(n)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    step_record("Found Target Node Predecessor", "Predecessor located. Allocating new node.", 9, "O(1)", "HIGHLIGHT", "", idx, "CURR", -1, 0);

    SNode *newNode = create_snode(val);
    newNode->next = temp->next;
    temp->next = newNode;

    step_record("Node Inserted Before Target", "Pointers updated successfully.", 12, "O(n)", "COMPLETE", "", idx + 1, "NEW", -1, 0);
    return true;
}

bool sll_insert_after_value(int target, int val) {
    step_recorder_reset();
    if (g_sll_head == NULL) {
        step_record("Empty List", "Cannot insert after value in an empty list.", 1, "O(1)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    step_record("Search Target Value", "Searching for node with target value to insert after it.", 1, "O(n)", "INIT", "", -1, "", -1, 0);

    SNode *temp = g_sll_head;
    int idx = 0;
    while (temp != NULL && temp->data != target) {
        step_record("Checking Node", "Comparing current node value with target.", 4, "O(n)", "TRAVERSE", "", idx, "CURR", -1, 0);
        temp = temp->next;
        idx++;
    }

    if (temp == NULL) {
        char err[128];
        snprintf(err, sizeof(err), "Target value %d not found in list.", target);
        step_record("Value Not Found", err, 7, "O(n)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    step_record("Target Node Found", "Allocating new node to insert immediately after this node.", 8, "O(1)", "HIGHLIGHT", "", idx, "TARGET", -1, 0);

    SNode *newNode = create_snode(val);
    newNode->next = temp->next;
    temp->next = newNode;

    step_record("Node Inserted After Target", "newNode->next = temp->next; temp->next = newNode;", 11, "O(n)", "COMPLETE", "", idx + 1, "NEW", -1, 0);
    return true;
}

bool sll_delete_head(void) {
    step_recorder_reset();
    if (g_sll_head == NULL) {
        step_record("Underflow Error", "List is already empty. Cannot delete head.", 1, "O(1)", "ERROR", "head=NULL", -1, "", -1, 0);
        return false;
    }

    char ptr_buf[128];
    snprintf(ptr_buf, sizeof(ptr_buf), "head=0x%X (val=%d)", g_sll_head->address, g_sll_head->data);
    step_record(
        "Start Delete Head",
        "Deleting the first node in the list.",
        1, "O(1)", "INIT", ptr_buf, 0, "HEAD", -1, 0
    );

    SNode *temp = g_sll_head;
    step_record(
        "Save Pointer to Old Head",
        "SNode *temp = head; Storing head reference in temp so we can deallocate it later.",
        3, "O(1)", "HIGHLIGHT", ptr_buf, 0, "DELETED", -1, 0
    );

    g_sll_head = g_sll_head->next;
    snprintf(ptr_buf, sizeof(ptr_buf), "new head=0x%X", g_sll_head ? g_sll_head->address : 0);
    step_record(
        "Advance Head Pointer",
        "head = head->next; Moving head pointer to the second node.",
        4, "O(1)", "POINTER", ptr_buf, (g_sll_head != NULL ? 0 : -1), "HEAD", -1, 0
    );

    mem_track_free(sizeof(SNode));
    free(temp);

    step_record(
        "Free Allocated Memory",
        "free(temp); Deallocated memory of deleted node to prevent memory leaks.",
        5, "O(1)", "FREE", "", -1, "", -1, 0
    );

    step_record(
        "Head Deletion Complete",
        "Successfully deleted head node. Time complexity: O(1).",
        6, "O(1)", "COMPLETE", "", -1, "", -1, 0
    );

    return true;
}

bool sll_delete_tail(void) {
    step_recorder_reset();
    if (g_sll_head == NULL) {
        step_record("Underflow Error", "List is empty. Cannot delete tail.", 1, "O(1)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    if (g_sll_head->next == NULL) {
        return sll_delete_head();
    }

    step_record("Start Delete Tail", "Traversing to locate the node just before tail.", 1, "O(n)", "INIT", "", -1, "", -1, 0);

    SNode *temp = g_sll_head;
    int idx = 0;
    while (temp->next->next != NULL) {
        step_record("Traversing Towards Tail", "temp = temp->next;", 5, "O(n)", "TRAVERSE", "", idx, "CURR", -1, 0);
        temp = temp->next;
        idx++;
    }

    SNode *toDelete = temp->next;
    step_record(
        "Identify Tail Node",
        "Found tail node (toDelete = temp->next). Preceding node is at pos idx.",
        8, "O(1)", "HIGHLIGHT", "", idx + 1, "DELETED", -1, 0
    );

    temp->next = NULL;
    step_record(
        "Disconnect Tail Node",
        "temp->next = NULL; Preceding node now becomes the new tail.",
        9, "O(1)", "POINTER", "temp->next = NULL", idx, "TAIL", -1, 0
    );

    mem_track_free(sizeof(SNode));
    free(toDelete);

    step_record(
        "Free Tail Node Memory",
        "free(toDelete); Deallocated memory of deleted node.",
        10, "O(1)", "FREE", "", -1, "", -1, 0
    );

    step_record("Tail Deletion Complete", "Successfully removed tail node. Time complexity: O(n).", 11, "O(n)", "COMPLETE", "", idx, "TAIL", -1, 0);
    return true;
}

bool sll_delete_at_position(int pos) {
    step_recorder_reset();
    int size = sll_size();
    if (pos < 1 || pos > size) {
        char err[128];
        snprintf(err, sizeof(err), "Invalid position %d. Valid range is 1 to %d.", pos, size);
        step_record("Position Error", err, 1, "O(1)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    if (pos == 1) return sll_delete_head();
    if (pos == size) return sll_delete_tail();

    step_record("Start Delete at Position", "Traversing to node just before target position.", 1, "O(n)", "INIT", "", -1, "", -1, 0);

    SNode *temp = g_sll_head;
    for (int i = 1; i < pos - 1 && temp != NULL; i++) {
        step_record("Traversing", "temp = temp->next;", 4, "O(n)", "TRAVERSE", "", i - 1, "CURR", -1, 0);
        temp = temp->next;
    }

    SNode *toDelete = temp->next;
    step_record(
        "Target Node Located",
        "Identified node to delete at target position.",
        6, "O(1)", "HIGHLIGHT", "", pos - 1, "DELETED", -1, 0
    );

    temp->next = toDelete->next;
    step_record(
        "Bypass Target Node",
        "temp->next = toDelete->next; Splicing out the target node.",
        7, "O(1)", "POINTER", "temp->next = toDelete->next", pos - 2, "CURR", -1, 0
    );

    mem_track_free(sizeof(SNode));
    free(toDelete);

    step_record(
        "Free Memory",
        "free(toDelete); Deallocated node memory.",
        8, "O(1)", "FREE", "", -1, "", -1, 0
    );

    step_record("Deletion Complete", "Node successfully removed.", 9, "O(n)", "COMPLETE", "", -1, "", -1, 0);
    return true;
}

bool sll_delete_by_value(int target) {
    step_recorder_reset();
    if (g_sll_head == NULL) {
        step_record("Empty List", "Cannot delete from an empty list.", 1, "O(1)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    if (g_sll_head->data == target) {
        return sll_delete_head();
    }

    step_record("Search Value to Delete", "Searching for node with matching value.", 1, "O(n)", "INIT", "", -1, "", -1, 0);

    SNode *temp = g_sll_head;
    int idx = 0;
    while (temp->next != NULL && temp->next->data != target) {
        step_record("Checking Value", "Comparing node value with target...", 4, "O(n)", "TRAVERSE", "", idx, "CURR", -1, 0);
        temp = temp->next;
        idx++;
    }

    if (temp->next == NULL) {
        char err[128];
        snprintf(err, sizeof(err), "Value %d not found in the list.", target);
        step_record("Value Not Found", err, 7, "O(n)", "ERROR", "", -1, "", -1, 0);
        return false;
    }

    SNode *toDelete = temp->next;
    step_record("Found Match", "Node matched target value. Preparing deletion.", 8, "O(1)", "HIGHLIGHT", "", idx + 1, "DELETED", -1, 0);

    temp->next = toDelete->next;
    mem_track_free(sizeof(SNode));
    free(toDelete);

    step_record("Deleted Node", "Node bypassed and freed from memory.", 10, "O(n)", "COMPLETE", "", idx, "CURR", -1, 0);
    return true;
}

bool sll_clear(void) {
    step_recorder_reset();
    step_record("Start Clear List", "Iterating through all nodes to free memory.", 1, "O(n)", "INIT", "", -1, "", -1, 0);

    SNode *curr = g_sll_head;
    int count = 0;
    while (curr != NULL) {
        SNode *nxt = curr->next;
        char msg[128];
        snprintf(msg, sizeof(msg), "free(node with val=%d at 0x%X);", curr->data, curr->address);
        step_record("Deallocating Node", msg, 4, "O(1)", "FREE", "", 0, "DELETED", -1, 0);
        mem_track_free(sizeof(SNode));
        free(curr);
        curr = nxt;
        g_sll_head = curr;
        count++;
    }

    g_sll_head = NULL;
    char comp[128];
    snprintf(comp, sizeof(comp), "All %d nodes freed. List is now empty (head = NULL).", count);
    step_record("Clear Completed", comp, 8, "O(n)", "COMPLETE", "head=NULL", -1, "", -1, 0);
    return true;
}

int sll_search(int val) {
    step_recorder_reset();
    step_record("Start Search", "Beginning linear search from head pointer.", 1, "O(n)", "INIT", "", -1, "", -1, 0);

    SNode *curr = g_sll_head;
    int idx = 0;
    while (curr != NULL) {
        char desc[128];
        snprintf(desc, sizeof(desc), "Checking node at index %d: data = %d (target = %d)", idx, curr->data, val);
        if (curr->data == val) {
            step_record("Target Found!", desc, 5, "O(n)", "HIGHLIGHT", "Found match", idx, "TARGET", -1, 0);
            step_record("Search Successful", "Element found at position index.", 6, "O(n)", "COMPLETE", "", idx, "TARGET", -1, 0);
            return idx;
        } else {
            step_record("Comparing Node", desc, 4, "O(n)", "TRAVERSE", "No match, advancing", idx, "CURR", -1, 0);
        }
        curr = curr->next;
        idx++;
    }

    step_record("Search Finished", "Value not found in linked list.", 9, "O(n)", "ERROR", "Reached NULL", -1, "", -1, 0);
    return -1;
}

bool sll_update_value(int old_val, int new_val) {
    step_recorder_reset();
    step_record("Start Update Value", "Searching for node with target value to update.", 1, "O(n)", "INIT", "", -1, "", -1, 0);

    SNode *curr = g_sll_head;
    int idx = 0;
    while (curr != NULL) {
        if (curr->data == old_val) {
            char desc[128];
            snprintf(desc, sizeof(desc), "Updating node at index %d from %d to %d.", idx, old_val, new_val);
            step_record("Target Located", desc, 4, "O(1)", "HIGHLIGHT", "", idx, "TARGET", -1, 0);
            curr->data = new_val;
            step_record("Value Updated", "curr->data = new_val; Update successful.", 5, "O(n)", "COMPLETE", "", idx, "CURR", -1, 0);
            return true;
        }
        curr = curr->next;
        idx++;
    }

    step_record("Update Failed", "Old value was not found in the list.", 8, "O(n)", "ERROR", "", -1, "", -1, 0);
    return false;
}

void sll_traverse(void) {
    step_recorder_reset();
    if (g_sll_head == NULL) {
        step_record("Empty List", "List has 0 nodes. Nothing to traverse.", 1, "O(1)", "INFO", "head=NULL", -1, "", -1, 0);
        return;
    }

    step_record("Start Traversal", "Starting traversal from head node.", 1, "O(n)", "INIT", "curr=head", 0, "HEAD", -1, 0);

    SNode *curr = g_sll_head;
    int idx = 0;
    while (curr != NULL) {
        char desc[128];
        snprintf(desc, sizeof(desc), "Visiting node %d: data = %d, next = 0x%X", idx, curr->data, curr->next ? curr->next->address : 0);
        step_record("Visiting Node", desc, 4, "O(n)", "TRAVERSE", "curr=curr->next", idx, "CURR", -1, 0);
        curr = curr->next;
        idx++;
    }

    step_record("Traversal Complete", "Reached end of list (curr == NULL). Visited all nodes.", 7, "O(n)", "COMPLETE", "curr=NULL", -1, "", -1, 0);
}

void sll_reverse(void) {
    step_recorder_reset();
    if (g_sll_head == NULL || g_sll_head->next == NULL) {
        step_record("Reverse Trivial", "List has 0 or 1 node. Reversal is instantaneous.", 1, "O(1)", "COMPLETE", "", -1, "", -1, 0);
        return;
    }

    step_record(
        "Start In-Place Reversal",
        "Initializing 3 pointers: prev = NULL, curr = head, next = NULL.",
        1, "O(n)", "INIT", "prev=NULL, curr=head, next=NULL", 0, "CURR", -1, 0
    );

    SNode *prev = NULL;
    SNode *curr = g_sll_head;
    SNode *next = NULL;
    int step_idx = 0;

    while (curr != NULL) {
        next = curr->next; // Save next node
        char ptr_info[128];
        snprintf(ptr_info, sizeof(ptr_info), "prev=0x%X, curr=0x%X, next=0x%X", prev ? prev->address : 0, curr->address, next ? next->address : 0);
        step_record("Save Next Pointer", "next = curr->next; Store reference to next node before overwriting pointer.", 5, "O(1)", "POINTER", ptr_info, step_idx, "CURR", -1, 0);

        curr->next = prev; // Reverse pointer
        step_record("Reverse Arrow Direction", "curr->next = prev; Arrow now points backward to previous node.", 6, "O(1)", "POINTER", ptr_info, step_idx, "CURR", -1, 0);

        prev = curr;
        curr = next;
        step_idx++;

        snprintf(ptr_info, sizeof(ptr_info), "prev=0x%X, curr=0x%X", prev->address, curr ? curr->address : 0);
        step_record("Advance Pointers", "prev = curr; curr = next; Ready for next node.", 7, "O(1)", "TRAVERSE", ptr_info, step_idx < sll_size() ? step_idx : -1, "CURR", -1, 0);
    }

    g_sll_head = prev;
    step_record(
        "Update Head Pointer",
        "head = prev; Head now points to the new front (former tail). Reversal complete!",
        10, "O(n)", "COMPLETE", "head=prev", 0, "HEAD", -1, 0
    );
}

void sll_sort(void) {
    step_recorder_reset();
    int size = sll_size();
    if (size <= 1) {
        step_record("Sort Trivial", "List has 0 or 1 node. Already sorted.", 1, "O(1)", "COMPLETE", "", -1, "", -1, 0);
        return;
    }

    step_record("Start Bubble Sort", "Comparing adjacent node values and swapping if out of order.", 1, "O(n^2)", "INIT", "", -1, "", -1, 0);

    for (int i = 0; i < size - 1; i++) {
        SNode *curr = g_sll_head;
        for (int j = 0; j < size - i - 1; j++) {
            char desc[128];
            snprintf(desc, sizeof(desc), "Comparing node[%d]=%d with node[%d]=%d", j, curr->data, j + 1, curr->next->data);
            step_record("Compare Adjacent Pair", desc, 5, "O(1)", "TRAVERSE", "", j, "CURR", -1, 0);

            if (curr->data > curr->next->data) {
                int temp = curr->data;
                curr->data = curr->next->data;
                curr->next->data = temp;
                char swap_desc[128];
                snprintf(swap_desc, sizeof(swap_desc), "Swapped values: %d and %d are now in ascending order.", curr->data, curr->next->data);
                step_record("Swap Values", swap_desc, 8, "O(1)", "HIGHLIGHT", "", j + 1, "SWAP", -1, 0);
            }
            curr = curr->next;
        }
    }

    step_record("Sort Completed", "List is now sorted in ascending order. Time complexity: O(n^2).", 12, "O(n^2)", "COMPLETE", "", -1, "", -1, 0);
}

void sll_detect_cycle(void) {
    step_recorder_reset();
    step_record(
        "Start Cycle Detection",
        "Executing Floyd's Cycle Detection Algorithm (Tortoise & Hare). slow advances 1 step, fast advances 2 steps.",
        1, "O(n)", "INIT", "slow=head, fast=head", 0, "HEAD", -1, 0
    );

    SNode *slow = g_sll_head;
    SNode *fast = g_sll_head;
    int step = 1;

    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
        char ptr_info[128];
        snprintf(ptr_info, sizeof(ptr_info), "slow=0x%X, fast=0x%X (step %d)", slow->address, fast ? fast->address : 0, step++);
        step_record("Advancing Pointers", "slow moves 1 step, fast moves 2 steps.", 5, "O(n)", "TRAVERSE", ptr_info, -1, "", -1, 0);

        if (slow == fast) {
            step_record("Cycle Detected!", "slow pointer met fast pointer! A cycle is present in the list.", 8, "O(n)", "HIGHLIGHT", "slow == fast", -1, "", -1, 0);
            return;
        }
    }

    step_record(
        "No Cycle Detected",
        "fast reached NULL pointer. List is linear and terminates without cycles.",
        11, "O(n)", "COMPLETE", "fast == NULL", -1, "", -1, 0
    );
}
