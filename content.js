// 全局变量
let isSelectingElement = false;
let selectedElementForHighlight = null;
let highlightOverlay = null;
let shortcutDialogInstance = null;
let lastMouseOverElement = null;

document.addEventListener('mousemove', (event) => {
    if (!shortcutDialogInstance && !isSelectingElement) {
        lastMouseOverElement = event.target;
    }
}, true);
document.addEventListener('contextmenu', function(event) {
    if (!shortcutDialogInstance && !isSelectingElement) {
        lastMouseOverElement = event.target;
    }
}, true);

function getUrlScope() {
  return window.location.hostname;
}

function isDecorativeElement(el) {
  if (!el) return false;
  return ['svg', 'img', 'span', 'i'].includes(el.tagName.toLowerCase());
}

function isFunctionalElement(el) {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (['button', 'a', 'select', 'textarea'].includes(tag)) return true;
  if (tag === 'input' && !['hidden', 'reset', 'image'].includes(el.type)) return true;
  if (el.hasAttribute('role') && ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'option', 'slider'].includes(el.getAttribute('role'))) return true;
  if (el.hasAttribute('onclick') || el.hasAttribute('tabindex') && parseInt(el.getAttribute('tabindex'),10) >= 0) return true;
  const cls = el.className || '';
  if (typeof cls === 'string' && /btn|button|upload|send|control|action|nav|menu-item/i.test(cls)) return true;
  return false;
}

function findFunctionalAncestor(el) {
  let current = el;
  for (let i = 0; i < 5 && current && current !== document.body; i++, current = current.parentElement) {
    if (isFunctionalElement(current)) return current;
  }
  return el;
}

function getFilteredClasses(targetElement) {
    if (!targetElement || !targetElement.classList) return [];
    return Array.from(targetElement.classList)
        .filter(cls => cls && 
                       !cls.startsWith('style-') && // 过滤动态样式类
                       !/focused|active|hover|selected|current|visited|disabled|focus-visible/i.test(cls) && // 过滤常见状态类
                       !/^\s*$/.test(cls)) // 过滤空字符串类
        .sort(); // 排序以保证选择器字符串的一致性
}

function isSelectorUniqueForTarget(selector, targetElement) {
    if (!selector || !targetElement) return false;
    try {
        const elements = document.querySelectorAll(selector);
        return elements.length === 1 && elements[0] === targetElement;
    } catch (e) {
        return false; // 无效的选择器
    }
}

