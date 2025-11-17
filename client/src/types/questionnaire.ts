export type ScoringType = "1 to 5" | "Yes/No";

export interface Question {
  id: number;
  pillar: string;
  indicator: string;
  scoring: ScoringType;
  question: string;
}

export interface QuestionnaireResponse {
  questionId: number;
  answer: number | boolean;
}

export interface PillarScore {
  pillar: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

export interface AssessmentResults {
  responses: QuestionnaireResponse[];
  pillarScores: PillarScore[];
  overallScore: number;
  overallPercentage: number;
  completedAt: string;
}
