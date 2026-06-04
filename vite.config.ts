import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-proxy-sheet',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/proxy-sheet')) {
              try {
                // Parse the search parameters
                const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
                const sheetUrl = parsedUrl.searchParams.get('url');

                if (!sheetUrl) {
                  res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                  res.end(JSON.stringify({ error: 'ระบุลิงก์ Google Sheets ไม่ถูกต้อง' }));
                  return;
                }

                let csvUrl = sheetUrl;
                const docIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (docIdMatch && docIdMatch[1]) {
                  const docId = docIdMatch[1];
                  let gid = '0';
                  const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
                  if (gidMatch && gidMatch[1]) {
                    gid = gidMatch[1];
                  }
                  csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
                }

                // Fetch the CSV copy on backend
                const response = await fetch(csvUrl);
                if (!response.ok) {
                  res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8' });
                  res.end(JSON.stringify({
                    error: `ดึงข้อมูลไม่ได้ (รหัสสถานะ: ${response.status}) โปรดอนุญาตสิทธิ์การเข้าถึงโดย "ทุกคนที่มีลิงก์สามารถมีสิทธิ์อ่าน" (Anyone with the link can view)`
                  }));
                  return;
                }

                const text = await response.text();

                // Check if it returned general Google Login HTML sign-in page (private sheet check)
                if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('Sign in - Google Accounts')) {
                  res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                  res.end(JSON.stringify({
                    error: "Google Sheets เป็นลิงก์ส่วนบุคคล โปรดตั้งค่าเป็นสาธารณะ (เปิดสิทธิ์ให้ 'ทุกคนที่มีลิงก์' เข้าถึงได้ก่อน)"
                  }));
                  return;
                }

                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(text);
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: err.message || 'ล้มเหลวในการเชื่อมโยงข้อมูลกับไฟล์ภายนอก' }));
              }
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
