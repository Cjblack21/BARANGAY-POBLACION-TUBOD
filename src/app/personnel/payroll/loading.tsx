import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PersonnelPayrollLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 animate-pulse">
      <div className="h-9 w-64 bg-muted rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardContent className="p-4">
              <div className="h-3 w-28 bg-muted/60 rounded mb-2" />
              <div className="h-8 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-36 bg-muted/20 rounded-xl" />
          <div className="h-36 bg-muted/20 rounded-xl" />
        </CardContent>
      </Card>
    </div>
  )
}
