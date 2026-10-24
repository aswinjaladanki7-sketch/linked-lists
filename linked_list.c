/**
 * ============================================================================
 * Linked List Implementation in C (Singly, Doubly, Circular)
 * Designed for College Data Structures & Algorithms (DSA) Course
 * Compatible with WebAssembly (Emscripten) and Native C (GCC / Clang)
 * ============================================================================
 * 
 * Comprehensive DSA Coverage:
 *  - Singly Linked List
 *  - Doubly Linked List (prev <-> next)
 *  - Circular Linked List (tail -> head loop)
 *  - Dynamic memory allocation via malloc() and release via free()
 *  - Insertion: Beginning, End, Specified 1-based Position, After Value
 *  - Deletion: Beginning, End, Specified 1-based Position, By Value (first match)
 *  - Updating: By 1-based Position, By Value
 *  - Traversal, Search (1-based index), Count, Peek First/Last
 *  - In-place reversal of pointers
 *  - Full list destruction and safe resets with zero memory leaks
 *  - JSON serialization for WebAssembly to JavaScript bridging
 *  - Native test harness when compiled without Emscripten or with TEST_MAIN
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>
#include <ctype.h>
#include <stdint.h>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

/* Status / Error Codes */
#define STATUS_SUCCESS          0
#define ERR_EMPTY_LIST         -1
#define ERR_INVALID_POSITION   -2
#define ERR_VALUE_NOT_FOUND    -3
#define ERR_MALLOC_FAILED      -4
#define ERR_INVALID_INPUT      -5
#define ERR_BUFFER_OVERFLOW    -6

/* Linked List Type Constants */
#define LIST_TYPE_SINGLY       0
#define LIST_TYPE_DOUBLY       1
#define LIST_TYPE_CIRCULAR     2

/* Node Structure supporting Singly, Doubly, and Circular lists */
struct Node {
    int data;
    struct Node *prev;
    struct Node *next;
};

/* Global authoritative state */
static struct Node *head = NULL;
static int current_list_type = LIST_TYPE_SINGLY;

/* Buffer for JSON serialization returned to JavaScript */
#define SERIALIZE_BUF_SIZE 65536
static char serialization_buffer[SERIALIZE_BUF_SIZE];

/* Helper: Create a new node */
static struct Node* create_node(int value) {
    struct Node *newNode = (struct Node*)malloc(sizeof(struct Node));
    if (newNode == NULL) {
        return NULL;
    }
    newNode->data = value;
    newNode->prev = NULL;
    newNode->next = NULL;
    return newNode;
}

/* ============================================================================
 * 0. LIST TYPE MANAGEMENT
 * ============================================================================
 */

/**
 * Gets the current active linked list type (0: Singly, 1: Doubly, 2: Circular).
 */
EMSCRIPTEN_KEEPALIVE
int get_list_type(void) {
    return current_list_type;
}

/**
 * Sets the linked list type and adapts existing nodes:
 * 0: LIST_TYPE_SINGLY
 * 1: LIST_TYPE_DOUBLY
 * 2: LIST_TYPE_CIRCULAR
 */
EMSCRIPTEN_KEEPALIVE
int set_list_type(int type) {
    if (type < 0 || type > 2) {
        return ERR_INVALID_INPUT;
    }
    if (current_list_type == type) {
        return STATUS_SUCCESS;
    }

    /* If list is empty, just update mode */
    if (head == NULL) {
        current_list_type = type;
        return STATUS_SUCCESS;
    }

    /* If currently circular, break the cycle first to work on a linear chain */
    if (current_list_type == LIST_TYPE_CIRCULAR) {
        struct Node *curr = head;
        while (curr->next != NULL && curr->next != head) {
            curr = curr->next;
        }
        curr->next = NULL;
    }

    current_list_type = type;

    if (current_list_type == LIST_TYPE_SINGLY) {
        /* Disconnect all prev pointers and ensure last node next is NULL */
        struct Node *curr = head;
        while (curr != NULL) {
            curr->prev = NULL;
            curr = curr->next;
        }
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        /* Rebuild prev pointers across linear chain */
        struct Node *prev_node = NULL;
        struct Node *curr = head;
        while (curr != NULL) {
            curr->prev = prev_node;
            prev_node = curr;
            curr = curr->next;
        }
    } else if (current_list_type == LIST_TYPE_CIRCULAR) {
        /* Clear prev pointers and link tail->next to head */
        struct Node *curr = head;
        while (curr->next != NULL) {
            curr->prev = NULL;
            curr = curr->next;
        }
        curr->prev = NULL;
        curr->next = head; /* Close circle */
    }

    return STATUS_SUCCESS;
}

