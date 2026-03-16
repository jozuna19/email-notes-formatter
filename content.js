chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GET_SELECTION_TEXT") {
    const selection = window.getSelection()?.toString() || "";
    sendResponse({ text: selection });
  }
});