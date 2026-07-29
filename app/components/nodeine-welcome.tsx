"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Compass,
  Heart,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export const NODEINE_WELCOME_EVENT = "nodeine:open-welcome";

const storageKey = "nodeine:welcome:v1";

type WelcomeStep = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  secondaryIcon: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
  }>;
};

const steps: WelcomeStep[] = [
  {
    number: "01",
    eyebrow: "Explore",
    title: "Find a world that pulls you in.",
    description:
      "Move through visual worlds, open any artwork, and follow the ideas that catch your attention.",
    detail: "Discover by collection, mood, creator, or pure surprise.",
    icon: Compass,
    secondaryIcon: Sparkles,
  },
  {
    number: "02",
    eyebrow: "Collect",
    title: "Shape an archive that feels like yours.",
    description:
      "Like the work that hits, save pieces for later, and follow creators whose worlds you want to revisit.",
    detail: "Your saves stay private. Your follows help shape what comes next.",
    icon: Bookmark,
    secondaryIcon: Heart,
  },
  {
    number: "03",
    eyebrow: "Create",
    title: "Add your own signal to NODEINE.",
    description:
      "Creator Studio lets you publish artwork, organize collections, and build a public visual identity.",
    detail: "Start as a viewer. Become part of the archive when you are ready.",
    icon: Sparkles,
    secondaryIcon: Compass,
  },
];

function rememberWelcome() {
  try {
    window.localStorage.setItem(storageKey, "seen");
  } catch {
    // The tour still works when browser storage is unavailable.
  }
}

export default function NodeineWelcome() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const SecondaryIcon = step.secondaryIcon;

  useEffect(() => {
    function openTour() {
      setStepIndex(0);
      setOpen(true);
    }

    window.addEventListener(NODEINE_WELCOME_EVENT, openTour);

    let frame = 0;
    try {
      if (pathname === "/" && !window.localStorage.getItem(storageKey)) {
        frame = window.requestAnimationFrame(openTour);
      }
    } catch {
      // A replay button remains available when storage is blocked.
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener(NODEINE_WELCOME_EVENT, openTour);
    };
  }, [pathname]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) rememberWelcome();
  }

  function finishTour() {
    rememberWelcome();
    setOpen(false);
    window.requestAnimationFrame(() => {
      document
        .getElementById("archive-worlds")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-1.5rem)] max-w-[calc(100%-1.5rem)] overflow-y-auto border border-cyan-300/20 bg-zinc-950 p-0 shadow-[0_30px_100px_rgba(0,0,0,.8)] sm:max-w-3xl motion-reduce:duration-0 motion-reduce:animate-none"
      >
        <div className="grid sm:grid-cols-[0.88fr_1.12fr]">
          <div className="relative isolate min-h-44 overflow-hidden border-b border-white/10 bg-black p-6 sm:min-h-[510px] sm:border-b-0 sm:border-r sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(103,232,249,.20),transparent_36%),radial-gradient(circle_at_75%_85%,rgba(34,211,238,.09),transparent_38%)]" />
            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:34px_34px]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
                  NODEINE / Orientation
                </p>
                <span className="font-mono text-[10px] tracking-[0.22em] text-zinc-600">
                  {step.number} / 03
                </span>
              </div>

              <div className="relative mx-auto grid size-24 place-items-center sm:size-40">
                <span className="absolute inset-0 rounded-full border border-cyan-300/15 nodeine-orbit" />
                <span className="absolute inset-4 rounded-full border border-white/10" />
                <span className="grid size-16 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,.12)] sm:size-20">
                  <StepIcon className="size-7 sm:size-9" aria-hidden={true} />
                </span>
                <SecondaryIcon
                  className="absolute -right-1 bottom-3 size-5 text-zinc-600 sm:right-2 sm:bottom-7"
                  aria-hidden={true}
                />
              </div>

              <p className="hidden max-w-xs text-xs uppercase leading-6 tracking-[0.18em] text-zinc-600 sm:block">
                A living visual network for impossible worlds.
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-5 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                {step.eyebrow}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleOpenChange(false)}
                className="nodeine-action -mr-2 text-zinc-500 hover:text-white"
                aria-label="Close welcome tour"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-6 flex-1" aria-live="polite">
              <DialogTitle className="max-w-md text-3xl font-light leading-tight text-white sm:text-4xl">
                {step.title}
              </DialogTitle>
              <DialogDescription className="mt-4 max-w-md text-base leading-7 text-zinc-400">
                {step.description}
              </DialogDescription>
              <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm leading-6 text-zinc-300">{step.detail}</p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex gap-2" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
                {steps.map((item, index) => (
                  <span
                    key={item.number}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      index <= stepIndex ? "bg-cyan-300" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                {stepIndex === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenChange(false)}
                    className="nodeine-action min-h-11 px-2 text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
                  >
                    Skip tour
                  </button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStepIndex((current) => current - 1)}
                    className="nodeine-action h-11 text-zinc-400"
                  >
                    <ArrowLeft data-icon="inline-start" />
                    Back
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={() => {
                    if (stepIndex === steps.length - 1) {
                      finishTour();
                    } else {
                      setStepIndex((current) => current + 1);
                    }
                  }}
                  className="nodeine-action h-11 bg-cyan-300 px-5 text-zinc-950 hover:bg-cyan-200"
                >
                  {stepIndex === steps.length - 1 ? "Enter NODEINE" : "Next"}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
