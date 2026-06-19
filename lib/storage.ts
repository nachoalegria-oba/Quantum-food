import type { Paper } from '../types';

const PREFIX = 'origenes:paper:';

export function savePaperToStorage(paper: Paper): void {
  localStorage.setItem(PREFIX + paper.id, JSON.stringify(paper));
}

export function loadPapersFromStorage(): Paper[] {
  const papers: Paper[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) papers.push(JSON.parse(raw) as Paper);
      } catch {
        // skip malformed entries
      }
    }
  }
  return papers.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

export function deletePaperFromStorage(id: string): void {
  localStorage.removeItem(PREFIX + id);
}
