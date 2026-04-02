import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 animate-pulse">
      <div className="h-9 w-36 bg-muted rounded-md" />
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader><div className="h-5 w-36 bg-muted rounded" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-12 bg-muted/20 rounded" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
