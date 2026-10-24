@echo off
echo =========================================================================
echo Compiling and Running Native C Unit Tests using GCC
echo =========================================================================

gcc -Wall -Wextra linked_list.c -o test_linked_list.exe

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Compilation succeeded. Running tests...
    echo.
    test_linked_list.exe
) else (
    echo [ERROR] Native GCC compilation failed!
)
pause