/* ============================================================================
 * 1. QUERY & TRAVERSAL OPERATIONS
 * ============================================================================
 */

/**
 * Returns the total number of nodes currently in the linked list.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int get_node_count(void) {
    if (head == NULL) {
        return 0;
    }
    int count = 0;
    struct Node *current = head;
    if (current_list_type == LIST_TYPE_CIRCULAR) {
        do {
            count++;
            current = current->next;
        } while (current != NULL && current != head);
    } else {
        while (current != NULL) {
            count++;
            current = current->next;
        }
    }
    return count;
}

/**
 * Checks if the list is empty.
 * Returns 1 if empty, 0 otherwise.
 */
EMSCRIPTEN_KEEPALIVE
int is_empty(void) {
    return (head == NULL) ? 1 : 0;
}

/**
 * Retrieves the value of the first node (HEAD).
 * Time Complexity: O(1)
 */
EMSCRIPTEN_KEEPALIVE
int get_first_node(int *out_val) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }
    if (out_val != NULL) {
        *out_val = head->data;
    }
    return STATUS_SUCCESS;
}

/**
 * Retrieves the value of the last node (TAIL).
 * Time Complexity: O(n) or O(1) with tail
 */
EMSCRIPTEN_KEEPALIVE
int get_last_node(int *out_val) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }
    struct Node *current = head;
    if (current_list_type == LIST_TYPE_CIRCULAR) {
        while (current->next != NULL && current->next != head) {
            current = current->next;
        }
    } else {
        while (current->next != NULL) {
            current = current->next;
        }
    }
    if (out_val != NULL) {
        *out_val = current->data;
    }
    return STATUS_SUCCESS;
}

/**
 * Searches for target_value in the linked list.
 * Returns 1-based position if found, or ERR_VALUE_NOT_FOUND (-3).
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int search_value(int target_value) {
    if (head == NULL) {
        return ERR_VALUE_NOT_FOUND;
    }
    int position = 1;
    struct Node *current = head;
    if (current_list_type == LIST_TYPE_CIRCULAR) {
        do {
            if (current->data == target_value) {
                return position;
            }
            position++;
            current = current->next;
        } while (current != NULL && current != head);
    } else {
        while (current != NULL) {
            if (current->data == target_value) {
                return position;
            }
            position++;
            current = current->next;
        }
    }
    return ERR_VALUE_NOT_FOUND;
}

/* ============================================================================
 * 2. INSERTION OPERATIONS
 * ============================================================================
 */

/**
 * Inserts a new node at the beginning of the list.
 * Time Complexity: O(1) for Singly/Doubly, O(n) for Circular (tail pointer update)
 */
EMSCRIPTEN_KEEPALIVE
int insert_beginning(int value) {
    struct Node *newNode = create_node(value);
    if (newNode == NULL) {
        return ERR_MALLOC_FAILED;
    }

    if (head == NULL) {
        if (current_list_type == LIST_TYPE_CIRCULAR) {
            newNode->next = newNode;
        }
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
        /* Find tail node to update its next pointer to new head */
        struct Node *tail = head;
        while (tail->next != head) {
            tail = tail->next;
        }
        newNode->next = head;
        tail->next = newNode;
        head = newNode;
    }

    return STATUS_SUCCESS;
}

