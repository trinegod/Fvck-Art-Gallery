import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import ts from "typescript";
import { appNavigationItems, appSectionForPath, mobileDestinationForPath, mobileGroupForPath, mobileNavigationGroups } from "../lib/mobile-navigation";

const requireFromTest = createRequire(import.meta.url);
const compiledNavigation = ts.transpileModule(readFileSync(resolve(process.cwd(), "app/components/mobile-app-navigation.tsx"), "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;

// Exercise the production markup, Next links, icons and route model. Only the
// router/session data providers are replaced; no auth or realtime calls run.
function renderNavigation(pathname = "/feed", unreadCount = 0, hidden = false) {
  const componentModule = { exports: {} as { default: ComponentType<{ hidden?: boolean }> } };
  const localRequire = (specifier: string): unknown => {
    if (specifier === "next/navigation") return { usePathname: () => pathname };
    if (specifier === "./use-activity-count") return { useUnreadActivityCount: () => unreadCount };
    if (specifier === "@/lib/mobile-navigation") return { appNavigationItems, appSectionForPath };
    return requireFromTest(specifier);
  };
  new Function("require", "module", "exports", compiledNavigation)(localRequire, componentModule, componentModule.exports);
  return renderToStaticMarkup(createElement(componentModule.exports.default, { hidden }));
}

test("the icon-only dock keeps four named real links without visible label text", () => {
  const html = renderNavigation();
  assert.match(html, /<nav[^>]*aria-label="Primary app navigation"/);
  const links = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
  assert.equal(links.length, 4);
  for (const [index, [label, href]] of [
    ["Feed", "/feed"], ["Explore", "/explore"], ["Create", "/create"], ["You", "/you"],
  ].entries()) {
    const link: string = links[index];
    assert.ok(link.includes(`href="${href}"`));
    assert.ok(link.includes(`title="${label}"`));
    assert.ok(link.includes(`<span class="sr-only">${label}</span>`));
    assert.match(link, /<svg[^>]*aria-hidden="true"/);
    assert.equal(link.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, "").replace(/<[^>]*>/g, ""), "");
    assert.doesNotMatch(link, /aria-label=|role="tab"|tabindex="-1"/);
  }
});

test("54px dock controls and shared bottom clearance retain touch targets and safe areas", () => {
  const html = renderNavigation();
  const nav = html.match(/<nav\b[^>]*>/)?.[0] ?? "";
  assert.match(nav, /\bp-1\b/);
  assert.match(nav, /\bgap-1\b/);
  assert.match(nav, /bottom-\[max\(\.75rem,env\(safe-area-inset-bottom\)\)\]/);
  const links = html.match(/<a\b[^>]*>/g) ?? [];
  for (const link of links) {
    assert.match(link, /\bmin-h-11\b/);
    assert.match(link, /\bmin-w-11\b/);
  }
  const css = postcss.parse(readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8"));
  const clearances: string[] = [];
  css.walkDecls("--nodeine-mobile-nav-clearance", (declaration) => { clearances.push(declaration.value); });
  assert.deepEqual(clearances, ["calc(3.75rem + 2px + max(.75rem, env(safe-area-inset-bottom)))"]);
  for (const [selector, property] of [
    ["main:has(.nodeine-mobile-navigation)", "padding-bottom"],
    ["html:has(.nodeine-mobile-navigation)", "scroll-padding-bottom"],
  ]) {
    const values: string[] = [];
    css.walkRules(selector, (rule) => {
      assert.ok(rule.parent?.type === "atrule" && rule.parent.params === "(width < 64rem)", "Reservation must stay mobile-only");
      rule.walkDecls(property, (declaration) => { values.push(declaration.value); });
    });
    assert.deepEqual(values, ["var(--nodeine-mobile-nav-clearance)"]);
  }
});

test("real dock links expose exact-page and deeper-location selection", () => {
  for (const [pathname, href, current] of [
    ["/feed", "/feed", "page"], ["/explore", "/explore", "page"],
    ["/create", "/create", "page"], ["/you", "/you", "page"],
    ["/messages", "/you", "location"], ["/threads/example/edit", "/create", "location"],
    ["/worlds/example", "/explore", "location"],
  ]) {
    const selected = renderNavigation(pathname).match(/<a\b[^>]*aria-current="[^"]*"[^>]*>/g) ?? [];
    assert.equal(selected.length, 1, pathname);
    assert.ok(selected[0].includes(`href="${href}"`), pathname);
    assert.ok(selected[0].includes(`aria-current="${current}"`), pathname);
  }
});

test("You retains its screen-reader unread count and visible dot while another section is active", () => {
  const html = renderNavigation("/feed", 12);
  const you = html.match(/<a\b[^>]*href="\/you"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? "";
  assert.match(you, /<span class="sr-only">You<\/span>/);
  assert.match(you, /<span class="sr-only">, 12 unread notifications<\/span>/);
  assert.match(you, /<span[^>]*bg-rose-400[^>]*aria-hidden="true"/);
  assert.doesNotMatch(you, /aria-current=|aria-label=/);
  assert.equal(html.match(/unread notifications/g)?.length, 1);
  assert.doesNotMatch(renderNavigation("/you", 0), /unread notifications|bg-rose-400/);
});

test("focused conversations remove the whole dock and normal navigation retains visible keyboard focus", () => {
  assert.equal(renderNavigation("/messages", 4, true), "");
  assert.match(renderNavigation("/messages"), /<nav[^>]*\blg:hidden\b/);
  const css = postcss.parse(readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8"));
  const focus = new Map<string, string>();
  css.walkRules(".nodeine-mobile-navigation :is(a, button):focus-visible", (rule) => {
    rule.walkDecls((declaration) => { focus.set(declaration.prop, declaration.value); });
  });
  assert.equal(focus.get("outline"), "2px solid var(--ring)");
  assert.equal(focus.get("outline-offset"), "-2px");
  let selectedShape = false;
  css.walkRules(".nodeine-nav-primary[aria-current]::after", (rule) => {
    rule.walkDecls("height", (declaration) => { selectedShape = declaration.value === "2px"; });
  });
  assert.ok(selectedShape, "Selection must retain a non-color-only marker");
});

test("the dock retains all destinations and gives creation its own section", () => {
  assert.deepEqual(mobileNavigationGroups.map((group) => group.label), ["Explore", "Create", "You"]);
  assert.deepEqual(mobileNavigationGroups[1].destinations.map((item) => item.href), ["/forge", "/admin", "/threads/new"]);
  const ids = mobileNavigationGroups.flatMap((group) => group.destinations.map((item) => item.id));
  assert.equal(new Set(ids).size, 10);
});

test("deep links choose the right section without prefix collisions", () => {
  for (const [path, destination, group] of [
    ["/feed", "feed", 0], ["/discover", "discover", 0], ["/", "archive", 0],
    ["/worlds/ashigara", "archive", 0], ["/threads", "threads", 0],
    ["/threads/chronicle/edit", "threads", 0], ["/threads/new", "new-thread", 1],
    ["/forge", "forge", 1], ["/admin", "publish", 1], ["/saved", "saved", 2],
    ["/messages/conversation", "messages", 2], ["/activity", "activity", 2],
    ["/creator/artist", "profile", 2], ["/feed-lab", null, 0],
    ["/threads/new-era", "threads", 0], ["/administer", null, 0], ["/artwork/work", null, 0],
  ] as const) {
    assert.equal(mobileDestinationForPath(path), destination, path);
    assert.equal(mobileGroupForPath(path), group, path);
  }
});

test("signed-out profile fallback does not make Publish part of You", () => {
  assert.equal(mobileNavigationGroups[2].destinations[3].href, "/admin");
  assert.equal(mobileDestinationForPath("/admin"), "publish");
  assert.equal(mobileGroupForPath("/admin"), 1);
});

test("section landing pages stay selected when opened directly or restored from history", () => {
  assert.equal(mobileGroupForPath("/explore"), 0);
  assert.equal(mobileGroupForPath("/create"), 1);
  assert.equal(mobileGroupForPath("/you"), 2);
  assert.equal(mobileGroupForPath("/create-not-a-section"), 0);
});

test("the primary row has four real destinations, and private editing belongs to Create", () => {
  assert.deepEqual(appNavigationItems.map(({ label, href }) => [label, href]), [
    ["Feed", "/feed"], ["Explore", "/explore"], ["Create", "/create"], ["You", "/you"],
  ]);
  for (const [path, section] of [
    ["/feed", "feed"], ["/feed-lab", "explore"], ["/explore", "explore"],
    ["/create", "create"], ["/you", "you"], ["/forge", "create"],
    ["/threads/new", "create"], ["/threads/chronicle/edit", "create"],
    ["/threads/chronicle/editorial", "explore"], ["/messages", "you"],
    ["/saved", "you"], ["/activity", "you"], ["/worlds/ashigara", "explore"],
  ] as const) assert.equal(appSectionForPath(path), section, path);
});
