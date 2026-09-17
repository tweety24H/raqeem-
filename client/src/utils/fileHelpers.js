export function fileIcon(type) {
  const t = (type || '').toLowerCase();
  if (['jpg', 'jpeg', 'png'].includes(t)) return '🖼️';
  if (t === 'pdf') return '📕';
  if (t === 'ai') return '🎨';
  if (t === 'psd') return '🖌️';
  if (t === 'cdr') return '✂️';
  if (t === 'eps') return '📐';
  return '📄';
}

export function isImageType(type) {
  return ['jpg', 'jpeg', 'png'].includes((type || '').toLowerCase());
}

export function isPreviewable(type) {
  return ['jpg', 'jpeg', 'png', 'pdf'].includes((type || '').toLowerCase());
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function downloadDesignFile(api, design) {
  const res = await api.get(`/designs/download/${design.id}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = design.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
