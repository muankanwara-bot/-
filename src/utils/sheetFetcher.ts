/**
 * Helper to fetch public Google Sheets as CSV.
 * It tries fetching through the local `/api/proxy-sheet` proxy first to bypass CORS or restricted proxies.
 * If that fails or returns a 404 (common on static deployments like Vercel), it falls back to a direct client-side fetch.
 */
export async function fetchGoogleSheet(sheetUrl: string): Promise<string> {
  const trimmedUrl = sheetUrl.trim();

  // 1. Try local Express API Proxy first
  try {
    const proxyUrl = `/api/proxy-sheet?url=${encodeURIComponent(trimmedUrl)}`;
    const response = await fetch(proxyUrl);

    if (response.ok) {
      const text = await response.text();
      if (
        text &&
        !text.trim().startsWith("<!DOCTYPE html>") &&
        !text.includes("<html") &&
        !text.includes("Sign in - Google Accounts")
      ) {
        return text;
      }
    } else if (response.status !== 404) {
      // If the proxy server is active but returned an explicit error (e.g., 403 Private Sheet)
      try {
        const errData = await response.json();
        if (errData && errData.error) {
          throw new Error(errData.error);
        }
      } catch (_) {}
    }
  } catch (err: any) {
    // If we threw a specific permission or private link exception from the proxy response, rethrow it
    if (
      err.message &&
      (err.message.includes("สาธารณะ") || err.message.includes("ลิงก์ส่วนบุคคล"))
    ) {
      throw err;
    }
    console.warn("Proxy sync failed or returned 404, falling back to direct browser fetch:", err);
  }

  // 2. Fallback: Parse Google Sheet link and fetch direct export from Google's CDN
  let csvUrl = trimmedUrl;
  const docIdMatch = trimmedUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (docIdMatch && docIdMatch[1]) {
    const docId = docIdMatch[1];
    let gid = "0";
    const gidMatch = trimmedUrl.match(/gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
    }
    csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
  }

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(
        `ไม่สามารถเชื่อมต่อชีตได้ (Status: ${response.status}) โปรดตั้งค่าแชร์ไฟล์ให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" (Anyone with link can view)`
      );
    }
    const text = await response.text();
    if (
      !text ||
      text.trim().startsWith("<!DOCTYPE html>") ||
      text.includes("<html") ||
      text.includes("Sign in")
    ) {
      throw new Error(
        "ไม่สามารถดึงข้อมูลได้เนื่องจากคุณยังไม่ได้แชร์ชีตโปรดเปลี่ยนสิทธิ์ ‘ทุกคนที่มีลิงก์’ เป็นมีสิทธิ์อ่าน"
      );
    }
    return text;
  } catch (err: any) {
    throw new Error(
      err.message ||
        "ไม่สามารถเชื่อมต่อไปยัง Google Sheets ได้โปรดตรวจสอบสิทธิ์การแชร์ของลิงก์แผ่นที่ระบุ"
    );
  }
}
