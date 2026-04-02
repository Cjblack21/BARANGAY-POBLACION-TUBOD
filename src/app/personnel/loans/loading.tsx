import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PersonnelLoansLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 animate-pulse">
      <div className="h-9 w-40 bg-muted rounded-md" />
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardHeader className="pb-1 px-4 pt-4">
              <div className="h-3 w-20 bg-muted rounded" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="h-6 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
