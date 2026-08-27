import { eq } from "drizzle-orm";
import { subjects } from "../drizzle/schema.ts";
import * as db from "../server/db.ts";

const code = "INV-401";
const owner = await db.getUserByEmail("wilinton@gmail.com");
const connection = await db.getDb();

if (!owner || !connection) throw new Error("No fue posible encontrar una cuenta administradora o la conexión de datos.");

const existing = await connection.select({ id: subjects.id }).from(subjects).where(eq(subjects.code, code)).limit(1);
if (existing[0]) {
  console.log(`El curso ${code} ya existe con id ${existing[0].id}.`);
  process.exit(0);
}

const assessment = (moduleTitle, topics) => ({
  title: `Evaluación de cierre · ${moduleTitle}`,
  description: "Cuestionario formativo para comprobar comprensión conceptual y la aplicación responsable de los contenidos del módulo.",
  passingScore: 70,
  questions: [
    { id: "q1", prompt: `¿Cuál es el propósito principal de estudiar ${topics[0]} antes de tomar decisiones de inversión?`, options: ["Comprender riesgos y alternativas", "Garantizar una rentabilidad", "Eliminar la volatilidad", "Copiar operaciones ajenas"], correctOption: 0, explanation: "El análisis educativo permite comprender riesgos y alternativas; no garantiza resultados." },
    { id: "q2", prompt: `¿Qué práctica es consistente con el enfoque responsable de este módulo?`, options: ["Revisar fuentes, costos y riesgos", "Concentrar todo el capital en una sola idea", "Seguir promesas de rentabilidad", "Ignorar el horizonte de tiempo"], correctOption: 0, explanation: "Una decisión informada revisa fuentes, costos, riesgos y el objetivo personal." },
    { id: "q3", prompt: "¿Qué debe diferenciarse siempre en un análisis académico de inversiones?", options: ["Datos verificables y opiniones", "Ahorro y fraude", "Precio y nombre", "Cálculo y lectura"], correctOption: 0, explanation: "Los estudiantes deben distinguir hechos, fuentes y opiniones para evaluar información financiera." },
  ],
});