// 选择器生成
function generateSelector(element) {
  let target = element;
  // 如果初始元素是纯装饰性的，尝试找到一个功能性的父元素
  if (isDecorativeElement(element) && !isFunctionalElement(element)) {
    target = findFunctionalAncestor(element);
  }

  const tagName = target.tagName.toLowerCase();

  // 1. 尝试使用 ID (最高优先级)
  if (target.id) {
    const idSelector = `#${CSS.escape(target.id)}`;
    if (isSelectorUniqueForTarget(idSelector, target)) {
      return idSelector;
    }
  }

  const filteredClasses = getFilteredClasses(target);
  const classSelectorPart = filteredClasses.length > 0 ? `.${filteredClasses.join('.')}` : '';

  // 2. 尝试使用 data-value (对于B站播放速度这类场景非常关键)
  const dataValue = target.getAttribute('data-value');
  if (dataValue) {
    // 2a. tagName[data-value="..."]
    let potentialSelector = `${tagName}[data-value="${CSS.escape(dataValue)}"]`;
    if (isSelectorUniqueForTarget(potentialSelector, target)) {
      return potentialSelector;
    }
    // 2b. tagName.classes[data-value="..."]
    if (classSelectorPart) {
      potentialSelector = `${tagName}${classSelectorPart}[data-value="${CSS.escape(dataValue)}"]`;
      if (isSelectorUniqueForTarget(potentialSelector, target)) {
        return potentialSelector;
      }
    }
  }

  // 3. 尝试使用 aria-label
  const ariaLabel = target.getAttribute('aria-label');
  if (ariaLabel) {
    // 3a. tagName[aria-label="..."]
    let potentialSelector = `${tagName}[aria-label="${CSS.escape(ariaLabel)}"]`;
    if (isSelectorUniqueForTarget(potentialSelector, target)) {
      return potentialSelector;
    }
    // 3b. tagName.classes[aria-label="..."]
    if (classSelectorPart) {
        potentialSelector = `${tagName}${classSelectorPart}[aria-label="${CSS.escape(ariaLabel)}"]`;
        if (isSelectorUniqueForTarget(potentialSelector, target)) {
            return potentialSelector;
        }
    }
  }

  // 4. 尝试使用 title
  const title = target.getAttribute('title');
  if (title) {
    // 4a. tagName[title="..."]
    let potentialSelector = `${tagName}[title="${CSS.escape(title)}"]`;
    if (isSelectorUniqueForTarget(potentialSelector, target)) {
      return potentialSelector;
    }
    // 4b. tagName.classes[title="..."]
     if (classSelectorPart) {
        potentialSelector = `${tagName}${classSelectorPart}[title="${CSS.escape(title)}"]`;
        if (isSelectorUniqueForTarget(potentialSelector, target)) {
            return potentialSelector;
        }
    }
  }

  // 5. 尝试仅使用 tagName + classes (如果它们组合起来是唯一的)
  if (classSelectorPart) {
    const tagAndClassSelector = `${tagName}${classSelectorPart}`;
    if (isSelectorUniqueForTarget(tagAndClassSelector, target)) {
      return tagAndClassSelector;
    }
  }

  // 6. 尝试其他属性 (role, name, type, href) 结合 tagName 和 classes
  const otherAttributes = ['role', 'name', 'type', 'href'];
  for (const attr of otherAttributes) {
    const attrValue = target.getAttribute(attr);
    if (attrValue) {
      // 6a. tagName[attribute="..."]
      let potentialSelector = `${tagName}[${attr}="${CSS.escape(attrValue)}"]`;
      if (isSelectorUniqueForTarget(potentialSelector, target)) {
        return potentialSelector;
      }
      // 6b. tagName.classes[attribute="..."]
      if (classSelectorPart) {
        potentialSelector = `${tagName}${classSelectorPart}[${attr}="${CSS.escape(attrValue)}"]`;
        if (isSelectorUniqueForTarget(potentialSelector, target)) {
          return potentialSelector;
        }
      }
    }
  }

  // 7. 如果所有策略都失败了，返回一个基础选择器 (tagName + classes)，并警告它可能不唯一
  const fallbackSelector = `${tagName}${classSelectorPart}`;
  if (!isSelectorUniqueForTarget(fallbackSelector, target)) {
      console.warn(`[WebBoost Keys] Fallback selector "${fallbackSelector}" is not unique for the target element. This may lead to incorrect behavior. Consider XPath or more specific attributes if possible. Target:`, target);
  }
  console.log('[WebBoost Keys] Generated selector (final attempt/fallback):', fallbackSelector);
  return fallbackSelector;
}


// --- 消息监听与处理 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startElementSelectionViaContextMenu") {
    if (lastMouseOverElement) {
      console.log("[WebBoost Keys] Starting selection via context menu for:", lastMouseOverElement);
      const selector = generateSelector(lastMouseOverElement);
      openShortcutDialog(lastMouseOverElement, selector);
      lastMouseOverElement = null;
    } else {
      console.warn("[WebBoost Keys] Context menu selection triggered, but no lastMouseOverElement found. Falling back to normal selection.");
      startNormalElementSelectionMode();
    }
  } else if (request.action === "startElementSelection") {
    console.log("[WebBoost Keys] Starting normal element selection mode via popup.");
    startNormalElementSelectionMode();
  } else if (request.action === "editShortcutDialog") {
    if (shortcutDialogInstance) {
        shortcutDialogInstance.remove();
        shortcutDialogInstance = null;
    }
    openShortcutDialog(null, request.selector, request.shortcut);
  } else if (request.action === "captureElementUnderMouseForShortcut") {
    console.log("[WebBoost Keys] Capturing element under mouse via hotkey.");
    if (lastMouseOverElement) {
      if (lastMouseOverElement.closest('.webboost-keys-dialog') || lastMouseOverElement.closest('.webboost-keys-highlight')) {
          console.log("[WebBoost Keys] Hotkey capture ignored: mouse is over plugin UI.");
          return;
      }
      const selector = generateSelector(lastMouseOverElement);
      console.log("[WebBoost Keys] Selector from hotkey capture:", selector, "for element:", lastMouseOverElement);
      openShortcutDialog(lastMouseOverElement, selector);
    } else {
      console.warn("[WebBoost Keys] Hotkey capture triggered, but no element under mouse was recorded.");
        const tooltip = document.createElement('div');
        tooltip.className = 'webboost-keys-tooltip';
        tooltip.textContent = `捕获失败: 未检测到鼠标下元素`;
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2500);
    }
  }
});

