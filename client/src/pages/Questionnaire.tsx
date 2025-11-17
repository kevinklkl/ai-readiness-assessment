import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { QUESTIONS, PILLARS } from "@/data/questions";
import { QuestionnaireResponse } from "@/types/questionnaire";
import { toast } from "sonner";
import Footer from "@/components/Footer";

export default function Questionnaire() {
  const [, setLocation] = useLocation();
  const [currentPillarIndex, setCurrentPillarIndex] = useState(0);
  const [responses, setResponses] = useState<Map<number, number | boolean>>(new Map());

  // Load saved responses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("questionnaire_responses");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResponses(new Map(parsed));
      } catch (e) {
        console.error("Failed to load saved responses:", e);
      }
    }
  }, []);

  // Save responses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("questionnaire_responses", JSON.stringify(Array.from(responses.entries())));
  }, [responses]);

  const currentPillar = PILLARS[currentPillarIndex];
  const currentQuestions = QUESTIONS.filter(q => q.pillar === currentPillar);
  const totalQuestions = QUESTIONS.length;
  const answeredQuestions = responses.size;
  const progress = (answeredQuestions / totalQuestions) * 100;

  const handleAnswer = (questionId: number, value: string) => {
    const question = QUESTIONS.find(q => q.id === questionId);
    if (!question) return;

    const newResponses = new Map(responses);
    
    if (question.scoring === "Yes/No") {
      newResponses.set(questionId, value === "yes");
    } else {
      newResponses.set(questionId, parseInt(value));
    }
    
    setResponses(newResponses);
  };

  const isCurrentSectionComplete = () => {
    return currentQuestions.every(q => responses.has(q.id));
  };

  const handleNext = () => {
    if (currentPillarIndex < PILLARS.length - 1) {
      setCurrentPillarIndex(currentPillarIndex + 1);
      const mainEl = document.querySelector('main');
      if (mainEl && typeof (mainEl as HTMLElement).scrollTo === 'function') {
        (mainEl as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevious = () => {
    if (currentPillarIndex > 0) {
      setCurrentPillarIndex(currentPillarIndex - 1);
      const mainEl = document.querySelector('main');
      if (mainEl && typeof (mainEl as HTMLElement).scrollTo === 'function') {
        (mainEl as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleViewResults = () => {
    if (responses.size < totalQuestions) {
      toast.error("Please answer all questions before viewing results");
      return;
    }

    // Save final results with timestamp
    const results = {
      responses: Array.from(responses.entries()).map(([questionId, answer]) => ({
        questionId,
        answer
      })),
      completedAt: new Date().toISOString()
    };
    
    localStorage.setItem("assessment_results", JSON.stringify(results));
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">AI Readiness Assessment</h1>
              <p className="text-muted-foreground mt-1">Evaluate your organization's AI maturity</p>
            </div>
            <Button onClick={() => setLocation("/")} variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">
                {answeredQuestions} / {totalQuestions} questions answered
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Pillar Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {PILLARS.map((pillar, index) => {
              const pillarQuestions = QUESTIONS.filter(q => q.pillar === pillar);
              const pillarAnswered = pillarQuestions.filter(q => responses.has(q.id)).length;
              const isComplete = pillarAnswered === pillarQuestions.length;
              
              return (
                <button
                  key={pillar}
                  onClick={() => setCurrentPillarIndex(index)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                    ${currentPillarIndex === index 
                      ? 'bg-primary text-primary-foreground' 
                      : isComplete
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {pillar}
                  <span className="ml-2 text-xs opacity-75">
                    ({pillarAnswered}/{pillarQuestions.length})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Pillar Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{currentPillar}</CardTitle>
              <CardDescription>
                Section {currentPillarIndex + 1} of {PILLARS.length} • {currentQuestions.length} questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {currentQuestions.map((question, index) => (
                <div key={question.id} className="space-y-4 pb-6 border-b last:border-b-0">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-4">
                      <p className="text-foreground font-medium leading-relaxed">{question.question}</p>
                      
                      {question.scoring === "1 to 5" ? (
                        <div className="space-y-3">
                          <div className="flex gap-3 flex-wrap">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                onClick={() => handleAnswer(question.id, value.toString())}
                                className={`
                                  w-12 h-12 rounded-lg font-medium text-sm transition-all
                                  ${responses.get(question.id) === value
                                    ? 'bg-primary text-primary-foreground border border-primary'
                                    : 'bg-background text-foreground border border-input hover:bg-accent hover:text-accent-foreground'
                                  }
                                `}
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            1 = Strongly Disagree, 5 = Strongly Agree
                          </p>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          {["yes", "no"].map((value) => (
                            <button
                              key={value}
                              onClick={() => handleAnswer(question.id, value)}
                              className={`
                                px-6 py-2 rounded-lg font-medium text-sm transition-all
                                ${responses.has(question.id) && (responses.get(question.id) ? "yes" : "no") === value
                                  ? 'bg-primary text-primary-foreground border border-primary'
                                  : 'bg-background text-foreground border border-input hover:bg-accent hover:text-accent-foreground'
                                }
                              `}
                            >
                              {value === "yes" ? "Yes" : "No"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-4">
            <Button
              onClick={handlePrevious}
              disabled={currentPillarIndex === 0}
              variant="outline"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Section
            </Button>

            <div className="flex gap-3">
              {currentPillarIndex === PILLARS.length - 1 ? (
                <Button
                  onClick={handleViewResults}
                  disabled={responses.size < totalQuestions}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  View Results
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!isCurrentSectionComplete()}
                >
                  Next Section
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
