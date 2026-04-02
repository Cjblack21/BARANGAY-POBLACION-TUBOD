import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-52 bg-muted rounded-md" />
        <div className="h-9 w-36 bg-muted rounded-md" />
      </div>
      <Card>
        <CardHeader><div className="h-5 w-44 bg-muted rounded" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/20 rounded" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
