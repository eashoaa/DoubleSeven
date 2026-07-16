"use client";

import { useWashSettings, WASH_DEFAULTS } from "@/lib/theme/wash-settings";
import { useLanguage } from "@/lib/i18n/language-context";

export function SettingsForm() {
  const { settings, setSettings, reset } = useWashSettings();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <div className="shadow-card flex flex-col gap-5 rounded-2xl border border-hairline bg-card p-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("settings.appearance.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.appearance.desc")}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("settings.bottomColor")}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.bottomColor}
                onChange={(e) => setSettings({ bottomColor: e.target.value })}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-hairline bg-transparent p-0.5"
              />
              <span className="font-mono text-xs text-muted-foreground uppercase">{settings.bottomColor}</span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("settings.topColor")}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.topColor}
                onChange={(e) => setSettings({ topColor: e.target.value })}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-hairline bg-transparent p-0.5"
              />
              <span className="font-mono text-xs text-muted-foreground uppercase">{settings.topColor}</span>
            </div>
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t("settings.depth")}</span>
            <span className="text-sm text-muted-foreground">{settings.depth}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.depth}
            onChange={(e) => setSettings({ depth: Number(e.target.value) })}
            className="accent-primary h-2 w-full cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">{t("settings.depth.desc")}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-foreground">{t("settings.preview")}</span>
          <div
            className="mt-1.5 h-16 w-full rounded-xl border border-hairline"
            style={{
              background: `linear-gradient(to top, ${settings.bottomColor} 0%, ${settings.bottomColor} ${Math.max(0, 100 - settings.depth)}%, ${settings.topColor} 100%)`,
            }}
          />
        </div>

        <button
          type="button"
          onClick={reset}
          disabled={
            settings.bottomColor === WASH_DEFAULTS.bottomColor &&
            settings.topColor === WASH_DEFAULTS.topColor &&
            settings.depth === WASH_DEFAULTS.depth
          }
          className="self-start rounded-full border border-hairline px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          {t("settings.reset")}
        </button>
      </div>
    </div>
  );
}
