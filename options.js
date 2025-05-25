// 默认设置
const defaultSettings = {
  showTooltip: true,
  showHighlight: true,
  preventDefault: true
};

// 初始化设置页面
document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置
  loadSettings();
  
  // 绑定事件监听器
  bindEventListeners();
});

// 加载设置
function loadSettings() {
  chrome.storage.local.get(['settings'], function(result) {
    const settings = result.settings || defaultSettings;
    
    // 更新复选框状态
    document.getElementById('showTooltip').checked = settings.showTooltip;
    document.getElementById('showHighlight').checked = settings.showHighlight;
    document.getElementById('preventDefault').checked = settings.preventDefault;
  });
}

// 保存设置
function saveSettings() {
  const settings = {
    showTooltip: document.getElementById('showTooltip').checked,
    showHighlight: document.getElementById('showHighlight').checked,
    preventDefault: document.getElementById('preventDefault').checked
  };
  
  chrome.storage.local.set({settings: settings}, function() {
    showStatusMessage('设置已保存', 'success');
  });
}

// 绑定事件监听器
function bindEventListeners() {
  // 设置变更时自动保存
  document.getElementById('showTooltip').addEventListener('change', saveSettings);
  document.getElementById('showHighlight').addEventListener('change', saveSettings);
  document.getElementById('preventDefault').addEventListener('change', saveSettings);
  
  // 导出配置
  document.getElementById('exportBtn').addEventListener('click', exportSettings);
  
  // 导入配置
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  
  document.getElementById('importFile').addEventListener('change', importSettings);
  
  // 重置设置
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
}

// 导出设置
function exportSettings() {
  chrome.storage.local.get(['shortcuts', 'settings'], function(result) {
    const data = {
      shortcuts: result.shortcuts || {},
      settings: result.settings || defaultSettings,
      version: '1.0.0',
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `webboost-keys-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatusMessage('配置已导出', 'success');
  });
}

// 导入设置
function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      // 验证数据格式
      if (!data.shortcuts || !data.settings) {
        throw new Error('无效的配置文件格式');
      }
      
      // 保存导入的数据
      chrome.storage.local.set({
        shortcuts: data.shortcuts,
        settings: data.settings
      }, function() {
        showStatusMessage('配置已导入', 'success');
        loadSettings(); // 重新加载设置
      });
    } catch (error) {
      showStatusMessage('导入失败：' + error.message, 'error');
    }
  };
  
  reader.readAsText(file);
  event.target.value = ''; // 清除文件选择
}

// 重置设置
function resetSettings() {
  if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
    chrome.storage.local.set({
      shortcuts: {},
      settings: defaultSettings
    }, function() {
      showStatusMessage('设置已重置', 'success');
      loadSettings(); // 重新加载设置
    });
  }
}

// 显示状态消息
function showStatusMessage(message, type) {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + type;
  statusMessage.style.display = 'block';
  
  // 3秒后自动隐藏
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
} 