#ifndef LINKED_LIST_H
#define LINKED_LIST_H

#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define WASM_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define WASM_EXPORT
#endif

#define MAX_STEPS 300
#define MAX_NODES 100
#define MAX_STR_LEN 256
#define MAX_JSON_BUF 262144 // 256 KB JSON buffer

/* Supported List Types */
typedef enum {
    LIST_TYPE_SINGLY = 0
} ListType;

/* Singly Linked List Node Struct */
typedef struct SNode {
    int data;
    unsigned int address; // Simulated memory address (e.g. 0x2040)
    struct SNode *next;
} SNode;

/* Step snapshot representation for visualization */
typedef struct {
    int step_number;
    char title[64];
    char description[MAX_STR_LEN];
    int c_line;
    char time_complexity[32];
    char action_type[32]; // ALLOC, POINTER, TRAVERSE, HIGHLIGHT, FREE, COMPLETE, ERROR
    char active_pointers[MAX_STR_LEN]; // e.g. "head=0x1010, curr=0x1028"
    int list_type;
    int node_count;
    int node_values[MAX_NODES];
    unsigned int node_addresses[MAX_NODES];
    unsigned int next_addresses[MAX_NODES];
    unsigned int prev_addresses[MAX_NODES];
    int highlight_index; // -1 if none
    char highlight_role[32]; // HEAD, TAIL, CURR, TARGET, NEW, DELETED, SWAP
    int temp_node_val;
    unsigned int temp_node_addr;
    bool has_cycle;
} StepSnapshot;

/* Memory Tracker */
typedef struct {
    int total_allocations;
    int total_deallocations;
    int active_nodes;
    size_t total_bytes_allocated;
    unsigned int next_simulated_addr;
} MemoryStats;

extern MemoryStats g_mem_stats;

/* Memory functions */
void mem_init(void);
unsigned int mem_alloc_addr(void);
void mem_track_alloc(size_t size);
void mem_track_free(size_t size);
MemoryStats mem_get_stats(void);

/* Step recorder functions */
void step_recorder_reset(void);
void step_record(
    const char *title,
    const char *description,
    int c_line,
    const char *complexity,
    const char *action_type,
    const char *active_pointers,
    int highlight_index,
    const char *highlight_role,
    int temp_node_val,
    unsigned int temp_node_addr
);
const char* step_recorder_get_json(void);
int step_recorder_get_count(void);

/* Singly Linked List Declarations */
void sll_init(void);
void sll_clear_silent(void);
int sll_size(void);
bool sll_insert_head(int val);
bool sll_insert_tail(int val);
bool sll_insert_at_position(int val, int pos);
bool sll_insert_before_value(int target, int val);
bool sll_insert_after_value(int target, int val);
bool sll_delete_head(void);
bool sll_delete_tail(void);
bool sll_delete_at_position(int pos);
bool sll_delete_by_value(int target);
bool sll_clear(void);
int sll_search(int val);
bool sll_update_value(int old_val, int new_val);
void sll_traverse(void);
void sll_reverse(void);
void sll_sort(void);
void sll_detect_cycle(void);
void sll_snapshot_nodes(StepSnapshot *snap);

/* Active List Type Context */
extern ListType g_current_list_type;
void set_active_list_type(ListType type);
ListType get_active_list_type(void);

#endif /* LINKED_LIST_H */
