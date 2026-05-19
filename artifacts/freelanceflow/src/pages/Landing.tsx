import { motion } from "framer-motion";
import { Link } from "wouter";
import { SignInButton, SignUpButton, useAuth } from "@clerk/react";
import { ArrowRight, Bot, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="fixed top-0 w-full border-b border-white/5 bg-background/80 backdrop-blur-md z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-bold text-primary">FreelanceFlow<span className="text-foreground">.ai</span></div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block">Pricing</Link>
            {isSignedIn ? (
              <Link href="/dashboard" className="text-sm font-medium">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="ghost" className="text-sm">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="text-sm">Get Started</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              Get hired faster <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">with AI</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Stop writing generic cover letters. FreelanceFlow AI matches you with the right jobs and generates high-converting, personalized proposals in seconds.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {isSignedIn ? (
                <Link href="/dashboard">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold rounded-full group">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold rounded-full group">
                    Start Winning Jobs
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </SignUpButton>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-card/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Work smarter, not harder</h2>
            <p className="mt-4 text-lg text-muted-foreground">Everything you need to scale your freelance business.</p>
          </div>
          <div className="mx-auto mt-16 max-w-5xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {[
                { name: 'AI Proposals', description: 'Generate tailored proposals that highlight your relevant skills and match the tone of the job post.', icon: Bot },
                { name: 'Smart Job Matching', description: 'Our algorithm finds the jobs you are most likely to win based on your profile and past success.', icon: Target },
                { name: 'Success Scoring', description: 'Get an instant probability score on how likely you are to win a job before you even apply.', icon: Zap },
              ].map((feature, idx) => (
                <motion.div
                  key={feature.name}
                  className="flex flex-col rounded-2xl bg-background p-8 border border-white/5 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2 }}
                >
                  <dt className="flex items-center gap-x-3 text-xl font-semibold text-foreground">
                    <feature.icon className="h-6 w-6 flex-none text-primary" aria-hidden="true" />
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <footer className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10" />
        <div className="relative mx-auto max-w-3xl px-6 text-center z-10">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to take your freelance career to the next level?</h2>
          <p className="mt-4 text-lg text-muted-foreground">Join thousands of freelancers winning more work with AI.</p>
          <div className="mt-10 flex justify-center">
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button size="lg" className="rounded-full">View Dashboard</Button>
              </Link>
            ) : (
              <SignUpButton mode="modal">
                <Button size="lg" className="rounded-full">Get Started for Free</Button>
              </SignUpButton>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
