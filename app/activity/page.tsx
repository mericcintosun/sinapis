import type { Metadata } from "next";
import { ChangeLog } from "@/components/change-log";
import { SceneSlot } from "@/components/scene-slot";
import { SupplierChangeForm } from "@/components/supplier-change-form";

export const metadata: Metadata = { title: "Change log" };

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="sinapis-rise grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <h1 className="text-4xl text-ink md:text-5xl">Change log</h1>
          <p className="max-w-[66ch] text-lg leading-relaxed text-ink/90">
            Suppliers change recipes quietly. A new roasting line, a new grower, a new oven. Log the email here, see
            exactly which dishes it touches, and only then write it to the graph.
          </p>
        </div>
        <div className="overflow-hidden rounded-md">
          <SceneSlot
            n={3}
            alt="A tahini tin with a fresh supplier label taped on, next to an open email and three plates marked with red tags"
            width={960}
            height={600}
          />
        </div>
      </section>
      <SupplierChangeForm />
      <section className="space-y-4">
        <h2 className="text-3xl text-ink">History</h2>
        <ChangeLog />
      </section>
    </div>
  );
}
