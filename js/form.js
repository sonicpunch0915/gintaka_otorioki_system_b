// form.js - 申込みフォームのロジック

function loadNotice() {
  apiGet('getNotice')
    .then(function(res) {
      var noticeSection = document.getElementById('notice-section');
      if (res.data && res.data.notice) {
        noticeSection.textContent = res.data.notice;
        noticeSection.style.display = 'block';
      } else {
        noticeSection.style.display = 'none';
      }
    })
    .catch(function(err) {
      console.error('Failed to load notice:', err);
    });
}

function loadItems() {
  apiGet('getItems')
    .then(function(res) {
      var items = res.data;
      var gridSection = document.getElementById('item-grid-section');
      var grid = document.getElementById('item-grid');
      var emptyMsg = document.getElementById('empty-items-message');
      var form = document.getElementById('reservation-form');
      
      gridSection.style.display = 'block';
      
      if (!items || items.length === 0) {
        emptyMsg.style.display = 'block';
        grid.style.display = 'none';
        form.style.display = 'none';
        return;
      }
      
      emptyMsg.style.display = 'none';
      grid.style.display = 'grid';
      form.style.display = 'block';
      
      grid.innerHTML = '';
      items.forEach(function(item) {
        grid.appendChild(renderItemCard(item));
      });
    })
    .catch(function(err) {
      console.error('Failed to load items:', err);
      document.getElementById('form-error').textContent = '頒布物データの読み込みに失敗しました。時間をおいて再読み込みしてください。';
      document.getElementById('form-error').style.display = 'block';
    });
}

function renderItemCard(item) {
  var isSoldOut = item.stock <= 0;
  
  var card = document.createElement('div');
  card.className = 'item-card';
  if (item.is_new) card.classList.add('is-new');
  if (isSoldOut) card.classList.add('sold-out');
  
  // Checkbox
  var checkboxWrap = document.createElement('div');
  checkboxWrap.className = 'item-checkbox-wrap';
  var checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'item-checkbox';
  checkbox.dataset.itemId = item.item_id;
  checkbox.dataset.title = item.title;
  if (isSoldOut) checkbox.disabled = true;
  checkboxWrap.appendChild(checkbox);
  card.appendChild(checkboxWrap);
  
  // Thumbnail
  var thumbWrap = document.createElement('div');
  thumbWrap.className = 'thumbnail-wrap';
  var img = document.createElement('img');
  img.src = item.thumbnail_path || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="%23eee"/></svg>';
  img.alt = item.title;
  thumbWrap.appendChild(img);
  if (item.sample_image_path) {
    thumbWrap.addEventListener('click', function() {
      openModal(item.sample_image_path, item.title);
    });
  }
  card.appendChild(thumbWrap);
  
  // Details
  var details = document.createElement('div');
  details.className = 'item-details';
  
  var title = document.createElement('div');
  title.className = 'item-title';
  title.textContent = item.title;
  if (item.sample_image_path) {
    title.addEventListener('click', function() {
      openModal(item.sample_image_path, item.title);
    });
  }
  details.appendChild(title);
  
  if (item.price_visible) {
    var price = document.createElement('div');
    price.className = 'item-price';
    price.textContent = item.price + '円';
    details.appendChild(price);
  }
  
  card.appendChild(details);
  
  // Quantity / Sold Out
  var qtyWrap = document.createElement('div');
  qtyWrap.className = 'item-qty-wrap';
  if (isSoldOut) {
    var label = document.createElement('span');
    label.className = 'sold-out-label';
    label.textContent = '品切れ';
    qtyWrap.appendChild(label);
  } else {
    var qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'item-qty';
    qtyInput.min = 1;
    qtyInput.max = item.stock;
    qtyInput.value = 1;
    qtyInput.dataset.itemId = item.item_id;
    qtyWrap.appendChild(qtyInput);
    
    // Checkbox and quantity sync
    card.addEventListener('click', function(e) {
      if (e.target !== checkbox && e.target !== qtyInput && e.target !== img && e.target !== title) {
        checkbox.checked = !checkbox.checked;
      }
    });
  }
  card.appendChild(qtyWrap);
  
  return card;
}

