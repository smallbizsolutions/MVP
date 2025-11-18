import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    // 1. Process the uploaded file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    // 2. Get file details
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.replaceAll(" ", "_"); // Replace spaces for safety

    // 3. Define the save location (public/documents)
    const uploadDir = path.join(process.cwd(), "public", "documents");

    // 4. Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 5. Save the file
    // This writes the raw PDF or TXT data directly to the disk
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    console.log(`File saved successfully: ${filename}`);

    return NextResponse.json({ 
      message: "File uploaded successfully", 
      fileName: filename 
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 }
    );
  }
}
