export interface ProverScenarioDefinition {
  id: string;
  name: string;
  description: string;
  targetFile: string;
  recommendedPatch: string;
}

export const PROVER_SCENARIOS: ProverScenarioDefinition[] = [
  {
    id: 'ecommerce_checkout',
    name: 'E-Commerce Checkout 404',
    description: 'Missing /api/checkout route causing unhandled fetch failure',
    targetFile: 'src/app/api/checkout/route.ts',
    recommendedPatch: 'export async function POST() { return Response.json({ success: true, orderId: "ord_123" }); }',
  },
  {
    id: 'ssr_hydration_drift',
    name: 'SSR Hydration Timestamp Drift',
    description: 'Server/client Date.now divergence causing React 19 Hydration Error #418',
    targetFile: 'src/components/HydratedClock.tsx',
    recommendedPatch: 'const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);',
  },
  {
    id: 'sqli_preflight_gate',
    name: 'SQL Injection Preflight Gate',
    description: 'Raw string concatenation blocked by preflight AST security scanner',
    targetFile: 'src/lib/db/query.ts',
    recommendedPatch: 'db.query("SELECT * FROM users WHERE id = $1", [userId]);',
  }
];
