export class TagPicker {
  constructor(container, { availableTags = [], selectedTagIds = [], onChange, onCreateTag, placeholder } = {}) {
    this.container = container;
    this.availableTags = availableTags;
    this.selectedTagIds = [...selectedTagIds];
    this.onChange = onChange || (() => {});
    this.onCreateTag = onCreateTag;
    this.placeholder = placeholder || '输入标签，回车确认';
    this.build();
  }

  build() {
    this.container.innerHTML = '';
    this.root = document.createElement('div');
    this.root.className = 'tag-picker';
    this.container.appendChild(this.root);

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'tag-input-field';
    this.input.placeholder = this.placeholder;
    this.root.appendChild(this.input);

    this.suggestionBox = document.createElement('div');
    this.suggestionBox.className = 'tag-suggestions';
    this.root.appendChild(this.suggestionBox);

    this.bindEvents();
    this.renderSelected();
  }

  bindEvents() {
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
        event.preventDefault();
        this.commitInput();
      } else if (event.key === 'Backspace' && !this.input.value && this.selectedTagIds.length) {
        this.removeTag(this.selectedTagIds[this.selectedTagIds.length - 1]);
      }
    });

    this.input.addEventListener('input', () => {
      this.updateSuggestions();
    });

    this.input.addEventListener('focus', () => {
      this.updateSuggestions();
    });

    this.input.addEventListener('blur', () => {
      setTimeout(() => {
        this.hideSuggestions();
        this.commitInput();
      }, 120);
    });
  }

  updateSuggestions() {
    const query = this.input.value.trim().toLowerCase();
    const candidates = this.availableTags.filter(
      (tag) => !this.selectedTagIds.includes(tag.id) && (!query || tag.name.toLowerCase().includes(query))
    );
    this.suggestionBox.innerHTML = '';
    if (!candidates.length) {
      this.suggestionBox.classList.remove('visible');
      return;
    }
    candidates.slice(0, 6).forEach((tag) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = tag.name;
      button.addEventListener('click', () => {
        this.addTag(tag);
        this.hideSuggestions();
        this.input.focus();
      });
      this.suggestionBox.appendChild(button);
    });
    this.suggestionBox.classList.add('visible');
  }

  hideSuggestions() {
    this.suggestionBox.classList.remove('visible');
  }

  commitInput() {
    const value = this.input.value.trim();
    if (!value) return;
    const existing = this.availableTags.find((tag) => tag.name.toLowerCase() === value.toLowerCase());
    if (existing) {
      this.addTag(existing);
    } else if (this.onCreateTag) {
      const created = this.onCreateTag(value);
      if (created) {
        this.availableTags.push(created);
        this.addTag(created);
      }
    }
    this.input.value = '';
    this.hideSuggestions();
  }

  addTag(tag) {
    if (!tag || this.selectedTagIds.includes(tag.id)) {
      return;
    }
    this.selectedTagIds.push(tag.id);
    this.renderSelected();
    this.onChange(this.selectedTagIds.slice());
  }

  removeTag(tagId) {
    const index = this.selectedTagIds.indexOf(tagId);
    if (index >= 0) {
      this.selectedTagIds.splice(index, 1);
      this.renderSelected();
      this.onChange(this.selectedTagIds.slice());
    }
  }

  renderSelected() {
    this.root.querySelectorAll('.tag-chip').forEach((chip) => chip.remove());
    this.selectedTagIds.forEach((tagId) => {
      const tag = this.availableTags.find((item) => item.id === tagId) || { name: tagId };
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = tag.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.addEventListener('click', () => this.removeTag(tagId));
      chip.appendChild(remove);
      this.root.insertBefore(chip, this.input);
    });
  }

  setAvailableTags(tags) {
    this.availableTags = [...tags];
    this.updateSuggestions();
    this.renderSelected();
  }

  setSelectedTagIds(tagIds) {
    this.selectedTagIds = [...(tagIds || [])];
    this.renderSelected();
  }

  getSelectedTagIds() {
    return this.selectedTagIds.slice();
  }
}
