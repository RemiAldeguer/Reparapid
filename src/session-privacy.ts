export type SessionTicket = {generation: number; signal: AbortSignal};

/** Cancel old requests before clearing or replacing a session. */
export function createSessionEpoch() {
  let generation = 0, controller = new AbortController();
  const capture = (): SessionTicket => ({generation, signal: controller.signal});
  function advance() {controller.abort(); controller = new AbortController(); generation++; return capture();}
  return {capture, advance, current: (ticket: SessionTicket) => ticket.generation === generation && !ticket.signal.aborted};
}

/** Page departure and tab visibility have different draft-preservation requirements. */
export function observeSessionPrivacy({onPageHide, onRestore, onVisible, onBackground}: {
  onPageHide: () => void; onRestore: () => void; onVisible: () => void; onBackground: () => void;
}) {
  let wasHidden = document.visibilityState === 'hidden', departed = false;
  const pageHide = () => {departed = true; onPageHide();};
  const pageShow = (event: PageTransitionEvent) => {
    if (!(event.persisted || departed)) return;
    if (document.visibilityState === 'hidden') {wasHidden = true; return;}
    departed = false; wasHidden = false; onRestore();
  };
  const visibility = () => {
    if (document.visibilityState === 'hidden') {wasHidden = true; onBackground();}
    else if (wasHidden) {wasHidden = false; if (departed) {departed = false; onRestore();} else onVisible();}
  };
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('pageshow', pageShow);
    document.removeEventListener('visibilitychange', visibility);
  };
}
