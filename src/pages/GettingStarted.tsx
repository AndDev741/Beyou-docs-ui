import { useTranslation } from "react-i18next";
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Lightbulb, Terminal, Copy } from "lucide-react";

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
        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition-colors"
        aria-label="Copy to clipboard"
      >
        <Copy className="w-3 h-3" />
        {copied ? t("common.copied") : t("common.copy")}
      </button>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1 className="text-3xl font-bold text-foreground mb-3">
          {t("gettingStarted.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("gettingStarted.description")}
        </p>
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              {t("gettingStarted.whyBeyou.title")}
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            {t("gettingStarted.whyBeyou.paragraph")}
          </p>
        </div>
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              {t("gettingStarted.localExecution.title")}
            </h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            {t("gettingStarted.localExecution.description")}
          </p>

          {/* Step 1 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("gettingStarted.localExecution.steps.createFolder.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("gettingStarted.localExecution.steps.createFolder.description")}
            </p>
          </div>

          {/* Step 2 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("gettingStarted.localExecution.steps.cloneBackendFrontend.title")}
            </h3>
            <p className="text-muted-foreground mb-2">
              {t("gettingStarted.localExecution.steps.cloneBackendFrontend.description")}
            </p>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {t("gettingStarted.localExecution.steps.cloneBackendFrontend.code")}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={t("gettingStarted.localExecution.steps.cloneBackendFrontend.code")} />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("gettingStarted.localExecution.steps.installDependencies.title")}
            </h3>
            <p className="text-muted-foreground mb-2">
              {t("gettingStarted.localExecution.steps.installDependencies.description")}
            </p>
            <div className="space-y-2">
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {t("gettingStarted.localExecution.steps.installDependencies.codeBackend")}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={t("gettingStarted.localExecution.steps.installDependencies.codeBackend")} />
                </div>
              </div>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {t("gettingStarted.localExecution.steps.installDependencies.codeFrontend")}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={t("gettingStarted.localExecution.steps.installDependencies.codeFrontend")} />
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("gettingStarted.localExecution.steps.cloneDevEnv.title")}
            </h3>
            <p className="text-muted-foreground mb-2">
              {t("gettingStarted.localExecution.steps.cloneDevEnv.description")}
            </p>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {t("gettingStarted.localExecution.steps.cloneDevEnv.code")}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={t("gettingStarted.localExecution.steps.cloneDevEnv.code")} />
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("gettingStarted.localExecution.steps.createEnvFile.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("gettingStarted.localExecution.steps.createEnvFile.description")}
            </p>
          </div>

          {/* Step 6 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("gettingStarted.localExecution.steps.runScripts.title")}
            </h3>
            <p className="text-muted-foreground mb-2">
              {t("gettingStarted.localExecution.steps.runScripts.description")}
            </p>
            <div className="space-y-2">
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {t("gettingStarted.localExecution.steps.runScripts.scriptDev")}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={t("gettingStarted.localExecution.steps.runScripts.scriptDev")} />
                </div>
              </div>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {t("gettingStarted.localExecution.steps.runScripts.scriptProd")}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={t("gettingStarted.localExecution.steps.runScripts.scriptProd")} />
                </div>
              </div>
            </div>
          </div>

          {/* Scripts Explanation */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {t("gettingStarted.localExecution.scriptsExplanation.title")}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-3 text-left font-medium text-foreground">Script</th>
                    <th className="p-3 text-left font-medium text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    "upDev",
                    "upProd",
                    "down",
                    "resetDb"
                  ].map((key) => {
                    const text = t(`gettingStarted.localExecution.scriptsExplanation.${key}`);
                    const [script, ...rest] = text.split(' – ');
                    const description = rest.join(' – ');
                    return (
                      <tr key={key} className="border-b border-border last:border-b-0 hover:bg-muted/10">
                        <td className="p-3 font-mono text-foreground">{script}</td>
                        <td className="p-3 text-muted-foreground">{description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Env Explanation */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {t("gettingStarted.localExecution.envExplanation.title")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("gettingStarted.localExecution.envExplanation.description")}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-3 text-left font-medium text-foreground">Variable</th>
                    <th className="p-3 text-left font-medium text-foreground">Description</th>
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
                    "docsImportSettings"
                  ].map((key) => {
                    const text = t(`gettingStarted.localExecution.envExplanation.${key}`);
                    const [variable, ...rest] = text.split(' – ');
                    const description = rest.join(' – ');
                    return (
                      <tr key={key} className="border-b border-border last:border-b-0 hover:bg-muted/10">
                        <td className="p-3 font-mono text-foreground">{variable}</td>
                        <td className="p-3 text-muted-foreground">{description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
