import { useTranslation } from "react-i18next";
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Lightbulb,
  Terminal,
  Copy,
  Check,
  FolderOpen,
  GitBranch,
  Package,
  FileCode,
  Play,
  ChevronRight,
} from "lucide-react";

export default function GettingStarted() {
  const { t } = useTranslation();

  const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <button
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all duration-200 ${
          copied
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-white/5 text-muted-foreground border border-border/50 hover:bg-white/10 hover:text-foreground"
        }`}
        aria-label="Copy to clipboard"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? t("common.copied") : t("common.copy")}
      </button>
    );
  };

  const CodeBlock = ({ code }: { code: string }) => (
    <div className="group relative glass-panel !rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground/90 leading-relaxed">
        {code}
      </pre>
    </div>
  );

  const stepIcons = [FolderOpen, GitBranch, Package, FileCode, FileCode, Play];

  const steps = [
    "createFolder",
    "cloneBackendFrontend",
    "installDependencies",
    "cloneDevEnv",
    "createEnvFile",
    "runScripts",
  ] as const;

  return (
    <MainLayout>
      <div className="fade-in max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            {t("gettingStarted.title")}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("gettingStarted.description")}
          </p>
        </div>

        {/* Why Beyou Section */}
        <section className="mb-12">
          <div className="glass-panel gradient-border p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                {t("gettingStarted.whyBeyou.title")}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-[52px]">
              {t("gettingStarted.whyBeyou.paragraph")}
            </p>
          </div>
        </section>

        {/* Local Execution Section */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
              <Terminal className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              {t("gettingStarted.localExecution.title")}
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-8 pl-[52px]">
            {t("gettingStarted.localExecution.description")}
          </p>

          {/* Steps */}
          <div className="relative space-y-6 ml-5">
            {/* Vertical connector line */}
            <div className="absolute left-0 top-6 bottom-6 w-px bg-gradient-to-b from-primary/40 via-accent/30 to-transparent" />

            {steps.map((stepKey, index) => {
              const StepIcon = stepIcons[index];
              const stepPath = `gettingStarted.localExecution.steps.${stepKey}`;

              return (
                <div key={stepKey} className="relative pl-10">
                  {/* Step number circle */}
                  <div className="absolute left-0 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-card border-2 border-primary/40 text-primary text-xs font-bold z-10">
                    {index + 1}
                  </div>

                  <div className="glass-panel p-5 transition-all duration-200 hover:neon-glow">
                    <div className="flex items-center gap-2.5 mb-2">
                      <StepIcon className="w-4 h-4 text-primary/70" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {t(`${stepPath}.title`)}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t(`${stepPath}.description`)}
                    </p>

                    {/* Code blocks for steps that have them */}
                    {stepKey === "cloneBackendFrontend" && (
                      <CodeBlock code={t(`${stepPath}.code`)} />
                    )}
                    {stepKey === "installDependencies" && (
                      <div className="space-y-3">
                        <CodeBlock code={t(`${stepPath}.codeBackend`)} />
                        <CodeBlock code={t(`${stepPath}.codeFrontend`)} />
                      </div>
                    )}
                    {stepKey === "cloneDevEnv" && (
                      <CodeBlock code={t(`${stepPath}.code`)} />
                    )}
                    {stepKey === "runScripts" && (
                      <div className="space-y-3">
                        <CodeBlock code={t(`${stepPath}.scriptDev`)} />
                        <CodeBlock code={t(`${stepPath}.scriptProd`)} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scripts Reference Table */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-primary" />
              {t("gettingStarted.localExecution.scriptsExplanation.title")}
            </h3>
            <div className="glass-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Script
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {["upDev", "upProd", "down", "resetDb"].map((key, i) => {
                    const text = t(
                      `gettingStarted.localExecution.scriptsExplanation.${key}`
                    );
                    const [script, ...rest] = text.split(" – ");
                    const description = rest.join(" – ");
                    return (
                      <tr
                        key={key}
                        className={`border-b border-border/30 last:border-b-0 transition-colors hover:bg-primary/5 ${
                          i % 2 === 0 ? "bg-muted/5" : ""
                        }`}
                      >
                        <td className="px-5 py-3 font-mono text-sm text-primary/80">
                          {script}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Env Variables Table */}
          <div className="mt-10">
            <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-primary" />
              {t("gettingStarted.localExecution.envExplanation.title")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("gettingStarted.localExecution.envExplanation.description")}
            </p>
            <div className="glass-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Variable
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    "postgresDb",
                    "postgresUser",
                    "postgresPassword",
                    "postgresPort",
                    "tokenSecret",
                    "googleClientId",
                    "googleClientSecret",
                    "cookieSecure",
                    "corsAllowedPattern",
                    "mailSettings",
                    "frontendUrl",
                    "docsImportSettings",
                  ].map((key, i) => {
                    const text = t(
                      `gettingStarted.localExecution.envExplanation.${key}`
                    );
                    const [variable, ...rest] = text.split(" – ");
                    const description = rest.join(" – ");
                    return (
                      <tr
                        key={key}
                        className={`border-b border-border/30 last:border-b-0 transition-colors hover:bg-primary/5 ${
                          i % 2 === 0 ? "bg-muted/5" : ""
                        }`}
                      >
                        <td className="px-5 py-3 font-mono text-sm text-primary/80 whitespace-nowrap">
                          {variable}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
