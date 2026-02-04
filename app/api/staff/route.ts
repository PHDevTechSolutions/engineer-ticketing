import { NextResponse } from 'next/server';

export async function GET() {
  // Replace this with your actual Database fetch (Firebase or SQL)
  const staff = [
    { id: "1", Name: "JOHN DOE" },
    { id: "2", Name: "JANE SMITH" },
    { id: "3", Name: "ALEX RIVERA" },
  ];

  return NextResponse.json(staff);
}