const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_LOAD_TIMEOUT_MS = 10_000;

let googleReadyPromise = null;
let initializedClientId = null;
let activeCredentialHandler = null;

export async function renderGoogleButton({
  element,
  clientId,
  onCredential,
  width = 320,
}) {
  if (!element) {
    throw new Error("Elemento do botão Google não encontrado.");
  }

  if (!clientId) {
    throw new Error("VITE_GOOGLE_CLIENT_ID não foi configurado.");
  }

  activeCredentialHandler = onCredential;
  const google = await initializeGoogleIdentity(clientId);

  if (activeCredentialHandler !== onCredential || !element.isConnected) return;

  element.replaceChildren();

  google.accounts.id.renderButton(element, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "center",
    width: Math.max(220, Math.min(400, Math.round(width))),
    locale: "pt-BR",
  });
}

export function clearGoogleCredentialHandler(handler) {
  if (!handler || activeCredentialHandler === handler) {
    activeCredentialHandler = null;
  }
}

export async function disableGoogleAutoSelect() {
  try {
    const google = await waitForGoogleIdentity();
    google.accounts.id.disableAutoSelect();
  } catch {}
}

async function initializeGoogleIdentity(clientId) {
  const google = await waitForGoogleIdentity();

  if (initializedClientId && initializedClientId !== clientId) {
    throw new Error(
      "O Google Identity Services já foi inicializado com outro Client ID. Reinicie a página.",
    );
  }

  if (!initializedClientId) {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        activeCredentialHandler?.(response);
      },
      auto_select: false,
      ux_mode: "popup",
      use_fedcm_for_button: false,
    });

    initializedClientId = clientId;
  }

  return google;
}

function waitForGoogleIdentity() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (googleReadyPromise) {
    return googleReadyPromise;
  }

  googleReadyPromise = new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let interval = null;
    let settled = false;
    let script;
    const fail = (message) => {
      if (settled) return;
      settled = true;
      window.clearInterval(interval);
      script?.remove();
      reject(new Error(message));
    };
    const existingScript = document.querySelector(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );

    script = existingScript;
    if (!script) {
      script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        fail("Não foi possível carregar o Google Identity Services.");
      };
      document.head.appendChild(script);
    }

    interval = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        if (settled) return;
        settled = true;
        window.clearInterval(interval);
        resolve(window.google);
        return;
      }

      if (Date.now() - startedAt >= GOOGLE_LOAD_TIMEOUT_MS) {
        fail("Tempo esgotado ao carregar o Google Identity Services.");
      }
    }, 50);
  }).catch((error) => {
    googleReadyPromise = null;
    throw error;
  });

  return googleReadyPromise;
}
