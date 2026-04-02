import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StatisticsLoading() {
  return (
    <div className="flex-1 space-y-8 p-4 pt-6 animate-pulse">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-9 w-44 bg-muted rounded-md" />
        <div className="h-4 w-72 bg-muted/60 rounded-md" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-7 w-7 bg-muted rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-20 bg-muted rounded mb-2" />
              <div className="h-3 w-36 bg-muted/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payroll trend + Loans */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="h-4 w-44 bg-muted rounded" />
            <div className="h-3 w-64 bg-muted/60 rounded" />
          </CardHeader>
          <CardContent className="h-56 bg-muted/20 rounded" />
        </Card>
        <Card>
          <CardHeader>
            <div className="h-4 w-32 bg-muted rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/20 rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Deduction charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-36 bg-muted rounded" />
            </CardHeader>
            <CardContent className="h-48 bg-muted/20 rounded" />
          </Card>
        ))}
      </div>

      {/* Staff table */}
      <Card>
        <CardHeader>
          <div className="h-4 w-44 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted/20 rounded" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
