const chakraActiveApps = new WeakSet();

export function registerChakraTab() {
    Hooks.on("renderActorSheetPF", async (app, html, data) => {
        if (!["character", "npc"].includes(app.actor.type)) return;

        const $html = html instanceof HTMLElement ? $(html) : html;

        // Fallback nav injection — the template normally renders this from cls.TABS.primary.tabs,
        // but we add it here in case some pf1e version doesn't iterate TABS for nav items.
        const nav = $html.find("nav.sheet-navigation.tabs[data-group='primary']");
        if (nav.length && !nav.find('[data-tab="chakra"]').length) {
            nav.append('<a class="item" data-tab="chakra" data-group="primary" data-action="tab">Chakra</a>');
        }

        // Track chakra activation across re-renders. WeakSet survives because the same `app`
        // instance persists for the lifetime of the open sheet.
        nav.find('[data-tab="chakra"]').on("click", () => chakraActiveApps.add(app));
        nav.find('.item:not([data-tab="chakra"])').on("click", () => chakraActiveApps.delete(app));

        const body = $html.find("section.primary-body");
        if (!body.length) return;

        // Inject the chakra content div (template hard-codes content divs).
        if (!body.find('[data-tab="chakra"]').length) {
            data.flags = app.actor.flags || {};
            const templateHtml = await foundry.applications.handlebars.renderTemplate(
                "modules/naruto-d20/templates/actor/chakra-tab.hbs",
                data
            );
            body.append($(templateHtml));
        }

        // Restore chakra as the active tab. We use changeTab() to keep app.tabGroups in sync —
        // skipping that step makes Foundry's no-op guard (foundry.mjs:27853) silently swallow
        // future clicks on whichever tab tabGroups still thinks is active.
        const shouldBeChakra = chakraActiveApps.has(app) || app.tabGroups?.primary === "chakra";
        if (shouldBeChakra) {
            if (app.tabGroups?.primary !== "chakra" && typeof app.changeTab === "function") {
                app.changeTab("chakra", "primary", { force: true });
            } else {
                body.find('[data-tab="chakra"]').addClass("active");
                nav.find('[data-tab="chakra"]').addClass("active");
            }
            chakraActiveApps.add(app);
        }

        // Roll listeners for Learn checks
        $html.find(".shinobi-roll").off("click").on("click", async (ev) => {
            ev.preventDefault();
            const { bonus, label } = ev.currentTarget.dataset;
            const roll = new Roll(`1d20 + ${bonus}`);
            await roll.evaluate({ async: true });
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: app.actor }),
                flavor: `<h3 style="margin-bottom: 0;">${label} Learn Check</h3>`
            });
        });

    });
}