// 元素选择模式
function startNormalElementSelectionMode() {
  if (isSelectingElement || shortcutDialogInstance) return;
  isSelectingElement = true;
  createHighlightOverlay();
  document.body.classList.add('webboost-keys-selecting');
  document.addEventListener('mousemove', handleMouseMoveForHighlight);
  document.addEventListener('click', handleElementClickToSelectInNormalMode, { capture: true, once: true });
  document.addEventListener('keydown', handleEscapeKeyForSelection, { capture: true });
}

function createHighlightOverlay() {
  if (highlightOverlay) highlightOverlay.remove();
  highlightOverlay = document.createElement('div');
  highlightOverlay.className = 'webboost-keys-highlight';
  document.body.appendChild(highlightOverlay);
}

function handleMouseMoveForHighlight(e) {
  if (!isSelectingElement) return;
  if (highlightOverlay) highlightOverlay.style.display = 'none';
  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (highlightOverlay) highlightOverlay.style.display = 'block';

  if (element && element !== selectedElementForHighlight && element !== highlightOverlay && !highlightOverlay.contains(element)) {
    selectedElementForHighlight = element;
    updateElementHighlight(element);
  }
}

function updateElementHighlight(element) {
  if (!highlightOverlay || !element) return;
  const rect = element.getBoundingClientRect();
  highlightOverlay.innerHTML = `
    <div class="webboost-keys-highlight-element" style="
      position: absolute;
      top: ${window.scrollY + rect.top}px;
      left: ${window.scrollX + rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
    "></div>
  `;
}

function handleElementClickToSelectInNormalMode(e) {
  if (!isSelectingElement) return;
  e.preventDefault();
  e.stopPropagation();

  if (highlightOverlay) highlightOverlay.style.display = 'none';
  const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
  if (highlightOverlay) highlightOverlay.style.display = 'block';

  if (clickedElement && clickedElement !== highlightOverlay && !highlightOverlay.contains(clickedElement)) {
    const selector = generateSelector(clickedElement);
    openShortcutDialog(clickedElement, selector);
  }
  cleanupSelectionMode();
}

function handleEscapeKeyForSelection(e) {
  if (e.key === 'Escape' && isSelectingElement) {
    e.preventDefault();
    e.stopPropagation();
    cleanupSelectionMode();
  }
}

function cleanupSelectionMode() {
  isSelectingElement = false;
  selectedElementForHighlight = null;
  document.body.classList.remove('webboost-keys-selecting');
  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
  document.removeEventListener('mousemove', handleMouseMoveForHighlight);
  document.removeEventListener('keydown', handleEscapeKeyForSelection, { capture: true });
}

