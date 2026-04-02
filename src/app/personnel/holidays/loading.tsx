import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PersonnelHolidaysLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 animate-pulse">
      <div className="h-9 w-44 bg-muted rounded-md" />
      <div className="h-4 w-56 bg-muted/60 rounded" />
      <Card>
        <CardHeader>
          <div className="h-5 w-36 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted/20 rounded" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
