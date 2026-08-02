import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="size-24 rounded-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="col-span-2 h-20" />
      </div>
    </div>
  );
}