export type ToastType = 'success' | 'error' | 'warning' | 'info';

export class Toast {
  private static container: HTMLElement | null = null;

  private static getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  static show(message: string, type: ToastType = 'info', duration: number = 4000) {
    const container = this.getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons: Record<ToastType, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" type="button" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close')!;
    closeBtn.addEventListener('click', () => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  static success(msg: string) {
    this.show(msg, 'success');
  }

  static error(msg: string) {
    this.show(msg, 'error', 6000);
  }

  static warning(msg: string) {
    this.show(msg, 'warning');
  }

  static info(msg: string) {
    this.show(msg, 'info');
  }
}