/**
 * Inserts a new node at the end of the list.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int insert_end(int value) {
    if (head == NULL) {
        return insert_beginning(value);
    }

    struct Node *newNode = create_node(value);
    if (newNode == NULL) {
        return ERR_MALLOC_FAILED;
    }

    if (current_list_type == LIST_TYPE_SINGLY) {
        struct Node *current = head;
        while (current->next != NULL) {
            current = current->next;
        }
        current->next = newNode;
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        struct Node *current = head;
        while (current->next != NULL) {
            current = current->next;
        }
        current->next = newNode;
        newNode->prev = current;
    } else if (current_list_type == LIST_TYPE_CIRCULAR) {
        struct Node *current = head;
        while (current->next != head) {
            current = current->next;
        }
        current->next = newNode;
        newNode->next = head;
    }

    return STATUS_SUCCESS;
}

/**
 * Inserts a new node at a specified 1-based position.
 * Position 1 inserts at beginning.
 * Position count+1 inserts at end.
 * Any position < 1 or > count+1 is invalid.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int insert_at_position(int value, int position) {
    if (position < 1) {
        return ERR_INVALID_POSITION;
    }

    if (position == 1) {
        return insert_beginning(value);
    }

    int count = get_node_count();
    if (position > count + 1) {
        return ERR_INVALID_POSITION;
    }
    if (position == count + 1) {
        return insert_end(value);
    }

    /* Traverse to (position - 1)-th node */
    struct Node *current = head;
    int current_pos = 1;
    while (current != NULL && current_pos < position - 1) {
        current = current->next;
        current_pos++;
    }

    if (current == NULL) {
        return ERR_INVALID_POSITION;
    }

    struct Node *newNode = create_node(value);
    if (newNode == NULL) {
        return ERR_MALLOC_FAILED;
    }

    if (current_list_type == LIST_TYPE_SINGLY || current_list_type == LIST_TYPE_CIRCULAR) {
        newNode->next = current->next;
        current->next = newNode;
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        newNode->next = current->next;
        newNode->prev = current;
        if (current->next != NULL) {
            current->next->prev = newNode;
        }
        current->next = newNode;
    }

    return STATUS_SUCCESS;
}

/**
 * Inserts a new node immediately after the first node matching target_value.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int insert_after_value(int target_value, int value) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }

    struct Node *current = head;
    int found = 0;

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        do {
            if (current->data == target_value) {
                found = 1;
                break;
            }
            current = current->next;
        } while (current != head);
    } else {
        while (current != NULL) {
            if (current->data == target_value) {
                found = 1;
                break;
            }
            current = current->next;
        }
    }

    if (!found) {
        return ERR_VALUE_NOT_FOUND;
    }

    struct Node *newNode = create_node(value);
    if (newNode == NULL) {
        return ERR_MALLOC_FAILED;
    }

    if (current_list_type == LIST_TYPE_SINGLY || current_list_type == LIST_TYPE_CIRCULAR) {
        newNode->next = current->next;
        current->next = newNode;
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        newNode->next = current->next;
        newNode->prev = current;
        if (current->next != NULL) {
            current->next->prev = newNode;
        }
        current->next = newNode;
    }

    return STATUS_SUCCESS;
}

/* ============================================================================
 * 3. DELETION OPERATIONS
 * ============================================================================
 */

/**
 * Deletes the first node (HEAD).
 * Stores deleted value into out_deleted_val if pointer is non-null.
 * Time Complexity: O(1) for Singly/Doubly, O(n) for Circular
 */
EMSCRIPTEN_KEEPALIVE
int delete_beginning(int *out_deleted_val) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }

    struct Node *temp = head;
    if (out_deleted_val != NULL) {
        *out_deleted_val = temp->data;
    }

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        if (head->next == head) {
            head = NULL;
        } else {
            struct Node *tail = head;
            while (tail->next != head) {
                tail = tail->next;
            }
            head = head->next;
            tail->next = head;
        }
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        head = head->next;
        if (head != NULL) {
            head->prev = NULL;
        }
    } else {
        head = head->next;
    }

    free(temp);
    return STATUS_SUCCESS;
}

