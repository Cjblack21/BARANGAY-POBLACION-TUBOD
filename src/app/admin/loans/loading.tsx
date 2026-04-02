import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-32 bg-muted rounded-md" />
        <div className="h-9 w-36 bg-muted rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardHeader className="pb-2">
              <div className="h-4 w-28 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-20 bg-muted rounded mb-2" />
              <div className="h-3 w-36 bg-muted/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><div className="h-5 w-40 bg-muted rounded" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/20 rounded" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
