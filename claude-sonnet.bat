@echo off
rem Opens Claude Code with the Sonnet model in this folder. See docs\ROADMAP.md.
cd /d "%~dp0"
where claude >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.local\bin\claude.exe" (
    "%USERPROFILE%\.local\bin\claude.exe" --model sonnet
  ) else (
    echo Claude Code was not found. Install it, then run this file again.
    pause
  )
) else (
  claude --model sonnet
)
