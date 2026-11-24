import { PageSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <PageSkeleton label="Walking the graph for this dish" cards={3} />;
}