/**
 * Deletes the last node (TAIL).
 * Stores deleted value into out_deleted_val if pointer is non-null.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int delete_end(int *out_deleted_val) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }

    /* Single node case */
    if ((current_list_type == LIST_TYPE_CIRCULAR && head->next == head) ||
        (current_list_type != LIST_TYPE_CIRCULAR && head->next == NULL)) {
        return delete_beginning(out_deleted_val);
    }

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        struct Node *current = head;
        while (current->next->next != head) {
            current = current->next;
        }
        struct Node *temp = current->next;
        if (out_deleted_val != NULL) {
            *out_deleted_val = temp->data;
        }
        current->next = head;
        free(temp);
    } else if (current_list_type == LIST_TYPE_DOUBLY) {
        struct Node *current = head;
        while (current->next != NULL) {
            current = current->next;
        }
        if (out_deleted_val != NULL) {
            *out_deleted_val = current->data;
        }
        current->prev->next = NULL;
        free(current);
    } else {
        struct Node *current = head;
        while (current->next->next != NULL) {
            current = current->next;
        }
        struct Node *temp = current->next;
        if (out_deleted_val != NULL) {
            *out_deleted_val = temp->data;
        }
        current->next = NULL;
        free(temp);
    }

    return STATUS_SUCCESS;
}

/**
 * Deletes the node at a specified 1-based position.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int delete_at_position(int position, int *out_deleted_val) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }
    if (position < 1) {
        return ERR_INVALID_POSITION;
    }

    int count = get_node_count();
    if (position > count) {
        return ERR_INVALID_POSITION;
    }

    if (position == 1) {
        return delete_beginning(out_deleted_val);
    }
    if (position == count) {
        return delete_end(out_deleted_val);
    }

    struct Node *current = head;
    int current_pos = 1;
    while (current_pos < position - 1) {
        current = current->next;
        current_pos++;
    }

    struct Node *temp = current->next;
    if (out_deleted_val != NULL) {
        *out_deleted_val = temp->data;
    }

    if (current_list_type == LIST_TYPE_DOUBLY) {
        current->next = temp->next;
        if (temp->next != NULL) {
            temp->next->prev = current;
        }
    } else {
        current->next = temp->next;
    }

    free(temp);
    return STATUS_SUCCESS;
}

/**
 * Deletes the FIRST node matching target_value.
 * Returns STATUS_SUCCESS (and position deleted via out_position) or ERR_VALUE_NOT_FOUND.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int delete_by_value(int target_value, int *out_position) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }

    /* Head node matches */
    if (head->data == target_value) {
        if (out_position != NULL) {
            *out_position = 1;
        }
        return delete_beginning(NULL);
    }

    struct Node *prev = head;
    struct Node *current = head->next;
    int position = 2;
    int found = 0;

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        while (current != head) {
            if (current->data == target_value) {
                found = 1;
                break;
            }
            prev = current;
            current = current->next;
            position++;
        }
    } else {
        while (current != NULL) {
            if (current->data == target_value) {
                found = 1;
                break;
            }
            prev = current;
            current = current->next;
            position++;
        }
    }

    if (!found) {
        return ERR_VALUE_NOT_FOUND;
    }

    if (out_position != NULL) {
        *out_position = position;
    }

    if (current_list_type == LIST_TYPE_DOUBLY) {
        prev->next = current->next;
        if (current->next != NULL) {
            current->next->prev = prev;
        }
    } else {
        prev->next = current->next;
    }

    free(current);
    return STATUS_SUCCESS;
}

/* ============================================================================
 * 4. UPDATE OPERATIONS
 * ============================================================================
 */

/**
 * Updates the value of the node at a specified 1-based position.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int update_at_position(int position, int new_value) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }
    if (position < 1) {
        return ERR_INVALID_POSITION;
    }

    int count = get_node_count();
    if (position > count) {
        return ERR_INVALID_POSITION;
    }

    struct Node *current = head;
    int current_pos = 1;
    while (current_pos < position) {
        current = current->next;
        current_pos++;
    }

    current->data = new_value;
    return STATUS_SUCCESS;
}

/**
 * Updates the FIRST node matching old_value to new_value.
 * Returns 1-based position of updated node, or ERR_VALUE_NOT_FOUND.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
int update_value(int old_value, int new_value) {
    if (head == NULL) {
        return ERR_EMPTY_LIST;
    }

    struct Node *current = head;
    int position = 1;

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        do {
            if (current->data == old_value) {
                current->data = new_value;
                return position;
            }
            position++;
            current = current->next;
        } while (current != head);
    } else {
        while (current != NULL) {
            if (current->data == old_value) {
                current->data = new_value;
                return position;
            }
            position++;
            current = current->next;
        }
    }

    return ERR_VALUE_NOT_FOUND;
}

/* ============================================================================
 * 5. LIST MANIPULATION & MEMORY CLEANUP
 * ============================================================================
 */

