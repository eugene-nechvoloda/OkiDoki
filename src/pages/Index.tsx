import { PRDForm } from "@/components/PRDForm";
import { PRDOutput } from "@/components/PRDOutput";
import { usePRDGenerator } from "@/hooks/usePRDGenerator";
import { FileText } from "lucide-react";

const Index = () => {
  const { isLoading, prdContent, generatePRD, reset } = usePRDGenerator();

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container max-w-4xl py-8 md:py-16 px-4">
        {/* Header */}
        <header className="text-center mb-10 md:mb-14 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
            <FileText className="h-4 w-4" />
            AI-Powered PRD Generator
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-4">
            Okidoki
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your product ideas into comprehensive PRDs in seconds.
            Just describe your vision, and let AI do the heavy lifting.
          </p>
        </header>

        {/* Main Content */}
        <main className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {!prdContent && !isLoading ? (
            <div className="bg-card rounded-2xl shadow-card border p-6 md:p-8">
              <PRDForm onSubmit={generatePRD} isLoading={isLoading} />
            </div>
          ) : (
            <>
              {isLoading && !prdContent && (
                <div className="bg-card rounded-2xl shadow-card border p-8 md:p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-warm mb-6">
                    <FileText className="h-8 w-8 text-primary-foreground animate-pulse-soft" />
                  </div>
                  <h2 className="font-display font-semibold text-xl mb-2">
                    Generating your PRD...
                  </h2>
                  <p className="text-muted-foreground">
                    This usually takes 15-30 seconds
                  </p>
                </div>
              )}
              {prdContent && <PRDOutput content={prdContent} onReset={reset} />}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>Built with Lovable Cloud</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
