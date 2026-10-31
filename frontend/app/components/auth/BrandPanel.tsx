import { Logo } from "./Logo";
import { DemoCard } from "./DemoCard";
import { FeatureCards } from "./FeatureCards";

/** The dark left-hand branding panel. Shows the demo card on sign-in and feature cards on sign-up. */
export function BrandPanel({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="hidden lg:flex flex-col justify-between w-1/2 shrink-0 bg-[#0A0A0B] px-14 py-12">
      <Logo dark />

      <div className="flex flex-col gap-8 max-w-[520px]">
        <div>
          <h1 className="font-display text-[3.75rem] leading-[0.98] font-bold text-white">
            Just blurt it.
            <br />
            <span className="text-[#0A84FF]">We&rsquo;ll sort it.</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mt-6 max-w-md">
            Talk for a minute about your day. Blurt turns it into a work log, tasks and lists, and saves nothing until you approve it.
          </p>
        </div>

        {mode === "signup" ? <FeatureCards /> : <DemoCard />}
      </div>

      <div className="flex items-center text-sm text-gray-500">
        <span>© 2026 Blurt</span>
      </div>
    </div>
  );
}
