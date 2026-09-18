export interface ModalOptions {
  title: string;
  bodyHtml: string;
  size?: 'md' | 'lg' | 'xl';
  onConfirm?: () => Promise<boolean | void> | boolean | void;
  confirmText?: string;
  confirmClass?: string;
  cancelText?: string;
  showFooter?: boolean;
}

export class Modal {
  private static activeModal: HTMLElement | null = null;

  static open(options: ModalOptions): HTMLElement {
    this.close();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = `modal-dialog modal-${options.size || 'md'}`;

    const showFooter = options.showFooter !== false;
    const confirmText = options.confirmText || 'Save';
    const confirmClass = options.confirmClass || 'btn btn-primary';
    const cancelText = options.cancelText || 'Cancel';

    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${options.title}</h3>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        ${options.bodyHtml}
      </div>
      ${
        showFooter
          ? `
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary modal-cancel-btn">${cancelText}</button>
          <button type="button" class="${confirmClass} modal-confirm-btn">${confirmText}</button>
        </div>
      `
          : ''
      }
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    this.activeModal = backdrop;

    // Close handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => this.close());

    const cancelBtn = modal.querySelector('.modal-cancel-btn');
    cancelBtn?.addEventListener('click', () => this.close());

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.close();
      }
    });

    // Confirm handler
    const confirmBtn = modal.querySelector('.modal-confirm-btn');
    if (confirmBtn && options.onConfirm) {
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.setAttribute('disabled', 'true');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = 'Processing...';

        try {
          const result = await options.onConfirm!();
          if (result !== false) {
            this.close();
          }
        } catch (err: unknown) {
          console.error(err);
        } finally {
          confirmBtn.removeAttribute('disabled');
          confirmBtn.textContent = originalText;
        }
      });
    }

    return modal;
  }

  static close() {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  }
}

