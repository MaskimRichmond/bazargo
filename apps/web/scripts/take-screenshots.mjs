import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(webDir, "../..");

const targetDirs = [
  path.join(webDir, ".screenshots"),
  path.join(repoDir, ".screenshots"),
  path.resolve("C:/Users/maski/.gemini/antigravity/brain/7f18d1fc-6990-4f02-ba39-155babdde091"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function isServerRunning(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  console.log(`Waiting for ${url} to respond...`);
  while (Date.now() - start < timeoutMs) {
    if (await isServerRunning(url)) {
      console.log(`Server is responding at ${url}!`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function main() {
  const url = "http://localhost:3000/requests";
  let serverProcess = null;

  const alreadyRunning = await isServerRunning(url);
  if (!alreadyRunning) {
    console.log("Starting Next.js production server on port 3000...");
    // Use cmd.exe /c npx next start on Windows
    serverProcess = spawn("cmd.exe", ["/c", "npx next start -p 3000"], {
      cwd: webDir,
      stdio: "pipe",
      env: { ...process.env, PORT: "3000" },
    });

    serverProcess.stdout.on("data", (d) => process.stdout.write(`[Next.js] ${d}`));
    serverProcess.stderr.on("data", (d) => process.stderr.write(`[Next.js Error] ${d}`));

    await waitForServer(url, 60000);
  } else {
    console.log("Server is already running on port 3000.");
  }

  console.log("Launching Chromium headless browser...");
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    // 1. Light Theme Screenshot
    console.log("Switching to Light Theme...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    });
    await page.waitForTimeout(1000);

    const lightPathWeb = path.join(webDir, ".screenshots", "requests-light.png");
    console.log(`Capturing light theme screenshot to ${lightPathWeb}...`);
    await page.screenshot({ path: lightPathWeb, fullPage: true });

    // 2. Dark Theme Screenshot
    console.log("Switching to Dark Theme...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    });
    await page.waitForTimeout(1000);

    const darkPathWeb = path.join(webDir, ".screenshots", "requests-dark.png");
    console.log(`Capturing dark theme screenshot to ${darkPathWeb}...`);
    await page.screenshot({ path: darkPathWeb, fullPage: true });

    // 3. Navigate to http://localhost:3000/ to verify homepage and Section 5 pre-footer banner
    const homeUrl = "http://localhost:3000/";
    console.log(`Navigating to ${homeUrl}...`);
    await page.goto(homeUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    // Light Theme for Home
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    });
    await page.waitForTimeout(1000);
    const homeLightPath = path.join(webDir, ".screenshots", "home-light.png");
    console.log(`Capturing home light screenshot to ${homeLightPath}...`);
    await page.screenshot({ path: homeLightPath, fullPage: true });

    // Dark Theme for Home
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    });
    await page.waitForTimeout(1000);
    const homeDarkPath = path.join(webDir, ".screenshots", "home-dark.png");
    console.log(`Capturing home dark screenshot to ${homeDarkPath}...`);
    await page.screenshot({ path: homeDarkPath, fullPage: true });

    // Copy all screenshots to target directories
    for (const dir of targetDirs) {
      if (dir !== path.join(webDir, ".screenshots")) {
        fs.copyFileSync(lightPathWeb, path.join(dir, "requests-light.png"));
        fs.copyFileSync(darkPathWeb, path.join(dir, "requests-dark.png"));
        fs.copyFileSync(homeLightPath, path.join(dir, "home-light.png"));
        fs.copyFileSync(homeDarkPath, path.join(dir, "home-dark.png"));
      }
    }

    console.log("Screenshots captured successfully!");
    console.log("Files generated:");
    console.log(` - ${lightPathWeb}`);
    console.log(` - ${darkPathWeb}`);
  } finally {
    await browser.close();
    if (serverProcess) {
      console.log("Stopping background Next.js server...");
      // Kill tree on Windows
      spawn("taskkill", ["/pid", serverProcess.pid.toString(), "/f", "/t"]);
    }
  }
}

main().catch((err) => {
  console.error("Error executing screenshot script:", err);
  process.exit(1);
});
