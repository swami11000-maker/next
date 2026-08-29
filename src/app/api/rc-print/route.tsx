import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const rcno = searchParams.get("rcno");
  if (!rcno) {
    return NextResponse.json({ error: "Missing rcno parameter" }, { status: 400 });
  }

  const cardtype = searchParams.get("cardtype");
  const chiptype = searchParams.get("chiptype");

  const apiKey = "358d9943fd434085b9947ff78441183d314a209ddd666803453b5d80b4fb";
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const url = new URL("https://www.apicentre.in/api/rc");
  url.searchParams.append("api_key", apiKey);
  url.searchParams.append("rcno", rcno);
  if (cardtype) url.searchParams.append("cardtype", cardtype);
  if (chiptype) url.searchParams.append("chiptype", chiptype);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return NextResponse.json({ error: `External API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("RC API call failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
