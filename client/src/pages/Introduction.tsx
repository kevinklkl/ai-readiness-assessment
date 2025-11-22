import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Clock, FileText, Users } from "lucide-react";
import Footer from "@/components/Footer";

export default function Introduction() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="topographic" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M10 10c0 20 20 20 20 40s20 20 20 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/20"/>
                <path d="M50 10c0 20 20 20 20 40s20 20 20 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-accent/20"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#topographic)" />
          </svg>
        </div>
        
        <div className="container relative py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              AI Readiness Assessment
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Navigate Your AI Journey with Confidence
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A comprehensive assessment designed to evaluate your organization's readiness for AI adoption across strategy, governance, data, people, and compliance.
            </p>
            
            {/* MAIN BUTTONS */}
            <div className="flex gap-4 justify-center pt-4 flex-wrap">
              <Button size="lg" onClick={() => setLocation("/questionnaire")} className="text-lg px-8">
                Start Assessment
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              {/* BUTTON UPDATED TO ENGLISH */}
              <Button size="lg" variant="secondary" onClick={() => setLocation("/about-us")}>
                <Users className="w-5 h-5 mr-2" />
                About Us
              </Button>

              <Button size="lg" variant="outline" onClick={() => window.scrollTo({ top: 600, behavior: "smooth" })}>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 bg-card border-y">
        <div className="container">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">45 Questions</h3>
              <p className="text-muted-foreground">
                Comprehensive coverage across 9 critical pillars of AI readiness
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">20-30 Minutes</h3>
              <p className="text-muted-foreground">
                Estimated time to complete the full assessment
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Visual Dashboard</h3>
              <p className="text-muted-foreground">
                Instant results with charts and actionable insights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Assessment Pillars */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-foreground">Assessment Pillars</h2>
              <p className="text-lg text-muted-foreground">
                Our questionnaire evaluates your organization across nine essential dimensions
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Strategy & Value
                  </CardTitle>
                  <CardDescription>
                    AI strategy alignment with organizational objectives and value tracking
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    Governance, Ethics & Compliance
                  </CardTitle>
                  <CardDescription>
                    Policy frameworks, human oversight, and data governance structures
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Data Foundations
                  </CardTitle>
                  <CardDescription>
                    Data quality, ownership, cataloging, and readiness for AI applications
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    People, Skills & Culture
                  </CardTitle>
                  <CardDescription>
                    Team capabilities, training programs, and organizational culture
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    Data, Platforms & MLOps
                  </CardTitle>
                  <CardDescription>
                    Cross-functional collaboration and operational workflows
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Process & Stakeholders
                  </CardTitle>
                  <CardDescription>
                    Pipeline management, versioning, and monitoring practices
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    EU AI Act Compliance
                  </CardTitle>
                  <CardDescription>
                    Comprehensive evaluation of compliance with EU AI Act requirements including prohibited practices, high-risk applications, and transparency obligations
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-card border-y">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-foreground">How It Works</h2>
              <p className="text-lg text-muted-foreground">
                Complete the assessment in three simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Answer Questions</h3>
                  <p className="text-muted-foreground">
                    Navigate through 9 sections, answering questions honestly based on your organization's current state. Your progress is automatically saved.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Review Results</h3>
                  <p className="text-muted-foreground">
                    View your comprehensive dashboard with visual breakdowns of scores across all pillars and compliance areas.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Take Action</h3>
                  <p className="text-muted-foreground">
                    Use the insights to identify gaps, prioritize improvements, and build your AI readiness roadmap.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-4xl font-bold text-foreground">Ready to Begin?</h2>
            <p className="text-xl text-muted-foreground">
              Start your AI readiness assessment now and discover where your organization stands on its AI journey.
            </p>
            <Button size="lg" onClick={() => setLocation("/questionnaire")} className="text-lg px-8">
              Start Assessment
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-muted-foreground pt-4">
              All data is stored locally in your browser. No registration required.
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="pb-10 px-4">
        <div className="container">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
              <p>
                <span className="font-semibold">Disclaimer:</span> This framework does not replace or supersede the legal requirements of the EU AI Act. Organizations remain fully responsible for reviewing and complying with all applicable regulations. <span className="font-semibold">This is only a recommendation.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}