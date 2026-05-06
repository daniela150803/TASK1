@echo off
echo Instalando dependencias (solo la primera vez)...
call npm install
echo.
echo Iniciando dashboard...
echo Cuando veas la URL, abre http://localhost:3000 en tu navegador.
echo.
node server.js
pause
