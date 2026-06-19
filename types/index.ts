export type FermentationType =
  | 'koji'
  | 'miso'
  | 'kefir'
  | 'kombucha'
  | 'lacto'
  | 'beverage'
  | 'general';

export type InoculationLevel = 'baja' | 'media' | 'alta';

export interface Paper {
  id: string;
  title: string;
  year: string;
  type: FermentationType;
  abstract?: string;
  doi?: string;
  temperatura_min: number | null;
  temperatura_max: number | null;
  pH_min: number | null;
  pH_max: number | null;
  tiempo_min_h: number | null;
  tiempo_max_h: number | null;
  concentracion_min: number | null;
  concentracion_max: number | null;
  inoculacion: InoculationLevel | null;
  microorganismo_clave: string | null;
  resultado_principal: string;
  aplicacion_oba: string;
  confianza: number;
  preloaded?: boolean;
  savedAt?: number;
  zoteroKey?: string;
  filename?: string;
  full_text?: string;
}

export interface QuantumResult {
  counts: Record<string, number>;
  entropy: number;
  probs: string[];
  top: Array<{ bits: string; count: number }>;
  angles: number[];
}

export interface Calibration {
  count: number;
  temp: { min: number; max: number; mean: number };
  pH: { min: number; max: number; mean: number };
  tiempo: { min: number; max: number; mean: number };
  conc: { min: number; max: number; mean: number };
}

export interface ZoteroItem {
  key: string;
  data: {
    key: string;
    title: string;
    date: string;
    abstractNote: string;
    tags: Array<{ tag: string }>;
    itemType: string;
    url?: string;
    DOI?: string;
    publicationTitle?: string;
    creators?: Array<{ firstName?: string; lastName?: string }>;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Quantum backend types ────────────────────────────────────────────────────

export type BackendId = 'local' | 'ibm-sim' | 'ibm-real' | 'ionq-sim' | 'ionq-real';
export type BackendProvider = 'local' | 'ibm' | 'ionq';

export interface BackendMeta {
  id: BackendId;
  provider: BackendProvider;
  label: string;
  sublabel: string;
  latency: string;
  color: string;
  envKeys: string[];
  async: boolean;
}

export type JobPhase =
  | 'idle'
  | 'running-local'
  | 'submitting'
  | 'queued'
  | 'running-remote'
  | 'claude'
  | 'done'
  | 'error';

export interface JobStatus {
  status: 'queued' | 'running' | 'completed' | 'failed';
  queuePosition?: number;
  result?: QuantumResult;
  error?: string;
}
