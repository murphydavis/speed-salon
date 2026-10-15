/** Walking-slice click path. Read-only: no approve / reject / ban. */

export async function walkSmoke(page, opts = {}) {
  const { pause = async () => {}, origin = "", demo = false, onStep } = opts;

  await page.goto(origin ? `${origin}/` : "/");
  if (demo) await mountDemoChrome(page);

  await seen(page.getByRole("heading", { name: "Games" }));
  await page.getByRole("option", { name: "Alice Koopa" }).waitFor({ state: "attached", timeout: 30_000 });

  await step(page, { demo, onStep, pause }, "Act as Alice Koopa");
  await pointAndAct(page, demo, page.getByLabel("Act as"), (el) => el.selectOption({ label: "Alice Koopa" }));
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Search games: Mario");
  await pointAndAct(page, demo, page.getByLabel("Search game"), async (el) => {
    if (demo) {
      await el.fill("");
      await el.pressSequentially("Mario", { delay: 80 });
    } else {
      await el.fill("Mario");
    }
  });
  await pointAndAct(page, demo, page.getByRole("button", { name: "Search" }), (el) => el.click());
  await seen(page.getByRole("link", { name: "Super Mario 64" }));
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Open Super Mario 64");
  await pointAndAct(page, demo, page.getByRole("link", { name: "Super Mario 64" }), (el) => el.click());
  await seen(page.getByRole("heading", { name: /Super Mario 64/ }));
  await seen(page.getByText("You are assigned to this game."));
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Rank by runs");
  await pointAndAct(page, demo, page.getByRole("button", { name: "Rank by runs" }), (el) => el.click());
  await seen(page.getByText("PB").first());
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Switch board to 100%");
  await pointAndAct(page, demo, page.getByRole("button", { name: "100%", exact: true }), (el) => el.click());
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Switch board to Any%");
  await pointAndAct(page, demo, page.getByRole("button", { name: "Any%" }), (el) => el.click());
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Search runner: DashMain");
  await pointAndAct(page, demo, page.getByLabel("Search runner"), async (el) => {
    if (demo) {
      await el.fill("");
      await el.pressSequentially("DashMain", { delay: 60 });
    } else {
      await el.fill("DashMain");
    }
  });
  await pointAndAct(page, demo, page.getByRole("button", { name: "Search" }), (el) => el.click());
  await seen(page.getByText("DashMain").first());
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Open DashMain run (splits + history)");
  const dashRow = page.getByRole("row").filter({ hasText: "DashMain" }).first();
  await showLocator(page, demo, dashRow);
  await pointAndAct(page, demo, dashRow.getByRole("link"), (el) => el.click());
  await seen(page.getByRole("heading", { name: /DashMain/ }));
  await seen(page.getByRole("heading", { name: "Splits" }));
  await seen(page.getByRole("heading", { name: "Review history" }));
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Back to the SM64 board");
  await pointAndAct(page, demo, page.getByRole("link", { name: "Super Mario 64" }), (el) => el.click());
  await seen(page.getByRole("heading", { name: /Super Mario 64/ }));
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Show pending runs on the board");
  await pointAndAct(page, demo, page.getByRole("button", { name: "Show pending" }), (el) => el.click());
  await seen(page.getByText("(pending)").first());
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Hide approved (work still needing input)");
  await pointAndAct(page, demo, page.getByRole("button", { name: "Hide approved" }), (el) => el.click());
  await seen(page.getByText("(pending)").first());
  await showGrid(page, demo, pause);

  await step(page, { demo, onStep, pause }, "Return to the games list");
  await pointAndAct(page, demo, page.getByRole("link", { name: "Games" }), (el) => el.click());
  await seen(page.getByRole("heading", { name: "Games" }));
  await showGrid(page, demo, pause);
}

async function step(page, { demo, onStep, pause }, text) {
  onStep?.(text);
  if (demo) {
    await page.evaluate((t) => {
      const el = document.getElementById("smoke-caption");
      if (el) el.textContent = t;
    }, text);
    await pause(500);
  }
}

async function pointAndAct(page, demo, locator, act) {
  await locator.scrollIntoViewIfNeeded();
  if (demo) await moveTo(page, locator);
  await act(locator);
}

async function moveTo(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
}

async function showGrid(page, demo, pause) {
  const table = page.locator("table").first();
  if ((await table.count()) === 0) return;
  await showLocator(page, demo, table);
  if (demo) await pause(700);
}

async function showLocator(page, demo, locator) {
  await locator.scrollIntoViewIfNeeded();
  if (!demo) return;
  await locator.evaluate((el) => {
    el.scrollIntoView({ block: "center", inline: "nearest" });
  });
}

async function mountDemoChrome(page) {
  await page.evaluate(() => {
    if (document.getElementById("smoke-cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "smoke-cursor";
    cursor.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" stroke="#111" stroke-width="1.4" d="M3 2 3 19 8.2 14.2 12.2 22 15.4 20.7 11.3 13 20 13 Z"/></svg>';
    cursor.style.cssText =
      "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 1px 2px #000);";
    const caption = document.createElement("div");
    caption.id = "smoke-caption";
    caption.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:2147483646;pointer-events:none;background:rgba(12,16,22,.88);color:#fff;font:15px/1.3 system-ui,sans-serif;padding:10px 14px 12px;border-top:1px solid #445;";
    caption.textContent = "Starting…";
    document.documentElement.appendChild(cursor);
    document.documentElement.appendChild(caption);
    document.body.style.paddingBottom = "56px";
    window.addEventListener(
      "mousemove",
      (e) => {
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      },
      true,
    );
  });
}

async function seen(locator) {
  await locator.waitFor({ state: "visible", timeout: 30_000 });
}
