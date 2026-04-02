import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-8 p-4 pt-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-72 bg-muted rounded-md" />
        <div className="h-4 w-80 bg-muted/60 rounded-md" />
      </div>

      <div className="h-4 w-16 bg-muted/40 rounded" />

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-20 bg-muted rounded mb-2" />
              <div className="h-3 w-36 bg-muted/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Calendar skeleton */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-40 bg-muted rounded" />
                <div className="h-3 w-52 bg-muted/60 rounded" />
              </CardHeader>
              <CardContent className="h-[300px] bg-muted/20 rounded" />
            </Card>
          ))}
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent className="h-[320px] bg-muted/20 rounded" />
          </Card>
        </div>
      </div>
    </div>
  )
}
