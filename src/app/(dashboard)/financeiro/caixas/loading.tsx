import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  )
}
