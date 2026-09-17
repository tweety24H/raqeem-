@echo off
chcp 65001 >nul
title RaqeemOS - اصلاح مشكلة التنصيب

echo ===================================================
echo   RaqeemOS - اصلاح مشكلة "البرنامج شغال"
echo ===================================================
echo.
echo هذا الملف يسكر أي نسخة عالقة من RaqeemOS، ثم يشغّل
echo ملف التثبيت الموجود بنفس المجلد تلقائيًا.
echo.
echo بيانات مطبعتك (الطلبات والعملاء) لن تُمس إطلاقًا -
echo هذا السكربت يسكر البرنامج فقط، ولا يحذف أي بيانات.
echo.
pause

echo.
echo [1/2] جاري إغلاق أي نسخة عالقة من RaqeemOS...
taskkill /F /IM RaqeemOS.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo تم.

echo.
echo [2/2] جاري تشغيل ملف التثبيت...
set FOUND=0
for %%F in ("%~dp0Raqeem Setup*.exe") do (
  if exist "%%F" (
    set FOUND=1
    start "" "%%F"
  )
)

if "%FOUND%"=="0" (
  echo.
  echo تعذّر إيجاد ملف "Raqeem Setup*.exe" بنفس مجلد هذا السكربت.
  echo تأكد إن ملف التثبيت الجديد موجود بنفس المجلد وحاول من جديد.
  echo.
  pause
) else (
  echo تم تشغيل المثبّت - كمّل التنصيب عادي بالنافذة اللي فتحت.
  timeout /t 3 /nobreak >nul
)
