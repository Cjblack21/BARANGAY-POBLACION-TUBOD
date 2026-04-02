import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PersonnelDashboardLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-9 w-48 bg-muted rounded-md" />
        <div className="h-4 w-56 bg-muted/60 rounded" />
      </div>
      <div className="h-4 w-16 bg-muted/40 rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4 pt-4">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="h-6 w-20 bg-muted rounded mb-1" />
              <div className="h-3 w-32 bg-muted/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        {[1, 2].map((i) => (
          <div key={i}>
            <div className="h-6 w-36 bg-muted rounded mb-4" />
            <div className="flex flex-col gap-4">
              {[1, 2].map((j) => (
                <Card key={j} className="border-l-4 border-l-muted">
                  <CardContent className="p-4">
                    <div className="h-16 bg-muted/20 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
