"use client";

/**
 * Health tools: BMI calculator (educational — spec "extra improvements").
 * WHO classification categories, explicit "not a diagnosis" framing, and
 * pointers to professional assessment. No data leaves the browser.
 */

import { useState } from "react";
import { Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumbs, PortalLink, useTrackPageView } from "../shared";

// WHO BMI classification (adults 20+)
const WHO_CATEGORIES: { range: [number, number]; label: string; tone: string }[] = [
  { range: [0, 18.49], label: "Below 18.5 — Underweight", tone: "text-amber-700 border-amber-300 bg-amber-50" },
  { range: [18.5, 24.99], label: "18.5 – 24.9 — Healthy range", tone: "text-emerald-700 border-emerald-300 bg-emerald-50" },
  { range: [25, 29.99], label: "25.0 – 29.9 — Overweight", tone: "text-amber-700 border-amber-300 bg-amber-50" },
  { range: [30, 99], label: "30.0 and above — Obesity", tone: "text-red-700 border-red-300 bg-red-50" },
];

export function ToolsView() {
  useTrackPageView("tools");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [result, setResult] = useState<{ bmi: number; category: string; tone: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  function calculate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!h || !w || h < 80 || h > 250 || w < 20 || w > 400) {
      setError("Please enter a realistic height (80–250 cm) and weight (20–400 kg).");
      return;
    }
    const bmi = w / Math.pow(h / 100, 2);
    const cat = WHO_CATEGORIES.find((c) => bmi >= c.range[0] && bmi <= c.range[1]);
    setResult({
      bmi: Math.round(bmi * 10) / 10,
      category: cat?.label ?? "",
      tone: cat?.tone ?? "",
    });
  }

  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: "Health tools" }]} />
      <header className="mb-6">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          <Calculator className="h-8 w-8 text-[#13A89E]" aria-hidden="true" />
          Health tools
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
          Educational calculators. Results are screening information — never a
          diagnosis.
        </p>
      </header>

      <Card className="shadow-soft">
        <CardContent className="p-6">
          <h2 className="text-base font-bold text-foreground">BMI calculator</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Body Mass Index (BMI) is a rough screening measure comparing weight
            to height using WHO adult categories. It does not measure body
            composition and does not apply to children (who need growth
            charts), athletes, pregnant women or older adults with muscle loss.
          </p>

          <form onSubmit={calculate} className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bmi-height">Height (cm)</Label>
              <Input
                id="bmi-height"
                type="number"
                inputMode="numeric"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 165"
                className="mt-1.5 h-11"
                min={80}
                max={250}
              />
            </div>
            <div>
              <Label htmlFor="bmi-weight">Weight (kg)</Label>
              <Input
                id="bmi-weight"
                type="number"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="e.g. 62"
                className="mt-1.5 h-11"
                min={20}
                max={400}
              />
            </div>
            <div className="col-span-2">
              <Button type="submit" className="w-full font-semibold sm:w-auto">
                Calculate BMI
              </Button>
            </div>
          </form>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}

          {result && (
            <div
              role="status"
              className={`mt-5 rounded-2xl border p-5 text-center ${result.tone}`}
            >
              <p className="text-4xl font-extrabold tabular-nums">{result.bmi}</p>
              <p className="mt-1 text-sm font-bold">{result.category}</p>
              <p className="mt-2 text-xs leading-relaxed opacity-80">
                This is a screening number, not a diagnosis. Discuss your weight
                and health goals with a doctor — they interpret BMI alongside
                many other factors.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            <p className="flex items-center gap-2 font-bold">
              <Info className="h-4 w-4" aria-hidden="true" />
              Educational tool
            </p>
            <p className="mt-1.5">
              Your entries stay in your browser — nothing is sent to any server.
              For guidance on weight, diet or activity,{" "}
              <PortalLink
                view={{ name: "doctors" }}
                className="font-semibold underline underline-offset-2"
              >
                find a doctor
              </PortalLink>{" "}
              or read our{" "}
              <PortalLink
                view={{ name: "library", category: "preventive-health" }}
                className="font-semibold underline underline-offset-2"
              >
                preventive health guides
              </PortalLink>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
