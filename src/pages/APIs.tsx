import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, Play, Copy, ChevronRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchApiControllers,
  fetchApiControllerDetail,
  type ApiControllerListItem,
  type ApiControllerDetail,
} from "@/lib/apiDocsApi";
import { parseOpenAPISpec, extractEndpoints, type Endpoint } from "@/lib/openapi";
import { dereferenceSpec, simplifySchema } from "@/lib/openapi-resolver";
import { JsonHighlight } from "@/components/api/JsonHighlight";

const methodColors: Record<string, string> = {
  GET: "method-get",
  POST: "method-post",
  PUT: "method-put",
  DELETE: "method-delete",
  PATCH: "method-put", // reuse put style
  HEAD: "method-get", // reuse get style
  OPTIONS: "method-get",
};

export default function APIs() {
  const { t, i18n } = useTranslation();
  const locale = useMemo(
    () => (i18n.language?.toLowerCase().startsWith("pt") ? "pt" : "en"),
    [i18n.language],
  );
  const [searchParams, setSearchParams] = useSearchParams();

  const [controllers, setControllers] = useState<ApiControllerListItem[]>([]);
  const [controllersLoading, setControllersLoading] = useState(true);
  const [controllersError, setControllersError] = useState<string | null>(null);

  const [selectedController, setSelectedController] = useState<ApiControllerListItem | null>(null);
  const [detail, setDetail] = useState<ApiControllerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);

  const controllersLoadId = useRef(0);
  const detailLoadId = useRef(0);

  const syncControllerParam = useCallback(
    (key: string | null) => {
      const next = new URLSearchParams();
      if (key) {
        next.set("controller", key);
      }
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

  // Load controllers
  useEffect(() => {
    const loadId = controllersLoadId.current + 1;
    controllersLoadId.current = loadId;
    setControllersLoading(true);
    setControllersError(null);

    fetchApiControllers(locale)
      .then((data) => {
        if (controllersLoadId.current !== loadId) return;
        setControllers(data);

        const controllerParam = searchParams.get("controller");
        const preferred =
          controllerParam && data.some((controller) => controller.key === controllerParam)
            ? data.find((c) => c.key === controllerParam)!
            : data[0] ?? null;

        setSelectedController(preferred);
        syncControllerParam(preferred?.key ?? null);
      })
      .catch((error) => {
        if (controllersLoadId.current !== loadId) return;
        setControllersError(error instanceof Error ? error.message : t("apis.errors.loadControllers"));
      })
      .finally(() => {
        if (controllersLoadId.current === loadId) {
          setControllersLoading(false);
        }
      });
  }, [searchParams, locale, syncControllerParam, t]);

  // Load controller detail when selected
  useEffect(() => {
    if (!selectedController) {
      setDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      setEndpoints([]);
      setSelectedEndpoint(null);
      return;
    }

    const loadId = detailLoadId.current + 1;
    detailLoadId.current = loadId;
    setDetailLoading(true);
    setDetailError(null);

    fetchApiControllerDetail(selectedController.key, locale)
      .then((data) => {
        if (detailLoadId.current !== loadId) return;
        setDetail(data);

        // Parse OpenAPI spec
        if (data.apiCatalog?.trim()) {
          const spec = parseOpenAPISpec(data.apiCatalog);
          if (spec) {
            const deref = dereferenceSpec(spec);
            const extracted = extractEndpoints(deref);
            setEndpoints(extracted);
            setSelectedEndpoint(extracted[0] || null);
          } else {
            setEndpoints([]);
            setSelectedEndpoint(null);
          }
        } else {
          setEndpoints([]);
          setSelectedEndpoint(null);
        }
      })
      .catch((error) => {
        if (detailLoadId.current !== loadId) return;
        setDetail(null);
        setEndpoints([]);
        setSelectedEndpoint(null);
        setDetailError(error instanceof Error ? error.message : t("apis.errors.loadControllerDetail"));
      })
      .finally(() => {
        if (detailLoadId.current === loadId) {
          setDetailLoading(false);
        }
      });
  }, [selectedController, locale, t]);

  const handleSelectController = useCallback((controller: ApiControllerListItem) => {
    setSelectedController(controller);
    syncControllerParam(controller.key);
  }, [syncControllerParam]);

  const handleSelectEndpoint = useCallback((endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
  }, []);

  // Determine request body schema
  const requestBodySchema = useMemo(() => {
    if (!selectedEndpoint) return null;
    const content = selectedEndpoint.operation.requestBody?.content;
    if (!content) return null;
    const firstMedia = Object.values(content)[0];
    return firstMedia?.schema;
  }, [selectedEndpoint]);

  // Determine response schema (first 2xx response)
  const responseSchema = useMemo(() => {
    if (!selectedEndpoint) return null;
    const responses = selectedEndpoint.operation.responses;
    if (!responses) return null;
    const successCode = Object.keys(responses).find((code) => code.startsWith("2"));
    if (!successCode) return null;
    const response = responses[successCode];
    const content = response.content;
    if (!content) return null;
    const firstMedia = Object.values(content)[0];
    return firstMedia?.schema;
  }, [selectedEndpoint]);

  // Format schema to JSON string for display
  const formatSchema = (schema: any): string => {
    if (!schema) return "{}";
    const simplified = simplifySchema(schema);
    return JSON.stringify(simplified, null, 2);
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Endpoints */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 border-r border-glass-border/30 glass-panel flex flex-col"
        >
          {/* Service Selector */}
          <div className="p-4 border-b border-glass-border/30 overflow-auto">
            {controllersLoading ? (
              <div className="w-full px-4 py-3 rounded-lg bg-white/5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ) : controllersError ? (
              <div className="text-sm text-red-200 p-2">{controllersError}</div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {selectedController?.title || t("apis.controller.select")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedController?.summary || ""}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 bg-popover border-glass-border max-h-60 lg:max-h-[800px] overflow-y-auto">
                  {controllers.map((controller) => (
                    <DropdownMenuItem
                      key={controller.key}
                      onClick={() => handleSelectController(controller)}
                      className="cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{controller.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {controller.summary || t("apis.controller.noDescription")}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Endpoint List */}
          <div className="flex-1 overflow-auto p-4 space-y-1">
            {detailLoading && (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 animate-pulse">
                    <div className="w-12 h-6 bg-white/10 rounded" />
                    <div className="h-4 bg-white/10 rounded flex-1" />
                  </div>
                ))}
              </div>
            )}
            {!detailLoading && detailError && (
              <div className="text-sm text-red-200 p-2">{detailError}</div>
            )}
            {!detailLoading && !detailError && endpoints.length === 0 && (
              <div className="text-sm text-muted-foreground p-2">
                {t("apis.controller.noApiCatalog")}
              </div>
            )}
            {!detailLoading && !detailError &&
              endpoints.map((endpoint, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectEndpoint(endpoint)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                    selectedEndpoint === endpoint
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20"
                      : "hover:bg-white/5"
                  )}
                >
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-mono font-semibold rounded",
                      methodColors[endpoint.method] || "bg-muted text-foreground"
                    )}
                  >
                    {endpoint.method}
                  </span>
                  <span className="text-sm text-foreground font-mono truncate">
                    {endpoint.path}
                  </span>
                </button>
              ))}
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          {!selectedController ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {t("apis.empty")}
            </div>
          ) : detailLoading ? (
            <div className="max-w-4xl space-y-8">
              <div className="glass-panel rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
              </div>
              <div className="glass-panel rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-1/4 mb-4" />
                <div className="h-32 bg-white/10 rounded" />
              </div>
            </div>
          ) : detailError ? (
            <div className="glass-panel rounded-xl p-6 text-sm text-red-200">
              {detailError}
            </div>
          ) : !selectedEndpoint ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {t("apis.controller.noEndpoints")}
            </div>
          ) : (
            <motion.div
              key={selectedEndpoint.path + selectedEndpoint.method}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl space-y-8"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={cn(
                        "px-3 py-1 text-sm font-mono font-semibold rounded",
                        methodColors[selectedEndpoint.method] || "bg-muted text-foreground"
                      )}
                    >
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-lg font-mono text-foreground">
                      {selectedEndpoint.path}
                    </code>
                  </div>
                </div>
              </div>

              {/* Request Schema */}
              {requestBodySchema && (
                <div className="glass-panel rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-glass-border/30 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("apis.controller.requestBody")}
                    </h3>
                    <button className="p-1.5 rounded hover:bg-white/5 transition-colors text-muted-foreground">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <JsonHighlight
                    data={formatSchema(requestBodySchema)}
                    className="bg-transparent border-0 p-4 text-sm font-mono overflow-x-auto"
                  />
                </div>
              )}

              {/* Response Schema */}
              {responseSchema && (
                <div className="glass-panel rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-glass-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("apis.controller.response")}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded">
                        200 OK
                      </span>
                    </div>
                    <button className="p-1.5 rounded hover:bg-white/5 transition-colors text-muted-foreground">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <JsonHighlight
                    data={formatSchema(responseSchema)}
                    className="bg-transparent border-0 p-4 text-sm font-mono overflow-x-auto"
                  />
                </div>
              )}

              {/* Parameters */}
              {selectedEndpoint.operation.parameters && selectedEndpoint.operation.parameters.length > 0 && (
                <div className="glass-panel rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">
                    {t("apis.controller.parameters")}
                  </h3>
                  <div className="space-y-3">
                    {selectedEndpoint.operation.parameters.map((param, idx) => (
                      <ParameterRow
                        key={idx}
                        name={param.name}
                        type={param.schema?.type || "unknown"}
                        required={param.required}
                        description={param.description || ""}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

interface ParameterRowProps {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

function ParameterRow({ name, type, required, description }: ParameterRowProps) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-glass-border/20 last:border-0">
      <div className="flex items-center gap-2 min-w-32">
        <code className="text-sm font-mono text-purple-400">{name}</code>
        {required && (
          <span className="text-xs text-pink-400">*</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
        {type}
      </span>
      <p className="text-sm text-muted-foreground flex-1">{description}</p>
    </div>
  );
}
