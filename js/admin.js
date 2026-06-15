// admin.js - 管理画面ロジック

// -----------------------------------------------------------------------
// 状態管理
// -----------------------------------------------------------------------
var currentReservationsPage = 1;
var totalReservationsPages = 1;

// -----------------------------------------------------------------------
// 認証
// -----------------------------------------------------------------------
function initAuth() {
  if (sessionStorage.getItem('authToken')) {
    showDashboard();
  } else {
    showLoginSection();
  }
}

function showLoginSection() {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('admin-dashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  switchTab('items');
}

function handleLogin() {
  var pwdInput = document.getElementById('login-password');
  var errorMsg = document.getElementById('login-error');
  var btn = document.getElementById('login-btn');
  
  var pwd = pwdInput.value;
  if (!pwd) return;
  
  btn.disabled = true;
  btn.textContent = 'ログイン中...';
  
  apiPost({ action: 'login', password: pwd })
    .then(function(res) {
      if (res.data && res.data.token) {
        sessionStorage.setItem('authToken', res.data.token);
        pwdInput.value = '';
        errorMsg.textContent = '';
        showDashboard();
      }
    })
    .catch(function(err) {
      errorMsg.textContent = err.message || 'ログインに失敗しました';
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = 'ログイン';
    });
}

function handleLogout() {
  apiPost({ action: 'logout' }).catch(function(){});
  sessionStorage.removeItem('authToken');
  showLoginSection();
  history.replaceState(null, '', location.pathname);
}

// -----------------------------------------------------------------------
// タブ遷移
// -----------------------------------------------------------------------
function switchTab(tabName) {
  var tabs = ['items', 'reservations', 'notice'];
  
  tabs.forEach(function(t) {
    document.getElementById('tab-' + t).classList.remove('active');
    document.getElementById('panel-' + t).style.display = 'none';
  });
  
  document.getElementById('tab-' + tabName).classList.add('active');
  document.getElementById('panel-' + tabName).style.display = 'block';
  
  if (tabName === 'items') {
    loadAdminItems();
  } else if (tabName === 'reservations') {
    loadReservations(1);
  } else if (tabName === 'notice') {
    loadNoticeEditor();
  }
}

// -----------------------------------------------------------------------
// 頒布物管理
// -----------------------------------------------------------------------
function loadAdminItems() {
  var tbody = document.getElementById('item-list');
  tbody.innerHTML = '<tr><td colspan="7">読み込み中...</td></tr>';
  
  apiGet('getAdminItems')
    .then(function(res) {
      tbody.innerHTML = '';
      if (!res.data || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">頒布物が登録されていません</td></tr>';
        return;
      }
      res.data.forEach(function(item) {
        tbody.appendChild(renderItemRow(item));
      });
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="7" class="error-message">読み込みエラー: ' + (err.message || '') + '</td></tr>';
    });
}

function renderItemRow(item) {
  var tr = document.createElement('tr');
  
  // Thumbnail
  var tdThumb = document.createElement('td');
  tdThumb.className = 'thumbnail-cell';
  var img = document.createElement('img');
  img.src = item.thumbnail_path || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23eee"/></svg>';
  tdThumb.appendChild(img);
  tr.appendChild(tdThumb);
  
  // Title
  var tdTitle = document.createElement('td');
  tdTitle.textContent = item.title;
  tr.appendChild(tdTitle);
  
  // Price
  var tdPrice = document.createElement('td');
  tdPrice.textContent = item.price;
  tr.appendChild(tdPrice);
  
  // Stock
  var tdStock = document.createElement('td');
  tdStock.textContent = item.stock;
  tr.appendChild(tdStock);
  
  // is_new
  var tdNew = document.createElement('td');
  tdNew.textContent = item.is_new ? '🌸' : '-';
  tr.appendChild(tdNew);
  
  // price_visible
  var tdVis = document.createElement('td');
  tdVis.textContent = item.price_visible ? '👁' : '-';
  tr.appendChild(tdVis);
  
  // Actions
  var tdAct = document.createElement('td');
  var divAct = document.createElement('div');
  divAct.className = 'action-btns';
  
  var btnEdit = document.createElement('button');
  btnEdit.className = 'btn-edit';
  btnEdit.textContent = '編集';
  btnEdit.addEventListener('click', function() {
    showItemForm(item);
  });
  
  var btnDel = document.createElement('button');
  btnDel.className = 'btn-delete';
  btnDel.textContent = '削除';
  btnDel.addEventListener('click', function() {
    handleItemDelete(item.item_id, item.title);
  });
  
  divAct.appendChild(btnEdit);
  divAct.appendChild(btnDel);
  tdAct.appendChild(divAct);
  
  tr.appendChild(tdAct);
  return tr;
}

function showItemForm(item) {
  document.getElementById('item-form-section').style.display = 'block';
  var form = document.getElementById('item-form');
  form.reset();
  
  if (item) {
    document.getElementById('item-edit-id').value = item.item_id;
    document.getElementById('item-title').value = item.title;
    document.getElementById('item-price').value = item.price;
    document.getElementById('item-stock').value = item.stock;
    document.getElementById('item-description').value = item.description || '';
    document.getElementById('item-is-new').checked = !!item.is_new;
    document.getElementById('item-price-visible').checked = !!item.price_visible;
    document.getElementById('item-save-btn').textContent = '更新';
  } else {
    document.getElementById('item-edit-id').value = '';
    document.getElementById('item-save-btn').textContent = '登録';
    document.getElementById('item-price-visible').checked = true;
  }
}

function hideItemForm() {
  document.getElementById('item-form-section').style.display = 'none';
  document.getElementById('item-form').reset();
  document.getElementById('item-edit-id').value = '';
}

function readFileAsBase64(file) {
  return new Promise(function(resolve, reject) {
    if (!file) {
      resolve(null);
      return;
    }
    var reader = new FileReader();
    reader.onload = function() {
      resolve(reader.result); // Includes 'data:image/jpeg;base64,...'
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleItemSave(e) {
  e.preventDefault();
  
  var title = document.getElementById('item-title').value.trim();
  if (!title) return;
  
  var price = parseInt(document.getElementById('item-price').value, 10) || 0;
  var stock = parseInt(document.getElementById('item-stock').value, 10) || 0;
  var description = document.getElementById('item-description').value;
  var isNew = document.getElementById('item-is-new').checked;
  var isPriceVis = document.getElementById('item-price-visible').checked;
  
  var thumbFile = document.getElementById('item-thumbnail').files[0];
  var sampleFile = document.getElementById('item-sample').files[0];
  
  if (thumbFile && thumbFile.size > 1 * 1024 * 1024) {
    alert('サムネイルは1MB以下にしてください');
    return;
  }
  if (sampleFile && sampleFile.size > 5 * 1024 * 1024) {
    alert('サンプル画像は5MB以下にしてください');
    return;
  }
  
  var btn = document.getElementById('item-save-btn');
  btn.disabled = true;
  btn.textContent = '保存中...';
  
  Promise.all([
    readFileAsBase64(thumbFile),
    readFileAsBase64(sampleFile)
  ]).then(function(results) {
    var payload = {
      title: title,
      price: price,
      stock: stock,
      description: description,
      is_new: isNew,
      price_visible: isPriceVis
    };
    
    if (results[0]) payload.thumbnail_base64 = results[0];
    if (results[1]) payload.sample_base64 = results[1];
    
    var editId = document.getElementById('item-edit-id').value;
    if (editId) {
      payload.action = 'updateItem';
      payload.item_id = editId;
    } else {
      payload.action = 'createItem';
    }
    
    return apiPost(payload);
  }).then(function() {
    hideItemForm();
    loadAdminItems();
  }).catch(function(err) {
    alert('エラー: ' + (err.message || '保存に失敗しました'));
  }).finally(function() {
    btn.disabled = false;
    btn.textContent = document.getElementById('item-edit-id').value ? '更新' : '登録';
  });
}

function handleItemDelete(itemId, title) {
  showConfirmDialog('頒布物「' + title + '」を削除しますか？\n（物理削除されます）')
    .then(function(confirmed) {
      if (!confirmed) return;
      apiPost({ action: 'deleteItem', item_id: itemId })
        .then(function() {
          loadAdminItems();
        })
        .catch(function(err) {
          alert('エラー: ' + (err.message || '削除に失敗しました'));
        });
    });
}

// -----------------------------------------------------------------------
// 申込み一覧
// -----------------------------------------------------------------------
function loadReservations(page) {
  var tbody = document.getElementById('reservation-list');
  var emptyMsg = document.getElementById('reservation-empty');
  var table = document.getElementById('reservations-table');
  var pagination = document.getElementById('pagination');
  
  tbody.innerHTML = '<tr><td colspan="5">読み込み中...</td></tr>';
  emptyMsg.style.display = 'none';
  
  apiGet('getReservations', { page: page, limit: 20 })
    .then(function(res) {
      tbody.innerHTML = '';
      if (!res.data || !res.data.reservations || res.data.reservations.length === 0) {
        table.style.display = 'none';
        emptyMsg.style.display = 'block';
        pagination.innerHTML = '';
        return;
      }
      
      table.style.display = 'table';
      emptyMsg.style.display = 'none';
      
      res.data.reservations.forEach(function(resItem) {
        tbody.appendChild(renderReservationRow(resItem));
      });
      
      currentReservationsPage = res.data.page;
      totalReservationsPages = res.data.totalPages;
      renderPagination(currentReservationsPage, totalReservationsPages);
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="5" class="error-message">読み込みエラー: ' + (err.message || '') + '</td></tr>';
    });
}

function formatDate(isoString) {
  if (!isoString) return '';
  var d = new Date(isoString);
  var pad = function(n) { return n < 10 ? '0' + n : n; };
  return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function renderReservationRow(res) {
  var tr = document.createElement('tr');
  
  // Name
  var tdName = document.createElement('td');
  tdName.textContent = res.visitor_name;
  tr.appendChild(tdName);
  
  // Items
  var tdItems = document.createElement('td');
  var ul = document.createElement('ul');
  ul.style.listStyleType = 'none';
  ul.style.padding = '0';
  ul.style.margin = '0';
  (res.items || []).forEach(function(it) {
    var li = document.createElement('li');
    li.textContent = it.title + ' ×' + it.qty;
    ul.appendChild(li);
  });
  tdItems.appendChild(ul);
  tr.appendChild(tdItems);
  
  // Email
  var tdEmail = document.createElement('td');
  tdEmail.textContent = res.visitor_email || '-';
  tr.appendChild(tdEmail);
  
  // Date
  var tdDate = document.createElement('td');
  tdDate.textContent = formatDate(res.submitted_at);
  tr.appendChild(tdDate);
  
  // Actions
  var tdAct = document.createElement('td');
  var btnDel = document.createElement('button');
  btnDel.className = 'btn-delete';
  btnDel.textContent = '削除';
  btnDel.addEventListener('click', function() {
    handleReservationDelete(res.reservation_id, res.visitor_name);
  });
  tdAct.appendChild(btnDel);
  tr.appendChild(tdAct);
  
  return tr;
}

function renderPagination(page, total) {
  var container = document.getElementById('pagination');
  container.innerHTML = '';
  
  var prevBtn = document.createElement('button');
  prevBtn.textContent = '前へ';
  prevBtn.disabled = (page <= 1);
  prevBtn.addEventListener('click', function() { loadReservations(page - 1); });
  
  var span = document.createElement('span');
  span.textContent = page + ' / ' + total;
  
  var nextBtn = document.createElement('button');
  nextBtn.textContent = '次へ';
  nextBtn.disabled = (page >= total);
  nextBtn.addEventListener('click', function() { loadReservations(page + 1); });
  
  container.appendChild(prevBtn);
  container.appendChild(span);
  container.appendChild(nextBtn);
}

function handleReservationDelete(resId, name) {
  showConfirmDialog(name + ' 様の申込みを削除しますか？\n（論理削除されます）')
    .then(function(confirmed) {
      if (!confirmed) return;
      apiPost({ action: 'deleteReservation', reservation_id: resId })
        .then(function() {
          loadReservations(currentReservationsPage);
        })
        .catch(function(err) {
          alert('エラー: ' + (err.message || '削除に失敗しました'));
        });
    });
}

// -----------------------------------------------------------------------
// 連絡事項エディタ
// -----------------------------------------------------------------------
function loadNoticeEditor() {
  var textarea = document.getElementById('notice-textarea');
  var counter = document.getElementById('notice-char-count');
  
  apiGet('getNotice')
    .then(function(res) {
      var text = (res.data && res.data.notice) ? res.data.notice : '';
      textarea.value = text;
      counter.textContent = text.length + '/1000';
    })
    .catch(function(err) {
      alert('連絡事項の取得に失敗しました');
    });
}

function handleNoticeSave() {
  var textarea = document.getElementById('notice-textarea');
  var text = textarea.value;
  var btn = document.getElementById('notice-save-btn');
  
  if (text.length > 1000) {
    alert('1000文字以内で入力してください');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '保存中...';
  
  apiPost({ action: 'updateNotice', notice_text: text })
    .then(function() {
      alert('連絡事項を保存しました');
    })
    .catch(function(err) {
      alert('保存エラー: ' + (err.message || ''));
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = '保存';
    });
}

// -----------------------------------------------------------------------
// 確認ダイアログ
// -----------------------------------------------------------------------
function showConfirmDialog(message) {
  return new Promise(function(resolve) {
    var dialog = document.getElementById('confirm-dialog');
    var msgEl = document.getElementById('confirm-message');
    var btnOk = document.getElementById('confirm-ok');
    var btnCancel = document.getElementById('confirm-cancel');
    
    msgEl.textContent = message;
    dialog.style.display = 'flex';
    
    var cleanup = function() {
      dialog.style.display = 'none';
      btnOk.removeEventListener('click', onOk);
      btnCancel.removeEventListener('click', onCancel);
    };
    
    var onOk = function() { cleanup(); resolve(true); };
    var onCancel = function() { cleanup(); resolve(false); };
    
    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
  });
}

// -----------------------------------------------------------------------
// 初期化
// -----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
  initCsrfToken();
  
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('login-password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleLogin();
  });
  
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  document.getElementById('tab-items').addEventListener('click', function(){ switchTab('items'); });
  document.getElementById('tab-reservations').addEventListener('click', function(){ switchTab('reservations'); });
  document.getElementById('tab-notice').addEventListener('click', function(){ switchTab('notice'); });
  
  document.getElementById('add-item-btn').addEventListener('click', function() { showItemForm(null); });
  document.getElementById('item-cancel-btn').addEventListener('click', hideItemForm);
  document.getElementById('item-form').addEventListener('submit', handleItemSave);
  
  var noticeTextarea = document.getElementById('notice-textarea');
  noticeTextarea.addEventListener('input', function() {
    document.getElementById('notice-char-count').textContent = this.value.length + '/1000';
  });
  document.getElementById('notice-save-btn').addEventListener('click', handleNoticeSave);
  
  initAuth();
});
