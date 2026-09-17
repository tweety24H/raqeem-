// مصدّر Excel — نحمّل مكتبة xlsx ديناميكياً (lazy) فقط لما المستخدم فعلياً
// يضغط زر التصدير، حتى ما تكبّر حجم البرنامج المحمّل بالبداية لكل صفحة.

async function loadXLSX() {
  const XLSX = await import('xlsx');
  return XLSX;
}

// مصدّر بسيط لجدول واحد.
export async function exportToExcel(filename, sheetName, rows) {
  const XLSX = await loadXLSX();
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// مصدّر لعدة جداول (Sheets) بملف واحد. sheets = [{ name, rows }]
export async function exportMultiSheetExcel(filename, sheets) {
  const XLSX = await loadXLSX();
  const workbook = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  }
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
