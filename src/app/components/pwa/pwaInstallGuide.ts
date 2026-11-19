export type InstallGuide = {
  text: string;
  /** El navegador interno de otra app no puede instalar. El enlace abre Chrome. */
  openInChrome?: boolean;
};

const IN_APP =
  /;\s*wv\)|WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\/|MicroMessenger|TikTok|BytedanceWebview|Musical_ly|Snapchat/i;

function isInAppBrowser(userAgent: string) {
  return IN_APP.test(userAgent);
}

export function chromeIntentUrl(pageUrl: string): string {
  const url = new URL(pageUrl);
  const scheme = url.protocol.replace(":", "");
  const fallback = encodeURIComponent(pageUrl);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

/**
 * Pasos para crear el acceso directo cuando el navegador no abre el diálogo solo.
 * En Mac y Linux devuelve null: ahí solo se muestra el botón si el navegador lo permite.
 */
export function getInstallGuide(
  userAgent: string,
  options?: { brave?: boolean },
): InstallGuide | null {
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return { text: "Toca Compartir y elige Agregar a inicio." };
  }

  const android = /android/i.test(userAgent);
  if (android && isInAppBrowser(userAgent)) {
    return {
      text: "Este navegador no puede instalarla. Ábrela en Chrome para crear el acceso directo.",
      openInChrome: true,
    };
  }

  if (android) {
    if (/firefox/i.test(userAgent)) {
      return { text: "Menú del navegador → Instalar." };
    }
    if (/samsungbrowser/i.test(userAgent)) {
      return { text: "Menú del navegador → Agregar página a → Pantalla de inicio." };
    }
    if (/edga\/|edg\//i.test(userAgent)) {
      return { text: "Menú del navegador → Instalar aplicación." };
    }
    if (/opr\/|opera/i.test(userAgent)) {
      return { text: "Menú del navegador → Añadir a pantalla de inicio." };
    }
    if (options?.brave) return { text: "Menú del navegador → Instalar PCInbox Admin." };
    if (/chrome|crios/i.test(userAgent)) {
      return {
        text: "Menú del navegador → Instalar app o Agregar a pantalla principal.",
      };
    }
    return { text: "En el menú del navegador elige Instalar o Agregar a inicio." };
  }

  if (!/windows nt/i.test(userAgent)) return null;

  if (/firefox/i.test(userAgent)) {
    return {
      text: "Menú del navegador → Instalar, o el ícono de instalar en la barra de direcciones.",
    };
  }
  if (/edg\//i.test(userAgent)) {
    return {
      text: "Menú del navegador → Aplicaciones → Instalar este sitio como una aplicación.",
    };
  }
  if (/opr\/|opera/i.test(userAgent)) {
    return { text: "Menú del navegador → Instalar PCInbox Admin." };
  }
  if (options?.brave) return { text: "Menú del navegador → Instalar PCInbox Admin." };
  if (/chrome/i.test(userAgent)) {
    return {
      text: "Menú del navegador → Transmitir, guardar y compartir → Instalar página como app.",
    };
  }
  return { text: "En el menú del navegador elige Instalar aplicación." };
}
