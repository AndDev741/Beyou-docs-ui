import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
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
  Users,
  Code,
  BookOpen,
  Languages,
  ExternalLink,
  CheckCircle,
  GitFork,
  GitPullRequest,
  Rocket,
  ArrowUp,
} from "lucide-react";

type Priority = "high" | "medium" | "low";

interface FutureIdea {
  nameEn: string;
  namePt: string;
  priority: Priority;
  descriptionEn: string;
  descriptionPt: string;
}

const futureIdeas: FutureIdea[] = [
  {
    nameEn: "Custom user store & credits for completed tasks",
    namePt: "Loja customizada pelo usuário e créditos por tarefas concluídas",
    priority: "high",
    descriptionEn: "Will help a lot with gamification and user engagement",
    descriptionPt: "Irá ajudar muito na gamificação e engajamento do app pelos usuários",
  },
  {
    nameEn: "Weekly, monthly and yearly XP leaderboards",
    namePt: "Ranks semanais, mensais e anuais de ganho de XP por usuários",
    priority: "high",
    descriptionEn: "Will help build a community and boost user engagement",
    descriptionPt: "Vai ajudar muito na construção de uma comunidade e no engajamento dos usuários",
  },
  {
    nameEn: "Pomodoro",
    namePt: "Pomodoro",
    priority: "high",
    descriptionEn: "Pomodoro timer for routine tasks",
    descriptionPt: "Pomodoro para as tarefas da rotina",
  },
  {
    nameEn: "Small fixed/temporary tasks in Pomodoro mode",
    namePt: "Adição de pequenas tasks fixas ou temporárias no modo pomodoro",
    priority: "high",
    descriptionEn: "Small tasks during Pomodoro breaks and normal time",
    descriptionPt: "Pequenas tasks durante os breaks do pomodoro e durante o tempo normal",
  },
  {
    nameEn: "Focus mode showing only the routine",
    namePt: "Modo foco mostrando somente a rotina",
    priority: "high",
    descriptionEn: "Focus on the current routine linked with Pomodoro for tasks",
    descriptionPt: "Foco na rotina atual e pomodoro",
  },
  {
    nameEn: "Ultra-focus mode with only the current task",
    namePt: "Modo ultrafoco com apenas a tarefa do horário",
    priority: "high",
    descriptionEn: "Only the current task to be done with optional Pomodoro",
    descriptionPt: "Somente a tarefa atual a ser feita e pomodoro opcional",
  },
  {
    nameEn: "New routine type without sections, just today's task",
    namePt: "Implementar novo tipo de rotina sem seções, apenas com a tarefa do dia",
    priority: "high",
    descriptionEn: "",
    descriptionPt: "",
  },
  {
    nameEn: "Nested goals",
    namePt: "Metas aninhadas",
    priority: "medium",
    descriptionEn: "Big goals broken into medium and small ones leading to the big goal",
    descriptionPt: "Grandes metas e diversas médias e pequenas até chegar na grande",
  },
  {
    nameEn: "Achievements by level",
    namePt: "Conquistas por level",
    priority: "medium",
    descriptionEn: "Goals by level (e.g. level 50: Senior, level 100: Specialist)",
    descriptionPt: "Metas por level (ex: level 50: Senior, level 100: Especialista)",
  },
  {
    nameEn: "Emotions & daily journal",
    namePt: "Diário de emoções e do dia a dia",
    priority: "medium",
    descriptionEn: "",
    descriptionPt: "",
  },
  {
    nameEn: "Recommended habits & tasks based on user averages",
    namePt: "Hábitos e tarefas recomendados com base na média dos usuários",
    priority: "medium",
    descriptionEn: "",
    descriptionPt: "",
  },
  {
    nameEn: "Rest mode for idle screen",
    namePt: "Modo descanso para deixar a tela parada",
    priority: "medium",
    descriptionEn: "A calm background with optional routine display and ultra-focus mode",
    descriptionPt: "Somente um background tranquilo com opcional para mostrar a rotina e modo ultrafoco",
  },
  {
    nameEn: "Previous day achievements & upcoming tasks",
    namePt: "Lista de conquistas do dia anterior e do dia que está por vir",
    priority: "low",
    descriptionEn: "On app open, show yesterday's completed tasks (maybe with AI summary linking to habits/goals progress) and today's key tasks",
    descriptionPt: "Ao entrar no app, mostrará as tarefas feitas do dia anterior (talvez com resumo de IA, linkando com quais hábitos e metas estão progredindo) e as principais tarefas do dia que está por vir",
  },
];

