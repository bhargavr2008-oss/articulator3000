"use client";

const STEPS = ["Capture", "Grill", "Confirm", "Result"] as const;

export default function FlowStepper({ active }: { active: string }) {
  const activeIndex = STEPS.findIndex(
    (step) => step.toLowerCase() === active.toLowerCase(),
  );
  return (
    <nav aria-label="Idea workflow" className="flex items-center gap-2">
      {STEPS.map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          {index > 0 && <span className="h-px w-5 bg-stone-700 sm:w-10" />}
          <span
            className={
              index <= activeIndex
                ? "text-xs font-semibold text-emerald-400"
                : "text-xs text-stone-600"
            }
          >
            {step}
          </span>
        </div>
      ))}
    </nav>
  );
}
