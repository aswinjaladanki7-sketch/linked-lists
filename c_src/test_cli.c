#include "linked_list.h"
#include <assert.h>

int main(void) {
    printf("===========================================\n");
    printf("Testing Singly Linked List Engine (MinGW GCC)\n");
    printf("Verifying 3 Insertion Operations & Test Cases\n");
    printf("===========================================\n\n");

    mem_init();
    set_active_list_type(LIST_TYPE_SINGLY);
    sll_init();

    /* [Test 0] Empty list insertion & invalid bounds */
    printf("[Test 0] Empty List & Invalid Position Handling...\n");
    assert(sll_size() == 0);
    assert(sll_insert_at_position(99, 5) == false); // Invalid on empty
    assert(sll_insert_at_position(99, -1) == false); // Invalid negative
    assert(sll_insert_at_position(10, 0) == true);  // Valid on empty (pos 0 = HEAD)
    assert(sll_size() == 1);
    sll_clear();
    assert(sll_size() == 0);
    printf("  -> Success. Empty list and out-of-bounds guards work correctly.\n\n");

    /* Build baseline list: 10 -> 20 -> 30 */
    sll_insert_tail(10);
    sll_insert_tail(20);
    sll_insert_tail(30);
    assert(sll_size() == 3);
    printf("Baseline list created: 10 -> 20 -> 30 (size = 3)\n\n");

    /* [Test Case 1] Insert 5 at beginning */
    printf("[Test Case 1] Insert 5 at beginning...\n");
    assert(sll_insert_head(5) == true);
    assert(sll_size() == 4);
    assert(sll_search(5) == 0);   // index 0
    assert(sll_search(10) == 1);  // index 1
    assert(sll_search(20) == 2);  // index 2
    assert(sll_search(30) == 3);  // index 3
    printf("  -> Expected list: 5 -> 10 -> 20 -> 30. PASSED!\n\n");

    /* Reset to 10 -> 20 -> 30 */
    sll_clear();
    sll_insert_tail(10);
    sll_insert_tail(20);
    sll_insert_tail(30);

    /* [Test Case 2] Insert 25 at position 2 (zero-based indexing) */
    printf("[Test Case 2] Insert 25 at position 2 (0-based indexing)...\n");
    assert(sll_insert_at_position(25, 2) == true);
    assert(sll_size() == 4);
    assert(sll_search(10) == 0);  // index 0
    assert(sll_search(20) == 1);  // index 1
    assert(sll_search(25) == 2);  // index 2 (spliced between 20 and 30)
    assert(sll_search(30) == 3);  // index 3
    printf("  -> Expected list: 10 -> 20 -> 25 -> 30. PASSED!\n\n");

    /* Reset to 10 -> 20 -> 30 */
    sll_clear();
    sll_insert_tail(10);
    sll_insert_tail(20);
    sll_insert_tail(30);

    /* [Test Case 3] Insert 40 at end */
    printf("[Test Case 3] Insert 40 at end...\n");
    assert(sll_insert_tail(40) == true);
    assert(sll_size() == 4);
    assert(sll_search(10) == 0);  // index 0
    assert(sll_search(20) == 1);  // index 1
    assert(sll_search(30) == 2);  // index 2
    assert(sll_search(40) == 3);  // index 3 (tail)
    printf("  -> Expected list: 10 -> 20 -> 30 -> 40. PASSED!\n\n");

    /* [Test 4] Duplicate values handling */
    printf("[Test 4] Insert Duplicate Values...\n");
    assert(sll_insert_tail(20) == true);
    assert(sll_size() == 5);
    // Deletion should delete first occurrence (previously at index 1)
    assert(sll_delete_by_value(20) == true);
    assert(sll_size() == 4);
    assert(sll_search(20) == 3); // Second occurrence still present at index 3
    printf("  -> Success. Duplicate values handled safely.\n\n");

    /* [Test 5] Final Clear and Memory Verification */
    printf("[Test 5] Clear list and check heap leaks...\n");
    assert(sll_clear() == true);
    assert(sll_size() == 0);

    MemoryStats final_mem = mem_get_stats();
    printf("===========================================\n");
    printf("Memory Summary:\n");
    printf("  Total Allocations:   %d\n", final_mem.total_allocations);
    printf("  Total Deallocations: %d\n", final_mem.total_deallocations);
    printf("  Active Nodes Leaked: %d\n", final_mem.active_nodes);
    printf("===========================================\n");
    assert(final_mem.active_nodes == 0);
    printf("ALL TESTS PASSED! ZERO MEMORY LEAKS!\n");

    return 0;
}
