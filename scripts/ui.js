function ensureRootElement(id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  return el;
}

let activeMenu = null;

export function openMenu(trigger, items) {
  if (!trigger) return () => {};
  closeMenu();
  const menuRoot = ensureRootElement('menu-root');
  const menu = document.createElement('div');
  menu.className = 'context-menu';

  items
    .filter(Boolean)
    .forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      if (item.variant === 'danger') {
        button.style.color = 'var(--danger)';
      }
      if (item.disabled) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
      } else {
        button.addEventListener('click', () => {
          item.onSelect?.();
          closeMenu();
        });
      }
      menu.appendChild(button);
    });

  menuRoot.appendChild(menu);
  const rect = trigger.getBoundingClientRect();
  const { offsetWidth, offsetHeight } = menu;
  let top = rect.bottom + window.scrollY + 8;
  if (top + offsetHeight > window.scrollY + window.innerHeight) {
    top = rect.top + window.scrollY - offsetHeight - 8;
  }
  let left = rect.right + window.scrollX - offsetWidth;
  if (left < 16) {
    left = rect.left + window.scrollX;
  }
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  function handleOutsideClick(event) {
    if (!menu.contains(event.target) && event.target !== trigger) {
      closeMenu();
    }
  }

  function handleKey(event) {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }

  setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKey);
  }, 0);

  activeMenu = {
    element: menu,
    cleanup() {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKey);
    }
  };

  return closeMenu;
}

export function closeMenu() {
  if (activeMenu) {
    activeMenu.cleanup();
    if (activeMenu.element.isConnected) {
      activeMenu.element.remove();
    }
    activeMenu = null;
  }
}

let modalStack = [];

export function openModal({ title, size = 'medium', content, actions = [], closeOnOverlay = true, onClose }) {
  const modalRoot = ensureRootElement('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal-window';
  if (size === 'large') {
    modal.classList.add('large');
  }

  let header;
  if (title) {
    header = document.createElement('div');
    header.className = 'modal-header';
    const heading = document.createElement('h2');
    heading.textContent = title;
    header.appendChild(heading);
    modal.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'modal-body';
  modal.appendChild(body);

  let footer;
  if (actions && actions.length) {
    footer = document.createElement('div');
    footer.className = 'modal-footer';
    modal.appendChild(footer);
  }

  overlay.appendChild(modal);
  modalRoot.appendChild(overlay);

  function renderActions(list) {
    if (!footer) {
      if (!list || !list.length) return;
      footer = document.createElement('div');
      footer.className = 'modal-footer';
      modal.appendChild(footer);
    }
    footer.innerHTML = '';
    list.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      if (action.variant === 'primary') {
        button.className = 'primary-button';
      } else if (action.variant === 'ghost') {
        button.className = 'secondary-button';
      } else {
        button.className = 'secondary-button';
      }
      if (action.disabled) {
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
      }
      button.addEventListener('click', () => {
        action.onClick?.({ close, overlay, modal, body });
      });
      footer.appendChild(button);
    });
  }

  if (actions && actions.length) {
    renderActions(actions);
  }

  function close() {
    overlay.classList.remove('visible');
    setTimeout(() => {
      overlay.remove();
      modalStack = modalStack.filter((entry) => entry !== overlay);
      onClose?.();
    }, 180);
    document.removeEventListener('keydown', handleKeydown);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      if (modalStack[modalStack.length - 1] === overlay) {
        close();
      }
    }
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay && closeOnOverlay) {
      close();
    }
  });

  if (typeof content === 'function') {
    content({ body, close, setActions: renderActions });
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  } else if (typeof content === 'string') {
    body.innerHTML = content;
  }

  setTimeout(() => {
    overlay.classList.add('visible');
    document.addEventListener('keydown', handleKeydown);
  }, 10);

  modalStack.push(overlay);

  return {
    close,
    body,
    overlay,
    modal,
    setActions: renderActions
  };
}
