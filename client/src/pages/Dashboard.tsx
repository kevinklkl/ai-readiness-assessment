import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, RotateCcw, ChevronDown, ChevronUp, Loader2, Mail, Scale, CheckCircle2, X } from "lucide-react";
import { calculateResults, getReadinessLevel, getHighestRiskFactors } from "@/lib/assessment";
import { AssessmentResults } from "@/types/questionnaire";
import { QUESTIONS } from "@/data/questions";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { jsPDF } from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas-pro";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
  ChartData,
  ChartOptions
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const [expandedRiskCategory, setExpandedRiskCategory] = useState<string | null>(null);
  const [forceExpandAll, setForceExpandAll] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfRenderMode, setIsPdfRenderMode] = useState(false);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsFeedback, setNpsFeedback] = useState("");
  const [npsSubmitting, setNpsSubmitting] = useState(false);
  const [npsSubmitted, setNpsSubmitted] = useState(false);
  const [feedbackSessionId, setFeedbackSessionId] = useState<string | null>(null);
  const useSliderScale = false;
  const [npsOpen, setNpsOpen] = useState(false);
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
  const feedbackPath = "/api/nps-feedback";
  const overviewRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);
  const nextStepsRef = useRef<HTMLDivElement>(null);
  const nextStepsGroups = useRef<(HTMLDivElement | null)[]>([]);
  const risksRef = useRef<HTMLDivElement>(null);
  const disclaimerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const euAiSectionRef = useRef<HTMLDivElement>(null);
  const radarRef = useRef<ChartJS<"radar"> | undefined>(undefined);

  const scrollToEuSection = () => {
    const el = euAiSectionRef.current;
    if (!el) return;
    const header = document.querySelector('header');
    const headerHeight = header ? (header as HTMLElement).offsetHeight : 0;
    const top = el.getBoundingClientRect().top + window.pageYOffset - headerHeight - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__pdf_ready__ = false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("renderMode") === "pdf") {
      setIsPdfRenderMode(true);
      setExportMode(true);
      setForceExpandAll(true);
    }
  }, []);

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

  useEffect(() => {
    if (!isPdfRenderMode || !results) return;
    const timer = setTimeout(() => {
      radarRef.current?.resize();
      (window as any).__pdf_ready__ = true;
    }, 600);
    return () => clearTimeout(timer);
  }, [isPdfRenderMode, results]);

  useEffect(() => {
    const handleResize = () => radarRef.current?.resize();
    handleResize();
    const timeout = setTimeout(handleResize, 200);
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [exportMode, results?.pillarScores.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = "feedback_session_id";
    const existing = localStorage.getItem(storageKey);
    const id =
      (existing && existing.trim()) ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(storageKey, id);
    setFeedbackSessionId(id);
  }, []);

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

    setIsExporting(true);
    setForceExpandAll(true);
    setExportMode(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const sectionSpacing = 6;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      let cursorY = margin;

      const captureAndAddPage = async (element: HTMLElement | null, title: string) => {
        if (!element) return;

        try {
          const canvas = await html2canvas(element, {
            scale: 1.6,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: -window.scrollY
          });

          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          
          const ratio = contentWidth / canvasWidth;
          let scaledWidth = contentWidth;
          let scaledHeight = canvasHeight * ratio;

          if (scaledHeight > contentHeight) {
            const fitRatio = contentHeight / canvasHeight;
            scaledWidth = canvasWidth * fitRatio;
            scaledHeight = contentHeight;
          }

          if (cursorY + scaledHeight > pageHeight - margin) {
            pdf.addPage();
            cursorY = margin;
          }

          const xPosition = margin + (contentWidth - scaledWidth) / 2;
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", xPosition, cursorY, scaledWidth, scaledHeight);
          cursorY += scaledHeight + sectionSpacing;
        } catch (error) {
          console.error(`Failed to capture ${title}:`, error);
        }
      };

      await captureAndAddPage(overviewRef.current, "Overview & Radar");
      await captureAndAddPage(pillarsRef.current, "Pillar Scores");
      await captureAndAddPage(barRef.current, "Bar Chart");

      const incompletePillarsForExport = results.pillarScores
        .filter(ps => ps.pillar !== "EU AI Act Compliance" && ps.percentage < 100)
        .sort((a, b) => a.percentage - b.percentage);
      const numGroups = Math.ceil(incompletePillarsForExport.length / 3);

      for (let i = 0; i < numGroups; i++) {
        if (nextStepsGroups.current[i]) {
          await captureAndAddPage(nextStepsGroups.current[i], `Next Steps Group ${i + 1}`);
        }
      }

      if (risksRef.current) await captureAndAddPage(risksRef.current, "EU AI Act Risks");
      if (disclaimerRef.current) await captureAndAddPage(disclaimerRef.current, "Disclaimer");

      const filename = `ai-readiness-dashboard-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("PDF export failed", err);
      toast.error("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setForceExpandAll(false);
      setExportMode(false);
    }
  };

  const handleScoreSelect = (value: number) => {
    setNpsScore(value);
    if (npsSubmitted) setNpsSubmitted(false);
  };

  const handleSubmitFeedback = async () => {
    if (!apiBaseUrl) {
      toast.error("Feedback API is not configured. Please set VITE_API_BASE_URL.");
      return;
    }

    if (npsScore === null) {
      toast.error("Please choose a score from 0 to 10.");
      return;
    }

    const normalizedPath = feedbackPath.startsWith("/") ? feedbackPath : `/${feedbackPath}`;
    const feedbackEndpoint = `${apiBaseUrl.replace(/\/$/, "")}${normalizedPath}`;
    setNpsSubmitting(true);
    setNpsSubmitted(false);

    const normalizedScore = Math.max(0, Math.min(10, Math.round(npsScore)));
    const payload = {
      npsScore: normalizedScore, // required by new backend
      score: normalizedScore, // backwards compatibility
      comments: npsFeedback.trim(),
      feedback: npsFeedback.trim(),
      sessionId: feedbackSessionId,
      completedAt: results?.completedAt,
      pageUrl: typeof window !== "undefined" ? window.location.href : ""
    };

    try {
      const response = await fetch(feedbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let detail = "";
        try {
          const data = await response.json();
          detail = (data && (data.error || data.message)) || JSON.stringify(data);
        } catch {
          try {
            detail = await response.text();
          } catch {
            /* ignore */
          }
        }
        console.error("Feedback submission failed: API error", {
          endpoint: feedbackEndpoint,
          status: response.status,
          statusText: response.statusText,
          detail: detail || null
        });
        const message = detail ? `Feedback request failed (${response.status}): ${detail}` : `Feedback request failed with status ${response.status}`;
        throw new Error(message);
      }

      setNpsSubmitted(true);
      setNpsFeedback("");
      setNpsScore(null);
      setNpsOpen(false);
      toast.success("Thank you for your feedback!");
    } catch (error) {
      console.error("Feedback submission failed", {
        error,
        endpoint: feedbackEndpoint,
        npsScore: normalizedScore,
        hasComments: Boolean(npsFeedback.trim()),
        sessionId: feedbackSessionId
      });
      toast.error(error instanceof Error ? error.message : "Unable to submit feedback. Please try again.");
    } finally {
      setNpsSubmitting(false);
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

  const wrapLabel = (label: string, maxLength = 16) => {
    const words = label.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLength && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const readinessInfo = getReadinessLevel(results.overallPercentage);
  
  const radarData = results.pillarScores
    .filter(ps => ps.pillar !== "EU AI Act Compliance")
    .map(ps => ({
      pillar: ps.pillar,
      score: ps.percentage,
      fullName: ps.pillar
    }));

  const radarChartData: ChartData<"radar"> = {
    labels: radarData.map(item => item.fullName),
    datasets: [
      {
        label: "Readiness Score",
        data: radarData.map(item => item.score),
        backgroundColor: "rgba(47, 74, 184, 0.25)",
        borderColor: "#2f4ab8",
        borderWidth: 2,
        pointBackgroundColor: "#2f4ab8",
        pointBorderColor: "#ffffff",
        pointHoverBackgroundColor: "#1f3a94",
        pointHoverBorderColor: "#ffffff",
        pointStyle: "rectRot",
        pointRadius: 5,
        pointHoverRadius: 7,
        borderCapStyle: "butt",
        borderJoinStyle: "miter",
        fill: true,
        tension: 0
      }
    ]
  };

  const radarChartOptions: ChartOptions<"radar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: exportMode ? false : undefined,
    layout: {
      padding: 24
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: "#ffffff",
        titleColor: "#111827",
        bodyColor: "#374151",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: (context) => {
            const value = context.parsed.r;
            if (typeof value !== "number") return "";
            return `Score: ${value.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        beginAtZero: true,
        angleLines: { color: "#e7e9f6" },
        grid: { color: "#e7e9f6" },
        ticks: {
          backdropColor: "transparent",
          color: "#6c6f8c",
          stepSize: 20,
          showLabelBackdrop: false
        },
        pointLabels: {
          color: "#2c2f55",
          font: { size: 11 },
          callback: (label) => wrapLabel(String(label))
        }
      }
    }
  };

  const barData = results.pillarScores
    .filter(ps => ps.pillar !== "EU AI Act Compliance")
    .map(ps => ({
      name: ps.pillar,
      score: ps.percentage,
      fullName: ps.pillar
    }));
  const forceDesktopForExport = exportMode;
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 640 && !forceDesktopForExport;

  const getGradientColor = (percentage: number) => {
    if (percentage <= 50) {
      const ratio = percentage / 50;
      const hue = 0 + ratio * 30;
      return `hsl(${hue}, 100%, 50%)`;
    } else {
      const ratio = (percentage - 50) / 50;
      const hue = 30 + ratio * 90;
      const lightness = 50 - ratio * 15;
      return `hsl(${hue}, 70%, ${lightness}%)`;
    }
  };

  const BAR_COLOR = '#2f4ab8';
  const riskFactors = getHighestRiskFactors(results.responses);
  const responseMap = new Map(results.responses.map(r => [r.questionId, r.answer]));
  const incompletePillars = results.pillarScores
    .filter(ps => ps.pillar !== "EU AI Act Compliance" && ps.percentage < 100)
    .sort((a, b) => a.percentage - b.percentage);
  const hasRisks = riskFactors.critical.length > 0 || riskFactors.important.length > 0 || riskFactors.minimal.length > 0;
  const radarResponsiveSize = "clamp(260px, 85vw, 520px)";

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
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" /> Export
                  </>
                )}
              </Button>
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" /> Reset
              </Button>
              <Button onClick={() => setLocation("/")} variant="default">
                <ArrowLeft className="w-4 h-4 mr-2" /> Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main
        ref={exportRef}
        className="container py-8"
        style={exportMode ? { maxWidth: "1280px", width: "1280px" } : undefined}
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
                <div className={`grid gap-6 items-start lg:grid-cols-[1.4fr_0.9fr] lg:grid-rows-[auto_auto] lg:gap-8 ${exportMode ? "grid-cols-[1.4fr_0.9fr] grid-rows-[auto_auto]" : ""}`}>
                  <div className={`order-1 space-y-4 ${exportMode ? "" : "lg:col-start-1 lg:row-start-1"}`}>
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
                  </div>

                  {/* Simple pie chart for overall score */}
                  <div className={`order-2 flex justify-center ${exportMode ? "col-start-2 row-start-1 row-span-2 justify-end self-center" : "lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:justify-end lg:self-center"}`}>
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

                  {/* EU AI Act Status */}
                  <div className={`order-3 border-t pt-3 ${exportMode ? "col-start-1 row-start-2" : "lg:col-start-1 lg:row-start-2 lg:border-t lg:pt-3 lg:mt-2"}`}>
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
                      {riskFactors.highestRisk}
                    </button>
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
                <div className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: exportMode ? 540 : 480 }}>
                  <div
                    className="w-full flex items-center justify-center mx-auto"
                    style={{
                      width: exportMode ? 520 : radarResponsiveSize,
                      height: exportMode ? 520 : radarResponsiveSize,
                      maxWidth: "100%",
                      maxHeight: "100%",
                      aspectRatio: "1 / 1",
                      overflow: "hidden"
                    }}
                  >
                    <Radar
                      data={radarChartData}
                      options={radarChartOptions}
                      style={{ width: "100%", height: "100%" }}
                      ref={radarRef}
                      redraw={exportMode}
                    />
                  </div>
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
                <div className="h-[400px] -mx-4 sm:mx-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ top: 10, right: 20, bottom: 10, left: isSmallScreen ? 0 : 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f6" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={isSmallScreen ? 150 : 200}
                        tick={{ fill: "#2c2f55", fontSize: 11 }}
                      />
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
          <div
            ref={pillarsRef}
            className={`grid gap-5 ${exportMode ? "grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}
            style={exportMode ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } : undefined}
          >
            {results.pillarScores
              .filter(ps => ps.pillar !== "EU AI Act Compliance")
              .map((pillarScore) => {
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
              {incompletePillars.length > 0 && (
                  <div className="space-y-6">
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

              {incompletePillars.length === 0 && !hasRisks && (
                <p className="text-green-700 dark:text-green-300 font-semibold">✅ Excellent! All readiness pillars are at 100% and no EU AI Act risks identified. Your organization is fully prepared.</p>
              )}

              {incompletePillars.length === 0 && hasRisks && (
                <p className="text-foreground font-semibold">✅ All readiness pillars are at 100%. Focus now on addressing the EU AI Act compliance risks identified above.</p>
              )}
            </CardContent>
            </Card>
          </div>

          {/* Final Action & Disclaimer Section (UPDATED) */}
          <div ref={disclaimerRef} className="grid md:grid-cols-2 gap-6 mt-8 print:break-inside-avoid">
            {/* Legal Disclaimer Card */}
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-500">
                  <Scale className="w-5 h-5" />
                  Legal Disclaimer
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  This assessment framework provides a preliminary evaluation of your organization's AI readiness and alignment with the EU AI Act. <strong>It does not constitute legal advice.</strong>
                </p>
                <p className="mt-2">
                  Organizations remain fully responsible for reviewing and complying with all applicable regulations. We strongly recommend consulting with legal experts for definitive compliance verification.
                </p>
              </CardContent>
            </Card>

            {/* Contact & Support Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Mail className="w-5 h-5" />
                  Feedback & Support
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  Do you have questions about your results, suggestions for the tool, or need further assistance with your AI governance strategy?
                </p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="gap-2 w-full sm:w-auto border-primary/20 hover:bg-primary/10 hover:text-primary"
                    onClick={() => window.location.href = 'mailto:ligia@tlu.ee'}
                  >
                    <Mail className="w-4 h-4" />
                    Contact Us: ligia@tlu.ee
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div ref={euAiSectionRef}></div>

          <section className="relative">
            {!exportMode && (
              <>
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  aria-expanded={npsOpen}
                  onClick={() => setNpsOpen((prev) => !prev)}
                  className={`fixed right-4 bottom-6 z-40 min-w-[150px] shadow-xl transition-transform hover:translate-y-[-2px] opacity-90 hover:opacity-100 ${npsOpen ? "opacity-0 pointer-events-none" : ""}`}
                >
                  Feedback
                </Button>

                <div
                  className={`fixed left-1/2 md:left-auto md:right-6 bottom-20 md:bottom-24 z-50 w-[min(92vw,420px)] transition-all duration-300 ease-in-out ${
                    npsOpen
                      ? "translate-y-0 opacity-100 -translate-x-1/2 md:translate-x-0"
                      : "translate-y-4 opacity-0 pointer-events-none -translate-x-1/2 md:translate-x-0"
                  }`}
                >
                  <Card className="border border-border/70 bg-white shadow-xl max-h-[80vh] overflow-y-auto">
                    <CardHeader className="space-y-1 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Feedback</p>
                          <CardTitle className="text-lg leading-tight">
                            How likely are you to recommend this AI Readiness Assessment to a colleague or business partner?
                          </CardTitle>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setNpsOpen(false)}
                          aria-label="Close feedback panel"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        0 = Not likely at all &nbsp;·&nbsp; 10 = Extremely likely
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {useSliderScale ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                            <span className="font-medium">0 · Not likely at all</span>
                            <span className="font-medium text-right">10 · Extremely likely</span>
                          </div>
                          <div className="px-1">
                            <Slider
                              min={0}
                              max={10}
                              step={1}
                              value={[npsScore ?? 5]}
                              onValueChange={(value) => handleScoreSelect(value[0])}
                              aria-label="Likelihood to recommend on a scale from 0 to 10"
                            />
                          </div>
                          <div className="text-center text-sm font-semibold text-foreground">
                            {npsScore !== null ? `Selected score: ${npsScore}` : "Drag the slider to pick a score"}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                            <span className="font-medium">0 · Not likely at all</span>
                            <span className="font-medium text-right">10 · Extremely likely</span>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {Array.from({ length: 11 }).map((_, value) => (
                              <Button
                                key={value}
                                type="button"
                                variant={npsScore === value ? "default" : "outline"}
                                className={`w-12 justify-center ${npsScore === value ? "" : "bg-background/80"}`}
                                onClick={() => handleScoreSelect(value)}
                              >
                                {value}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="nps-feedback">
                          Do you have any additional thoughts or suggestions for us? (Optional)
                        </Label>
                        <Textarea
                          id="nps-feedback"
                          placeholder="Do you have any additional thoughts or suggestions for us? (Optional)"
                          value={npsFeedback}
                          onChange={(e) => {
                            setNpsFeedback(e.target.value);
                            if (npsSubmitted) setNpsSubmitted(false);
                          }}
                          className="min-h-[120px] resize-none"
                        />
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                        <Button
                          onClick={handleSubmitFeedback}
                          disabled={npsSubmitting}
                          className="w-full sm:w-auto"
                        >
                          {npsSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                            </>
                          ) : (
                            "Submit Feedback"
                          )}
                        </Button>
                        {npsSubmitted && (
                          <div className="inline-flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Thank you for your feedback!
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
