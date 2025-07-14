import chromium from "@sparticuz/chromium";

let puppeteer: typeof import("puppeteer") | typeof import("puppeteer-core");

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "development") {
    const puppeteerModule = await import("puppeteer");
    puppeteer = puppeteerModule;
  } else {
    const puppeteerModule = await import("puppeteer-core");
    puppeteer = puppeteerModule;
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "https://meralion.org/demo/";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;

  try {
    browser = await puppeteer.launch({
      args: process.env.NODE_ENV === "development" ? [] : chromium.args,
      executablePath:
        process.env.NODE_ENV === "development"
          ? undefined
          : await chromium.executablePath(),
      headless: true,
      protocolTimeout: 0,
    });

    if (browser == null) {
      throw Error("Browser Not Opened");
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    await page.setDefaultTimeout(0);
    await page.setDefaultNavigationTimeout(0);

    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector('[aria-label="Instruction..."]');
    await page.type('[aria-label="Instruction..."]', "What is ur name?");
    await page.keyboard.press("Enter");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await page.waitForSelector('[data-testid="stChatMessage"]');
    const messages = await page.$$('[data-testid="stChatMessage"]');

    if (messages.length === 0) {
      console.log("No chat messages found.");
      return new Response(
        JSON.stringify({ error: "No chat messages found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const lastMessageText = await page.evaluate(
      (el: HTMLElement) => el.innerText,
      messages[messages.length - 1]
    );

    console.log("Last chat message:", lastMessageText);

    return new Response(JSON.stringify({ lastMessage: lastMessageText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error scraping the page" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "development") {
    const puppeteerModule = await import("puppeteer");
    puppeteer = puppeteerModule;
  } else {
    const puppeteerModule = await import("puppeteer-core");
    puppeteer = puppeteerModule;
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const lang = formData.get("lang")?.toString().trim() || "";

  const allowedTypes = ["audio/mpeg", "audio/wav", "audio/wave"];
  const allowedExtensions = [".mp3", ".wav"];

  if (!file || !(file instanceof Blob)) {
    return new Response(JSON.stringify({ error: "No valid file uploaded." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!allowedTypes.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: "Only MP3 or WAV files are allowed." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const filename = file.name as string | undefined;
  if (filename && !allowedExtensions.some((ext) => filename.endsWith(ext))) {
    return new Response(
      JSON.stringify({ error: "Only MP3 or WAV files are allowed." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;

  try {
    browser = await puppeteer.launch({
      args: process.env.NODE_ENV === "development" ? [] : chromium.args,
      executablePath:
        process.env.NODE_ENV === "development"
          ? undefined
          : await chromium.executablePath(),
      headless: true,
      protocolTimeout: 0,
    });

    if (browser == null) {
      throw Error("Browser Not Opened");
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    await page.setDefaultTimeout(0);
    await page.setDefaultNavigationTimeout(0);

    await page.goto("https://meralion.org/demo/", {
      waitUntil: "domcontentloaded",
    });

    // ✅ Click the "add icon" button
    await page.waitForSelector('[aria-label="add icon"]');
    await page.click('[aria-label="add icon"]');

    // ✅ Click the file upload input
    await page.waitForSelector('[data-testid="stFileUploaderDropzoneInput"]');
    const inputUploadHandle = await page.$(
      '[data-testid="stFileUploaderDropzoneInput"]'
    );

    if (!inputUploadHandle) {
      throw Error("Upload input not found.");
    }

    // ✅ Create a temporary file and upload it
    const fs = await import("fs/promises");
    const tmp = await import("os");
    const path = await import("path");

    const tempFilePath = path.join(tmp.tmpdir(), `upload-${Date.now()}.mp3`);
    await fs.writeFile(tempFilePath, buffer);

    await inputUploadHandle.uploadFile(tempFilePath);

    await page.waitForSelector('[aria-modal="true"]', { hidden: true });

    await page.waitForSelector('[data-testid="stBaseButton-pills"]');
    // Find all pill buttons
    const buttons = await page.$$('[data-testid="stBaseButton-pills"]');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matchedButton: any = undefined;

    for (const button of buttons) {
      const buttonText = await page.evaluate(
        (el: Element) => (el as HTMLElement).textContent?.trim().toLowerCase(),
        button
      );
      if (buttonText.includes(lang.trim().toLowerCase())) {
        matchedButton = button;
        break;
      }
    }

    if (matchedButton) {
      console.log(`Found button for language: ${lang}`);
      await matchedButton.click();
    } else {
      console.log(`No button found for language: ${lang}, typing instead.`);
      await page.waitForSelector('[aria-label="Instruction..."]');
      await page.type(
        '[aria-label="Instruction..."]',
        `Please translate this speech to ${lang}`
      );
      await page.keyboard.press("Enter");
    }

    console.log("WAITING FOR THINKING OR TIMEOUT...");

    const thinkingDetected = await Promise.race([
      page
        .waitForFunction(
          () => {
            const indicators = Array.from(
              document.querySelectorAll(".e12gfcky1")
            );
            return indicators.some((indicator) => {
              const children = indicator.parentElement?.children || [];
              const sibling = [...children].slice(-1)[0];
              return (
                sibling &&
                sibling.textContent?.toLowerCase().includes("thinking")
              );
            });
          },
          { timeout: 0 }
        )
        .then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);

    if (thinkingDetected) {
      console.log("THINKING DETECTED");
      await page.waitForSelector(".e12gfcky1", { hidden: true });
    } else {
      console.log("THINKING NOT DETECTED, BYPASSING...");
    }

    if (
      matchedButton &&
      !["transcribe", "summarise"].includes(lang.trim().toLowerCase())
    ) {
      console.log("WAITING FOR 2 AUDIO ELEMENTS...");

      await page.waitForFunction(
        () => {
          return document.querySelectorAll("audio").length >= 2;
        },
        { timeout: 0 }
      );
    }

    console.log("DONE WAIT");

    await page.waitForSelector('[data-testid="stChatMessage"]');
    const messages = await page.$$('[data-testid="stChatMessage"]');

    if (messages.length === 0) {
      console.log("No chat messages found.");
      return new Response(
        JSON.stringify({ error: "No chat messages found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const lastMessageData = await page.evaluate((el: HTMLElement) => {
      const audioElement = el.querySelector("audio") as HTMLAudioElement | null;
      return {
        text: el.innerText,
        audioSrc: audioElement ? audioElement.src : null,
      };
    }, messages[messages.length - 1]);

    console.log("Last chat message with audio:", lastMessageData);

    return new Response(JSON.stringify(lastMessageData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: "Error during file upload or interaction." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