/**
 * Reverses the linked list in-place across all list types:
 *  - Singly: iteratively reverses next pointers.
 *  - Doubly: iteratively swaps prev and next pointers.
 *  - Circular: reverses internal loop and re-establishes circle to new head.
 * Time Complexity: O(n), Auxiliary Space: O(1)
 */
EMSCRIPTEN_KEEPALIVE
int reverse_list(void) {
    if (head == NULL) {
        return STATUS_SUCCESS;
    }

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        if (head->next == head) {
            return STATUS_SUCCESS;
        }

        struct Node *prev = NULL;
        struct Node *current = head;
        struct Node *next_node = NULL;

        do {
            next_node = current->next;
            current->next = prev;
            prev = current;
            current = next_node;
        } while (current != head);

        /* Connect old head (now new tail) back to the new head (prev) */
        head->next = prev;
        head = prev;
        return STATUS_SUCCESS;
    }

    if (current_list_type == LIST_TYPE_DOUBLY) {
        struct Node *temp = NULL;
        struct Node *current = head;

        while (current != NULL) {
            temp = current->prev;
            current->prev = current->next;
            current->next = temp;
            current = current->prev; /* Advance using updated prev pointer */
        }

        if (temp != NULL) {
            head = temp->prev;
        }
        return STATUS_SUCCESS;
    }

    /* Singly Linked List Reversal */
    struct Node *prev = NULL;
    struct Node *current = head;
    struct Node *next_node = NULL;

    while (current != NULL) {
        next_node = current->next;
        current->next = prev;
        prev = current;
        current = next_node;
    }
    head = prev;
    return STATUS_SUCCESS;
}

/**
 * Frees all allocated nodes in the linked list and sets head to NULL.
 * Guarantees zero memory leaks.
 * Time Complexity: O(n)
 */
EMSCRIPTEN_KEEPALIVE
void clear_list(void) {
    if (head == NULL) {
        return;
    }

    if (current_list_type == LIST_TYPE_CIRCULAR) {
        struct Node *current = head;
        struct Node *tail = head;
        while (tail->next != head) {
            tail = tail->next;
        }
        tail->next = NULL; /* Break circular reference to safely free linearly */
        while (current != NULL) {
            struct Node *temp = current;
            current = current->next;
            free(temp);
        }
        head = NULL;
        return;
    }

    struct Node *current = head;
    while (current != NULL) {
        struct Node *temp = current;
        current = current->next;
        free(temp);
    }
    head = NULL;
}

/**
 * Resets the list cleanly. Equivalent to clear_list().
 */
EMSCRIPTEN_KEEPALIVE
void reset_list(void) {
    clear_list();
}

/**
 * Initializes the linked list from a comma/space/semicolon-separated string of integers.
 * Existing list is cleared first.
 * Example input: "10, 20, 30, 40"
 * Returns the number of nodes successfully inserted, or negative error code.
 */
EMSCRIPTEN_KEEPALIVE
int init_list(const char *values_str) {
    clear_list();

    if (values_str == NULL) {
        return 0;
    }

    int count = 0;
    const char *p = values_str;

    while (*p != '\0') {
        while (*p != '\0' && (isspace((unsigned char)*p) || *p == ',' || *p == ';' || *p == '|')) {
            p++;
        }
        if (*p == '\0') {
            break;
        }

        char *endptr;
        long val = strtol(p, &endptr, 10);
        if (p == endptr) {
            p++;
            continue;
        }

        if (val > INT_MAX) val = INT_MAX;
        if (val < INT_MIN) val = INT_MIN;

        int status = insert_end((int)val);
        if (status != STATUS_SUCCESS) {
            return status;
        }
        count++;
        p = endptr;
    }

    return count;
}

/* ============================================================================
 * 6. SERIALIZATION FOR WEBASSEMBLY & JAVASCRIPT BRIDGING
 * ============================================================================
 */

/**
 * Serializes the current authoritative C linked list into a JSON string.
 * Supports Singly, Doubly (prevAddr, nextAddr), and Circular (loop back to HEAD).
 */
