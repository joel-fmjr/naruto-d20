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

        const body = $html.find("section.primary-body");
        if (!body.length) return;

        // The chakra content div is not in the pf1e template, so we must inject it after each render.
        // Its active state must mirror app.tabGroups.primary, since Foundry's render only applies
        // "active" to content divs it actually rendered.
        if (!body.find('[data-tab="chakra"]').length) {
            data.flags = app.actor.flags || {};
            const templateHtml = await foundry.applications.handlebars.renderTemplate(
                "modules/naruto-d20/templates/actor/chakra-tab.hbs",
                data
            );
            const $tab = $(templateHtml);
            if (app.tabGroups?.primary === "chakra") $tab.addClass("active");
            body.append($tab);
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
