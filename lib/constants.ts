import type { Paper } from '../types';

export const PRELOADED_PAPERS: Paper[] = [
  {
    id: 'pre-1',
    title: 'Soy sauce koji: Aspergillus oryzae flavor formation',
    year: '2024',
    type: 'koji',
    abstract: 'Changes of microorganisms, physicochemical properties, and flavor compounds in Cantonese soy sauce koji. Protease and amylase peaks at 72h, optimal temperature 30°C, salt 18%, humidity 85-90%. Aspergillus oryzae 3.042 crucial for enzyme activity.',
    temperatura_min: 28, temperatura_max: 32,
    pH_min: 5.0, pH_max: 6.5,
    tiempo_min_h: 48, tiempo_max_h: 96,
    concentracion_min: 15, concentracion_max: 20,
    inoculacion: 'media',
    microorganismo_clave: 'Aspergillus oryzae 3.042',
    resultado_principal: 'Protease activity peaks at 72h at 30°C with 18% salt',
    aplicacion_oba: 'Koji de cebada o maíz manchego a 30°C, 72h, sal 15-18%',
    confianza: 0.92,
    preloaded: true,
  },
  {
    id: 'pre-2',
    title: 'Milk vs water kefir at different temperatures',
    year: '2023',
    type: 'kefir',
    abstract: 'Comparison at 20°C, 25°C, 30°C. Water kefir optimal acidification at 25°C, pH dropping from 6.8 to 3.4 in 48h. Biomass increase greatest at 25°C. Sucrose 5-8%.',
    temperatura_min: 20, temperatura_max: 30,
    pH_min: 3.4, pH_max: 6.8,
    tiempo_min_h: 24, tiempo_max_h: 72,
    concentracion_min: 5, concentracion_max: 8,
    inoculacion: 'media',
    microorganismo_clave: 'Lachancea fermentati, Lactobacillus nagelii',
    resultado_principal: 'Optimal acidification at 25°C in 48h',
    aplicacion_oba: 'Kéfir de agua de mosto de bobal a 25°C, 48h, azúcar 6%',
    confianza: 0.95,
    preloaded: true,
  },
  {
    id: 'pre-3',
    title: 'Microbial diversity of novel misos (metagenomics)',
    year: '2024',
    type: 'miso',
    abstract: 'Miso with untraditional substrates. Salt 6-12%, koji ratio 10-50%, temperature 10-30°C, 1 month to 3 years. Umami develops with protease; glutamate increases with time.',
    temperatura_min: 10, temperatura_max: 30,
    pH_min: 4.5, pH_max: 6.0,
    tiempo_min_h: 720, tiempo_max_h: 26280,
    concentracion_min: 6, concentracion_max: 12,
    inoculacion: 'baja',
    microorganismo_clave: 'Aspergillus oryzae, Tetragenococcus halophilus',
    resultado_principal: 'Glutamate accumulation increases with fermentation time',
    aplicacion_oba: 'Miso de legumbres manchegas, sal 8%, 3-12 meses a 20°C',
    confianza: 0.90,
    preloaded: true,
  },
  {
    id: 'pre-4',
    title: 'Pichia kluyveri on kombucha aroma profile',
    year: '2023',
    type: 'kombucha',
    abstract: 'Kombucha fermented by SCOBY. Pichia kluyveri increases ester production. Optimal: pH 2.5-3.5 final, temperature 22-28°C, 7-14 days. Sugar 70-100g/L initial.',
    temperatura_min: 22, temperatura_max: 28,
    pH_min: 2.5, pH_max: 3.5,
    tiempo_min_h: 168, tiempo_max_h: 336,
    concentracion_min: 7, concentracion_max: 10,
    inoculacion: 'media',
    microorganismo_clave: 'Pichia kluyveri, Acetobacter, Komagataeibacter',
    resultado_principal: 'Pichia addition increases esters 40% improving aroma complexity',
    aplicacion_oba: 'Kombucha de hierbas de La Manchuela con Pichia kluyveri añadida',
    confianza: 0.88,
    preloaded: true,
  },
  {
    id: 'pre-5',
    title: 'Amazake: fermented food from Aspergillus oryzae',
    year: '2021',
    type: 'koji',
    abstract: 'Koji amazake: 55-60°C incubation 8-10h. Optimal amylase at 55°C, pH 4.5-5.5. Sweetness proportional to amylase activity. A. oryzae inoculation 0.1-0.5% w/w.',
    temperatura_min: 53, temperatura_max: 60,
    pH_min: 4.5, pH_max: 5.5,
    tiempo_min_h: 8, tiempo_max_h: 12,
    concentracion_min: 0.1, concentracion_max: 0.5,
    inoculacion: 'baja',
    microorganismo_clave: 'Aspergillus oryzae',
    resultado_principal: 'Maximum saccharification at 55°C in 8-10h',
    aplicacion_oba: 'Amazake de cereales manchegos, incubación 55°C, 9h',
    confianza: 0.94,
    preloaded: true,
  },
  {
    id: 'pre-6',
    title: 'Japanese traditional miso and koji making',
    year: '2021',
    type: 'miso',
    abstract: 'White miso 4-8 weeks. Red miso 6-36 months. Koji incubation 30°C, 42-48h, humidity 85-95%. Salt suppresses unwanted microbes. Salt 6-12%.',
    temperatura_min: 5, temperatura_max: 30,
    pH_min: 4.2, pH_max: 5.5,
    tiempo_min_h: 672, tiempo_max_h: 8760,
    concentracion_min: 6, concentracion_max: 12,
    inoculacion: 'baja',
    microorganismo_clave: 'Aspergillus oryzae, Tetragenococcus halophilus',
    resultado_principal: 'Koji incubation at 30°C 48h optimal enzyme production',
    aplicacion_oba: 'Koji de trigo manchego a 30°C, 45h, humedad 90%',
    confianza: 0.96,
    preloaded: true,
  },
  {
    id: 'pre-7',
    title: 'Mediterranean fruit juice kefir-like beverages',
    year: '2016',
    type: 'kefir',
    abstract: 'Sicilian fruit juices fermented with water kefir microorganisms. pH 3.5-4.5, 25°C, 48h. Juices >8% sugar support growth. Sensory acceptable in all tested juices.',
    temperatura_min: 22, temperatura_max: 28,
    pH_min: 3.5, pH_max: 4.5,
    tiempo_min_h: 36, tiempo_max_h: 72,
    concentracion_min: 8, concentracion_max: 15,
    inoculacion: 'media',
    microorganismo_clave: 'Lactobacillus casei, Leuconostoc mesenteroides',
    resultado_principal: 'All fruit juices >8% sugar viable for kefir fermentation',
    aplicacion_oba: 'Bebida fermentada de zumo de uva bobal con kéfir de agua',
    confianza: 0.87,
    preloaded: true,
  },
  {
    id: 'pre-8',
    title: 'Torulaspora delbrueckii in low-alcohol strawberry beverages',
    year: '2021',
    type: 'beverage',
    abstract: 'T. delbrueckii: lower ethanol, higher ester production, better aroma vs S. cerevisiae. Temperature 18-22°C, initial pH 3.5-4.0, inoculation 10^6-10^7 CFU/mL. Fermentation 5-7 days.',
    temperatura_min: 18, temperatura_max: 22,
    pH_min: 3.5, pH_max: 4.0,
    tiempo_min_h: 120, tiempo_max_h: 168,
    concentracion_min: 8, concentracion_max: 15,
    inoculacion: 'alta',
    microorganismo_clave: 'Torulaspora delbrueckii',
    resultado_principal: 'T. delbrueckii reduces ethanol 60% while improving aroma esters',
    aplicacion_oba: 'Bebida de frutos rojos manchegos con T. delbrueckii a 20°C',
    confianza: 0.91,
    preloaded: true,
  },
];

