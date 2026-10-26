#include "linked_list.h"

static char g_mem_json_buf[256];

WASM_EXPORT
void wasm_set_list_type(int type) {
    (void)type;
    set_active_list_type(LIST_TYPE_SINGLY);
}

WASM_EXPORT
int wasm_get_list_type(void) {
    return (int)LIST_TYPE_SINGLY;
}

WASM_EXPORT
void wasm_init_list(int type) {
    (void)type;
    set_active_list_type(LIST_TYPE_SINGLY);
    sll_init();
}

WASM_EXPORT
int wasm_load_initial_values(int type, const char *csv_values) {
    (void)type;
    wasm_init_list(0);
    if (!csv_values || strlen(csv_values) == 0) {
        return 0;
    }

    char buf[512];
    strncpy(buf, csv_values, sizeof(buf) - 1);
    buf[sizeof(buf) - 1] = '\0';

    char *token = strtok(buf, ", \t\r\n");
    int count = 0;
    while (token != NULL && count < MAX_NODES) {
        char *endptr;
        long val = strtol(token, &endptr, 10);
        if (endptr != token) {
            sll_insert_tail((int)val);
            count++;
        }
        token = strtok(NULL, ", \t\r\n");
    }
    return count;
}

WASM_EXPORT
int wasm_insert_head(int val) {
    return sll_insert_head(val) ? 1 : 0;
}

WASM_EXPORT
int wasm_insert_tail(int val) {
    return sll_insert_tail(val) ? 1 : 0;
}

WASM_EXPORT
int wasm_insert_at_position(int val, int pos) {
    return sll_insert_at_position(val, pos) ? 1 : 0;
}

WASM_EXPORT
int wasm_insert_before_value(int target, int val) {
    return sll_insert_before_value(target, val) ? 1 : 0;
}

WASM_EXPORT
int wasm_insert_after_value(int target, int val) {
    return sll_insert_after_value(target, val) ? 1 : 0;
}

WASM_EXPORT
int wasm_delete_head(void) {
    return sll_delete_head() ? 1 : 0;
}

WASM_EXPORT
int wasm_delete_tail(void) {
    return sll_delete_tail() ? 1 : 0;
}

WASM_EXPORT
int wasm_delete_at_position(int pos) {
    return sll_delete_at_position(pos) ? 1 : 0;
}

WASM_EXPORT
int wasm_delete_by_value(int target) {
    return sll_delete_by_value(target) ? 1 : 0;
}

WASM_EXPORT
int wasm_clear_list(void) {
    return sll_clear() ? 1 : 0;
}

WASM_EXPORT
int wasm_search(int val) {
    return sll_search(val);
}

WASM_EXPORT
int wasm_update_value(int old_val, int new_val) {
    return sll_update_value(old_val, new_val) ? 1 : 0;
}

WASM_EXPORT
void wasm_traverse(void) {
    sll_traverse();
}

WASM_EXPORT
void wasm_traverse_reverse(void) {
    sll_traverse();
}

WASM_EXPORT
void wasm_reverse(void) {
    sll_reverse();
}

WASM_EXPORT
void wasm_sort(void) {
    sll_sort();
}

WASM_EXPORT
void wasm_detect_cycle(void) {
    sll_detect_cycle();
}

WASM_EXPORT
int wasm_get_size(void) {
    return sll_size();
}

WASM_EXPORT
const char* wasm_get_steps_json(void) {
    return step_recorder_get_json();
}

WASM_EXPORT
const char* wasm_get_memory_stats_json(void) {
    MemoryStats mem = mem_get_stats();
    snprintf(g_mem_json_buf, sizeof(g_mem_json_buf),
        "{\"allocs\":%d,\"frees\":%d,\"active\":%d,\"bytes\":%lu}",
        mem.total_allocations, mem.total_deallocations, mem.active_nodes, (unsigned long)mem.total_bytes_allocated);
    return g_mem_json_buf;
}
