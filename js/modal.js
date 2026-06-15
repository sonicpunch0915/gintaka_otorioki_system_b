function openModal(imageUrl, altText) {
  var modal = document.getElementById('sample-image-modal');
  var img = document.getElementById('modal-image');
  img.src = imageUrl;
  img.alt = altText || '';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';  // prevent background scroll
  
  // Focus trap
  var closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.focus();
}

function closeModal() {
  var modal = document.getElementById('sample-image-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('modal-image').src = '';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  var modal = document.getElementById('sample-image-modal');
  if (!modal) return;
  
  var closeBtn = document.getElementById('modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  // Close on backdrop click
  var backdrop = modal.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeModal);
  }
  
  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display !== 'none') {
      closeModal();
    }
  });
});
