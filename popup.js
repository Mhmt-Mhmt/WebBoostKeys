document.addEventListener('DOMContentLoaded', function() {
  // 初始化
  loadShortcuts();
  
  // 添加新快捷键按钮事件
  document.getElementById('addShortcut').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "startElementSelection"});
      window.close(); // 关闭弹出窗口，让用户选择元素
    });
  });
});

// 加载快捷键列表
function loadShortcuts() {
  chrome.storage.local.get(['shortcuts'], function(result) {
    const shortcuts = result.shortcuts || {};
    const shortcutsList = document.getElementById('shortcutsList');
    shortcutsList.innerHTML = '';
    Object.entries(shortcuts).forEach(([url, urlShortcuts]) => {
      const urlGroup = document.createElement('div');

      urlGroup.className = 'url-group';
      console.log(urlGroup,'urlGroup in loadShortcuts')
      const urlHeader = document.createElement('div');
      urlHeader.className = 'url-header';

      urlHeader.textContent = url;
      urlGroup.appendChild(urlHeader);

      urlShortcuts.forEach(shortcut => {
        const shortcutItem = createShortcutElement(shortcut, url);
        urlGroup.appendChild(shortcutItem);
      });

      shortcutsList.appendChild(urlGroup);
    });
  });
}

// 创建单个快捷键元素
function createShortcutElement(shortcut, url) {
  const div = document.createElement('div');
  div.className = 'shortcut-item';
  
  const info = document.createElement('div');
  info.className = 'shortcut-info';
  
  const name = document.createElement('div');
  name.textContent = shortcut.name;
  
  const keys = document.createElement('div');
  keys.className = 'shortcut-keys';
  keys.textContent = formatKeyCombination(shortcut.keys);
  

  const scope = document.createElement('div');
  scope.className = 'shortcut-scope';
  let scopeText = '仅当前页面';
  if (url.match(/\/$/)) scopeText = '同一目录';
  if (!url.includes('/')) scopeText = '整个域名';
  scope.textContent = scopeText;

  info.appendChild(name);
  info.appendChild(keys);
  info.appendChild(scope);
  
  const actions = document.createElement('div');
  actions.className = 'shortcut-actions';
  
  const editButton = document.createElement('button');
  editButton.className = 'action-button edit-button';
  editButton.textContent = '编辑';
  editButton.addEventListener('click', function(e) {
    e.stopPropagation();
    editShortcut(shortcut, url);
  });
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'action-button delete-button';
  deleteButton.textContent = '删除';
  deleteButton.addEventListener('click', function(e) {
    e.stopPropagation();
    deleteShortcut(shortcut, url);
  });
  
  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  
  div.appendChild(info);
  div.appendChild(actions);
  
  return div;
}

// 格式化快捷键组合
function formatKeyCombination(keys) {
  return keys.map(key => {
    if (key === 'Control') return 'Ctrl';
    if (key === 'Alt') return 'Alt';
    if (key === 'Shift') return 'Shift';
    return key.toUpperCase();
  }).join(' + ');
}

// 编辑快捷键
function editShortcut(shortcut, url) {
  // 传递已有shortcut和scopeKey，selector用shortcut.selector
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "editShortcutDialog", shortcut, selector: shortcut.selector, scopeKey: url});
  });
}

// 删除快捷键
function deleteShortcut(shortcut, url) {
  if (confirm('确定要删除这个快捷键吗？')) {
    chrome.storage.local.get(['shortcuts'], function(result) {
      const shortcuts = result.shortcuts || {};
      if (shortcuts[url]) {
        shortcuts[url] = shortcuts[url].filter(s => s.id !== shortcut.id);
        if (shortcuts[url].length === 0) {
          delete shortcuts[url];
        }
        chrome.storage.local.set({shortcuts: shortcuts}, function() {
          loadShortcuts();
        });
      }
    });
  }
} 