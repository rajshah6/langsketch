// js/modal_utilities.js - Custom modal utilities for alerts and confirmations
(function (global) {

  function showCustomConfirm(title, message, onConfirm) {
    const modal = document.getElementById('customConfirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('customConfirmModalConfirmBtn');
    const cancelBtn = document.getElementById('customConfirmModalCancelBtn');
    const closeBtn = document.getElementById('customConfirmModalCloseBtn');

    titleEl.textContent = title;
    messageEl.textContent = message;

    // Remove previous event listeners
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    closeBtn.replaceWith(closeBtn.cloneNode(true));

    // Get fresh references
    const newConfirmBtn = document.getElementById('customConfirmModalConfirmBtn');
    const newCancelBtn = document.getElementById('customConfirmModalCancelBtn');
    const newCloseBtn = document.getElementById('customConfirmModalCloseBtn');

    // Add new event listeners
    newConfirmBtn.addEventListener('click', () => {
      hideCustomConfirm();
      if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener('click', hideCustomConfirm);
    newCloseBtn.addEventListener('click', hideCustomConfirm);

    modal.style.display = 'flex';
  }

  function hideCustomConfirm() {
    const modal = document.getElementById('customConfirmModal');
    modal.style.display = 'none';
  }

  function showCustomAlert(title, message, onOk) {
    const modal = document.getElementById('customAlertModal');
    const titleEl = document.getElementById('alertModalTitle');
    const messageEl = document.getElementById('alertModalMessage');
    const okBtn = document.getElementById('customAlertModalOkBtn');
    const closeBtn = document.getElementById('customAlertModalCloseBtn');

    titleEl.textContent = title;
    messageEl.textContent = message;

    // Remove previous event listeners
    okBtn.replaceWith(okBtn.cloneNode(true));
    closeBtn.replaceWith(closeBtn.cloneNode(true));

    // Get fresh references
    const newOkBtn = document.getElementById('customAlertModalOkBtn');
    const newCloseBtn = document.getElementById('customAlertModalCloseBtn');

    // Add new event listeners
    newOkBtn.addEventListener('click', () => {
      hideCustomAlert();
      if (onOk) onOk();
    });

    newCloseBtn.addEventListener('click', hideCustomAlert);

    modal.style.display = 'flex';
  }

  function hideCustomAlert() {
    const modal = document.getElementById('customAlertModal');
    modal.style.display = 'none';
  }

  // Export functions globally
  global.showCustomConfirm = showCustomConfirm;
  global.hideCustomConfirm = hideCustomConfirm;
  global.showCustomAlert = showCustomAlert;
  global.hideCustomAlert = hideCustomAlert;

  // Also add to App namespace
  global.App = global.App || {};
  global.App.modalUtilities = {
    showCustomConfirm,
    hideCustomConfirm,
    showCustomAlert,
    hideCustomAlert
  };

})(window);