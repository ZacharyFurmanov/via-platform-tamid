// Central AI model config — one place to tier/swap models instead of hunting across
// files. Every value is env-overridable, so you can experiment (or roll back) without a
// code change. Rule of thumb: Sonnet for quality-critical / customer-facing / agentic
// work; Haiku for mechanical, internal, low-volume tasks where a cheaper model won't show.
export const AI_MODELS = {
 /** Listing drafter — title, description, fields from photos. Customer-facing. */
 intake: process.env.AI_MODEL_INTAKE || "claude-sonnet-4-6",
 /** Price valuation from comps. High-stakes (sets the price). */
 pricing: process.env.AI_MODEL_PRICING || "claude-sonnet-4-6",
 /** Seller Sidekick tool-use agent — needs strong agentic reasoning. */
 assistant: process.env.AI_MODEL_ASSISTANT || "claude-sonnet-4-6",
 /** Whole-storefront generator. Rare, customer-facing. */
 storefront: process.env.AI_MODEL_STOREFRONT || "claude-sonnet-4-6",
 /** Store writing-voice extractor — internal, mechanical, low-volume → cheaper. */
 voice: process.env.AI_MODEL_VOICE || "claude-haiku-4-5-20251001",
 /** Store profiler (currently dormant). Internal. */
 storeProfile: process.env.AI_MODEL_STORE_PROFILE || "claude-sonnet-4-6",
} as const;