const modules = [
  {
    title: "Módulo 1 · Fundamentos, objetivos y riesgo",
    overview: "Establece las bases de una decisión de inversión responsable: objetivos, horizonte temporal, liquidez, tolerancia al riesgo y relación entre riesgo y rendimiento.",
    learningObjectives: ["Diferenciar ahorro, inversión y especulación", "Definir objetivos y horizonte temporal", "Identificar fuentes básicas de riesgo"],
    estimatedHours: 8,
    imagePrompt: "Aula de educación financiera con estudiantes analizando objetivos y riesgo, estilo institucional sobrio",
    lessons: [
      { title: "Ahorro, inversión y metas financieras", summary: "Conceptos iniciales y propósito de invertir.", explanation: "La clase diferencia el ahorro destinado a necesidades cercanas de la inversión para objetivos de mediano y largo plazo. Se trabaja con casos hipotéticos, sin recomendar productos ni operaciones reales.", keyTopics: ["Objetivos", "Horizonte temporal", "Liquidez"], classActivity: "Construir una línea de tiempo de metas hipotéticas y justificar su horizonte." },
      { title: "Riesgo, rendimiento y perfil del inversor", summary: "Cómo evaluar la incertidumbre antes de elegir una alternativa.", explanation: "Se analizan volatilidad, pérdida potencial, tolerancia al riesgo y capacidad financiera mediante una matriz de decisiones. El énfasis está en reconocer que toda inversión tiene riesgo.", keyTopics: ["Volatilidad", "Riesgo", "Rendimiento"], classActivity: "Resolver una matriz de perfil de riesgo usando tres casos ficticios." },
    ],
    assessment: assessment("Fundamentos, objetivos y riesgo", ["objetivos de inversión", "riesgo"]),
  },
  {
    title: "Módulo 2 · Mercados e instrumentos de inversión",
    overview: "Presenta los principales instrumentos y mercados: acciones, bonos, fondos, ETF y efectivo, junto con sus características, riesgos, costos y mecanismos de negociación.",
    learningObjectives: ["Comparar instrumentos de renta variable y renta fija", "Explicar el papel de fondos y ETF", "Reconocer costos y liquidez"],
    estimatedHours: 8,
    imagePrompt: "Diagrama educativo de mercados financieros con acciones, bonos y fondos, estilo editorial sobrio",
    lessons: [
      { title: "Acciones, bonos y fondos", summary: "Propiedad, deuda e inversión colectiva.", explanation: "La sesión explica que una acción representa participación en una empresa y un bono una obligación de deuda, mientras que los fondos agrupan diversos activos. Se contrastan escenarios de riesgo y retorno sin realizar recomendaciones.", keyTopics: ["Acciones", "Bonos", "Fondos"], classActivity: "Completar una tabla comparativa de instrumentos con ventajas, riesgos y liquidez." },
      { title: "ETF, costos y operaciones", summary: "Cómo se negocian los instrumentos y qué costos revisar.", explanation: "Los estudiantes examinan el recorrido de una orden y distinguen comisiones, gastos del fondo, diferencial compra-venta y otros costos que pueden afectar los resultados.", keyTopics: ["ETF", "Comisiones", "Órdenes"], classActivity: "Analizar una ficha de ETF hipotética e identificar todos los costos informados." },
    ],
    assessment: assessment("Mercados e instrumentos", ["instrumentos financieros", "costos"]),
  },
  {
    title: "Módulo 3 · Análisis de información y valoración básica",
    overview: "Desarrolla criterios para leer información pública, identificar indicadores fundamentales y diferenciar información verificable de contenido promocional o engañoso.",
    learningObjectives: ["Localizar fuentes financieras confiables", "Interpretar indicadores básicos", "Distinguir análisis de promoción"],
    estimatedHours: 8,
    imagePrompt: "Estudiantes revisando informes empresariales y gráficos sencillos en una biblioteca, estilo académico",
    lessons: [
      { title: "Fuentes, divulgación y lectura de información", summary: "Dónde buscar información y cómo verificarla.", explanation: "La clase trabaja con reportes, fichas de fondos y divulgaciones obligatorias. Se enfatiza la trazabilidad de las fuentes y el uso responsable de la información pública.", keyTopics: ["Divulgación", "Fuentes primarias", "Estados financieros"], classActivity: "Clasificar fuentes hipotéticas por nivel de confiabilidad y justificar la decisión." },
      { title: "Indicadores y valoración introductoria", summary: "Indicadores para formular preguntas, no certezas.", explanation: "Se presentan conceptos como ingresos, utilidad, endeudamiento, rendimiento y múltiplos de forma introductoria. Los estudiantes practican interpretar indicadores en casos simplificados y reconocen sus límites.", keyTopics: ["Rentabilidad", "Endeudamiento", "Valoración"], classActivity: "Interpretar un tablero ficticio de indicadores y elaborar tres preguntas de análisis." },
    ],
    assessment: assessment("Análisis de información", ["fuentes verificables", "indicadores"]),
  },
  {
    title: "Módulo 4 · Portafolio, diversificación y seguimiento",
    overview: "Aplica principios de asignación de activos, diversificación, rebalanceo y evaluación de desempeño a un portafolio académico simulado.",
    learningObjectives: ["Explicar la función de la diversificación", "Diseñar una asignación hipotética coherente", "Aplicar criterios básicos de seguimiento"],
    estimatedHours: 8,
    imagePrompt: "Portafolio de inversión diversificado representado con gráficos y estudiantes colaborando, estilo institucional",
    lessons: [
      { title: "Asignación de activos y diversificación", summary: "Distribución de riesgo entre activos.", explanation: "La clase muestra cómo la combinación de distintos activos busca evitar dependencia de un único resultado. Se discuten correlación, concentración y límites de la diversificación.", keyTopics: ["Asignación de activos", "Diversificación", "Concentración"], classActivity: "Diseñar tres portafolios hipotéticos para perfiles de riesgo distintos y argumentar sus diferencias." },
      { title: "Seguimiento, rebalanceo y desempeño", summary: "Cómo evaluar un plan de forma disciplinada.", explanation: "Se proponen métricas simples de seguimiento, comparación con objetivos y revisión periódica. Se aclara que el desempeño pasado no asegura resultados futuros.", keyTopics: ["Rebalanceo", "Desempeño", "Disciplina"], classActivity: "Analizar un portafolio simulado y proponer un plan de seguimiento trimestral." },
    ],
    assessment: assessment("Portafolio y diversificación", ["diversificación", "seguimiento"]),
  },
  {
    title: "Módulo 5 · Ética, prevención de fraude y proyecto integrador",
    overview: "Integra los aprendizajes en un caso de inversión simulado, con énfasis en prevención de fraude, sesgos, costos, documentación de decisiones y comunicación ética.",
    learningObjectives: ["Reconocer señales de fraude y promesas engañosas", "Documentar decisiones basadas en objetivos", "Presentar un proyecto académico responsable"],
    estimatedHours: 8,
    imagePrompt: "Presentación de proyecto de inversión académico con estudiantes y docente, ambiente profesional y ético",
    lessons: [
      { title: "Fraude, sesgos y conducta responsable", summary: "Protección de la persona inversora.", explanation: "Se identifican alertas como rendimientos garantizados, presión para actuar, falta de registro y mensajes no verificables. También se discuten sesgos comunes y la importancia de consultar fuentes reguladas.", keyTopics: ["Fraude", "Sesgos", "Debida diligencia"], classActivity: "Evaluar anuncios ficticios y señalar señales de alerta con evidencia." },
      { title: "Proyecto integrador: portafolio simulado", summary: "Aplicación integral en un caso académico.", explanation: "Cada estudiante construye y presenta una propuesta de portafolio simulado con objetivos, instrumentos, riesgos, costos, fuentes y reglas de seguimiento. No se usa dinero real ni se emiten recomendaciones personalizadas.", keyTopics: ["Proyecto", "Justificación", "Ética"], classActivity: "Presentar el portafolio simulado y responder preguntas de retroalimentación." },
    ],
    assessment: assessment("Ética y proyecto integrador", ["prevención de fraude", "ética"]),
  },
];

