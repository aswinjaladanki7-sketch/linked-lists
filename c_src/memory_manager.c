#include "linked_list.h"

MemoryStats g_mem_stats = {0, 0, 0, 0, 0x1000};

void mem_init(void) {
    g_mem_stats.total_allocations = 0;
    g_mem_stats.total_deallocations = 0;
    g_mem_stats.active_nodes = 0;
    g_mem_stats.total_bytes_allocated = 0;
    g_mem_stats.next_simulated_addr = 0x1010;
}

unsigned int mem_alloc_addr(void) {
    unsigned int addr = g_mem_stats.next_simulated_addr;
    g_mem_stats.next_simulated_addr += 0x18; // 24 bytes step for realistic memory spacing
    return addr;
}

void mem_track_alloc(size_t size) {
    g_mem_stats.total_allocations++;
    g_mem_stats.active_nodes++;
    g_mem_stats.total_bytes_allocated += size;
}

void mem_track_free(size_t size) {
    g_mem_stats.total_deallocations++;
    if (g_mem_stats.active_nodes > 0) {
        g_mem_stats.active_nodes--;
    }
    if (g_mem_stats.total_bytes_allocated >= size) {
        g_mem_stats.total_bytes_allocated -= size;
    }
}

MemoryStats mem_get_stats(void) {
    return g_mem_stats;
}
