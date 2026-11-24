import type { Metadata } from "next";
import { ChangeLog } from "@/components/change-log";
import { SceneSlot } from "@/components/scene-slot";
import { SupplierChangeForm } from "@/components/supplier-change-form";

export const metadata: Metadata = { title: "Change log" };

export default function ActivityPage() {
  return (
    <div className="sinapis-rise-group mx-auto max-w-6xl space-y-8">
      <section className="sinapis-rise space-y-3">
        <h1 className="text-4xl text-ink md:text-5xl">Change log</h1>
        <p className="text-lg leading-relaxed text-ink">
          Log the supplier&apos;s email, see every dish it reaches, and only then write it to the graph.
        </p>
      </section>
      <div className="sinapis-rise grid items-start gap-6 lg:grid-cols-[1.7fr_1fr]">
        <SupplierChangeForm />
        <div className="hidden overflow-hidden rounded-md sm:block">
          <SceneSlot n={4}
            alt="A supplier's tahini tin and a jar on a steel shelf, a ladle resting across a cream spec sheet with one line marked"
            width={720}
            height={880}
          />
        </div>
      </div>
      <section className="sinapis-rise space-y-4">
        <h2 className="text-3xl text-ink md:text-4xl">History</h2>
        <ChangeLog />
      </section>
    </div>
  );
}
