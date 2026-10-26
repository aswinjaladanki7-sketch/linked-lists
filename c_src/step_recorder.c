#include "linked_list.h"

ListType g_current_list_type = LIST_TYPE_SINGLY;
static StepSnapshot g_steps[MAX_STEPS];
static int g_step_count = 0;
static char g_json_buffer[MAX_JSON_BUF];

void set_active_list_type(ListType type) {
    g_current_list_type = type;
}

ListType get_active_list_type(void) {
    return g_current_list_type;
}

void step_recorder_reset(void) {
    g_step_count = 0;
}

int step_recorder_get_count(void) {
    return g_step_count;
}

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
) {
    if (g_step_count >= MAX_STEPS) return;

    StepSnapshot *snap = &g_steps[g_step_count];
    snap->step_number = g_step_count + 1;
    
    strncpy(snap->title, title ? title : "", sizeof(snap->title) - 1);
    snap->title[sizeof(snap->title) - 1] = '\0';
    
    strncpy(snap->description, description ? description : "", sizeof(snap->description) - 1);
    snap->description[sizeof(snap->description) - 1] = '\0';
    
    snap->c_line = c_line;
    
    strncpy(snap->time_complexity, complexity ? complexity : "O(1)", sizeof(snap->time_complexity) - 1);
    snap->time_complexity[sizeof(snap->time_complexity) - 1] = '\0';
    
    strncpy(snap->action_type, action_type ? action_type : "INFO", sizeof(snap->action_type) - 1);
    snap->action_type[sizeof(snap->action_type) - 1] = '\0';
    
    strncpy(snap->active_pointers, active_pointers ? active_pointers : "", sizeof(snap->active_pointers) - 1);
    snap->active_pointers[sizeof(snap->active_pointers) - 1] = '\0';
    
    snap->list_type = (int)g_current_list_type;
    snap->highlight_index = highlight_index;
    
    strncpy(snap->highlight_role, highlight_role ? highlight_role : "", sizeof(snap->highlight_role) - 1);
    snap->highlight_role[sizeof(snap->highlight_role) - 1] = '\0';
    
    snap->temp_node_val = temp_node_val;
    snap->temp_node_addr = temp_node_addr;
    snap->has_cycle = false;
    snap->node_count = 0;

    /* Snapshot current Singly Linked List nodes */
    sll_snapshot_nodes(snap);

    g_step_count++;
}

/* Helper to escape strings for JSON */
static void json_escape(const char *src, char *dst, size_t max_len) {
    size_t j = 0;
    for (size_t i = 0; src[i] != '\0' && j < max_len - 2; i++) {
        if (src[i] == '"' || src[i] == '\\') {
            dst[j++] = '\\';
        }
        dst[j++] = src[i];
    }
    dst[j] = '\0';
}

const char* step_recorder_get_json(void) {
    size_t offset = 0;
    char esc_title[128];
    char esc_desc[512];
    char esc_ptr[512];
    MemoryStats mem = mem_get_stats();

    offset += snprintf(g_json_buffer + offset, MAX_JSON_BUF - offset,
        "{\"list_type\":%d,\"step_count\":%d,\"memory\":{\"allocs\":%d,\"frees\":%d,\"active\":%d,\"bytes\":%lu},\"steps\":[",
        (int)g_current_list_type, g_step_count, mem.total_allocations, mem.total_deallocations, mem.active_nodes, (unsigned long)mem.total_bytes_allocated);

    for (int i = 0; i < g_step_count; i++) {
        StepSnapshot *s = &g_steps[i];
        json_escape(s->title, esc_title, sizeof(esc_title));
        json_escape(s->description, esc_desc, sizeof(esc_desc));
        json_escape(s->active_pointers, esc_ptr, sizeof(esc_ptr));

        offset += snprintf(g_json_buffer + offset, MAX_JSON_BUF - offset,
            "%s{\"step\":%d,\"title\":\"%s\",\"desc\":\"%s\",\"line\":%d,\"complexity\":\"%s\",\"action\":\"%s\",\"pointers\":\"%s\",\"highlight_idx\":%d,\"highlight_role\":\"%s\",\"temp_val\":%d,\"temp_addr\":%u,\"has_cycle\":%s,\"nodes\":[",
            (i > 0 ? "," : ""),
            s->step_number,
            esc_title,
            esc_desc,
            s->c_line,
            s->time_complexity,
            s->action_type,
            esc_ptr,
            s->highlight_index,
            s->highlight_role,
            s->temp_node_val,
            s->temp_node_addr,
            s->has_cycle ? "true" : "false"
        );

        for (int n = 0; n < s->node_count; n++) {
            offset += snprintf(g_json_buffer + offset, MAX_JSON_BUF - offset,
                "%s{\"idx\":%d,\"val\":%d,\"addr\":%u,\"next\":%u,\"prev\":%u}",
                (n > 0 ? "," : ""),
                n,
                s->node_values[n],
                s->node_addresses[n],
                s->next_addresses[n],
                s->prev_addresses[n]
            );
        }

        offset += snprintf(g_json_buffer + offset, MAX_JSON_BUF - offset, "]}");
        if (offset >= MAX_JSON_BUF - 512) {
            break; // prevent buffer overflow
        }
    }

    snprintf(g_json_buffer + offset, MAX_JSON_BUF - offset, "]}");
    return g_json_buffer;
}
