import { PageSkeleton } from "@/components/ui/skeleton";

export default function OverviewSkeleton() {
  return <PageSkeleton label="Loading the allergen matrix" cards={2} wide />;
}
