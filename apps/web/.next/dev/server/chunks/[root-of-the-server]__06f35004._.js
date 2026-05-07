module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/apps/web/src/lib/auth/supabase.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SupabaseAuthProvider",
    ()=>SupabaseAuthProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$3$2e$0_$40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$3$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+ssr@0.3.0_@supabase+supabase-js@2.105.3/node_modules/@supabase/ssr/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$3$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+supabase-js@2.105.3/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.29.0_@opentelemetry+api@1.9.0_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/next/headers.js [app-route] (ecmascript)");
;
;
;
const SUPABASE_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:54331");
const SUPABASE_ANON_KEY = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE_NAME = 'sb-tenant-starter';
function adminClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$3$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false
        }
    });
}
// Look up a user's role within a tenant. JWT claim is the source of truth for
// tenantId; this is just to fetch the role for UI/authorization.
async function membershipRole(userId, tenantId) {
    const { data } = await adminClient().from('tenant_members').select('role').eq('user_id', userId).eq('tenant_id', tenantId).single();
    return data?.role ?? null;
}
class SupabaseAuthProvider {
    async getCurrentUser() {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$3$2e$0_$40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$3$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createServerClient"])(SUPABASE_URL, SUPABASE_ANON_KEY, {
            cookieOptions: {
                name: COOKIE_NAME
            },
            cookies: {
                get (name) {
                    return cookieStore.get(name)?.value;
                },
                set (name, value, options) {
                    try {
                        cookieStore.set(name, value, options);
                    } catch  {
                    /* Server Component */ }
                },
                remove (name, options) {
                    try {
                        cookieStore.set(name, '', {
                            ...options,
                            maxAge: 0
                        });
                    } catch  {
                    /* Server Component */ }
                }
            }
        });
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        const tenantId = user.app_metadata?.active_tenant_id;
        if (!tenantId) return null;
        const role = await membershipRole(user.id, tenantId);
        if (!role) return null; // JWT claim references a tenant the user is no longer in.
        const { data: profile } = await adminClient().from('profiles').select('is_super_admin').eq('id', user.id).single();
        return {
            id: user.id,
            email: user.email ?? '',
            tenantId,
            tenantRole: role,
            isSuperAdmin: profile?.is_super_admin ?? false
        };
    }
    async verifyToken(token) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$3$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false
            }
        });
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        const tenantId = user.app_metadata?.active_tenant_id;
        if (!tenantId) return null;
        const role = await membershipRole(user.id, tenantId);
        if (!role) return null;
        const { data: profile } = await adminClient().from('profiles').select('is_super_admin').eq('id', user.id).single();
        return {
            id: user.id,
            email: user.email ?? '',
            tenantId,
            tenantRole: role,
            isSuperAdmin: profile?.is_super_admin ?? false
        };
    }
}
}),
"[project]/apps/web/src/lib/auth/clerk.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Clerk auth provider stub.
 *
 * To activate:
 *   1. Set AUTH_PROVIDER=clerk in your env files
 *   2. Install: pnpm add @clerk/nextjs @clerk/backend
 *   3. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to your env
 *   4. Wrap your root layout with <ClerkProvider>
 *   5. Implement the methods below using Clerk's server SDK
 *
 * When using Clerk, Supabase is used as DB only (service role key, no RLS).
 * All queries must include explicit .eq('tenant_id', tenantId) filters.
 */ __turbopack_context__.s([
    "ClerkAuthProvider",
    ()=>ClerkAuthProvider
]);
class ClerkAuthProvider {
    async getCurrentUser() {
        // TODO: implement with Clerk
        // import { auth } from '@clerk/nextjs/server';
        // const { userId } = await auth();
        // if (!userId) return null;
        // resolve tenant from tenant_members using service role Supabase client
        throw new Error('ClerkAuthProvider not yet implemented. See apps/web/src/lib/auth/clerk.ts');
    }
    async verifyToken(_token) {
        // TODO: implement with Clerk
        // import { verifyToken } from '@clerk/backend';
        // const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        // resolve tenant from tenant_members using service role Supabase client
        throw new Error('ClerkAuthProvider not yet implemented. See apps/web/src/lib/auth/clerk.ts');
    }
}
}),
"[project]/apps/web/src/lib/auth/factory.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAuthProvider",
    ()=>getAuthProvider
]);
let _provider = null;
function getAuthProvider() {
    if (_provider) return _provider;
    const providerName = process.env.AUTH_PROVIDER ?? 'supabase';
    if (providerName === 'clerk') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ClerkAuthProvider } = __turbopack_context__.r("[project]/apps/web/src/lib/auth/clerk.ts [app-route] (ecmascript)");
        _provider = new ClerkAuthProvider();
    } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { SupabaseAuthProvider } = __turbopack_context__.r("[project]/apps/web/src/lib/auth/supabase.ts [app-route] (ecmascript)");
        _provider = new SupabaseAuthProvider();
    }
    return _provider;
}
}),
"[project]/apps/web/src/lib/auth/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$factory$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/factory.ts [app-route] (ecmascript)");
;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[project]/apps/web/src/lib/billing/stripe.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "stripe",
    ()=>stripe
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$stripe$40$17$2e$7$2e$0$2f$node_modules$2f$stripe$2f$esm$2f$stripe$2e$esm$2e$node$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/stripe@17.7.0/node_modules/stripe/esm/stripe.esm.node.js [app-route] (ecmascript)");
;
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY');
}
const stripe = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$stripe$40$17$2e$7$2e$0$2f$node_modules$2f$stripe$2f$esm$2f$stripe$2e$esm$2e$node$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"](key, {
    // Pin an API version. Update intentionally.
    apiVersion: '2025-02-24.acacia',
    typescript: true
});
}),
"[project]/packages/types/src/agent.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
}),
"[project]/packages/types/src/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
}),
"[project]/packages/types/src/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
}),
"[project]/packages/types/src/api.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
}),
"[project]/packages/types/src/billing.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Billing plans + credit metering. Shared between web and api so they agree on
// what 1 credit means and how to throttle auto-rebills.
//
// To add a plan:
//   1. Create a recurring price in Stripe Dashboard (test + live).
//   2. Add an entry below + a STRIPE_PRICE_<NAME> env var.
//   3. Reference the env var in the entry's `stripePriceId`.
//
// Note on env access: `process.env.STRIPE_PRICE_*` resolves on the server.
// Client-side imports see `null` for these — that's intentional. Only the
// server-side checkout/webhook routes need real price IDs.
__turbopack_context__.s([
    "PAID_PLAN_IDS",
    ()=>PAID_PLAN_IDS,
    "PLANS",
    ()=>PLANS,
    "meterAgentRun",
    ()=>meterAgentRun,
    "planIdFromStripePriceId",
    ()=>planIdFromStripePriceId
]);
const PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        description: 'Try it out',
        priceMonthlyUsd: 0,
        priceAnnualUsd: 0,
        stripePriceId: null,
        stripePriceIdAnnual: null,
        creditsPerCycle: 10,
        features: [
            'api_keys',
            'team_unlimited'
        ],
        limits: {
            teamMembers: 1
        }
    },
    growth: {
        id: 'growth',
        name: 'Growth',
        description: 'For growing teams',
        priceMonthlyUsd: 49,
        priceAnnualUsd: 39,
        stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? null,
        stripePriceIdAnnual: process.env.STRIPE_PRICE_GROWTH_ANNUAL ?? null,
        creditsPerCycle: 4000,
        features: [
            'api_keys',
            'team_unlimited'
        ],
        minRebillIntervalSeconds: 600,
        trialDays: 14
    },
    business: {
        id: 'business',
        name: 'Business',
        description: 'For large teams',
        priceMonthlyUsd: 299,
        priceAnnualUsd: 249,
        stripePriceId: process.env.STRIPE_PRICE_BUSINESS ?? null,
        stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? null,
        creditsPerCycle: 30000,
        features: [
            'api_keys',
            'team_unlimited'
        ],
        minRebillIntervalSeconds: 600
    }
};
const PAID_PLAN_IDS = [
    'growth',
    'business'
];
function meterAgentRun(_run) {
    return 1;
}
function planIdFromStripePriceId(priceId) {
    for (const plan of Object.values(PLANS)){
        if (plan.stripePriceId === priceId) return plan.id;
    }
    return null;
}
}),
"[project]/packages/types/src/leads.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
}),
"[project]/packages/types/src/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/types/src/agent.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/types/src/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/types/src/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/types/src/api.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/types/src/billing.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$leads$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/types/src/leads.ts [app-route] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/apps/web/src/lib/supabase/admin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAdminClient",
    ()=>createAdminClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$3$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+supabase-js@2.105.3/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
function createAdminClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$3$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "http://127.0.0.1:54331"), process.env.SUPABASE_SERVICE_ROLE_KEY);
}
}),
"[project]/apps/web/src/lib/billing/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "consumeCredits",
    ()=>consumeCredits,
    "ensureStripeCustomer",
    ()=>ensureStripeCustomer,
    "getCurrentPlan",
    ()=>getCurrentPlan,
    "getSubscription",
    ()=>getSubscription,
    "hasFeature",
    ()=>hasFeature
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/types/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/types/src/billing.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/supabase/admin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$billing$2f$stripe$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/billing/stripe.ts [app-route] (ecmascript)");
;
;
;
async function getSubscription(supabase) {
    const { data } = await supabase.from('subscriptions').select('*').single();
    return data ?? null;
}
async function getCurrentPlan(supabase) {
    const sub = await getSubscription(supabase);
    if (!sub) return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLANS"].free;
    // Downgrade to free if billing is broken — RLS already scopes to tenant.
    if (sub.status === 'canceled' || sub.status === 'past_due') return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLANS"].free;
    return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLANS"][sub.plan_id] ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLANS"].free;
}
async function hasFeature(supabase, feature) {
    const plan = await getCurrentPlan(supabase);
    return plan.features.includes(feature);
}
async function consumeCredits(tenantId, amount) {
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // 1. Atomic decrement.
    const { data: ok } = await admin.rpc('consume_credits', {
        p_tenant_id: tenantId,
        p_amount: amount
    });
    if (ok === true) {
        const { data: sub } = await admin.from('subscriptions').select('credits_remaining').eq('tenant_id', tenantId).single();
        return {
            ok: true,
            remaining: sub?.credits_remaining ?? 0
        };
    }
    // 2. Insufficient. Look up the row to decide whether to rebill.
    const { data: sub } = await admin.from('subscriptions').select('*').eq('tenant_id', tenantId).single();
    if (!sub) return {
        ok: false,
        reason: 'no_payment_method'
    };
    // Free tier or no Stripe subscription → can't rebill.
    if (!sub.stripe_subscription_id || sub.plan_id === 'free') {
        return {
            ok: false,
            reason: 'no_payment_method'
        };
    }
    if (!sub.auto_rebill_enabled) {
        return {
            ok: false,
            reason: 'rebill_failed'
        };
    }
    // 3. Throttle.
    const minInterval = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLANS"][sub.plan_id].minRebillIntervalSeconds ?? 600;
    if (sub.last_rebill_at && Date.now() - new Date(sub.last_rebill_at).getTime() < minInterval * 1000) {
        return {
            ok: false,
            reason: 'throttled'
        };
    }
    // 4. Trigger Stripe to invoice now. Webhook will replenish credits on success.
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$billing$2f$stripe$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stripe"].subscriptions.update(sub.stripe_subscription_id, {
            billing_cycle_anchor: 'now',
            proration_behavior: 'none'
        });
        await admin.from('subscriptions').update({
            last_rebill_at: new Date().toISOString()
        }).eq('tenant_id', tenantId);
        // Credits aren't replenished yet — webhook does that. Caller should retry shortly.
        return {
            ok: false,
            reason: 'rebill_triggered'
        };
    } catch  {
        return {
            ok: false,
            reason: 'rebill_failed'
        };
    }
}
async function ensureStripeCustomer(tenantId, email) {
    const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id').eq('tenant_id', tenantId).single();
    if (sub?.stripe_customer_id) return sub.stripe_customer_id;
    const customer = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$billing$2f$stripe$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stripe"].customers.create({
        email,
        metadata: {
            tenant_id: tenantId
        }
    });
    await admin.from('subscriptions').update({
        stripe_customer_id: customer.id
    }).eq('tenant_id', tenantId);
    return customer.id;
}
}),
"[project]/apps/web/src/app/api/billing/checkout/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.29.0_@opentelemetry+api@1.9.0_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$factory$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/factory.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$billing$2f$stripe$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/billing/stripe.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$billing$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/billing/index.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/types/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/types/src/billing.ts [app-route] (ecmascript)");
;
;
;
;
;
async function POST(request) {
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$factory$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAuthProvider"])().getCurrentUser();
    if (!user) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: 'Unauthorized'
    }, {
        status: 401
    });
    if (user.tenantRole === 'member') {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Only owners and admins can manage billing'
        }, {
            status: 403
        });
    }
    const body = await request.json().catch(()=>({}));
    const planId = body.planId;
    if (!planId || !(planId in __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLANS"]) || planId === 'free') {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Invalid planId'
        }, {
            status: 400
        });
    }
    const plan = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$types$2f$src$2f$billing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLANS"][planId];
    if (!plan.stripePriceId) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: `Plan ${planId} has no Stripe price ID configured`
        }, {
            status: 400
        });
    }
    const customerId = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$billing$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureStripeCustomer"])(user.tenantId, user.email);
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3002';
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$billing$2f$stripe$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stripe"].checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: user.tenantId,
        line_items: [
            {
                price: plan.stripePriceId,
                quantity: 1
            }
        ],
        subscription_data: {
            metadata: {
                tenant_id: user.tenantId
            },
            ...plan.trialDays ? {
                trial_period_days: plan.trialDays
            } : {}
        },
        automatic_tax: {
            enabled: true
        },
        allow_promotion_codes: true,
        success_url: `${webUrl}/settings/billing?checkout=success`,
        cancel_url: `${webUrl}/settings/billing?checkout=cancel`
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        url: session.url
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__06f35004._.js.map