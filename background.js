// 初始化右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "setShortcutViaContextMenu",
    title: "为此元素设置快捷键 (WebBoost)",
    contexts: ["all"]
  });
  console.log("[WebBoost Keys] Context menu created.");
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "setShortcutViaContextMenu" && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
        action: "startElementSelectionViaContextMenu"
        
    }).catch(err => console.warn("[WebBoost Keys] Error sending context menu message:", err));
  }
});

// 监听来自content script或popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getShortcuts") {
    chrome.storage.local.get(['shortcuts'], function(result) {
      if (chrome.runtime.lastError) {
        console.error("[WebBoost Keys] Error getting shortcuts:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse(result.shortcuts || {});
    });
    return true; 
  }
});

// 新增：监听插件命令（热键）
chrome.commands.onCommand.addListener((command, tab) => {
  console.log(`[WebBoost Keys] Command received: ${command}`);
  if (command === "capture-element-for-shortcut" && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
        action: "captureElementUnderMouseForShortcut"
    }).catch(err => console.warn("[WebBoost Keys] Error sending capture command message:", err));
  }
});
