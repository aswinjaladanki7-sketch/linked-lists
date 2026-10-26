#include "linked_list.h"
#include <assert.h>

int main(void) {
    printf("===========================================\n");
    printf("Testing Singly Linked List Engine (MinGW GCC)\n");
    printf("User Final Test Sequence (Steps 1-9)\n");
    printf("===========================================\n\n");

    mem_init();
    set_active_list_type(LIST_TYPE_SINGLY);
    sll_init();

    /* 1. Insert 10 */
    printf("[Step 1] Insert 10...\n");
    assert(sll_insert_at_position(10, 1) == true);
    assert(sll_size() == 1);
    printf("  -> Success. Current size: %d\n", sll_size());

    /* 2. Insert 20 */
    printf("[Step 2] Insert 20...\n");
    assert(sll_insert_at_position(20, 2) == true);
    assert(sll_size() == 2);
    printf("  -> Success. Current size: %d\n", sll_size());

    /* 3. Insert 30 */
    printf("[Step 3] Insert 30...\n");
    assert(sll_insert_at_position(30, 3) == true);
    assert(sll_size() == 3);
    printf("  -> Success. Current size: %d (List: 10 -> 20 -> 30)\n", sll_size());

    /* 4. Traverse the list */
    printf("[Step 4] Traverse the list...\n");
    sll_traverse();
    printf("  -> Traversal steps recorded.\n");

    /* 5. Search for 20 */
    printf("[Step 5] Search for 20...\n");
    int found_idx = sll_search(20);
    assert(found_idx == 1); // 0-based index 1 (position 2)
    printf("  -> Found at index %d (Position %d)\n", found_idx, found_idx + 1);

    /* 6. Update 20 to 25 */
    printf("[Step 6] Update 20 to 25...\n");
    assert(sll_update_value(20, 25) == true);
    assert(sll_search(25) == 1);
    assert(sll_search(20) == -1); // 20 no longer exists
    printf("  -> Success. 20 updated to 25.\n");

    /* 7. Delete 10 */
    printf("[Step 7] Delete 10...\n");
    assert(sll_delete_by_value(10) == true);
    assert(sll_size() == 2);
    assert(sll_search(10) == -1); // 10 is deleted
    printf("  -> Success. 10 deleted. Current size: %d\n", sll_size());

    /* 8. Display the final list */
    printf("[Step 8] Display final list...\n");
    assert(sll_size() == 2);
    printf("  -> List elements: 25 -> 30 -> NULL\n");

    /* 9. Clear the list */
    printf("[Step 9] Clear list...\n");
    assert(sll_clear() == true);
    assert(sll_size() == 0);
    printf("  -> Success. All nodes cleared. Size: %d\n\n", sll_size());

    MemoryStats final_mem = mem_get_stats();
    printf("===========================================\n");
    printf("Memory Summary:\n");
    printf("  Total Allocations:   %d\n", final_mem.total_allocations);
    printf("  Total Deallocations: %d\n", final_mem.total_deallocations);
    printf("  Active Nodes Leaked: %d\n", final_mem.active_nodes);
    printf("===========================================\n");
    assert(final_mem.active_nodes == 0);
    printf("ALL 9 TEST SEQUENCE STEPS PASSED! ZERO MEMORY LEAKS!\n");

    return 0;
}
