import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { calculateResults, getReadinessLevel, getComplianceStatus, getHighestRiskFactors } from "@/lib/assessment";
import { AssessmentResults } from "@/types/questionnaire";
import { QUESTIONS } from "@/data/questions";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const [expandedRiskCategory, setExpandedRiskCategory] = useState<string | null>(null);
  const euAiSectionRef = useRef<HTMLDivElement>(null);

  const scrollToEuSection = () => {
    const el = euAiSectionRef.current;
    if (!el) return;
    const header = document.querySelector('header');
    const headerHeight = header ? (header as HTMLElement).offsetHeight : 0;
    const top = el.getBoundingClientRect().top + window.pageYOffset - headerHeight - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  };

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

  const handleExport = async () => {
    if (!results) return;

    // Generate PDF using jsPDF directly to avoid html2pdf/html2canvas parsing CSS functions like oklch
    const compliancePillar = results.pillarScores.find(ps => ps.pillar === "EU AI Act Compliance");
    const complianceStatus = getComplianceStatus(compliancePillar ?? { pillar: "EU AI Act Compliance", score: 0, maxScore: 0, percentage: 0, questionCount: 0 });

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(20);
      doc.text('AI Readiness Assessment Report', 14, y);
      y += 10;

      doc.setFontSize(10);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, y);
      y += 12;

      // Overall score
      doc.setFontSize(16);
      doc.text(`Overall Readiness: ${results.overallPercentage.toFixed(1)}%`, 14, y);
      y += 10;
      doc.setFontSize(12);
      doc.text(`Status: ${getReadinessLevel(results.overallPercentage).status}`, 14, y);
      y += 12;

      // Table header
      doc.setFontSize(12);
      doc.text('Pillar', 14, y);
      doc.text('Score', pageWidth - 60, y);
      doc.text('Percentage', pageWidth - 30, y);
      y += 6;
      doc.setLineWidth(0.2);
      doc.line(14, y, pageWidth - 14, y);
      y += 6;

      // Table rows
      doc.setFontSize(11);
      results.pillarScores
        .filter(ps => ps.pillar !== 'EU AI Act Compliance')
        .forEach(ps => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(ps.pillar, 14, y);
          doc.text(`${ps.score}/${ps.maxScore}`, pageWidth - 60, y, { align: 'right' });
          doc.text(`${ps.percentage.toFixed(1)}%`, pageWidth - 30, y, { align: 'right' });
          y += 8;
        });

      y += 8;
      doc.setFontSize(12);
      doc.text('EU AI Act Compliance', 14, y);
      y += 6;
      doc.setFontSize(11);
      doc.text(`Compliance Status: ${complianceStatus.status}`, 14, y);

      const filename = `ai-readiness-assessment-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('PDF exported successfully');
    } catch (err) {
      console.error('PDF export failed', err);
      toast.error('PDF export failed. See console for details.');
    }
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
      pillar: ps.pillar,
      score: ps.percentage,
      fullName: ps.pillar
    }));

  // Prepare data for bar chart (excluding EU AI Act Compliance)
  const barData = results.pillarScores
    .filter(ps => ps.pillar !== "EU AI Act Compliance")
    .map(ps => ({
      name: ps.pillar.length > 25 ? ps.pillar.substring(0, 25) + "..." : ps.pillar,
      score: ps.percentage,
      fullName: ps.pillar
    }));

  // Function to get gradient color from red (0%) to dark green (100%)
  const getGradientColor = (percentage: number) => {
    // Red to Dark Green gradient: 0% = red, 50% = orange/yellow, 100% = dark green
    if (percentage <= 50) {
      // Red to Orange: 0% -> 50%
      const ratio = percentage / 50;
      const hue = 0 + ratio * 30; // 0 (red) to 30 (orange)
      return `hsl(${hue}, 100%, 50%)`;
    } else {
      // Orange to Dark Green: 50% -> 100%
      const ratio = (percentage - 50) / 50;
      const hue = 30 + ratio * 90; // 30 (orange) to 120 (green)
      const lightness = 50 - ratio * 15; // 50% to 35% (darker)
      return `hsl(${hue}, 70%, ${lightness}%)`;
    }
  };

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
  // Compute risk factors and next-steps lists once to avoid inline IIFEs inside JSX
  const riskFactors = getHighestRiskFactors(results.responses);
  const responseMap = new Map(results.responses.map(r => [r.questionId, r.answer]));
  const incompletePillars = results.pillarScores
    .filter(ps => ps.pillar !== "EU AI Act Compliance" && ps.percentage < 100)
    .sort((a, b) => a.percentage - b.percentage);
  const hasRisks = riskFactors.critical.length > 0 || riskFactors.important.length > 0 || riskFactors.minimal.length > 0;

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
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-6xl font-bold text-foreground">
                        {results.overallPercentage.toFixed(1)}%
                      </span>
                      <span className={`text-2xl font-semibold ${readinessInfo.color}`}>
                        {readinessInfo.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-lg">{readinessInfo.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Score: {results.overallScore} / {results.pillarScores.reduce((sum, ps) => sum + ps.maxScore, 0)} points
                    </p>

                    {/* EU AI Act Status */}
                    <div className="pt-2 border-t">
                      <p className="text-sm font-semibold text-muted-foreground mb-2">EU AI Act Compliance:</p>
                      <button
                        onClick={scrollToEuSection}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-all hover:scale-105 ${
                          riskFactors.highestRisk === "Critical Risk" ? "bg-red-100 text-red-900 dark:bg-red-900/20 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/30" :
                          riskFactors.highestRisk === "Important Risk" ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/30" :
                          riskFactors.highestRisk === "Minimal Risk" ? "bg-orange-100 text-orange-900 dark:bg-orange-900/20 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/30" :
                          "bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30"
                        }`}
                      >
                        {riskFactors.highestRisk === "Critical Risk" && "🚨"}
                        {riskFactors.highestRisk === "Important Risk" && "⚠️"}
                        {riskFactors.highestRisk === "Minimal Risk" && "📋"}
                        {riskFactors.highestRisk === "No Risks" && "✅"}
                        {riskFactors.highestRisk}
                      </button>
                    </div>
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
              <div className="h-[600px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 50, right: 80, bottom: 50, left: 80 }}>
                    <PolarGrid stroke="oklch(0.88 0.005 250)" />
                    <PolarAngleAxis dataKey="pillar" tick={(props) => { const { payload, x, y, textAnchor } = props as any; const isStrategy = payload.value === "Strategy & Value"; return (<g transform={"translate(" + x + "," + y + ")"}><text x={0} y={isStrategy ? -12 : 0} textAnchor={textAnchor} fill="oklch(0.25 0.01 250)" fontSize={11}>{payload.value}</text></g>); }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "oklch(0.5 0.01 250)" }} />
                    <Radar name="Readiness Score" dataKey="score" stroke="oklch(0.35 0.15 250)" fill="oklch(0.35 0.15 250)" fillOpacity={0.3} />
                    <Tooltip content={({ payload }) => { if (payload && payload.length > 0) { const data = payload[0].payload as any; return (<div className="bg-card border rounded-lg p-3 shadow-lg"><p className="font-semibold text-foreground">{data.fullName}</p><p className="text-sm text-muted-foreground">Score: {data.score.toFixed(1)}%</p></div>); } return null; }} />
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
                    <YAxis dataKey="name" type="category" width={200} tick={{ fill: "oklch(0.25 0.01 250)", fontSize: 11 }} />
                    <Tooltip content={({ payload }) => { if (payload && payload.length > 0) { const data = payload[0].payload as any; return (<div className="bg-card border rounded-lg p-3 shadow-lg"><p className="font-semibold text-foreground">{data.fullName}</p><p className="text-sm text-muted-foreground">Score: {data.score.toFixed(1)}%</p></div>); } return null; }} />
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
            {results.pillarScores
              .filter(ps => ps.pillar !== "EU AI Act Compliance")
              .map((pillarScore, index) => {
                const statusInfo = getReadinessLevel(pillarScore.percentage);
                return (
                  <Card key={pillarScore.pillar} className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: getGradientColor(pillarScore.percentage) }} />
                    <CardHeader>
                      <CardTitle className="text-lg">{pillarScore.pillar}</CardTitle>
                      <CardDescription>{pillarScore.questionCount} questions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-foreground">{pillarScore.percentage.toFixed(1)}%</span>
                        <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.status}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pillarScore.percentage}%`, backgroundColor: getGradientColor(pillarScore.percentage) }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{pillarScore.score} / {pillarScore.maxScore} points</p>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Action Items */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-2">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Click on each category to see which questions need improvement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Collapsible Pillars */}
              {incompletePillars.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">📊 Readiness Improvement Areas</h3>
                  <div className="space-y-2">
                    {incompletePillars.map((ps, index) => {
                      const pillarQuestions = QUESTIONS.filter(q => q.pillar === ps.pillar && q.scoring === "1 to 5");
                      const questionsNot5 = pillarQuestions.filter(q => {
                        const answer = responseMap.get(q.id);
                        return answer !== 5;
                      });
                      const isOpen = expandedPillar === ps.pillar;

                      return (
                        <div key={ps.pillar} className="border rounded-lg bg-card overflow-hidden">
                          <button onClick={() => setExpandedPillar(isOpen ? null : ps.pillar)} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="flex items-start gap-4 flex-1 text-left">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">{index + 1}</div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{ps.pillar}</h4>
                                <p className="text-sm text-muted-foreground">{ps.percentage.toFixed(1)}% ({ps.score}/{ps.maxScore} points) • {questionsNot5.length} question{questionsNot5.length !== 1 ? 's' : ''} below 5</p>
                              </div>
                            </div>
                            {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                          </button>

                          {isOpen && questionsNot5.length > 0 && (
                            <div className="border-t bg-muted/30 p-4 space-y-3">
                              {questionsNot5.map((q) => {
                                const answer = responseMap.get(q.id);
                                return (
                                  <div key={q.id} className="text-sm space-y-1">
                                    <p className="font-medium text-foreground">{q.question}</p>
                                    <p className="text-xs text-muted-foreground">Current score: {answer}/5 • Indicator: {q.indicator}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EU AI Risks */}
              {hasRisks && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold text-destructive">⚠️ EU AI Act Compliance Risks</h3>
                  <div className="space-y-2">
                    {riskFactors.critical.length > 0 && (
                      <div className="border rounded-lg bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900 overflow-hidden">
                        <button onClick={() => setExpandedRiskCategory(expandedRiskCategory === "critical" ? null : "critical")} className="w-full p-3 flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left">
                          <p className="text-sm font-semibold text-red-900 dark:text-red-200">🚨 {riskFactors.critical.length} Critical Risk{riskFactors.critical.length > 1 ? 's' : ''} (Prohibited Practices)</p>
                          {expandedRiskCategory === "critical" ? <ChevronUp className="w-4 h-4 text-red-900 dark:text-red-200" /> : <ChevronDown className="w-4 h-4 text-red-900 dark:text-red-200" />}
                        </button>
                        {expandedRiskCategory === "critical" && (
                          <div className="border-t border-red-200 dark:border-red-900 bg-red-100/50 dark:bg-red-900/20 p-3 space-y-2">
                            {riskFactors.critical.map((risk, idx) => (
                              <div key={idx} className="text-xs space-y-1 pb-2 border-b border-red-200 dark:border-red-900 last:border-b-0"><p className="font-medium text-red-900 dark:text-red-200">{risk.question}</p></div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {riskFactors.important.length > 0 && (
                      <div className="border rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900 overflow-hidden">
                        <button onClick={() => setExpandedRiskCategory(expandedRiskCategory === "important" ? null : "important")} className="w-full p-3 flex items-center justify-between hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors text-left">
                          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">⚠️ {riskFactors.important.length} Important Risk{riskFactors.important.length > 1 ? 's' : ''} (High-Risk Practices)</p>
                          {expandedRiskCategory === "important" ? <ChevronUp className="w-4 h-4 text-yellow-900 dark:text-yellow-200" /> : <ChevronDown className="w-4 h-4 text-yellow-900 dark:text-yellow-200" />}
                        </button>
                        {expandedRiskCategory === "important" && (
                          <div className="border-t border-yellow-200 dark:border-yellow-900 bg-yellow-100/50 dark:bg-yellow-900/20 p-3 space-y-2">
                            {riskFactors.important.map((risk, idx) => (
                              <div key={idx} className="text-xs space-y-1 pb-2 border-b border-yellow-200 dark:border-yellow-900 last:border-b-0"><p className="font-medium text-yellow-900 dark:text-yellow-200">{risk.question}</p></div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {riskFactors.minimal.length > 0 && (
                      <div className="border rounded-lg bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900 overflow-hidden">
                        <button onClick={() => setExpandedRiskCategory(expandedRiskCategory === "minimal" ? null : "minimal")} className="w-full p-3 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors text-left">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">📋 {riskFactors.minimal.length} Minimal Risk{riskFactors.minimal.length > 1 ? 's' : ''} (Transparency Obligations)</p>
                          {expandedRiskCategory === "minimal" ? <ChevronUp className="w-4 h-4 text-blue-900 dark:text-blue-200" /> : <ChevronDown className="w-4 h-4 text-blue-900 dark:text-blue-200" />}
                        </button>
                        {expandedRiskCategory === "minimal" && (
                          <div className="border-t border-blue-200 dark:border-blue-900 bg-blue-100/50 dark:bg-blue-900/20 p-3 space-y-2">
                            {riskFactors.minimal.map((risk, idx) => (
                              <div key={idx} className="text-xs space-y-1 pb-2 border-b border-blue-200 dark:border-blue-900 last:border-b-0"><p className="font-medium text-blue-900 dark:text-blue-200">{risk.question}</p></div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Perfect Score Message */}
              {incompletePillars.length === 0 && !hasRisks && (
                <p className="text-green-700 dark:text-green-300 font-semibold">✅ Excellent! All readiness pillars are at 100% and no EU AI Act risks identified. Your organization is fully prepared.</p>
              )}

              {incompletePillars.length === 0 && hasRisks && (
                <p className="text-foreground font-semibold">✅ All readiness pillars are at 100%. Focus now on addressing the EU AI Act compliance risks identified above.</p>
              )}
            </CardContent>
          </Card>

          {/* EU AI Act Section with ref */}
          <div ref={euAiSectionRef}></div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