// 快捷键设置对话框
function openShortcutDialog(elementForContext, selector, existingShortcut = null) {
  if (shortcutDialogInstance) {
    shortcutDialogInstance.remove();
    shortcutDialogInstance = null;
  }
  if (isSelectingElement) {
      cleanupSelectionMode();
  }

  const dialog = document.createElement('div');
  dialog.className = 'webboost-keys-dialog';
  dialog.innerHTML = `
    <h3>${existingShortcut ? '编辑快捷键' : '设置快捷键'}</h3>
    <div>
      <label for="wbk-shortcutName">名称 (例如: "播放速度1.75x"):</label>
      <input type="text" id="wbk-shortcutName" value="${existingShortcut ? existingShortcut.name : (elementForContext ? (elementForContext.textContent || elementForContext.getAttribute('aria-label') || elementForContext.title || '').trim().substring(0,50) : '')}">
    </div>
    <div>
      <label for="wbk-shortcutKeys">快捷键 (点击输入框后按下组合键):</label>
      <input type="text" id="wbk-shortcutKeys" readonly value="${existingShortcut && existingShortcut.keys ? existingShortcut.keys.join(' + ') : ''}">
    </div>
    <div class="webboost-keys-dialog-buttons">
      <button id="wbk-cancelBtn" class="cancel">取消</button>
      <button id="wbk-saveBtn" class="save">保存</button>
    </div>
  `;
  document.body.appendChild(dialog);
  shortcutDialogInstance = dialog;

  const nameInput = dialog.querySelector('#wbk-shortcutName');
  const keysInput = dialog.querySelector('#wbk-shortcutKeys');
  const cancelBtn = dialog.querySelector('#wbk-cancelBtn');
  const saveBtn = dialog.querySelector('#wbk-saveBtn');
  let currentKeysArray = existingShortcut && existingShortcut.keys ? [...existingShortcut.keys] : [];

  function recordShortcutKeys(e) {
    if (document.activeElement !== keysInput) return;
    e.preventDefault();
    e.stopPropagation();
    currentKeysArray = [];
    if (e.ctrlKey) currentKeysArray.push('Control');
    if (e.altKey) currentKeysArray.push('Alt');
    if (e.shiftKey) currentKeysArray.push('Shift');
    if (e.metaKey) currentKeysArray.push('Meta');
    const key = e.key;
    if (!['Control', 'Alt', 'Shift', 'Meta', 'Dead', undefined].includes(key) && key.trim() !== '') {
        if (key.startsWith("Arrow") || (key.startsWith("F") && key.length > 1 && !isNaN(parseInt(key.substring(1))))) {
             currentKeysArray.push(key);
        } else if (key.length === 1 || [' ', 'Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown', 'Insert'].includes(key) ) {
            currentKeysArray.push(key.length === 1 ? key.toLowerCase() : key);
        }
    }
    keysInput.value = currentKeysArray.join(' + ');
  }

  keysInput.addEventListener('focus', () => {
    keysInput.value = '请按下快捷键...';
    document.addEventListener('keydown', recordShortcutKeys, {capture: true});
  });
  keysInput.addEventListener('blur', () => {
    document.removeEventListener('keydown', recordShortcutKeys, {capture: true});
    if (keysInput.value === '请按下快捷键...') keysInput.value = currentKeysArray.join(' + ');
  });

  cancelBtn.onclick = () => {
    dialog.remove();
    shortcutDialogInstance = null;
  };
  saveBtn.onclick = () => {
    if (!nameInput.value.trim() || currentKeysArray.length === 0) {
      const tempAlert = document.createElement('div');
      tempAlert.textContent = '请填写名称并设置快捷键!';
      tempAlert.style.cssText = 'position:fixed; top:10px; left:50%; transform:translateX(-50%); background:red; color:white; padding:10px; border-radius:5px; z-index: 2147483647;';
      document.body.appendChild(tempAlert);
      setTimeout(() => tempAlert.remove(), 3000);
      return;
    }
    const newShortcut = {
      id: existingShortcut ? existingShortcut.id : Date.now().toString(),
      name: nameInput.value.trim(),
      keys: currentKeysArray,
      selector: selector,
      action: 'click'
    };
    chrome.storage.local.get(['shortcuts'], function(result) {
      const shortcuts = result.shortcuts || {};
      const url = getUrlScope();
      if (!shortcuts[url]) shortcuts[url] = [];
      const existingIndex = shortcuts[url].findIndex(s => s.id === newShortcut.id);
      if (existingIndex !== -1) {
        shortcuts[url][existingIndex] = newShortcut;
      } else {
        shortcuts[url].push(newShortcut);
      }
      chrome.storage.local.set({shortcuts: shortcuts}, function() {
        if (chrome.runtime.lastError) console.error('[WebBoost Keys] Error saving shortcut:', chrome.runtime.lastError);
        else console.log('[WebBoost Keys] Shortcut saved:', newShortcut);
        dialog.remove();
        shortcutDialogInstance = null;
      });
    });
  };
  nameInput.focus();
}