EMSCRIPTEN_KEEPALIVE
const char* get_serialized_list(void) {
    int count = get_node_count();
    const char *typeName = (current_list_type == LIST_TYPE_DOUBLY) ? "doubly" :
                           (current_list_type == LIST_TYPE_CIRCULAR) ? "circular" : "singly";

    int offset = snprintf(serialization_buffer, SERIALIZE_BUF_SIZE,
        "{\"listType\":%d,\"typeName\":\"%s\",\"count\":%d,\"nodes\":[",
        current_list_type, typeName, count);

    if (head != NULL && count > 0) {
        struct Node *current = head;
        int pos = 1;

        do {
            char addr_str[32];
            char next_addr_str[32];
            char prev_addr_str[32];

            snprintf(addr_str, sizeof(addr_str), "0x%lx", (unsigned long)(uintptr_t)current);

            if (current->next != NULL) {
                if (current_list_type == LIST_TYPE_CIRCULAR && current->next == head) {
                    snprintf(next_addr_str, sizeof(next_addr_str), "0x%lx (HEAD)", (unsigned long)(uintptr_t)head);
                } else {
                    snprintf(next_addr_str, sizeof(next_addr_str), "0x%lx", (unsigned long)(uintptr_t)current->next);
                }
            } else {
                snprintf(next_addr_str, sizeof(next_addr_str), "NULL");
            }

            if (current_list_type == LIST_TYPE_DOUBLY && current->prev != NULL) {
                snprintf(prev_addr_str, sizeof(prev_addr_str), "0x%lx", (unsigned long)(uintptr_t)current->prev);
            } else {
                snprintf(prev_addr_str, sizeof(prev_addr_str), "NULL");
            }

            int written = snprintf(serialization_buffer + offset, SERIALIZE_BUF_SIZE - offset,
                "%s{\"value\":%d,\"pos\":%d,\"addr\":\"%s\",\"nextAddr\":\"%s\",\"prevAddr\":\"%s\"}",
                (pos > 1 ? "," : ""),
                current->data,
                pos,
                addr_str,
                next_addr_str,
                prev_addr_str
            );

            if (written < 0 || written >= SERIALIZE_BUF_SIZE - offset) {
                break;
            }
            offset += written;
            pos++;
            current = current->next;
        } while (current != NULL && (current_list_type != LIST_TYPE_CIRCULAR ? 1 : current != head) && pos <= count);
    }

    snprintf(serialization_buffer + offset, SERIALIZE_BUF_SIZE - offset, "]}");
    return serialization_buffer;
}

/* ============================================================================
 * 7. NATIVE C TEST HARNESS (GCC TESTING & VERIFICATION)
 * ============================================================================
 */

#if !defined(__EMSCRIPTEN__) || defined(TEST_MAIN)
#include <assert.h>

static void print_native_list(void) {
    printf("[%s] HEAD -> ", (current_list_type == LIST_TYPE_DOUBLY) ? "DOUBLY" :
                            (current_list_type == LIST_TYPE_CIRCULAR) ? "CIRCULAR" : "SINGLY");
    struct Node *curr = head;
    if (curr == NULL) {
        printf("NULL\n");
        return;
    }
    if (current_list_type == LIST_TYPE_CIRCULAR) {
        do {
            printf("[%d] -> ", curr->data);
            curr = curr->next;
        } while (curr != head);
        printf("(HEAD %d)\n", head->data);
    } else {
        while (curr != NULL) {
            printf("[%d] -> ", curr->data);
            curr = curr->next;
        }
        printf("NULL\n");
    }
}

