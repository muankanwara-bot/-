import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON payloads
  app.use(express.json());

  // API Route - Proxy Google Sheets CSV export to bypass CORS in browser
  app.get("/api/proxy-sheet", async (req, res) => {
    const sheetUrl = req.query.url as string;
    if (!sheetUrl) {
      return res.status(400).json({ error: "ระบุลิงก์ Google Sheets ไม่ถูกต้อง" });
    }

    try {
      let csvUrl = sheetUrl;
      const docIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch && docIdMatch[1]) {
        const docId = docIdMatch[1];
        let gid = "0";
        const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
        if (gidMatch && gidMatch[1]) {
          gid = gidMatch[1];
        }
        csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
      }

      // Fetch the CSV copy on backend
      const response = await fetch(csvUrl);
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `ดึงข้อมูลไม่ได้ (รหัสสถานะ: ${response.status}) โปรดอนุญาตสิทธิ์การเข้าถึงโดย "ทุกคนที่มีลิงก์สามารถมีสิทธิ์อ่าน" (Anyone with the link can view)`
        });
      }

      const text = await response.text();

      // Check if it returned general Google Login HTML sign-in page (private sheet check)
      if (text.includes("<!DOCTYPE html>") || text.includes("<html") || text.includes("Sign in - Google Accounts")) {
        return res.status(403).json({ 
          error: "Google Sheets เป็นลิงก์ส่วนบุคคล โปรดตั้งค่าเป็นสาธารณะ (เปิดสิทธิ์ให้ 'ทุกคนที่มีลิงก์' เข้าถึงได้ก่อน)" 
        });
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.send(text);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "ล้มเหลวในการเชื่อมโยงข้อมูลกับไฟล์ภายนอก" });
    }
  });

  // Vite middleware for dev mode vs. Express static serving in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
