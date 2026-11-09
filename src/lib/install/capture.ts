export const INSTALL_READY_EVENT = 'playing-cards-install-ready';
export const CAPTURED_INSTALL_PROMPT_KEY = '__playingCardsInstallPrompt';

export const INSTALL_CAPTURE_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.${CAPTURED_INSTALL_PROMPT_KEY}=e;window.dispatchEvent(new Event("${INSTALL_READY_EVENT}"))});`;