// 快捷键执行
document.addEventListener('keydown', async function(e) {
  const activeEl = document.activeElement;
  if (shortcutDialogInstance && shortcutDialogInstance.contains(activeEl)) {
      return;
  }
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable) && activeEl.id !== 'wbk-shortcutKeys') {
      return;
  }

  const url = getUrlScope();
  const result = await new Promise(resolve => chrome.storage.local.get(['shortcuts'], resolve));
  const shortcuts = result.shortcuts || {};
  const urlShortcuts = shortcuts[url] || [];
  const pressedKeysArray = [];
  if (e.ctrlKey) pressedKeysArray.push('Control');
  if (e.altKey) pressedKeysArray.push('Alt');
  if (e.shiftKey) pressedKeysArray.push('Shift');
  if (e.metaKey) pressedKeysArray.push('Meta');
  const mainKey = e.key;
  if (!['Control', 'Alt', 'Shift', 'Meta', 'Dead', undefined].includes(mainKey) && mainKey.trim() !== '') {
    pressedKeysArray.push(mainKey.length === 1 ? mainKey.toLowerCase() : mainKey);
  }

  const matchedShortcut = urlShortcuts.find(s => {
    if (s.keys.length !== pressedKeysArray.length) return false;
    const normalizedStoredKeys = s.keys.map(k => k.length === 1 ? k.toLowerCase() : k);
    const normalizedPressedKeys = pressedKeysArray.map(k => k.length === 1 ? k.toLowerCase() : k);
    return normalizedStoredKeys.every(storedKey => normalizedPressedKeys.includes(storedKey));
  });

  if (matchedShortcut) {
    e.preventDefault();
    e.stopPropagation();
    if (window.__webboostKeysLock) {
      console.log('[WebBoost Keys] 快捷键触发被忽略（操作太快）');
      return;
    }
    window.__webboostKeysLock = true;
    setTimeout(() => { window.__webboostKeysLock = false; }, 300);

    const selector = matchedShortcut.selector;
    let targetElement = document.querySelector(selector);
    if (!targetElement) {
      console.log('[WebBoost Keys] 目标元素未立即找到，尝试重试:', selector);
      await new Promise(resolve => setTimeout(resolve, 300));
      targetElement = document.querySelector(selector);
      if (targetElement) console.log('[WebBoost Keys] 目标元素在重试后找到。');
    }

    console.log('[WebBoost Keys] 快捷键触发:', matchedShortcut);
    console.log('[WebBoost Keys] 使用的选择器:', selector);
    console.log('[WebBoost Keys] 选中的元素:', targetElement);

    if (!targetElement) {
      console.warn('[WebBoost Keys] 未找到目标元素:', selector);
      const tooltip = document.createElement('div');
      tooltip.className = 'webboost-keys-tooltip';
      tooltip.textContent = `快捷键 "${matchedShortcut.name}": 未找到目标`;
      document.body.appendChild(tooltip);
      setTimeout(() => tooltip.remove(), 2500);
      return;
    }

    if (matchedShortcut.action === 'click') {
      if (typeof targetElement.click === 'function') {
        targetElement.click();
        console.log('[WebBoost Keys] 已调用 element.click()');
      } else {
        console.warn('[WebBoost Keys] 目标元素无法调用 click()。尝试派发mouse event。');
        try {
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            targetElement.dispatchEvent(clickEvent);
            console.log('[WebBoost Keys] 已派发 click mouse event。');
        } catch (err) { console.error('[WebBoost Keys] 派发 click event 失败:', err); }
      }
    }

    const settingsResult = await new Promise(resolve => chrome.storage.local.get(['settings'], resolve));
    const settings = settingsResult.settings || {};
    if (settings.showTooltip !== false) {
        const tooltip = document.createElement('div');
        tooltip.className = 'webboost-keys-tooltip';
        tooltip.textContent = `快捷键 "${matchedShortcut.name}" 已触发`;
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
    }
  }
});