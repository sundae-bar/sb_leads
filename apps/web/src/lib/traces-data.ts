export type StepType = "llm-call" | "tool-call" | "tool-result" | "text-output" | "error"

export interface TraceStep {
  id: string
  type: StepType
  name: string
  startedAt: string
  duration: number // ms
  input?: string
  output?: string
  // LLM-specific
  model?: string
  promptTokens?: number
  completionTokens?: number
  // Tool-specific
  toolName?: string
  args?: string
  result?: string
}

export interface Trace {
  id: string
  name: string
  status: "success" | "error" | "running"
  model: string
  totalTokens: number
  promptTokens: number
  completionTokens: number
  duration: number // ms
  startedAt: string
  steps: TraceStep[]
  totalSteps: number
}

export const traces: Trace[] = [
  {
    id: "trace-001",
    name: "Search and summarize recent news",
    status: "success",
    model: "gpt-4o",
    totalTokens: 3842,
    promptTokens: 2156,
    completionTokens: 1686,
    duration: 4320,
    startedAt: "2026-03-05T09:12:00Z",
    totalSteps: 6,
    steps: [
      {
        id: "step-001-1",
        type: "llm-call",
        name: "Initial planning",
        startedAt: "2026-03-05T09:12:00Z",
        duration: 820,
        model: "gpt-4o",
        promptTokens: 340,
        completionTokens: 128,
        input: JSON.stringify({ role: "user", content: "Find and summarize the latest news about AI regulation in Europe." }, null, 2),
        output: "I'll search for recent news about AI regulation in Europe and provide a comprehensive summary."
      },
      {
        id: "step-001-2",
        type: "tool-call",
        name: "web_search",
        startedAt: "2026-03-05T09:12:01Z",
        duration: 1200,
        toolName: "web_search",
        args: JSON.stringify({ query: "AI regulation Europe 2026 latest news", maxResults: 5 }, null, 2),
      },
      {
        id: "step-001-3",
        type: "tool-result",
        name: "web_search result",
        startedAt: "2026-03-05T09:12:02Z",
        duration: 10,
        result: JSON.stringify({
          results: [
            { title: "EU AI Act enforcement begins for high-risk systems", url: "https://example.com/eu-ai-act", snippet: "The European Union has started enforcing compliance requirements..." },
            { title: "France proposes amendments to AI liability framework", url: "https://example.com/france-ai", snippet: "French regulators have proposed new amendments..." },
            { title: "Germany's BSI releases AI security guidelines", url: "https://example.com/germany-bsi", snippet: "The Federal Office for Information Security..." }
          ]
        }, null, 2),
      },
      {
        id: "step-001-4",
        type: "tool-call",
        name: "fetch_page",
        startedAt: "2026-03-05T09:12:02Z",
        duration: 890,
        toolName: "fetch_page",
        args: JSON.stringify({ url: "https://example.com/eu-ai-act" }, null, 2),
      },
      {
        id: "step-001-5",
        type: "tool-result",
        name: "fetch_page result",
        startedAt: "2026-03-05T09:12:03Z",
        duration: 10,
        result: "The European Union has officially begun enforcement of the AI Act for high-risk systems as of February 2026. Companies deploying AI in healthcare, law enforcement, and critical infrastructure must now demonstrate compliance with transparency and safety requirements. Non-compliant organizations face fines up to 35 million EUR or 7% of global annual turnover...",
      },
      {
        id: "step-001-6",
        type: "llm-call",
        name: "Generate summary",
        startedAt: "2026-03-05T09:12:03Z",
        duration: 1390,
        model: "gpt-4o",
        promptTokens: 1816,
        completionTokens: 1558,
        input: "System context + search results + fetched article content",
        output: "## AI Regulation in Europe - March 2026 Update\n\n**EU AI Act Enforcement Begins:** The European Union has officially started enforcing its landmark AI Act for high-risk systems. Companies operating in healthcare, law enforcement, and critical infrastructure are now required to meet strict transparency and safety standards.\n\n**France Proposes Liability Amendments:** French regulators are pushing for expanded liability frameworks that would hold AI developers accountable for downstream harms.\n\n**Germany's Security Guidelines:** The BSI has released comprehensive security guidelines for AI systems deployed in public-facing applications."
      }
    ]
  },
  {
    id: "trace-002",
    name: "Code generation with review",
    status: "success",
    model: "claude-3.5-sonnet",
    totalTokens: 5210,
    promptTokens: 2890,
    completionTokens: 2320,
    duration: 6750,
    startedAt: "2026-03-05T08:45:00Z",
    totalSteps: 5,
    steps: [
      {
        id: "step-002-1",
        type: "llm-call",
        name: "Understand requirements",
        startedAt: "2026-03-05T08:45:00Z",
        duration: 950,
        model: "claude-3.5-sonnet",
        promptTokens: 520,
        completionTokens: 185,
        input: JSON.stringify({ role: "user", content: "Write a TypeScript function that implements a debounce utility with cancel and flush support." }, null, 2),
        output: "I'll create a comprehensive debounce utility with TypeScript generics, cancel, and flush methods."
      },
      {
        id: "step-002-2",
        type: "llm-call",
        name: "Generate code",
        startedAt: "2026-03-05T08:45:01Z",
        duration: 2200,
        model: "claude-3.5-sonnet",
        promptTokens: 890,
        completionTokens: 920,
        input: "Generate implementation based on requirements analysis",
        output: "```typescript\ninterface DebouncedFunction<T extends (...args: any[]) => any> {\n  (...args: Parameters<T>): void;\n  cancel: () => void;\n  flush: () => ReturnType<T> | undefined;\n}\n\nexport function debounce<T extends (...args: any[]) => any>(\n  func: T,\n  wait: number\n): DebouncedFunction<T> {\n  let timeoutId: ReturnType<typeof setTimeout> | null = null;\n  let lastArgs: Parameters<T> | null = null;\n  let lastResult: ReturnType<T> | undefined;\n\n  const debounced = (...args: Parameters<T>) => {\n    lastArgs = args;\n    if (timeoutId) clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => {\n      lastResult = func(...args);\n      lastArgs = null;\n      timeoutId = null;\n    }, wait);\n  };\n\n  debounced.cancel = () => {\n    if (timeoutId) clearTimeout(timeoutId);\n    timeoutId = null;\n    lastArgs = null;\n  };\n\n  debounced.flush = () => {\n    if (timeoutId && lastArgs) {\n      clearTimeout(timeoutId);\n      lastResult = func(...lastArgs);\n      timeoutId = null;\n      lastArgs = null;\n    }\n    return lastResult;\n  };\n\n  return debounced as DebouncedFunction<T>;\n}\n```"
      },
      {
        id: "step-002-3",
        type: "tool-call",
        name: "code_review",
        startedAt: "2026-03-05T08:45:03Z",
        duration: 450,
        toolName: "code_review",
        args: JSON.stringify({ code: "debounce implementation", language: "typescript", checks: ["types", "edge-cases", "memory-leaks"] }, null, 2),
      },
      {
        id: "step-002-4",
        type: "tool-result",
        name: "code_review result",
        startedAt: "2026-03-05T08:45:04Z",
        duration: 10,
        result: JSON.stringify({ passed: true, issues: [], suggestions: ["Consider adding leading/trailing options", "Add JSDoc comments for public API"] }, null, 2),
      },
      {
        id: "step-002-5",
        type: "llm-call",
        name: "Final response",
        startedAt: "2026-03-05T08:45:04Z",
        duration: 3140,
        model: "claude-3.5-sonnet",
        promptTokens: 1480,
        completionTokens: 1215,
        input: "Incorporate review feedback and produce final response",
        output: "Here's the complete debounce utility with full TypeScript support, cancel/flush methods, and JSDoc documentation. The implementation handles edge cases properly and avoids memory leaks by cleaning up timeout references."
      }
    ]
  },
  {
    id: "trace-003",
    name: "Weather agent with multi-city lookup",
    status: "success",
    model: "gpt-4o-mini",
    totalTokens: 2180,
    promptTokens: 1240,
    completionTokens: 940,
    duration: 3100,
    startedAt: "2026-03-05T07:30:00Z",
    totalSteps: 7,
    steps: [
      {
        id: "step-003-1",
        type: "llm-call",
        name: "Parse user request",
        startedAt: "2026-03-05T07:30:00Z",
        duration: 380,
        model: "gpt-4o-mini",
        promptTokens: 210,
        completionTokens: 95,
        input: JSON.stringify({ role: "user", content: "Compare the weather in Tokyo, London, and New York right now." }, null, 2),
        output: "I'll fetch the current weather for all three cities and compare them."
      },
      {
        id: "step-003-2",
        type: "tool-call",
        name: "get_weather (Tokyo)",
        startedAt: "2026-03-05T07:30:00Z",
        duration: 320,
        toolName: "get_weather",
        args: JSON.stringify({ city: "Tokyo", units: "metric" }, null, 2),
      },
      {
        id: "step-003-3",
        type: "tool-result",
        name: "get_weather result",
        startedAt: "2026-03-05T07:30:01Z",
        duration: 5,
        result: JSON.stringify({ city: "Tokyo", temp: 14, condition: "Partly Cloudy", humidity: 62, wind: "12 km/h NW" }, null, 2),
      },
      {
        id: "step-003-4",
        type: "tool-call",
        name: "get_weather (London)",
        startedAt: "2026-03-05T07:30:01Z",
        duration: 410,
        toolName: "get_weather",
        args: JSON.stringify({ city: "London", units: "metric" }, null, 2),
      },
      {
        id: "step-003-5",
        type: "tool-result",
        name: "get_weather result",
        startedAt: "2026-03-05T07:30:01Z",
        duration: 5,
        result: JSON.stringify({ city: "London", temp: 8, condition: "Overcast", humidity: 78, wind: "22 km/h W" }, null, 2),
      },
      {
        id: "step-003-6",
        type: "tool-call",
        name: "get_weather (New York)",
        startedAt: "2026-03-05T07:30:02Z",
        duration: 380,
        toolName: "get_weather",
        args: JSON.stringify({ city: "New York", units: "metric" }, null, 2),
      },
      {
        id: "step-003-7",
        type: "llm-call",
        name: "Compose comparison",
        startedAt: "2026-03-05T07:30:02Z",
        duration: 1600,
        model: "gpt-4o-mini",
        promptTokens: 1030,
        completionTokens: 845,
        input: "Weather data for all 3 cities + user request",
        output: "Here's the weather comparison:\n\n| City | Temp | Condition | Humidity | Wind |\n|------|------|-----------|----------|------|\n| Tokyo | 14C | Partly Cloudy | 62% | 12 km/h NW |\n| London | 8C | Overcast | 78% | 22 km/h W |\n| New York | 3C | Light Snow | 85% | 18 km/h NE |\n\nTokyo is the warmest at 14C with pleasant conditions. New York is experiencing light snow."
      }
    ]
  },
  {
    id: "trace-004",
    name: "Database query builder",
    status: "error",
    model: "gpt-4o",
    totalTokens: 1560,
    promptTokens: 980,
    completionTokens: 580,
    duration: 2800,
    startedAt: "2026-03-04T22:15:00Z",
    totalSteps: 4,
    steps: [
      {
        id: "step-004-1",
        type: "llm-call",
        name: "Analyze schema",
        startedAt: "2026-03-04T22:15:00Z",
        duration: 650,
        model: "gpt-4o",
        promptTokens: 420,
        completionTokens: 210,
        input: JSON.stringify({ role: "user", content: "Generate a SQL query to find all users who signed up in the last 30 days and have more than 5 orders." }, null, 2),
        output: "I'll construct the query by first fetching the database schema to ensure accuracy."
      },
      {
        id: "step-004-2",
        type: "tool-call",
        name: "get_schema",
        startedAt: "2026-03-04T22:15:01Z",
        duration: 280,
        toolName: "get_schema",
        args: JSON.stringify({ tables: ["users", "orders"] }, null, 2),
      },
      {
        id: "step-004-3",
        type: "tool-result",
        name: "get_schema result",
        startedAt: "2026-03-04T22:15:01Z",
        duration: 5,
        result: JSON.stringify({ error: "Connection refused: Unable to connect to database at host 'db.internal:5432'. Connection timed out after 10000ms." }, null, 2),
      },
      {
        id: "step-004-4",
        type: "error",
        name: "Tool execution failed",
        startedAt: "2026-03-04T22:15:01Z",
        duration: 1865,
        input: "Attempted to retry get_schema tool",
        output: "Error: Database connection failed after 3 retry attempts. The database server at db.internal:5432 is unreachable. Please check your connection configuration and ensure the database is running."
      }
    ]
  },
  {
    id: "trace-005",
    name: "Document analysis and extraction",
    status: "success",
    model: "gpt-4o",
    totalTokens: 8420,
    promptTokens: 6100,
    completionTokens: 2320,
    duration: 9200,
    startedAt: "2026-03-04T18:00:00Z",
    totalSteps: 5,
    steps: [
      {
        id: "step-005-1",
        type: "llm-call",
        name: "Analyze document structure",
        startedAt: "2026-03-04T18:00:00Z",
        duration: 1200,
        model: "gpt-4o",
        promptTokens: 3200,
        completionTokens: 380,
        input: "PDF document content (quarterly financial report, 12 pages)",
        output: "I've analyzed the document structure. It contains: Executive Summary, Revenue Breakdown, Operating Expenses, Balance Sheet, Cash Flow Statement, and Forward Guidance sections."
      },
      {
        id: "step-005-2",
        type: "tool-call",
        name: "extract_tables",
        startedAt: "2026-03-04T18:00:01Z",
        duration: 2400,
        toolName: "extract_tables",
        args: JSON.stringify({ sections: ["Revenue Breakdown", "Operating Expenses", "Balance Sheet"], format: "structured_json" }, null, 2),
      },
      {
        id: "step-005-3",
        type: "tool-result",
        name: "extract_tables result",
        startedAt: "2026-03-04T18:00:04Z",
        duration: 15,
        result: JSON.stringify({
          tables_extracted: 4,
          revenue: { q1: "$12.4M", q2: "$14.1M", q3: "$15.8M", q4: "$18.2M" },
          total_revenue: "$60.5M",
          yoy_growth: "23.4%"
        }, null, 2),
      },
      {
        id: "step-005-4",
        type: "tool-call",
        name: "calculate_metrics",
        startedAt: "2026-03-04T18:00:04Z",
        duration: 180,
        toolName: "calculate_metrics",
        args: JSON.stringify({ metrics: ["gross_margin", "operating_margin", "net_income_ratio"], data_source: "extracted_tables" }, null, 2),
      },
      {
        id: "step-005-5",
        type: "llm-call",
        name: "Generate report summary",
        startedAt: "2026-03-04T18:00:04Z",
        duration: 5405,
        model: "gpt-4o",
        promptTokens: 2900,
        completionTokens: 1940,
        input: "Extracted tables + calculated metrics + original document context",
        output: "## Q4 2025 Financial Summary\n\n**Revenue:** $60.5M total for FY2025, representing 23.4% YoY growth. Q4 was the strongest quarter at $18.2M.\n\n**Margins:** Gross margin improved to 72.3% (up from 68.1% in FY2024). Operating margin at 18.5%.\n\n**Key Highlights:**\n- Net income of $8.2M, up 31% from prior year\n- Cash reserves of $24.3M with zero debt\n- Customer acquisition cost decreased 15% while LTV increased 22%"
      }
    ]
  },
  {
    id: "trace-006",
    name: "Email draft with tone adjustment",
    status: "success",
    model: "gpt-4o-mini",
    totalTokens: 1890,
    promptTokens: 1020,
    completionTokens: 870,
    duration: 2100,
    startedAt: "2026-03-04T16:30:00Z",
    totalSteps: 3,
    steps: [
      {
        id: "step-006-1",
        type: "llm-call",
        name: "Draft initial email",
        startedAt: "2026-03-04T16:30:00Z",
        duration: 800,
        model: "gpt-4o-mini",
        promptTokens: 340,
        completionTokens: 420,
        input: JSON.stringify({ role: "user", content: "Write a professional email declining a meeting request due to scheduling conflicts, but suggest alternative times next week." }, null, 2),
        output: "Subject: Re: Meeting Request - Alternative Times\n\nDear [Name],\n\nThank you for reaching out. Unfortunately, I have a scheduling conflict at the proposed time. I'd love to connect and would like to suggest the following alternatives:\n\n- Tuesday, March 10 at 2:00 PM\n- Wednesday, March 11 at 10:00 AM\n- Thursday, March 12 at 3:30 PM\n\nPlease let me know if any of these work for you.\n\nBest regards"
      },
      {
        id: "step-006-2",
        type: "tool-call",
        name: "tone_analyzer",
        startedAt: "2026-03-04T16:30:01Z",
        duration: 320,
        toolName: "tone_analyzer",
        args: JSON.stringify({ text: "email draft content", target_tone: "warm-professional", check_for: ["passive-aggressive", "overly-formal"] }, null, 2),
      },
      {
        id: "step-006-3",
        type: "llm-call",
        name: "Final polished email",
        startedAt: "2026-03-04T16:30:01Z",
        duration: 980,
        model: "gpt-4o-mini",
        promptTokens: 680,
        completionTokens: 450,
        input: "Tone analysis feedback + original draft",
        output: "Subject: Re: Meeting Request - Let's Find a Time!\n\nHi [Name],\n\nThanks so much for the meeting invite! I'm really looking forward to discussing this with you, though I unfortunately have a conflict at the suggested time.\n\nWould any of these work instead?\n\n- Tuesday, March 10 at 2:00 PM\n- Wednesday, March 11 at 10:00 AM\n- Thursday, March 12 at 3:30 PM\n\nHappy to work around your schedule if none of these fit. Looking forward to connecting!\n\nWarm regards"
      }
    ]
  },
  {
    id: "trace-007",
    name: "Image analysis and captioning",
    status: "running",
    model: "gpt-4o",
    totalTokens: 1240,
    promptTokens: 890,
    completionTokens: 350,
    duration: 1800,
    startedAt: "2026-03-05T09:14:00Z",
    totalSteps: 3,
    steps: [
      {
        id: "step-007-1",
        type: "llm-call",
        name: "Analyze image content",
        startedAt: "2026-03-05T09:14:00Z",
        duration: 1100,
        model: "gpt-4o",
        promptTokens: 650,
        completionTokens: 240,
        input: "[Image: product-photo-001.jpg, 2048x1536px]",
        output: "The image shows a minimalist desk setup with a laptop, ceramic coffee mug, potted succulent, and a leather notebook on a light wood surface. Natural lighting from a window on the left."
      },
      {
        id: "step-007-2",
        type: "tool-call",
        name: "generate_caption",
        startedAt: "2026-03-05T09:14:01Z",
        duration: 450,
        toolName: "generate_caption",
        args: JSON.stringify({ style: "social-media", platform: "instagram", include_hashtags: true, max_length: 280 }, null, 2),
      },
      {
        id: "step-007-3",
        type: "tool-call",
        name: "generate_alt_text",
        startedAt: "2026-03-05T09:14:02Z",
        duration: 250,
        toolName: "generate_alt_text",
        args: JSON.stringify({ context: "e-commerce product listing", max_length: 150 }, null, 2),
      }
    ]
  },
  {
    id: "trace-008",
    name: "Data pipeline: CSV transform",
    status: "success",
    model: "gpt-4o-mini",
    totalTokens: 3100,
    promptTokens: 2200,
    completionTokens: 900,
    duration: 5400,
    startedAt: "2026-03-04T14:00:00Z",
    totalSteps: 6,
    steps: [
      {
        id: "step-008-1",
        type: "llm-call",
        name: "Parse requirements",
        startedAt: "2026-03-04T14:00:00Z",
        duration: 520,
        model: "gpt-4o-mini",
        promptTokens: 280,
        completionTokens: 120,
        input: JSON.stringify({ role: "user", content: "Clean this CSV: normalize phone numbers to E.164 format, deduplicate by email, and flag rows with missing required fields." }, null, 2),
        output: "I'll process the CSV in stages: first validate required fields, then normalize phone numbers, and finally deduplicate."
      },
      {
        id: "step-008-2",
        type: "tool-call",
        name: "validate_csv",
        startedAt: "2026-03-04T14:00:01Z",
        duration: 890,
        toolName: "validate_csv",
        args: JSON.stringify({ required_fields: ["name", "email", "phone"], file: "contacts.csv", rows: 2847 }, null, 2),
      },
      {
        id: "step-008-3",
        type: "tool-result",
        name: "validate_csv result",
        startedAt: "2026-03-04T14:00:02Z",
        duration: 10,
        result: JSON.stringify({ total_rows: 2847, valid: 2634, missing_name: 42, missing_email: 89, missing_phone: 82 }, null, 2),
      },
      {
        id: "step-008-4",
        type: "tool-call",
        name: "transform_phones",
        startedAt: "2026-03-04T14:00:02Z",
        duration: 1400,
        toolName: "transform_phones",
        args: JSON.stringify({ format: "E.164", default_country: "US", column: "phone" }, null, 2),
      },
      {
        id: "step-008-5",
        type: "tool-call",
        name: "deduplicate",
        startedAt: "2026-03-04T14:00:03Z",
        duration: 1200,
        toolName: "deduplicate",
        args: JSON.stringify({ key: "email", strategy: "keep_latest", merge_fields: ["phone", "name"] }, null, 2),
      },
      {
        id: "step-008-6",
        type: "llm-call",
        name: "Generate summary report",
        startedAt: "2026-03-04T14:00:05Z",
        duration: 1380,
        model: "gpt-4o-mini",
        promptTokens: 1920,
        completionTokens: 780,
        input: "Transformation results from all pipeline stages",
        output: "## CSV Processing Complete\n\n**Input:** 2,847 rows\n**Output:** 2,391 clean rows\n\n**Changes Made:**\n- Flagged 213 rows with missing required fields\n- Normalized 2,634 phone numbers to E.164 format\n- Removed 243 duplicate entries (by email)\n- Merged data for 18 partial duplicates\n\nThe cleaned file is ready for download."
      }
    ]
  },
  {
    id: "trace-009",
    name: "Translation with context preservation",
    status: "success",
    model: "claude-3.5-sonnet",
    totalTokens: 2650,
    promptTokens: 1480,
    completionTokens: 1170,
    duration: 3800,
    startedAt: "2026-03-04T11:20:00Z",
    totalSteps: 4,
    steps: [
      {
        id: "step-009-1",
        type: "llm-call",
        name: "Detect language and context",
        startedAt: "2026-03-04T11:20:00Z",
        duration: 600,
        model: "claude-3.5-sonnet",
        promptTokens: 380,
        completionTokens: 145,
        input: JSON.stringify({ role: "user", content: "Translate this marketing copy to Japanese, maintaining the playful brand voice: 'Your mornings just got a whole lot brighter. Wake up to coffee that actually tastes like it was made by someone who cares.'" }, null, 2),
        output: "Detected: English marketing copy with casual/playful tone. Target: Japanese. I'll preserve the warmth and colloquial feel while adapting cultural nuances."
      },
      {
        id: "step-009-2",
        type: "tool-call",
        name: "glossary_lookup",
        startedAt: "2026-03-04T11:20:01Z",
        duration: 200,
        toolName: "glossary_lookup",
        args: JSON.stringify({ brand: "default", terms: ["mornings", "brighter", "coffee"], target_lang: "ja" }, null, 2),
      },
      {
        id: "step-009-3",
        type: "llm-call",
        name: "Generate translation",
        startedAt: "2026-03-04T11:20:01Z",
        duration: 1800,
        model: "claude-3.5-sonnet",
        promptTokens: 720,
        completionTokens: 580,
        input: "Source text + glossary terms + tone guidelines",
        output: "Translation with back-translation provided for verification."
      },
      {
        id: "step-009-4",
        type: "llm-call",
        name: "Quality check and back-translate",
        startedAt: "2026-03-04T11:20:03Z",
        duration: 1200,
        model: "claude-3.5-sonnet",
        promptTokens: 380,
        completionTokens: 445,
        input: "Japanese translation for quality verification",
        output: "Quality score: 9.2/10\n\nBack-translation: 'Your mornings have become much more radiant. Wake up to coffee that truly tastes like it was brewed by someone with heart.'\n\nThe translation maintains the playful, warm brand voice while feeling natural in Japanese. Minor cultural adaptation: 'someone who cares' was adjusted to convey craftsmanship and heart."
      }
    ]
  }
]

export function getTrace(id: string): Trace | undefined {
  return traces.find(t => t.id === id)
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date("2026-03-05T09:15:00Z")
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}

export function formatTokens(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return count.toString()
}
