"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Cpu,
  Images,
  LayoutGrid,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import useSettings, {
  bannerKey,
  CATEGORY_BANNERS,
  categoryBannerUrl,
  armaTuPcBannerUrl,
  PC_LEVELS,
  pcLevelBannerUrl,
  principalBannerUrl,
  PRINCIPAL_SLOTS,
  versionFromUrl,
  type CategoryBanner,
  type PcLevel,
} from "./useSettings";
import {
  cx,
  useBannerDrafts,
  useLeaveWarning,
  usePersistentState,
  useRecentKeys,
} from "./useBannerDrafts";
import { BANNER_SPECS, formatsLabel, sizeLabel } from "./bannerSpecs";
import SettingsNav, { type NavSection } from "./components/SettingsNav";
import SectionHeader from "./components/SectionHeader";
import CarouselEditor from "./components/CarouselEditor";
import BannerTile from "./components/BannerTile";
import styles from "./settings.module.css";

type SectionId = "carrusel" | "categorias" | "niveles";

const isSectionId = (value: unknown): value is SectionId =>
  value === "carrusel" || value === "categorias" || value === "niveles";
const isString = (value: unknown): value is string => typeof value === "string";
const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

type Notice = { type: "success" | "error"; text: string } | null;

const SECTION_INFO: Record<
  SectionId,
  { label: string; icon: LucideIcon; description: string; meta: string[] }
> = {
  carrusel: {
    label: "Carrusel principal",
    icon: Images,
    description: "Los 5 banners que rotan en el inicio de la tienda.",
    meta: [
      "Inicio de la tienda",
      "PNG · máx. 10 MB",
      sizeLabel(BANNER_SPECS.principal),
    ],
  },
  categorias: {
    label: "Portadas de categorías",
    icon: LayoutGrid,
    description:
      "La imagen que aparece arriba de los productos de cada categoría.",
    meta: [
      "Búsqueda por categoría",
      "PNG · máx. 10 MB",
      sizeLabel(BANNER_SPECS.categoria),
    ],
  },
  niveles: {
    label: "Niveles de PC Gamer",
    icon: Cpu,
    description:
      "El botón de Arma tu PC Gamer en el inicio y la imagen de cada nivel.",
    meta: ["Inicio y Arma tu PC Gamer", "Máx. 10 MB"],
  },
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function apiMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof message === "string" && message ? message : fallback;
}

