/**
 * Inference Parameter Configuration
 * Contains all model inference parameters for text generation
 */

export interface CompletionParams {
  n_predict: number;
  temperature: number;
  top_k: number;
  top_p: number;
  min_p: number;
  xtc_threshold: number;
  xtc_probability: number;
  typical_p: number;
  penalty_last_n: number;
  seed: number;
}

export const InferenceParameters: CompletionParams = {
  n_predict: 1024,        // Maximum response length in tokens
  temperature: 0.7,       // Creativity balance (0.0 = deterministic, 1.0 = creative)
  top_k: 40,              // Vocabulary diversity (limits token choices)
  top_p: 0.95,            // Nucleus sampling (cumulative probability threshold)
  min_p: 0.05,            // Minimum probability threshold for tokens
  xtc_threshold: 0.05,    // Exclude top choices threshold
  xtc_probability: 0,     // XTC probability (disabled)
  typical_p: 1,           // Typical sampling parameter
  penalty_last_n: 64,     // Repetition penalty window (last N tokens)
  seed: -1,               // Random seed (-1 = random)
};

export default InferenceParameters;