export const EXTRACT_SYSTEM_PROMPT = `Eres un científico de fermentación. Analiza el paper y extrae datos experimentales en JSON estricto sin texto adicional ni backticks:
{"title":string,"year":string,"type":"koji"|"miso"|"kefir"|"kombucha"|"lacto"|"beverage"|"general","temperatura_min":número|null,"temperatura_max":número|null,"pH_min":número|null,"pH_max":número|null,"tiempo_min_h":número|null,"tiempo_max_h":número|null,"concentracion_min":número|null,"concentracion_max":número|null,"inoculacion":"baja"|"media"|"alta"|null,"microorganismo_clave":string|null,"resultado_principal":string,"aplicacion_oba":string,"confianza":número 0-1}`;

export const BATCH_EXTRACT_SYSTEM_PROMPT = `Eres un científico de fermentación. Recibirás un array JSON de papers (título + abstract).
Responde ÚNICAMENTE con un JSON array (mismo orden), sin texto adicional ni backticks.
Schema por elemento: {"type":"koji"|"miso"|"kefir"|"kombucha"|"lacto"|"beverage"|"general","temperatura_min":number|null,"temperatura_max":number|null,"pH_min":number|null,"pH_max":number|null,"tiempo_min_h":number|null,"tiempo_max_h":number|null,"concentracion_min":number|null,"concentracion_max":number|null,"inoculacion":"baja"|"media"|"alta"|null,"microorganismo_clave":string|null,"resultado_principal":string,"aplicacion_oba":string,"confianza":number}`;

export const QUANTUM_SYSTEM_PROMPT = `Eres el asesor de fermentación de Ørigenes. Nacho Barra dirige R&D para el restaurante Oba★ en La Manchuela.
Recibirás parámetros calculados por un circuito cuántico, calibrados con papers científicos reales de fermentación.
Los parámetros representan: Temperatura, pH, Tiempo, Concentración de sustrato, Inoculación, Humedad, Oxígeno y Temperatura de maduración.
Escribe en español. Da exactamente 3 recomendaciones prácticas con números concretos. Sin jerga técnica. Como si hablaras directamente con el chef fermentador, de forma clara y directa.`;

export const CHAT_SYSTEM_PROMPT = `Eres el asistente de investigación de Ørigenes Quantum Platform, sistema de R&D de fermentación avanzada.
Tienes acceso a la biblioteca científica completa del sistema. Usa ese conocimiento para responder preguntas técnicas sobre fermentación, sugerir experimentos, comparar técnicas y proponer innovaciones para Oba★ (restaurante Michelin en La Manchuela).
Responde siempre en español. Sé técnico, preciso y creativo.`;

export const QUANTUM_SUGGESTIONS = [
  'Optimizar koji de cebada para umami máximo',
  'Garum de hongos silvestres de La Manchuela',
  'Fermentación no alcohólica de uva bobal',
  'Miso blanco con legumbres manchegas',
];

// 8 qubits → 8 fermentation parameters
export const PARAM_LABELS: [string, string, string][] = [
  ['Temperatura',       '#c05000', '°C'],
  ['pH',                '#0060a0', ''],
  ['Tiempo',            '#2a7a50', 'h'],
  ['Concentración',     '#a06000', '%'],
  ['Inoculación',       '#7040b0', ''],
  ['Actividad agua',    '#006070', 'aw'],
  ['Presión O₂',        '#700040', '%'],
  ['T° maduración',     '#7a4000', '°C'],
];