export default function Settings() {
  const { versions, setVersion } = useSettings();
  const { requestPostProveedores } = ProveedoresUtils();
  const { drafts, hasUnsaved, restored, clearRestored, pick, discard } =
    useBannerDrafts();
  const [recentKeys, setRecentKeys] = useRecentKeys(5000);
  const [section, setSection] = usePersistentState<SectionId>(
    "section",
    "carrusel",
    isSectionId,
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const publishingRef = useRef(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [query, setQuery] = usePersistentState("query", "", isString);
  const [onlyDrafts, setOnlyDrafts] = usePersistentState(
    "onlyDrafts",
    false,
    isBoolean,
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!restored) return;
    setNotice({
      type: "success",
      text:
        restored === 1
          ? "Recuperamos 1 imagen que dejaste sin publicar."
          : `Recuperamos ${restored} imágenes que dejaste sin publicar.`,
    });
    clearRestored();
  }, [restored, clearRestored]);

  const busy = uploading !== null;
  useLeaveWarning(busy || hasUnsaved);
  const invalid = (text: string) => setNotice({ type: "error", text });

  const principalKeys = PRINCIPAL_SLOTS.map((slot) =>
    bannerKey.principal(slot),
  );
  const principalDrafts = principalKeys.filter((key) => drafts[key]);
  const categoryDrafts = CATEGORY_BANNERS.filter(
    (item) => drafts[bannerKey.categoria(item.category)],
  );
  const levelDrafts = [
    ...PC_LEVELS.map((item) => bannerKey.nivel(item.id)),
    bannerKey.armaTuPc,
  ].filter((key) => drafts[key]);
  const customLevels = PC_LEVELS.filter(
    (item) => versions?.[bannerKey.nivel(item.id)],
  ).length;
  const uploadingSection: SectionId | null =
    uploading === null
      ? null
      : uploading === "carrusel"
        ? "carrusel"
        : uploading.startsWith("nivel:") || uploading === bannerKey.armaTuPc
          ? "niveles"
          : "categorias";

  const navSections: NavSection<SectionId>[] = [
    {
      id: "carrusel",
      label: "Carrusel principal",
      description: "Inicio de la tienda",
      icon: Images,
      pending: principalDrafts.length,
      busy: uploadingSection === "carrusel",
      status: principalDrafts.length
        ? `${principalDrafts.length} sin publicar`
        : `${PRINCIPAL_SLOTS.length} banners`,
    },
    {
      id: "categorias",
      label: "Categorías",
      description: "Portada de cada categoría",
      icon: LayoutGrid,
      pending: categoryDrafts.length,
      busy: uploadingSection === "categorias",
      status: categoryDrafts.length
        ? `${categoryDrafts.length} sin publicar`
        : `${CATEGORY_BANNERS.length} portadas`,
    },
    {
      id: "niveles",
      label: "Niveles de PC Gamer",
      description: "Botón del inicio y los 3 niveles",
      icon: Cpu,
      pending: levelDrafts.length,
      busy: uploadingSection === "niveles",
      status: levelDrafts.length
        ? `${levelDrafts.length} sin publicar`
        : versions
          ? `${customLevels} de ${PC_LEVELS.length} personalizados`
          : "Cargando…",
    },
  ];

  const visibleCategories = useMemo(() => {
    const needle = normalize(query.trim());
    return CATEGORY_BANNERS.filter(
      (item) =>
        (!needle || normalize(item.name).includes(needle)) &&
        (!onlyDrafts || drafts[bannerKey.categoria(item.category)]),
    );
  }, [query, onlyDrafts, drafts]);

  // ── Publicar ──────────────────────────────────────────────────

  const publish = async (
    lockKey: string,
    endpoint: string,
    formData: FormData,
    onDone: (data: unknown) => void,
    errorText: string,
  ) => {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setUploading(lockKey);
    setNotice(null);
    try {
      const res = await requestPostProveedores(formData, endpoint, {
        silent: true,
      });
      onDone(res.data?.data);
    } catch (error) {
      setNotice({ type: "error", text: apiMessage(error, errorText) });
    } finally {
      publishingRef.current = false;
      setUploading(null);
    }
  };

  const publishCarousel = () => {
    if (!principalDrafts.length) return;
    const keys = [...principalDrafts];
    const formData = new FormData();
    PRINCIPAL_SLOTS.forEach((slot) => {
      const draft = drafts[bannerKey.principal(slot)];
      if (!draft) return;
      formData.append("files", draft.file);
      formData.append("slots", String(slot));
    });
    void publish(
      "carrusel",
      "/updateBanners",
      formData,
      (data) => {
        const updated = Array.isArray(data)
          ? (data as { slot: number; url: string }[])
          : [];
        updated.forEach(({ slot, url }) =>
          setVersion(bannerKey.principal(slot), versionFromUrl(url)),
        );
        discard(keys);
        setRecentKeys(keys);
        setNotice({
          type: "success",
          text:
            keys.length === 1
              ? "Banner publicado. Se verá al abrir o recargar la tienda."
              : `${keys.length} banners publicados. Se verán al abrir o recargar la tienda.`,
        });
      },
      "No se pudieron publicar los banners.",
    );
  };

  const publishCategory = (banner: CategoryBanner) => {
    const key = bannerKey.categoria(banner.category);
    const draft = drafts[key];
    if (!draft) return;
    const formData = new FormData();
    formData.append("file", draft.file);
    formData.append("categoryId", banner.category);
    void publish(
      key,
      "/updateCategoryBanner",
      formData,
      (data) => {
        setVersion(key, versionFromUrl((data as { url?: string })?.url ?? ""));
        discard([key]);
        setRecentKeys([key]);
        setNotice({
          type: "success",
          text: `Portada de ${banner.name} publicada.`,
        });
      },
      `No se pudo publicar la portada de ${banner.name}.`,
    );
  };

  const publishArmaTuPc = () => {
    const key = bannerKey.armaTuPc;
    const draft = drafts[key];
    if (!draft) return;
    const formData = new FormData();
    formData.append("file", draft.file);
    void publish(
      key,
      "/updateArmaTuPcBanner",
      formData,
      (data) => {
        const result = data as { url?: string; ext?: string } | undefined;
        if (result?.ext) setVersion(bannerKey.armaTuPcExt, result.ext);
        setVersion(key, versionFromUrl(result?.url ?? ""));
        discard([key]);
        setRecentKeys([key]);
        setNotice({
          type: "success",
          text: "Banner de Arma tu PC Gamer publicado.",
        });
      },
      "No se pudo publicar el banner de Arma tu PC Gamer.",
    );
  };

  const publishLevel = (level: PcLevel, name: string) => {
    const key = bannerKey.nivel(level);
    const draft = drafts[key];
    if (!draft) return;
    const formData = new FormData();
    formData.append("file", draft.file);
    formData.append("nivel", level);
    void publish(
      key,
      "/updatePcLevelBanner",
      formData,
      (data) => {
        setVersion(key, versionFromUrl((data as { url?: string })?.url ?? ""));
        discard([key]);
        setRecentKeys([key]);
        setNotice({ type: "success", text: `Imagen de ${name} publicada.` });
      },
      `No se pudo publicar la imagen de ${name}.`,
    );
  };

  // ── Render ────────────────────────────────────────────────────

  const info = SECTION_INFO[section];

  return (
    <AdminPageShell
      title="Ajustes Generales"
      subtitle="Administra las imágenes que ven tus clientes en la tienda."
    >
      <div className={styles.root}>
        <SettingsNav
          sections={navSections}
          active={section}
          onSelect={setSection}
        />

        <section
          key={section}
          id="settings-panel"
          role="tabpanel"
          aria-labelledby={`settings-tab-${section}`}
          className={styles.card}
        >
          <SectionHeader
            icon={info.icon}
            title={info.label}
            description={info.description}
            meta={info.meta}
          />

          <div className={styles.cardBody}>
            {section === "carrusel" ? (
              <CarouselEditor
                slots={PRINCIPAL_SLOTS}
                currentSrc={(slot) =>
                  versions ? principalBannerUrl(slot, versions) : null
                }
                drafts={drafts}
                slotKey={bannerKey.principal}
                doneKeys={recentKeys}
                uploading={uploading === "carrusel"}
                disabled={busy}
                onPick={pick}
                onDiscard={discard}
                onPublish={publishCarousel}
                onInvalid={invalid}
              />
            ) : null}

            {section === "categorias" ? (
              <>
                <div className={styles.toolbar}>
                  <label className={styles.search}>
                    <Search aria-hidden />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar categoría"
                      aria-label="Buscar categoría"
                    />
                  </label>
                  <div
                    className={styles.segmented}
                    role="group"
                    aria-label="Filtrar categorías"
                  >
                    <button
                      type="button"
                      aria-pressed={!onlyDrafts}
                      onClick={() => setOnlyDrafts(false)}
                    >
                      Todas <span>{CATEGORY_BANNERS.length}</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={onlyDrafts}
                      onClick={() => setOnlyDrafts(true)}
                    >
                      Por publicar <span>{categoryDrafts.length}</span>
                    </button>
                  </div>
                </div>

                {visibleCategories.length ? (
                  <div className={cx(styles.grid, styles.gridCategories)}>
                    {visibleCategories.map((banner) => {
                      const key = bannerKey.categoria(banner.category);
                      return (
                        <BannerTile
                          key={key}
                          title={banner.name}
                          src={
                            versions
                              ? categoryBannerUrl(banner, versions)
                              : null
                          }
                          spec={BANNER_SPECS.categoria}
                          draft={drafts[key]}
                          done={recentKeys.includes(key)}
                          uploading={uploading === key}
                          disabled={busy}
                          onPick={(file, size) => pick(key, file, size)}
                          onDiscard={() => discard([key])}
                          onPublish={() => publishCategory(banner)}
                          onInvalid={invalid}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.empty}>
                    {onlyDrafts && !query
                      ? "No hay portadas por publicar."
                      : `No hay categorías que coincidan con “${query}”.`}
                  </p>
                )}
              </>
            ) : null}

            {section === "niveles" ? (
              <>
                <div className={styles.group}>
                  <div className={styles.groupHead}>
                    <h3>Botón en el inicio</h3>
                    <p>
                      La franja que lleva a Arma tu PC Gamer desde la página
                      principal. Acepta {formatsLabel(BANNER_SPECS.armaTuPc)};
                      un GIF conserva su animación.
                    </p>
                  </div>
                  <BannerTile
                    title="Arma tu PC Gamer"
                    caption={`Inicio de la tienda · ${sizeLabel(BANNER_SPECS.armaTuPc)}`}
                    src={versions ? armaTuPcBannerUrl(versions) : null}
                    spec={BANNER_SPECS.armaTuPc}
                    draft={drafts[bannerKey.armaTuPc]}
                    done={recentKeys.includes(bannerKey.armaTuPc)}
                    isDefault={
                      Boolean(versions) && !versions?.[bannerKey.armaTuPc]
                    }
                    uploading={uploading === bannerKey.armaTuPc}
                    disabled={busy}
                    onPick={(file, size) =>
                      pick(bannerKey.armaTuPc, file, size)
                    }
                    onDiscard={() => discard([bannerKey.armaTuPc])}
                    onPublish={publishArmaTuPc}
                    onInvalid={invalid}
                  />
                </div>

                <div className={styles.groupHead}>
                  <h3>Imagen de cada nivel</h3>
                  <p>
                    Aparece en el cuestionario y en el armador.{" "}
                    {sizeLabel(BANNER_SPECS.nivel)}.
                  </p>
                </div>
                <div className={cx(styles.grid, styles.gridLevels)}>
                  {PC_LEVELS.map((level) => {
                    const key = bannerKey.nivel(level.id);
                    const custom = Boolean(versions?.[key]);
                    return (
                      <BannerTile
                        key={key}
                        title={level.name}
                        caption={level.range}
                        src={
                          versions ? pcLevelBannerUrl(level, versions) : null
                        }
                        spec={BANNER_SPECS.nivel}
                        tone={level.tone}
                        draft={drafts[key]}
                        done={recentKeys.includes(key)}
                        isDefault={Boolean(versions) && !custom}
                        uploading={uploading === key}
                        disabled={busy}
                        onPick={(file, size) => pick(key, file, size)}
                        onDiscard={() => discard([key])}
                        onPublish={() => publishLevel(level.id, level.name)}
                        onInvalid={invalid}
                      />
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>

      {notice ? (
        <div
          className={cx(
            styles.toast,
            notice.type === "error" ? styles.toastError : styles.toastSuccess,
          )}
          role={notice.type === "error" ? "alert" : "status"}
        >
          <span className={styles.toastIcon} aria-hidden>
            {notice.type === "success" ? <Check /> : <X />}
          </span>
          <p>{notice.text}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Cerrar aviso"
          >
            <X aria-hidden />
          </button>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