const sectionIds = ["why-beyou", "local-execution", "collaboration", "future-ideas"] as const;

export default function GettingStarted() {
  const { t, i18n } = useTranslation();
  const isPt = i18n.language?.startsWith("pt");

  const [activeSection, setActiveSection] = useState<string>(sectionIds[0]);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The scroll container is the <main> with overflow-auto
    const scrollParent = navRef.current?.closest("main");
    if (!scrollParent) return;

    const handleScroll = () => {
      const containerRect = scrollParent.getBoundingClientRect();
      const threshold = containerRect.top + 80;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) {
          setActiveSection(sectionIds[i]);
          return;
        }
      }
      setActiveSection(sectionIds[0]);
    };

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scrollParent.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const scrollParent = navRef.current?.closest("main");
    if (!scrollParent) return;
    const navHeight = navRef.current?.offsetHeight ?? 0;
    const elTop = el.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top + scrollParent.scrollTop;
    scrollParent.scrollTo({ top: elTop - navHeight, behavior: "smooth" });
  };

  const navItems = [
    { id: "why-beyou", icon: Lightbulb, key: "whyBeyou", color: "text-primary" },
    { id: "local-execution", icon: Terminal, key: "localExecution", color: "text-accent" },
    { id: "collaboration", icon: Users, key: "collaboration", color: "text-purple-400" },
    { id: "future-ideas", icon: Rocket, key: "futureIdeas", color: "text-rose-400" },
  ];

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

  const priorityConfig: Record<Priority, { color: string; bg: string }> = {
    high: { color: "text-rose-400", bg: "bg-rose-500/15" },
    medium: { color: "text-amber-400", bg: "bg-amber-500/15" },
    low: { color: "text-sky-400", bg: "bg-sky-500/15" },
  };

  return (
    <MainLayout>
      {/* Section Navigation — sticky pill bar */}
      <div ref={navRef} className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {navItems.map(({ id, icon: Icon, key, color }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                  activeSection === id
                    ? `${color} bg-white/10 border border-white/10`
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(`gettingStarted.nav.${key}`)}
              </button>
            ))}
          </nav>
        </div>
      </div>

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
        <section id="why-beyou" className="mb-12">
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
        <section id="local-execution" className="scroll-mt-0">
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
              {/* Desktop table */}
              <table className="hidden md:table w-full text-sm">
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
              {/* Mobile stacked layout */}
              <div className="md:hidden divide-y divide-border/30">
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
                    <div
                      key={key}
                      className={`px-4 py-3 ${i % 2 === 0 ? "bg-muted/5" : ""}`}
                    >
                      <div className="font-mono text-sm text-primary/80 mb-1">
                        {variable}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* How to Collaborate Section */}
        <section id="collaboration" className="mt-16">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              {t("gettingStarted.collaboration.title")}
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-8 pl-[52px]">
            {t("gettingStarted.collaboration.description")}
          </p>

          {/* Where to Contribute — 3-card grid */}
          <div className="mb-10">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-purple-400" />
              {t("gettingStarted.collaboration.areas.title")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: "code", icon: Code, color: "text-blue-400", bg: "bg-blue-500/10" },
                { key: "docs", icon: BookOpen, color: "text-amber-400", bg: "bg-amber-500/10" },
                { key: "translations", icon: Languages, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              ].map(({ key, icon: Icon, color, bg }) => (
                <div key={key} className="glass-panel gradient-border p-5 transition-all duration-200 hover:neon-glow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${bg}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <h4 className="text-base font-semibold text-foreground">
                      {t(`gettingStarted.collaboration.areas.${key}.title`)}
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`gettingStarted.collaboration.areas.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Contribution Workflow */}
          <div className="mb-10">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-purple-400" />
              {t("gettingStarted.collaboration.workflow.title")}
            </h3>
            <div className="glass-panel p-5">
              <ol className="space-y-3">
                {[
                  { key: "step1", icon: GitFork },
                  { key: "step2", icon: GitBranch },
                  { key: "step3", icon: Play },
                  { key: "step4", icon: GitPullRequest },
                ].map(({ key, icon: Icon }, index) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/15 text-purple-400 text-xs font-bold shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-purple-400/70 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {t(`gettingStarted.collaboration.workflow.${key}`)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Guidelines */}
          <div className="mb-10">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-purple-400" />
              {t("gettingStarted.collaboration.guidelines.title")}
            </h3>
            <div className="glass-panel gradient-border p-5">
              <ul className="space-y-2.5">
                {["bilingual", "tests", "patterns", "smallPrs"].map((key) => (
                  <li key={key} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">
                      {t(`gettingStarted.collaboration.guidelines.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Project Repositories */}
          <div className="mb-10">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-purple-400" />
              {t("gettingStarted.collaboration.repos.title")}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {t("gettingStarted.collaboration.repos.description")}
            </p>
            <div className="glass-panel p-5">
              <ul className="space-y-2">
                {["frontend", "backend", "docsUi", "archDesign", "devEnv"].map((key) => (
                  <li key={key} className="flex items-start gap-2.5">
                    <Package className="w-4 h-4 text-purple-400/70 shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">
                      {t(`gettingStarted.collaboration.repos.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* GitHub Link */}
          <a
            href={t("gettingStarted.collaboration.github.url")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4" />
            {t("gettingStarted.collaboration.github.label")}
          </a>
        </section>

        {/* Future Ideas Section */}
        <section id="future-ideas" className="mt-16">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-500/10">
              <Rocket className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              {t("gettingStarted.futureIdeas.title")}
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-8 pl-[52px]">
            {t("gettingStarted.futureIdeas.description")}
          </p>

          {/* Desktop table */}
          <div className="hidden md:block glass-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground uppercase text-xs tracking-wider">
                    {t("gettingStarted.futureIdeas.columns.idea")}
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground uppercase text-xs tracking-wider w-24">
                    {t("gettingStarted.futureIdeas.columns.priority")}
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground uppercase text-xs tracking-wider">
                    {t("gettingStarted.futureIdeas.columns.description")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {futureIdeas.map((idea, i) => {
                  const cfg = priorityConfig[idea.priority];
                  const name = isPt ? idea.namePt : idea.nameEn;
                  const desc = isPt ? idea.descriptionPt : idea.descriptionEn;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border/30 last:border-b-0 transition-colors hover:bg-primary/5 ${
                        i % 2 === 0 ? "bg-muted/5" : ""
                      }`}
                    >
                      <td className="px-5 py-3 text-foreground/90 font-medium">
                        {name}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          {t(`gettingStarted.futureIdeas.priority.${idea.priority}`)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {desc}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {futureIdeas.map((idea, i) => {
              const cfg = priorityConfig[idea.priority];
              const name = isPt ? idea.namePt : idea.nameEn;
              const desc = isPt ? idea.descriptionPt : idea.descriptionEn;
              return (
                <div key={i} className="glass-panel p-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <span className="text-sm font-medium text-foreground/90">{name}</span>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                      {t(`gettingStarted.futureIdeas.priority.${idea.priority}`)}
                    </span>
                  </div>
                  {desc && (
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Back to top */}
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => navRef.current?.closest("main")?.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-full bg-white/5 hover:bg-white/10 border border-border/40 transition-all duration-200"
          >
            <ArrowUp className="w-3 h-3" />
            {isPt ? "Voltar ao topo" : "Back to top"}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
