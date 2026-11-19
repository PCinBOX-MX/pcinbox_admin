"use client";

import { useEffect, useState } from "react";
import {
  chromeIntentUrl,
  getInstallGuide,
  type InstallGuide,
} from "./pwaInstallGuide";
import styles from "./pwaInstall.module.css";

const DISMISS_KEY = "pcinbox-admin-pwa-dismissed";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

export default function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [guide, setGuide] = useState<InstallGuide | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* Sin service worker el panel sigue igual; solo no aparece el acceso directo. */
      });
    }

    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (event: Event) => {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const nextGuide = getInstallGuide(navigator.userAgent, {
      brave: "brave" in navigator,
    });
    if (nextGuide) {
      setGuide(nextGuide);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem(DISMISS_KEY, "1");
      }
    } catch {
      /* El navegador no abrió el diálogo. Se vuelve a ofrecer en la siguiente visita. */
    }
    setPromptEvent(null);
    setVisible(false);
  };

  const text = promptEvent
    ? "Instala PCInbox Admin y ábrelo desde tu pantalla de inicio."
    : (guide?.text ?? "Instala PCInbox Admin y ábrelo desde tu pantalla de inicio.");
  const chromeHref =
    !promptEvent && guide?.openInChrome
      ? chromeIntentUrl(window.location.href)
      : null;

  return (
    <div className={styles.bar} role="region" aria-label="Acceso directo de PCInbox Admin">
      <img
        className={styles.icon}
        src="/icons/icon-192.png"
        alt=""
        width={40}
        height={40}
      />
      <div className={styles.copy}>
        <p className={styles.title}>Acceso directo</p>
        <p className={styles.text}>{text}</p>
      </div>
      <div className={styles.actions}>
        {promptEvent ? (
          <button type="button" className={styles.install} onClick={install}>
            Instalar
          </button>
        ) : null}
        {chromeHref ? (
          <a className={styles.install} href={chromeHref}>
            Abrir en Chrome
          </a>
        ) : null}
        <button
          type="button"
          className={styles.dismiss}
          onClick={dismiss}
          aria-label="Cerrar aviso de instalación"
        >
          ×
        </button>
      </div>
    </div>
  );
}
