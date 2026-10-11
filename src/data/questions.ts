import raw from './questions.json';

export interface Question {
  id: string;
  mod: number;
  topic: string | null;
  level: 0 | 1 | 2;
  text: string;
  options: [string, string, string, string];
  correct: number; // 0..3
  expl: string;
  source: string;
}

export const QUESTIONS = raw as unknown as Question[];
export const BY_ID: Map<string, Question> = new Map(QUESTIONS.map((q) => [q.id, q]));