int main(void) {
    printf("=====================================================\n");
    printf("Starting Native C Linked List Test Suite\n");
    printf("=====================================================\n\n");

    /* Part 1: Singly Linked List Tests */
    printf("[Test 1] Singly Linked List: Insert, Delete, Search, Reverse...\n");
    set_list_type(LIST_TYPE_SINGLY);
    assert(get_list_type() == LIST_TYPE_SINGLY);
    init_list("10, 20, 30, 40");
    assert(get_node_count() == 4);
    assert(insert_beginning(5) == STATUS_SUCCESS);
    assert(insert_end(50) == STATUS_SUCCESS);
    assert(insert_at_position(25, 4) == STATUS_SUCCESS);
    assert(insert_after_value(30, 35) == STATUS_SUCCESS);
    assert(search_value(25) == 4);
    assert(get_node_count() == 8);

    /* Update tests */
    assert(update_at_position(4, 26) == STATUS_SUCCESS);
    assert(search_value(26) == 4);
    assert(update_value(35, 36) == 6);
    assert(search_value(36) == 6);

    int dummy = 0;
    assert(delete_beginning(&dummy) == STATUS_SUCCESS && dummy == 5);
    assert(delete_end(&dummy) == STATUS_SUCCESS && dummy == 50);
    assert(reverse_list() == STATUS_SUCCESS);
    print_native_list();
    printf(" -> Singly Tests Passed!\n\n");

    /* Part 2: Doubly Linked List Tests */
    printf("[Test 2] Doubly Linked List: Bi-directional pointers & Reversal...\n");
    set_list_type(LIST_TYPE_DOUBLY);
    assert(get_list_type() == LIST_TYPE_DOUBLY);
    init_list("100, 200, 300");
    assert(get_node_count() == 3);
    assert(head->prev == NULL);
    assert(head->next->prev == head);
    assert(head->next->next->prev == head->next);
    assert(insert_beginning(50) == STATUS_SUCCESS);
    assert(head->prev == NULL);
    assert(head->next->prev == head);
    assert(insert_end(400) == STATUS_SUCCESS);
    assert(update_at_position(3, 250) == STATUS_SUCCESS);
    assert(delete_beginning(&dummy) == STATUS_SUCCESS && dummy == 50);
    assert(delete_end(&dummy) == STATUS_SUCCESS && dummy == 400);
    assert(reverse_list() == STATUS_SUCCESS);
    assert(get_first_node(&dummy) == STATUS_SUCCESS && dummy == 300);
    assert(get_last_node(&dummy) == STATUS_SUCCESS && dummy == 100);
    print_native_list();
    printf(" -> Doubly Tests Passed!\n\n");

    /* Part 3: Circular Linked List Tests */
    printf("[Test 3] Circular Linked List: Tail-to-Head Loop & Operations...\n");
    set_list_type(LIST_TYPE_CIRCULAR);
    assert(get_list_type() == LIST_TYPE_CIRCULAR);
    init_list("1, 2, 3");
    assert(get_node_count() == 3);
    assert(head->next->next->next == head); /* Tail links to head */
    assert(insert_beginning(0) == STATUS_SUCCESS);
    assert(head->data == 0);
    assert(get_node_count() == 4);
    assert(insert_end(4) == STATUS_SUCCESS);
    assert(get_node_count() == 5);
    assert(search_value(4) == 5);
    assert(update_value(2, 22) == 3);
    assert(delete_beginning(&dummy) == STATUS_SUCCESS && dummy == 0);
    assert(delete_end(&dummy) == STATUS_SUCCESS && dummy == 4);
    assert(reverse_list() == STATUS_SUCCESS);
    print_native_list();
    printf(" -> Circular Tests Passed!\n\n");

    /* Part 4: Serialization */
    printf("[Test 4] JSON Serialization for WebAssembly across types...\n");
    const char *json_circ = get_serialized_list();
    assert(strstr(json_circ, "\"typeName\":\"circular\"") != NULL);
    assert(strstr(json_circ, "(HEAD)") != NULL);
    set_list_type(LIST_TYPE_DOUBLY);
    const char *json_doub = get_serialized_list();
    assert(strstr(json_doub, "\"typeName\":\"doubly\"") != NULL);
    assert(strstr(json_doub, "prevAddr") != NULL);
    set_list_type(LIST_TYPE_SINGLY);
    const char *json_sing = get_serialized_list();
    assert(strstr(json_sing, "\"typeName\":\"singly\"") != NULL);
    printf(" -> Serialization Passed!\n\n");

    clear_list();
    assert(get_node_count() == 0);

    printf("=====================================================\n");
    printf("ALL NATIVE C TESTS PASSED WITH ZERO ERRORS!\n");
    printf("=====================================================\n");
    return 0;
}
#endif
