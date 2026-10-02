import type {
  AiQueryPlan,
} from './ai-query-plan.interface.js';

export interface AiProvider {
  interpret(
    question: string,
  ): Promise<AiQueryPlan>;
}