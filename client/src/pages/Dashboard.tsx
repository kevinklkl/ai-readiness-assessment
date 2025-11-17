import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, RotateCcw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { calculateResults, getReadinessLevel, getHighestRiskFactors } from "@/lib/assessment";
import { AssessmentResults } from "@/types/questionnaire";
import { QUESTIONS } from "@/data/questions";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { jsPDF } from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas-pro";
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
  const [forceExpandAll, setForceExpandAll] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const overviewRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);
  const nextStepsRef = useRef<HTMLDivElement>(null);
  const nextStepsGroups = useRef<(HTMLDivElement | null)[]>([]);
  const risksRef = useRef<HTMLDivElement>(null);
  const disclaimerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
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
    if (!results || isExporting) return;

    // Expand all sections before export
    setIsExporting(true);
    setForceExpandAll(true);
    setExportMode(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      let isFirstPage = true;

      // Helper function to capture an element and add it to PDF
      const captureAndAddPage = async (element: HTMLElement | null, title: string) => {
        if (!element) {
          console.warn(`${title} element not found`);
          console.log("nextStepsRef.current:", nextStepsRef.current);
          console.log("overviewRef.current:", overviewRef.current);
          console.log("pillarsRef.current:", pillarsRef.current);
          console.log("barRef.current:", barRef.current);
          return;
        }

        try {
          console.log(`Capturing ${title}...`, element);
          
          const canvas = await html2canvas(element, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff"
          });

          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          console.log(`${title} canvas size: ${canvasWidth}x${canvasHeight}`);
          
          const ratio = contentWidth / canvasWidth;
          const scaledHeight = canvasHeight * ratio;

          // If content fits on one page, add it directly
          if (scaledHeight <= pageHeight - margin * 2) {
            if (!isFirstPage) {
              pdf.addPage();
            }
            
            pdf.addImage(
              canvas.toDataURL("image/jpeg", 0.9),
              "JPEG",
              margin,
              margin,
              contentWidth,
              scaledHeight
            );
            isFirstPage = false;
            console.log(`${title} added to page`);
          } else {
            // Paginate if content is too long
            let position = 0;
            const pageHeightInCanvas = (pageHeight - margin * 2) / ratio;
            let isFirstSlice = true;

            while (position < canvasHeight) {
              const sliceHeight = Math.min(pageHeightInCanvas, canvasHeight - position);
              
              const sliceCanvas = document.createElement("canvas");
              sliceCanvas.width = canvasWidth;
              sliceCanvas.height = sliceHeight;

              const ctx = sliceCanvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(
                  canvas,
                  0, position,
                  canvasWidth, sliceHeight,
                  0, 0,
                  canvasWidth, sliceHeight
                );
              }

              const sliceImgData = sliceCanvas.toDataURL("image/jpeg", 0.9);
              const sliceHeightMm = sliceHeight * ratio;

              if (!isFirstPage || !isFirstSlice) {
                pdf.addPage();
              }
              
              pdf.addImage(sliceImgData, "JPEG", margin, margin, contentWidth, sliceHeightMm);
              
              position += sliceHeight;
              isFirstSlice = false;
              isFirstPage = false;
            }
            
            console.log(`${title} added across multiple pages`);
          }
        } catch (error) {
          console.error(`Failed to capture ${title}:`, error);
        }
      };

      // Page 1: Overview (Overall Score + Radar Chart)
      await captureAndAddPage(overviewRef.current, "Overview & Radar");

      // Page 2: Pillar Score Cards
      await captureAndAddPage(pillarsRef.current, "Pillar Scores");

      // Page 3: Bar Chart
      await captureAndAddPage(barRef.current, "Bar Chart");

      // Page 4+: Next Steps groups (one page per 3 items with page breaks)
      // Use the same filter as the UI to find incomplete pillars so refs/indexing match
      const incompletePillarsForExport = results.pillarScores
        .filter(ps => ps.pillar !== "EU AI Act Compliance" && ps.percentage < 100)
        .sort((a, b) => a.percentage - b.percentage);
      const numGroups = Math.ceil(incompletePillarsForExport.length / 3);

      for (let i = 0; i < numGroups; i++) {
        if (nextStepsGroups.current[i]) {
          console.log(`Exporting Next Steps group ${i + 1} of ${numGroups}`);
          await captureAndAddPage(nextStepsGroups.current[i], `Next Steps Group ${i + 1}`);
        } else {
          console.warn(`Next steps group ${i} missing in DOM during export`);
        }
      }

      // Capture EU AI Act risks if present
      if (risksRef.current) {
        await captureAndAddPage(risksRef.current, "EU AI Act Risks");
      }

      // Disclaimer
      if (disclaimerRef.current) {
        await captureAndAddPage(disclaimerRef.current, "Disclaimer");
      }

      const filename = `ai-readiness-dashboard-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("PDF export failed", err);
      toast.error("PDF export failed. See console for details.");
    } finally {
      setIsExporting(false);
      setForceExpandAll(false);
      setExportMode(false);
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

  // Color palette based on score (green to red) for charts
  const BAR_COLOR = '#2f4ab8';
  // Compute risk factors and next-steps lists once to avoid inline IIFEs inside JSX
  const riskFactors = getHighestRiskFactors(results.responses);
  const responseMap = new Map(results.responses.map(r => [r.questionId, r.answer]));
  const incompletePillars = results.pillarScores
    .filter(ps => ps.pillar !== "EU AI Act Compliance" && ps.percentage < 100)
    .sort((a, b) => a.percentage - b.percentage);
  const hasRisks = riskFactors.critical.length > 0 || riskFactors.important.length > 0 || riskFactors.minimal.length > 0;

  return (
    <div className={`min-h-screen bg-background ${exportMode ? "export-mode" : ""}`}>
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
            <div className="flex gap-3 flex-col sm:flex-row sm:items-center">
              <Button
                onClick={handleExport}
                variant="outline"
                disabled={isExporting}
                className="min-w-[120px]"
                aria-busy={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2
                      className="w-4 h-4 mr-2"
                      style={{ animation: "spin 1.5s linear infinite" }}
                    />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </>
                )}
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

      <main
        ref={exportRef}
        className="container py-8"
        style={exportMode ? { maxWidth: "100%", width: "100%" } : undefined}
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div ref={overviewRef} className="space-y-8">
          {/* Overall Score Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Overall AI Readiness</CardTitle>
              <CardDescription>Your organization's comprehensive AI maturity score</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="space-y-4">
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:gap-3">
                        <span className="text-6xl font-bold text-foreground leading-none">
                          {results.overallPercentage.toFixed(1)}%
                        </span>
                        <span className={`text-2xl font-semibold leading-none ${readinessInfo.color}`}>
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
                  <Cell fill={getGradientColor(results.overallPercentage)} />
                  <Cell fill="#eceff4" />
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
                    <PolarGrid stroke="#e7e9f6" />
                    <PolarAngleAxis dataKey="pillar" tick={(props) => { const { payload, x, y, textAnchor } = props as any; const isStrategy = payload.value === "Strategy & Value"; return (<g transform={"translate(" + x + "," + y + ")"}><text x={0} y={isStrategy ? -12 : 0} textAnchor={textAnchor} fill="#2c2f55" fontSize={11}>{payload.value}</text></g>); }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#6c6f8c" }} />
                    <Radar name="Readiness Score" dataKey="score" stroke="#2f4ab8" fill="#2f4ab8" fillOpacity={0.3} />
                    <Tooltip content={({ payload }) => { if (payload && payload.length > 0) { const data = payload[0].payload as any; return (<div className="bg-card border rounded-lg p-3 shadow-lg"><p className="font-semibold text-foreground">{data.fullName}</p><p className="text-sm text-muted-foreground">Score: {data.score.toFixed(1)}%</p></div>); } return null; }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          </div>

          {/* Bar Chart */}
          <div ref={barRef}>
            <Card>
              <CardHeader>
                <CardTitle>Pillar-by-Pillar Breakdown</CardTitle>
                <CardDescription>Detailed scores for each assessment dimension</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f6" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={200} tick={{ fill: "#2c2f55", fontSize: 11 }} />
                      <Tooltip content={({ payload }) => { if (payload && payload.length > 0) { const data = payload[0].payload as any; return (<div className="bg-card border rounded-lg p-3 shadow-lg"><p className="font-semibold text-foreground">{data.fullName}</p><p className="text-sm text-muted-foreground">Score: {data.score.toFixed(1)}%</p></div>); } return null; }} />
                      <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLOR} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Pillar Cards */}
          <div ref={pillarsRef} className={`grid gap-5 ${exportMode ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {results.pillarScores
              .filter(ps => ps.pillar !== "EU AI Act Compliance")
              .map((pillarScore, index) => {
                const statusInfo = getReadinessLevel(pillarScore.percentage);
                return (
                  <Card
                    key={pillarScore.pillar}
                    className="relative overflow-hidden export-pillar-card"
                    style={exportMode ? { breakInside: "avoid", pageBreakInside: "avoid" as any } : undefined}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: getGradientColor(pillarScore.percentage) }} />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{pillarScore.pillar}</CardTitle>
                      <CardDescription className="text-xs">{pillarScore.questionCount} questions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                        <span className="text-3xl font-bold text-foreground leading-none">{pillarScore.percentage.toFixed(1)}%</span>
                        <span className={`text-xs font-semibold leading-none ${statusInfo.color}`}>{statusInfo.status}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pillarScore.percentage}%`, backgroundColor: getGradientColor(pillarScore.percentage) }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{pillarScore.score} / {pillarScore.maxScore} points</p>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Action Items */}
          <div ref={nextStepsRef}>
            <Card 
              className="bg-gradient-to-br from-primary/5 to-accent/5 border-2"
              style={exportMode ? { backgroundColor: "white" } : undefined}
            >
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
                <CardDescription>Click on each category to see which questions need improvement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
              {/* Collapsible Pillars - grouped 3 per section */}
              {incompletePillars.length > 0 && (
                 <div className="space-y-6">
                  {/* Group pillars into sets of 3 */}
                  {Array.from({ length: Math.ceil(incompletePillars.length / 3) }).map((_, pageIdx) => {
                    const start = pageIdx * 3;
                    const end = Math.min(start + 3, incompletePillars.length);
                    const pillarGroup = incompletePillars.slice(start, end);
                    
                    return (
                      <div 
                        key={pageIdx} 
                        ref={(el) => {
                          if (el) nextStepsGroups.current[pageIdx] = el;
                        }}
                        className="space-y-3"
                      >
                        <h3 className="font-semibold text-foreground text-sm">📊 Readiness Improvement Areas</h3>
                        <div className="space-y-2">
                          {pillarGroup.map((ps, localIndex) => {
                            const globalIndex = start + localIndex;
                      const pillarQuestions = QUESTIONS.filter(q => q.pillar === ps.pillar && q.scoring === "1 to 5");
                      const questionsNot5 = pillarQuestions.filter(q => {
                        const answer = responseMap.get(q.id);
                        return answer !== 5;
                      });
                      const isOpen = forceExpandAll || expandedPillar === ps.pillar;

                      return (
                        <div
                          key={ps.pillar}
                          className="border rounded-lg bg-card overflow-hidden export-next-step"
                          style={exportMode ? { breakInside: "avoid", pageBreakInside: "avoid" as any } : undefined}
                        >
                          <button onClick={() => setExpandedPillar(isOpen ? null : ps.pillar)} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="flex items-start gap-4 flex-1 text-left">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">{globalIndex + 1}</div>
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
                    );
                  })}
                </div>
              )}

              {/* EU AI Risks */}
              {hasRisks && (
                <div ref={risksRef} className="space-y-3 pt-4 border-t" style={exportMode ? { breakInside: "avoid", pageBreakInside: "avoid" as any } : undefined}>
                  <h3 className="font-semibold text-destructive">⚠️ EU AI Act Compliance Risks</h3>
                  <div className="space-y-2">
                    {riskFactors.critical.length > 0 && (
                      <div className="border rounded-lg bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900 overflow-hidden">
                        <button onClick={() => setExpandedRiskCategory(expandedRiskCategory === "critical" ? null : "critical")} className="w-full p-3 flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left">
                          <p className="text-sm font-semibold text-red-900 dark:text-red-200">🚨 {riskFactors.critical.length} Critical Risk{riskFactors.critical.length > 1 ? 's' : ''} (Prohibited Practices)</p>
                          {forceExpandAll || expandedRiskCategory === "critical" ? <ChevronUp className="w-4 h-4 text-red-900 dark:text-red-200" /> : <ChevronDown className="w-4 h-4 text-red-900 dark:text-red-200" />}
                        </button>
                        {(forceExpandAll || expandedRiskCategory === "critical") && (
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
                          {forceExpandAll || expandedRiskCategory === "important" ? <ChevronUp className="w-4 h-4 text-yellow-900 dark:text-yellow-200" /> : <ChevronDown className="w-4 h-4 text-yellow-900 dark:text-yellow-200" />}
                        </button>
                        {(forceExpandAll || expandedRiskCategory === "important") && (
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
                          {forceExpandAll || expandedRiskCategory === "minimal" ? <ChevronUp className="w-4 h-4 text-blue-900 dark:text-blue-200" /> : <ChevronDown className="w-4 h-4 text-blue-900 dark:text-blue-200" />}
                        </button>
                        {(forceExpandAll || expandedRiskCategory === "minimal") && (
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
          </div>

          {/* Disclaimer */}
          <section ref={disclaimerRef} className="container">
            <div className="max-w-7xl mx-auto mt-8">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
                <p>
                  <span className="font-semibold">Disclaimer:</span> This framework does not replace or supersede the legal requirements of the EU AI Act. Organizations remain fully responsible for reviewing and complying with all applicable regulations. <span className="font-semibold">This is only a recommendation.</span>
                </p>
              </div>
            </div>
          </section>

          {/* EU AI Act Section with ref */}
          <div ref={euAiSectionRef}></div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
