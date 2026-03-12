export function waitForStylesheetLoad(link) {
  if (!link) {
    return Promise.resolve(link);
  }

  if (link.sheet) {
    return Promise.resolve(link);
  }

  if (link._readyPromise instanceof Promise) {
    return link._readyPromise;
  }

  link._readyPromise = new Promise((resolve, reject) => {
    const cleanup = () => {
      link.removeEventListener("load", handleLoad);
      link.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      cleanup();
      resolve(link);
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Stylesheet failed to load"));
    };

    link.addEventListener("load", handleLoad, { once: true });
    link.addEventListener("error", handleError, { once: true });

    if (link.sheet) {
      handleLoad();
    }
  });

  return link._readyPromise;
}
