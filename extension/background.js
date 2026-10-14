// LabelSeek service worker: clicking the toolbar icon opens the side panel.
// The icon sits on its own white tile, so one version works on light and dark toolbars.

function setup() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}
chrome.runtime.onInstalled.addListener(setup);
chrome.runtime.onStartup.addListener(setup);
