"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface StaffUser {
  _id: string
  Firstname: string
  Lastname: string
  Email: string
  Department: string
  Position: string
  ReferenceID: string
  profilePicture?: string
}

export default function StaffTableShell({ userId }: { userId?: string | null }) {
  const [staff, setStaff] = React.useState<StaffUser[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchStaff() {
      try {
        // Fetching all users - adjust endpoint if you have a specific /api/staff
        const res = await fetch(`/api/user/all`) 
        const data = await res.json()
        setStaff(data)
      } catch (error) {
        console.error("Error fetching directory:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStaff()
  }, [])

  if (loading) return <div>Loading staff records...</div>

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Reference ID</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Position</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow key={member._id}>
              <TableCell className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.profilePicture} />
                  <AvatarFallback>{member.Firstname[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{member.Firstname} {member.Lastname}</span>
                  <span className="text-xs text-muted-foreground">{member.Email}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {member.ReferenceID || "N/A"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-primary/5">
                  {member.Department}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{member.Position}</TableCell>
              <TableCell className="text-right">
                <button className="text-xs text-primary hover:underline font-bold uppercase">
                  Edit Profile
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}