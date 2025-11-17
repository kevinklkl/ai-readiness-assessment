import { QUESTIONS } from "@/data/questions";
import { QuestionnaireResponse, PillarScore, AssessmentResults } from "@/types/questionnaire";

export function calculateResults(responses: QuestionnaireResponse[]): AssessmentResults {
  const responseMap = new Map(responses.map(r => [r.questionId, r.answer]));
  
  // Group questions by pillar
  const pillarGroups = new Map<string, typeof QUESTIONS>();
  QUESTIONS.forEach(q => {
    if (!pillarGroups.has(q.pillar)) {
      pillarGroups.set(q.pillar, []);
    }
    pillarGroups.get(q.pillar)!.push(q);
  });

  // Calculate scores for each pillar
  const pillarScores: PillarScore[] = [];
  let totalScore = 0;
  let totalMaxScore = 0;

  pillarGroups.forEach((questions, pillar) => {
    let pillarScore = 0;
    let pillarMaxScore = 0;

    questions.forEach(q => {
      const answer = responseMap.get(q.id);
      if (answer !== undefined) {
        if (q.scoring === "1 to 5") {
          pillarScore += answer as number;
          pillarMaxScore += 5;
        } else {
          // Yes/No questions: Yes = 1, No = 0
          pillarScore += answer ? 1 : 0;
          pillarMaxScore += 1;
        }
      }
    });

    const percentage = pillarMaxScore > 0 ? (pillarScore / pillarMaxScore) * 100 : 0;

    pillarScores.push({
      pillar,
      score: pillarScore,
      maxScore: pillarMaxScore,
      percentage,
      questionCount: questions.length
    });

    // Don't include EU AI Act Compliance in overall score
    if (pillar !== "EU AI Act Compliance") {
      totalScore += pillarScore;
      totalMaxScore += pillarMaxScore;
    }
  });

  const overallPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  return {
    responses,
    pillarScores,
    overallScore: totalScore,
    overallPercentage,
    completedAt: new Date().toISOString()
  };
}

export function getReadinessLevel(percentage: number): {
  status: string;
  color: string;
  description: string;
} {
  if (percentage >= 80) {
    return {
      status: "Advanced",
      color: "text-accent",
      description: "Your organization demonstrates strong AI readiness with mature processes and capabilities."
    };
  } else if (percentage >= 60) {
    return {
      status: "Intermediate",
      color: "text-primary",
      description: "Your organization has a solid foundation but there are opportunities for improvement."
    };
  } else if (percentage >= 40) {
    return {
      status: "Developing",
      color: "text-yellow-600",
      description: "Your organization is building AI capabilities but significant gaps remain."
    };
  } else {
    return {
      status: "Early Stage",
      color: "text-orange-600",
      description: "Your organization is at the beginning of its AI journey with substantial work needed."
    };
  }
}

export function getComplianceStatus(pillarScore: PillarScore): {
  status: string;
  color: string;
  description: string;
} {
  const { percentage } = pillarScore;
  
  if (pillarScore.pillar === "EU AI Act Compliance") {
    // For compliance, we're stricter
    if (percentage >= 90) {
      return {
        status: "Compliant",
        color: "text-accent",
        description: "Strong compliance posture with minimal risk areas."
      };
    } else if (percentage >= 70) {
      return {
        status: "Mostly Compliant",
        color: "text-primary",
        description: "Good compliance foundation with some areas requiring attention."
      };
    } else if (percentage >= 50) {
      return {
        status: "Partial Compliance",
        color: "text-yellow-600",
        description: "Significant compliance gaps that need to be addressed."
      };
    } else {
      return {
        status: "Non-Compliant",
        color: "text-destructive",
        description: "Critical compliance issues requiring immediate action."
      };
    }
  }
  
  return getReadinessLevel(percentage);
}

export function getHighestRiskFactors(responses: QuestionnaireResponse[]): {
  critical: Array<{ indicator: string; question: string }>;
  important: Array<{ indicator: string; question: string }>;
  minimal: Array<{ indicator: string; question: string }>;
  highestRisk: string;
} {
  const responseMap = new Map(responses.map(r => [r.questionId, r.answer]));
  const euQuestions = QUESTIONS.filter(q => q.pillar === "EU AI Act Compliance");
  
  const critical: Array<{ indicator: string; question: string }> = [];
  const important: Array<{ indicator: string; question: string }> = [];
  const minimal: Array<{ indicator: string; question: string }> = [];
  
  euQuestions.forEach(q => {
    const answer = responseMap.get(q.id);
    // For compliance questions: "Yes" means they ARE doing this (the risk), which is bad
    if (answer === true) {
      if (q.indicator === "Prohibited Practices (Fatal Risk)") {
        critical.push({
          indicator: q.indicator,
          question: q.question
        });
      } else if (q.indicator === "High-Risk Practices (Mandatory Compliance)") {
        important.push({
          indicator: q.indicator,
          question: q.question
        });
      } else if (q.indicator === "Minimal/Low-Risk Practices (Transparency Obligations)") {
        minimal.push({
          indicator: q.indicator,
          question: q.question
        });
      }
    }
  });
  
  // Determine highest risk
  let highestRisk = "No Risks";
  if (critical.length > 0) {
    highestRisk = "Critical Risk";
  } else if (important.length > 0) {
    highestRisk = "Important Risk";
  } else if (minimal.length > 0) {
    highestRisk = "Minimal Risk";
  }
  
  return { critical, important, minimal, highestRisk };
}
