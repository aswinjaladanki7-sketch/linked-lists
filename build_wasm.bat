@echo off
echo =========================================================================
echo Compiling linked_list.c to WebAssembly using Emscripten (emcc)
echo =========================================================================

where emcc >nul 2>nul
if %ERRORLEVEL% EQU 0 goto :has_emcc

if exist "C:\Users\Aswinkumar jaladanki\emsdk\emsdk_env.bat" (
    call "C:\Users\Aswinkumar jaladanki\emsdk\emsdk_env.bat"
    goto :has_emcc
)
if exist "%USERPROFILE%\emsdk\emsdk_env.bat" (
    call "%USERPROFILE%\emsdk\emsdk_env.bat"
    goto :has_emcc
)
if exist "C:\emsdk\emsdk_env.bat" (
    call "C:\emsdk\emsdk_env.bat"
    goto :has_emcc
)

echo [ERROR] Emscripten compiler 'emcc' was not found in PATH or at common locations:
echo   - C:\Users\Aswinkumar jaladanki\emsdk\emsdk_env.bat
echo   - %USERPROFILE%\emsdk\emsdk_env.bat
echo   - C:\emsdk\emsdk_env.bat
echo Please install or activate Emscripten before compiling. See README.md.
pause
exit /b 1

:has_emcc

if not exist wasm mkdir wasm

emcc linked_list.c -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','UTF8ToString','stringToUTF8','allocateUTF8','HEAPU8','HEAP32','getValue','setValue']" -s EXPORTED_FUNCTIONS="['_malloc','_free','_init_list','_insert_beginning','_insert_end','_insert_at_position','_insert_after_value','_delete_beginning','_delete_end','_delete_at_position','_delete_by_value','_update_at_position','_update_value','_search_value','_get_node_count','_get_first_node','_get_last_node','_reverse_list','_clear_list','_reset_list','_get_serialized_list','_is_empty','_set_list_type','_get_list_type']" -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME="createLinkedListModule" -o wasm/linked_list.js

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] WebAssembly compiled successfully to wasm/linked_list.js and wasm/linked_list.wasm!
) else (
    echo [ERROR] WebAssembly compilation failed with error code %ERRORLEVEL%.
)
pause