const subjectId = await db.createSubjectWithCurriculum({
  code,
  name: "Inversiones: fundamentos y estrategias",
  description: "Curso académico de 40 horas para comprender principios de inversión, instrumentos, análisis, diversificación, prevención de fraude y construcción de portafolios simulados. El contenido es educativo y no constituye asesoría financiera personalizada.",
  period: "2026-2",
  color: "#B69A5E",
  resources: [
    { title: "Introducción a la inversión — Investor.gov", description: "Lectura institucional sobre objetivos, interés compuesto, riesgo, asignación de activos y diversificación.", resourceType: "reading", url: "https://www.investor.gov/introduction-investing" },
    { title: "Conceptos básicos de inversión — FINRA", description: "Lectura sobre valores, objetivos, riesgo, costos, asignación y diversificación.", resourceType: "reading", url: "https://www.finra.org/investors/investing/investing-basics" },
    { title: "Cuestionario de conocimientos de inversión — FINRA", description: "PDF descargable para diagnóstico y práctica de conceptos de inversión.", resourceType: "document", url: "https://www.finra.org/sites/default/files/2023-09/FINRA-Investing-Knowledge-Quiz.pdf" },
    { title: "Cómo evitar estafas de inversión — FINRA", description: "PDF para identificar señales de alerta y prevenir fraudes financieros.", resourceType: "document", url: "https://www.finra.org/sites/default/files/2020-12/how-to-avoid-investment-scams.pdf" },
    { title: "Ciclo de una operación bursátil en línea — FINRA", description: "Infografía PDF sobre el proceso de una orden de compra o venta.", resourceType: "document", url: "https://www.finra.org/sites/default/files/2025-01/Lifecycle_Infographic.pdf" },
    { title: "Asignación de activos y diversificación — FINRA", description: "Video breve de educación al inversor sobre diversificación.", resourceType: "video", url: "https://www.youtube.com/shorts/gq47emDcqek" },
    { title: "Acciones y bonos — Khan Academy", description: "Lecciones y videos sobre capital, deuda, acciones y bonos.", resourceType: "video", url: "https://www.khanacademy.org/economics-finance-domain/core-finance/stock-and-bonds" },
    { title: "Publicaciones gratuitas para inversores — FINRA", description: "Biblioteca de documentos PDF de educación y protección al inversor.", resourceType: "link", url: "https://www.finra.org/investors/free-investor-publications" },
  ],
  competencies: [
    { title: "Formular objetivos de inversión responsables", description: "Relaciona objetivos, horizonte temporal, liquidez y riesgo en escenarios académicos simulados.", level: "basic" },
    { title: "Comparar instrumentos financieros", description: "Distingue acciones, bonos, fondos y ETF mediante sus características, riesgos y costos.", level: "intermediate" },
    { title: "Analizar información financiera verificable", description: "Interpreta fuentes, divulgaciones e indicadores básicos, diferenciando hechos de contenido promocional.", level: "intermediate" },
    { title: "Diseñar un portafolio académico diversificado", description: "Construye una propuesta simulada de asignación de activos y seguimiento coherente con un perfil hipotético.", level: "advanced" },
    { title: "Actuar con ética y prevención de fraude", description: "Identifica señales de alerta, sesgos y prácticas responsables al evaluar alternativas de inversión.", level: "advanced" },
  ],
  modules,
  createdBy: owner.id,
});

const activities = [
  ["Actividad 1 · Perfil de inversión simulado", "Elabora una matriz de objetivos, horizonte temporal y tolerancia al riesgo para tres casos hipotéticos. Justifica cada decisión con conceptos del Módulo 1.", 20],
  ["Actividad 2 · Comparador de instrumentos", "Construye una tabla comparativa de acciones, bonos, fondos y ETF. Incluye riesgo, liquidez, costos y una fuente de información para cada instrumento.", 20],
  ["Actividad 3 · Lectura crítica de información", "Analiza un caso de información financiera simulada. Distingue datos verificables, supuestos y mensajes promocionales, y formula tres preguntas de investigación.", 20],
  ["Actividad 4 · Portafolio académico diversificado", "Diseña un portafolio simulado para un caso definido por el docente. Explica asignación de activos, diversificación, costos y reglas de seguimiento.", 25],
  ["Proyecto final · Plan de inversión simulado y ético", "Presenta un plan académico simulado que integre objetivos, instrumentos, riesgos, fuentes, costos, prevención de fraude y seguimiento. No utilices dinero real ni emitas recomendaciones personalizadas.", 40],
];

for (const [title, description, maxScore] of activities) {
  await db.createActivity({ subjectId, createdBy: owner.id, title, description, maxScore, status: "published", dueAt: null });
}

console.log(`Curso ${code} creado con id ${subjectId}, 40 horas, ${modules.length} módulos y ${activities.length} actividades.`);
