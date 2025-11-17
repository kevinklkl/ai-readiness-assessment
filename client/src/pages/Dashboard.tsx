import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { calculateResults, getReadinessLevel, getComplianceStatus } from "@/lib/assessment";
import { AssessmentResults } from "@/types/questionnaire";
import { toast } from "sonner";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<AssessmentResults | null>(null);

  useEffect(() => {
    const savedResults = localStorage.getItem("assessment_results");
    if (!savedResults) {
      toast.error("No assessment results found. Please complete the questionnaire first.");
      setLocation("/questionnaire");
      return;
    }

    try {
      const parsed = JSON.parse(savedResults);
      const calculatedResults = calculateResults(parsed.responses);
      setResults(calculatedResults);
    } catch (e) {
      console.error("Failed to load results:", e);
      toast.error("Failed to load results. Please try again.");
      setLocation("/questionnaire");
    }
  }, [setLocation]);

  const handleReset = () => {
    if (confirm("Are you sure you want to reset your assessment? This will delete all your responses.")) {
      localStorage.removeItem("questionnaire_responses");
      localStorage.removeItem("assessment_results");
      toast.success("Assessment reset successfully");
      setLocation("/");
    }
  };

  const handleExport = () => {
    if (!results) return;

    const exportData = {
      completedAt: results.completedAt,
      overallScore: `${results.overallPercentage.toFixed(1)}%`,
      readinessLevel: getReadinessLevel(results.overallPercentage).status,
      pillarScores: results.pillarScores.map(ps => ({
        pillar: ps.pillar,
        score: `${ps.score}/${ps.maxScore}`,
        percentage: `${ps.percentage.toFixed(1)}%`
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-readiness-assessment-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Results exported successfully");
  };

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  const readinessInfo = getReadinessLevel(results.overallPercentage);
  
  // Prepare data for radar chart
  const radarData = results.pillarScores
    .filter(ps => ps.pillar !== "EU AI Act Compliance")
    .map(ps => ({
      pillar: ps.pillar.length > 20 ? ps.pillar.substring(0, 20) + "..." : ps.pillar,
      score: ps.percentage,
      fullName: ps.pillar
    }));

  // Prepare data for bar chart
  const barData = results.pillarScores.map(ps => ({
    name: ps.pillar.length > 25 ? ps.pillar.substring(0, 25) + "..." : ps.pillar,
    score: ps.percentage,
    fullName: ps.pillar
  }));

  // Color palette based on design system
  const COLORS = [
    "oklch(0.35 0.15 250)", // Primary - Deep Blue
    "oklch(0.65 0.12 170)", // Accent - Teal-Green
    "oklch(0.45 0.14 250)", // Chart 3
    "oklch(0.55 0.13 250)", // Chart 4
    "oklch(0.25 0.16 250)", // Chart 5
    "oklch(0.5 0.1 200)",   // Additional
    "oklch(0.6 0.11 180)",  // Additional
    "oklch(0.4 0.13 230)",  // Additional
    "oklch(0.7 0.1 160)"    // Additional
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Assessment Results</h1>
              <p className="text-muted-foreground mt-1">
                Completed on {new Date(results.completedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleExport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={() => setLocation("/")} variant="default">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Overall Score Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Overall AI Readiness</CardTitle>
              <CardDescription>Your organization's comprehensive AI maturity score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="flex-1">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-6xl font-bold text-foreground">
                        {results.overallPercentage.toFixed(1)}%
                      </span>
                      <span className={`text-2xl font-semibold ${readinessInfo.color}`}>
                        {readinessInfo.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-lg">{readinessInfo.description}</p>
                    <p className="text-sm text-muted-foreground pt-2">
                      Total Score: {results.overallScore} / {results.pillarScores.reduce((sum, ps) => sum + ps.maxScore, 0)} points
                    </p>
                  </div>
                </div>
                
                {/* Simple pie chart for overall score */}
                <div className="w-64 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Achieved", value: results.overallPercentage },
                          { name: "Remaining", value: 100 - results.overallPercentage }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="oklch(0.35 0.15 250)" />
                        <Cell fill="oklch(0.93 0.005 250)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Multi-Dimensional Readiness View</CardTitle>
              <CardDescription>Comparative analysis across all assessment pillars (excluding EU AI Act Compliance)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="oklch(0.88 0.005 250)" />
                    <PolarAngleAxis 
                      dataKey="pillar" 
                      tick={{ fill: "oklch(0.25 0.01 250)", fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: "oklch(0.5 0.01 250)" }}
                    />
                    <Radar
                      name="Readiness Score"
                      dataKey="score"
                      stroke="oklch(0.35 0.15 250)"
                      fill="oklch(0.35 0.15 250)"
                      fillOpacity={0.3}
                    />
                    <Tooltip 
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold text-foreground">{data.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                Score: {data.score.toFixed(1)}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Pillar-by-Pillar Breakdown</CardTitle>
              <CardDescription>Detailed scores for each assessment dimension</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.005 250)" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={200}
                      tick={{ fill: "oklch(0.25 0.01 250)", fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold text-foreground">{data.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                Score: {data.score.toFixed(1)}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Individual Pillar Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.pillarScores.map((pillarScore, index) => {
              const statusInfo = pillarScore.pillar === "EU AI Act Compliance" 
                ? getComplianceStatus(pillarScore)
                : getReadinessLevel(pillarScore.percentage);
              
              return (
                <Card key={pillarScore.pillar} className="relative overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <CardHeader>
                    <CardTitle className="text-lg">{pillarScore.pillar}</CardTitle>
                    <CardDescription>{pillarScore.questionCount} questions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-foreground">
                        {pillarScore.percentage.toFixed(1)}%
                      </span>
                      <span className={`text-sm font-semibold ${statusInfo.color}`}>
                        {statusInfo.status}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${pillarScore.percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pillarScore.score} / {pillarScore.maxScore} points
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Items */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-2">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Recommendations based on your assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.pillarScores
                .filter(ps => ps.percentage < 60)
                .sort((a, b) => a.percentage - b.percentage)
                .slice(0, 3)
                .map((ps, index) => (
                  <div key={ps.pillar} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{ps.pillar}</h4>
                      <p className="text-sm text-muted-foreground">
                        Current score: {ps.percentage.toFixed(1)}% - Consider prioritizing improvements in this area
                      </p>
                    </div>
                  </div>
                ))}
              
              {results.pillarScores.every(ps => ps.percentage >= 60) && (
                <p className="text-muted-foreground">
                  Excellent work! All pillars show good maturity. Continue to maintain and enhance your capabilities.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
