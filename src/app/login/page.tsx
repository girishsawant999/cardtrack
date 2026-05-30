"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, Mail, Shield, Sparkles, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "https://www.googleapis.com/auth/gmail.readonly",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo & Branding */}
        <div className="mb-10 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-brand-gradient mb-6 relative ">
            <CreditCard className="w-10 h-10 text-primary-foreground" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center ring-2 ring-background">
              <Sparkles className="w-3 h-3 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">
            Card<span className="text-gradient">Track</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-xs mx-auto leading-relaxed">
            Never miss a credit card payment again. Auto-track your bills from email.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="w-full max-w-sm mb-10 space-y-3 animate-slide-up">
          {[
            {
              icon: Mail,
              title: "Auto-detect from Gmail",
              description: "We scan your emails for statement alerts",
            },
            {
              icon: Shield,
              title: "AI-verified bills",
              description: "Gemini AI extracts & validates bill details",
            },
            {
              icon: CreditCard,
              title: "All cards in one place",
              description: "Track multiple cards with beautiful visuals",
            },
          ].map((feature, i) => (
            <div
              key={feature.title}
              className={`flex items-start gap-4 p-4 surface-glass-card stagger-${i + 1}`}
              style={{ animationFillMode: "both" }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Login button */}
        <div className="w-full max-w-sm animate-slide-up stagger-4" style={{ animationFillMode: "both" }}>
          <button
            id="google-login-button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl
              bg-brand-gradient font-semibold text-base
              
              hover:
              active:scale-[0.98]
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200 ease-out"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
            We&apos;ll request read-only access to your Gmail
            <br />
            to detect credit card statement emails.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-6 relative z-10">
        <p className="text-xs text-muted-foreground">
          Your data is encrypted and never shared.
        </p>
      </div>
    </div>
  );
}
