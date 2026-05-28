function escapeCell(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadExcelCompatibleTable(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = 'Relatorio',
) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const tableHead = headers.map((header) => `<th>${escapeCell(header)}</th>`).join('');
  const tableRows = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${escapeCell(row[header])}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; }
      th { background: #0041aa; color: #fff; font-weight: 700; }
      th, td { border: 1px solid #d9e2ef; padding: 8px; }
    </style>
  </head>
  <body>
    <table>
      <caption>${escapeCell(sheetName)}</caption>
      <thead><tr>${tableHead}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`;

  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
