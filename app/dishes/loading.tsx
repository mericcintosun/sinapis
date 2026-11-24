import { PageSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <PageSkeleton label="Loading the menu" cards={2} wide />;
}
