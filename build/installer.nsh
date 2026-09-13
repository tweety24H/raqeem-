; دعم إضافي لمثبّت RaqeemOS - يعالج حالة نسخة قديمة عالقة من RaqeemOS.exe
; شغّالة وقت التنصيب.
;
; السبب الجذري لمشكلة "البرنامج شغال، اضغط موافق لإغلاقه" اللي تعلق بحلقة
; بلا نهاية: نسخ قديمة من البرنامج (قبل إضافة قفل النسخة-الوحدة
; app.requestSingleInstanceLock() بـ electron/main.js) كانت تسمح بفتح عشرات
; النسخ فوق بعضها بدون أي تحقق، وبعضها يصير صعب إغلاقه من المثبّت نفسه.
;
; customInit تشتغل مبكرًا جدًا بـ .onInit (قبل حتى فحص NSIS الداخلي
; CHECK_APP_RUNNING اللي يطلع رسالة "اضغط موافق") - فنقتل أي نسخة عالقة هنا
; أول شي، وبهذا فحص NSIS التالي ما يلقى شي شغال أصلاً وما تطلع الرسالة إطلاقًا.
!macro customInit
  nsExec::Exec 'taskkill /F /IM RaqeemOS.exe /T'
  Sleep 500
!macroend

; دفاع إضافي بنفس اللحظة اللي يبدأ فيها التنصيب الفعلي (لو بطريقة ما نسخة
; جديدة انفتحت بين customInit وهذا الموضع).
!macro customInstall
  nsExec::Exec 'taskkill /F /IM RaqeemOS.exe /T'
!macroend
