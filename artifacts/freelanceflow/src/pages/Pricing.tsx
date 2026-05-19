import { SignUpButton, useAuth } from "@clerk/react";
import { Link } from "wouter";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Pricing() {
  const { isSignedIn } = useAuth();

  const tiers = [
    {
      name: "Free",
      id: "tier-free",
      price: "$0",
      description: "Perfect for new freelancers just getting started.",
      features: [
        "Up to 5 AI proposals per month",
        "Basic job matching",
        "Save up to 10 jobs",
        "Community support",
        "Standard response tone"
      ],
      missingFeatures: [
        "Unlimited AI proposals",
        "Advanced success scoring",
        "Custom tone matching",
        "Client history insights"
      ],
      mostPopular: false,
    },
    {
      name: "Pro",
      id: "tier-pro",
      price: "$10",
      priceSuffix: "/mo",
      description: "For active freelancers looking to scale their income.",
      features: [
        "Up to 50 AI proposals per month",
        "Advanced job matching",
        "Unlimited saved jobs",
        "Success scoring prediction",
        "3 custom writing tones",
        "Priority email support"
      ],
      missingFeatures: [
        "Unlimited AI proposals",
        "Client history insights"
      ],
      mostPopular: true,
    },
    {
      name: "Pro Plus",
      id: "tier-plus",
      price: "$25",
      priceSuffix: "/mo",
      description: "Unlimited power for established freelance agencies.",
      features: [
        "Unlimited AI proposals",
        "Premium job matching algorithms",
        "Unlimited saved jobs",
        "Success scoring prediction",
        "Unlimited custom writing tones",
        "Client history & rating insights",
        "24/7 Priority support"
      ],
      missingFeatures: [],
      mostPopular: false,
    },
  ];

  return (
    <div className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/">
            <Button variant="ghost" className="mb-8">Back to Home</Button>
          </Link>
          <h2 className="text-base font-semibold leading-7 text-primary">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Choose the right plan for your business
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-muted-foreground">
          Whether you're sending your first proposal or managing an agency workload, we have a tier that fits your needs.
        </p>

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 xl:gap-x-12">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`flex flex-col justify-between ${tier.mostPopular ? 'ring-2 ring-primary bg-card/80' : 'bg-card/50'}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-x-4">
                  <CardTitle id={tier.id} className="text-lg leading-8">
                    {tier.name}
                  </CardTitle>
                  {tier.mostPopular ? (
                    <Badge variant="default" className="rounded-full bg-primary/20 text-primary hover:bg-primary/30">
                      Most popular
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="mt-4 text-sm leading-6">
                  {tier.description}
                </CardDescription>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                  {tier.priceSuffix && <span className="text-sm font-semibold leading-6 text-muted-foreground">{tier.priceSuffix}</span>}
                </p>
              </CardHeader>

              <CardContent className="flex-1">
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                  {tier.missingFeatures.map((feature) => (
                    <li key={feature} className="flex gap-x-3 text-muted-foreground opacity-60">
                      <X className="h-6 w-5 flex-none" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isSignedIn ? (
                  <Link href="/dashboard" className="w-full">
                    <Button
                      className={`w-full ${tier.mostPopular ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                      variant={tier.mostPopular ? "default" : "secondary"}
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <SignUpButton mode="modal">
                    <Button
                      className={`w-full ${tier.mostPopular ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                      variant={tier.mostPopular ? "default" : "secondary"}
                    >
                      Get Started
                    </Button>
                  </SignUpButton>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
