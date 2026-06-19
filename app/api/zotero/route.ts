import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import type { ZoteroItem } from '../../../types';

const QUERY = `
SELECT
  i.itemID,
  idv_title.value AS title,
  idv_abstract.value AS abstract,
  idv_doi.value AS doi,
  idv_year.value AS year,
  GROUP_CONCAT(c.firstName || ' ' || c.lastName, ', ') AS authors
FROM items i
JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
LEFT JOIN itemData id_title   ON i.itemID = id_title.itemID   AND id_title.fieldID   = (SELECT fieldID FROM fields WHERE fieldName = 'title')
LEFT JOIN itemDataValues idv_title ON id_title.valueID = idv_title.valueID
LEFT JOIN itemData id_abstract ON i.itemID = id_abstract.itemID AND id_abstract.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'abstractNote')
LEFT JOIN itemDataValues idv_abstract ON id_abstract.valueID = idv_abstract.valueID
LEFT JOIN itemData id_doi      ON i.itemID = id_doi.itemID      AND id_doi.fieldID      = (SELECT fieldID FROM fields WHERE fieldName = 'DOI')
LEFT JOIN itemDataValues idv_doi ON id_doi.valueID = idv_doi.valueID
LEFT JOIN itemData id_year     ON i.itemID = id_year.itemID     AND id_year.fieldID     = (SELECT fieldID FROM fields WHERE fieldName = 'date')
LEFT JOIN itemDataValues idv_year ON id_year.valueID = idv_year.valueID
LEFT JOIN itemCreators ic ON i.itemID = ic.itemID AND ic.orderIndex = 0
LEFT JOIN creators c ON ic.creatorID = c.creatorID
WHERE it.typeName NOT IN ('attachment','note','annotation')
  AND idv_title.value IS NOT NULL
GROUP BY i.itemID
ORDER BY i.itemID DESC;
`;

function readLocalZotero(): ZoteroItem[] {
  const home = os.homedir();
  // Try main DB first, fall back to backup (backup is readable when Zotero has main locked)
  const candidates = [
    path.join(home, 'Zotero', 'zotero.sqlite'),
    path.join(home, 'Zotero', 'zotero.sqlite.bak'),
  ];

  for (const dbPath of candidates) {
    try {
      const raw = execSync(
        `sqlite3 -json -readonly "${dbPath}" "${QUERY.replace(/\n/g, ' ')}"`,
        { timeout: 10_000, encoding: 'utf8' },
      );
      if (!raw.trim()) return [];
      const rows = JSON.parse(raw) as Array<{
        itemID: number;
        title: string;
        abstract?: string;
        doi?: string;
        year?: string;
        authors?: string;
      }>;
      return rows.map(r => ({
        key: String(r.itemID),
        data: {
          key: String(r.itemID),
          title: r.title,
          abstractNote: r.abstract ?? '',
          DOI: r.doi ?? '',
          date: r.year?.split(' ')[0] ?? '',
          itemType: 'journalArticle',
          tags: [],
          creators: r.authors
            ? r.authors.split(', ').map(name => {
                const parts = name.trim().split(' ');
                return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) ?? '' };
              })
            : [],
        },
      }));
    } catch {
      // Try next candidate
    }
  }
  return [];
}

export async function GET() {
  const userId = process.env.ZOTERO_USER_ID;
  const apiKey = process.env.ZOTERO_API_KEY;

  // ── Cloud API path ───────────────────────────────────────────────────────────
  if (userId && apiKey && !userId.includes('123456') && !apiKey.includes('your_')) {
    const res = await fetch(
      `https://api.zotero.org/users/${userId}/items?format=json&limit=100&itemType=journalArticle`,
      {
        headers: { 'Zotero-API-Key': apiKey, 'Zotero-API-Version': '3' },
        next: { revalidate: 300 },
      },
    );
    if (res.ok) {
      const items: ZoteroItem[] = await res.json();
      return NextResponse.json({ configured: true, source: 'cloud', items });
    }
  }

  // ── Local SQLite path ────────────────────────────────────────────────────────
  const items = readLocalZotero();
  if (items.length > 0) {
    return NextResponse.json({ configured: true, source: 'local', items });
  }

  return NextResponse.json({
    configured: false,
    source: 'none',
    items: [],
    error: 'No se encontró base de datos de Zotero local ni credenciales cloud configuradas.',
  });
}
