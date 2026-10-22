@echo off
:: ============================================================
:: BHARAT IMPEX — SETUP AUTOMATIC 23:59 (11:59 PM) EOD SNAPSHOT TASK
:: ============================================================
echo [BHARAT IMPEX] Registering Daily 23:59 EOD Stock Snapshot Task in Windows Task Scheduler...

set PHP_BIN=C:\xampp\php\php.exe
set SCRIPT_PATH=C:\xampp\htdocs\bharat impex stock project\cron_eod_snapshot.php

if not exist "%PHP_BIN%" (
    echo [ERROR] PHP binary not found at %PHP_BIN%. Please verify XAMPP installation path.
    pause
    exit /b 1
)

if not exist "%SCRIPT_PATH%" (
    echo [ERROR] Snapshot script not found at %SCRIPT_PATH%.
    pause
    exit /b 1
)

:: Schedule task at 23:59 everyday
schtasks /create /tn "BharatImpex_EOD_Snapshot" /tr "\"%PHP_BIN%\" \"%SCRIPT_PATH%\"" /sc daily /st 23:59 /f /rl HIGHEST

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Windows Scheduled Task "BharatImpex_EOD_Snapshot" successfully registered!
    echo It will execute automatically every night at 23:59 (11:59 PM).
    echo.
) else (
    echo.
    echo [WARNING] Administrator privileges may be required to register Windows Scheduled Task.
    echo Please right-click this .bat file and select "Run as administrator".
    echo.
)

pause
