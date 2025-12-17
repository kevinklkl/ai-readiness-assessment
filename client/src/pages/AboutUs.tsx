import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Users, Eye, Server, FileCheck, GraduationCap, Mail } from "lucide-react";
import Footer from "@/components/Footer";

export default function AboutUs() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* --- HEADER SECTION --- */}
      <header className="bg-muted/30 w-full border-b">
        <div className="container py-12 text-center">
          <div className="flex justify-start">
            <Button
              variant="default"
              onClick={() => setLocation("/")}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Home
            </Button>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
            About Us & Privacy
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-3xl mx-auto">
            Academic expertise meets practical compliance. Learn who we are and how we protect your data.
          </p>
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-12 space-y-20">
          
          {/* --- SECTION 1: WHO WE ARE (Updated Layout) --- */}
          <section className="max-w-5xl mx-auto">
            <div className="text-left mb-12">
              <h2 className="text-3xl font-bold mb-6 flex items-center justify-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                Who We Are
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                <p>
                  We are a specialized team dedicated to bridging the gap between AI innovation and regulatory compliance. Our mission is to empower organizations to adopt Artificial Intelligence confidently, knowing they are aligned with global standards like the EU AI Act.
                </p>
              </div>
            </div>

            {/* ACADEMIC BACKGROUND SECTION */}
            <Card className="mb-12 border-primary/20 shadow-sm">
              <CardHeader className="pb-2 text-center">
                <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">MSc in Artificial Intelligence</CardTitle>
                <p className="text-muted-foreground">Research & Development Background</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-6 text-center">
                  <div className="flex items-center gap-2 font-medium bg-muted px-4 py-2 rounded-full">
                    🇫🇮 Tampere University
                  </div>
                  <div className="flex items-center gap-2 font-medium bg-muted px-4 py-2 rounded-full">
                    🇵🇹 Lusófona University
                  </div>
                  <div className="flex items-center gap-2 font-medium bg-muted px-4 py-2 rounded-full">
                    🇪🇪 Tallinn University
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VISION (Moved Below) */}
            <div className="bg-primary/5 border border-primary/10 p-8 rounded-2xl text-center mb-12">
              <h3 className="text-xl font-semibold text-foreground mb-4">Our Vision</h3>
              <p className="text-xl italic text-muted-foreground max-w-3xl mx-auto">
                "To create a future where AI adoption is safe, ethical, and accessible to everyone, fostering trust between technology and society."
              </p>
            </div>

            {/* CONTACT SECTION */}
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Interested in discussing AI governance or collaboration?
              </p>
              <Button 
                size="lg" 
                className="gap-2 rounded-full px-8"
                onClick={() => window.location.href = 'mailto:ligia@tlu.ee'}
              >
                <Mail className="w-4 h-4" />
                Contact Us
              </Button>
            </div>
          </section>

          <hr className="border-border" />

          {/* --- SECTION 2: GDPR & PRIVACY (Unchanged) --- */}
          <section className="max-w-5xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <Shield className="w-8 h-8 text-accent" />
              GDPR & Data Privacy
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <Server className="w-10 h-10 text-primary mb-2" />
                  <CardTitle>Assessment Results Stay Local</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Your questionnaire answers and assessment results are stored in your browser (local storage) and processed locally on your device. We do not receive or store your assessment answers on our servers.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Eye className="w-10 h-10 text-primary mb-2" />
                  <CardTitle>No Tracking</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  We do not use cookies for advertising, tracking pixels, or third-party analytics that compromise your anonymity.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Mail className="w-10 h-10 text-primary mb-2" />
                  <CardTitle>Feedback (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  If you submit feedback, we store your score and optional comment to improve the tool (this is the only time the app sends data to our server). We retain feedback for a limited period (typically up to 180 days).
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileCheck className="w-10 h-10 text-primary mb-2" />
                  <CardTitle>EU AI Act Ready</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Our framework is designed specifically to help you prepare for the EU AI Act requirements, ensuring your governance structure is robust.
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted p-8 rounded-xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Your Rights (GDPR)
              </h3>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                <p>
                  Under the General Data Protection Regulation (GDPR), you have the right to access, rectify, and erase your personal data. 
                  Your assessment answers stay in your browser. If you submit feedback, we store that feedback and will help you exercise your rights.
                </p>
                <ul className="list-disc pl-5 mt-4 space-y-2">
                  <li>To delete your assessment data, use the reset button or clear your browser storage.</li>
                  <li>We store functional preferences (e.g., sidebar state) in your browser (cookie/local storage).</li>
                  <li>To request deletion of submitted feedback, contact us by email and include the approximate time and the text you submitted.</li>
                  <li>Service providers (hosting, database) may process data on our behalf when enabled/configured.</li>
                  <li>This tool is strictly for self-assessment purposes.</li>
                </ul>
              </div>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