function validateFormClient() {
  var isValid = true;
  
  // Name
  var nameInput = document.getElementById('visitor-name');
  var nameError = document.getElementById('error-visitor-name');
  var nameVal = nameInput.value.trim();
  if (!nameVal || nameVal.length > 50) {
    nameError.textContent = '氏名は50文字以内で入力してください（空白のみは不可）';
    nameError.style.display = 'block';
    isValid = false;
  } else {
    nameError.style.display = 'none';
  }
  
  // Email
  var emailInput = document.getElementById('visitor-email');
  var emailError = document.getElementById('error-visitor-email');
  var emailVal = emailInput.value.trim();
  if (emailVal) {
    var parts = emailVal.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      emailError.textContent = '有効なメールアドレスを入力してください';
      emailError.style.display = 'block';
      isValid = false;
    } else {
      emailError.style.display = 'none';
    }
  } else {
    emailError.style.display = 'none';
  }
  
  // Items
  var formError = document.getElementById('form-error');
  var checkboxes = document.querySelectorAll('.item-checkbox:checked');
  if (checkboxes.length === 0) {
    formError.textContent = '少なくとも1つの頒布物を選択してください';
    formError.style.display = 'block';
    isValid = false;
  } else {
    var qtyError = false;
    checkboxes.forEach(function(cb) {
      var id = cb.dataset.itemId;
      var qtyInput = document.querySelector('.item-qty[data-item-id="' + id + '"]');
      if (qtyInput) {
        var qty = parseInt(qtyInput.value, 10);
        if (isNaN(qty) || qty < 1) {
          qtyError = true;
        }
      }
    });
    if (qtyError) {
      formError.textContent = '数量は1以上を入力してください';
      formError.style.display = 'block';
      isValid = false;
    } else {
      formError.style.display = 'none';
    }
  }
  
  return isValid;
}

function submitReservation(e) {
  e.preventDefault();
  
  if (!validateFormClient()) {
    return;
  }
  
  var submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = '送信中...';
  
  var nameVal = document.getElementById('visitor-name').value.trim();
  var emailVal = document.getElementById('visitor-email').value.trim();
  
  var items = [];
  var checkboxes = document.querySelectorAll('.item-checkbox:checked');
  checkboxes.forEach(function(cb) {
    var id = cb.dataset.itemId;
    var title = cb.dataset.title;
    var qtyInput = document.querySelector('.item-qty[data-item-id="' + id + '"]');
    var qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    items.push({ item_id: id, title: title, qty: qty });
  });
  
  var payload = {
    action: 'submitReservation',
    visitor_name: nameVal,
    visitor_email: emailVal,
    items: items
  };
  
  apiPost(payload)
    .then(function(res) {
      var resultDiv = document.getElementById('submit-result');
      resultDiv.className = 'success';
      var msg = '申込みが完了しました。';
      // もしメール送信に失敗した場合（mail_warning等があれば）
      if (res.mail_warning) {
        msg += '\n※確認メールの送信に失敗しましたが、申込みは受け付けています。';
      }
      resultDiv.innerText = msg;
      resultDiv.style.display = 'block';
      
      document.getElementById('form-error').style.display = 'none';
      submitBtn.textContent = '申込み完了';
      
      // Reset form visually (optional, depending on requirements)
    })
    .catch(function(err) {
      console.error('Submit error:', err);
      
      // もしメール送信失敗がエラーとして返ってきた場合（要件により異なるが、main.gsの実装に依存）
      var resultDiv = document.getElementById('submit-result');
      if (err.code === 'MAIL_SEND_FAILED') {
        resultDiv.className = 'success'; // 申込み自体は成功している
        resultDiv.innerText = '申込みが完了しました。\n※確認メールの送信には失敗しました。';
        resultDiv.style.display = 'block';
        submitBtn.textContent = '申込み完了';
      } else {
        var msg = err.message || 'エラーが発生しました。';
        resultDiv.className = 'error';
        resultDiv.textContent = msg;
        resultDiv.style.display = 'block';
        
        submitBtn.disabled = false;
        submitBtn.textContent = '申し込む';
      }
    });
}

function init() {
  initCsrfToken();
  var loading = document.getElementById('loading-indicator');
  
  // Parallel loading
  Promise.all([
    apiGet('getNotice').catch(function(){ return {}; }),
    apiGet('getItems').catch(function(){ return {data:[]}; })
  ]).then(function(results) {
    loading.style.display = 'none';
    
    var noticeRes = results[0];
    var noticeSection = document.getElementById('notice-section');
    if (noticeRes && noticeRes.data && noticeRes.data.notice) {
      noticeSection.textContent = noticeRes.data.notice;
      noticeSection.style.display = 'block';
    }
    
    var itemsRes = results[1];
    var items = itemsRes.data || [];
    var gridSection = document.getElementById('item-grid-section');
    var grid = document.getElementById('item-grid');
    var emptyMsg = document.getElementById('empty-items-message');
    var form = document.getElementById('reservation-form');
    
    gridSection.style.display = 'block';
    if (items.length === 0) {
      emptyMsg.style.display = 'block';
    } else {
      grid.style.display = 'grid';
      form.style.display = 'block';
      items.forEach(function(item) {
        grid.appendChild(renderItemCard(item));
      });
    }
  });
  
  document.getElementById('reservation-form').addEventListener('submit', submitReservation);
}

document.addEventListener('DOMContentLoaded', init);
