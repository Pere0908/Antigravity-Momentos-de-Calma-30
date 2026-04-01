@echo off
cls
echo ==========================================
echo    SUBIENDO ANTIGRAVITY A GITHUB
echo ==========================================
git add .
set /p msg="¿Que has cambiado hoy?: "
git commit -m "%msg%"
git branch -M main
git push -u origin main
echo.
echo --- PROCESO TERMINADO ---
echo Tu web se esta actualizando en Netlify...
pause