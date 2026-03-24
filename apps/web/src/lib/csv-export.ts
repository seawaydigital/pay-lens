interface CsvExportOptions {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

function escapeCsvField(field: string | number): string {
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv({ filename, headers, rows }: CsvExportOptions): void {
  const csvLines: string[] = [];

  csvLines.push(headers.map(escapeCsvField).join(','));

  for (const row of rows) {
    csvLines.push(row.map(escapeCsvField).join(','));
  }

  const csvString = csvLines.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
