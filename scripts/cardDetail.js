import { getData, updateData, getTagById, ensureTag, createId, formatDate } from './dataStore.js';
import { TagPicker } from './tagPicker.js';
import { openModal } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  new CardDetailPage();
});

class CardDetailPage {
  constructor() {
    this.cardId = new URLSearchParams(window.location.search).get('id');
    this.shell = document.querySelector('.detail-shell');
    this.titleEl = document.getElementById('detail-title');
    this.editTitleBtn = document.getElementById('edit-title-btn');
    this.linkEl = document.getElementById('detail-link');
    this.tagsDisplayEl = document.getElementById('detail-tags');
    this.editTagsBtn = document.getElementById('edit-tags-btn');
    this.detailTagsRow = document.querySelector('.detail-tags-row');
    this.addSessionBtn = document.getElementById('add-session-btn');
    this.sessionListEl = document.getElementById('session-list');

    this.refreshData();
    if (!this.card) {
      this.renderNotFound();
      return;
    }
    this.renderCard();
    this.bindEvents();
  }

  refreshData() {
    this.data = getData();
    this.card = this.data.cards.find((card) => card.id === this.cardId);
  }

  renderNotFound() {
    this.shell.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '找不到这张收集卡，请返回仪表盘。';
    this.shell.appendChild(empty);
  }

  renderCard() {
    document.title = `${this.card.title} · 收集卡详情`;
    this.renderTitle();
    this.renderLink();
    this.renderTagChips();
    this.renderSessions();
  }

  renderTitle() {
    this.titleEl.textContent = this.card.title;
  }

  renderLink() {
    this.linkEl.href = this.card.link;
    this.linkEl.textContent = this.card.link;
  }

  renderTagChips() {
    this.tagsDisplayEl.innerHTML = '';
    if (!this.card.tags.length) {
      const empty = document.createElement('span');
      empty.className = 'muted';
      empty.textContent = '未添加标签';
      this.tagsDisplayEl.appendChild(empty);
      return;
    }
    this.card.tags.forEach((tagId) => {
      const tag = getTagById(tagId);
      if (!tag) return;
      const chip = document.createElement('span');
      chip.className = 'tag-pill';
      chip.textContent = tag.name;
      this.tagsDisplayEl.appendChild(chip);
    });
  }

  renderSessions() {
    this.sessionListEl.innerHTML = '';
    if (!this.card.sessions.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '还没有会话内容，点击右上角的“添加新会话”开始记录。';
      this.sessionListEl.appendChild(empty);
      return;
    }

    this.card.sessions
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .forEach((session) => {
        const item = document.createElement('div');
        item.className = 'session-item';

        const header = document.createElement('div');
        header.className = 'session-header';
        const meta = document.createElement('span');
        meta.textContent = `更新于 ${this.formatDateTime(session.updatedAt)}`;
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'secondary-button';
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', () => this.openSessionEditor(session));
        header.appendChild(meta);
        header.appendChild(editBtn);

        const content = document.createElement('div');
        content.className = 'session-content';
        content.innerHTML = session.content;

        item.appendChild(header);
        item.appendChild(content);
        this.sessionListEl.appendChild(item);
      });
  }

  bindEvents() {
    this.editTitleBtn.addEventListener('click', () => this.startTitleEditing());
    this.editTagsBtn.addEventListener('click', () => this.startTagEditing());
    this.addSessionBtn.addEventListener('click', () => this.openSessionEditor());
    this.linkEl.addEventListener('click', () => {
      this.linkEl.classList.add('visited');
    });
  }

  startTitleEditing() {
    if (this.titleEditing) return;
    this.titleEditing = true;
    this.titleEl.contentEditable = 'true';
    this.titleEl.classList.add('editing');
    const range = document.createRange();
    range.selectNodeContents(this.titleEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    this.titleEl.focus();

    const handleBlur = () => {
      commit();
    };

    const handleKey = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    };

    const cleanup = () => {
      this.titleEl.contentEditable = 'false';
      this.titleEl.classList.remove('editing');
      this.titleEl.removeEventListener('blur', handleBlur);
      this.titleEl.removeEventListener('keydown', handleKey);
      this.titleEditing = false;
    };

    const commit = () => {
      const nextTitle = this.titleEl.textContent.trim();
      cleanup();
      if (!nextTitle) {
        this.renderTitle();
        return;
      }
      if (nextTitle === this.card.title) {
        this.renderTitle();
        return;
      }
      updateData((data) => {
        const target = data.cards.find((item) => item.id === this.cardId);
        if (target) {
          target.title = nextTitle;
          target.updatedAt = new Date().toISOString();
        }
      });
      this.refreshData();
      this.renderTitle();
    };

    const cancel = () => {
      cleanup();
      this.renderTitle();
    };

    this.titleEl.addEventListener('blur', handleBlur);
    this.titleEl.addEventListener('keydown', handleKey);
  }

  startTagEditing() {
    if (this.tagEditorWrapper) {
      return;
    }
    this.tagsDisplayEl.hidden = true;
    this.tagEditorWrapper = document.createElement('div');
    this.tagEditorWrapper.className = 'tag-editor-panel';
    const pickerHost = document.createElement('div');
    this.tagEditorWrapper.appendChild(pickerHost);
    const helper = document.createElement('p');
    helper.className = 'muted';
    helper.textContent = '输入后回车创建新标签，修改会立即保存。';
    this.tagEditorWrapper.appendChild(helper);
    const actionRow = document.createElement('div');
    actionRow.className = 'inline-actions';
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'secondary-button';
    doneBtn.textContent = '完成';
    doneBtn.addEventListener('click', () => this.finishTagEditing());
    actionRow.appendChild(doneBtn);
    this.tagEditorWrapper.appendChild(actionRow);
    this.detailTagsRow.appendChild(this.tagEditorWrapper);

    this.tagPicker = new TagPicker(pickerHost, {
      availableTags: this.data.tags,
      selectedTagIds: this.card.tags,
      onChange: (ids) => {
        updateData((data) => {
          const target = data.cards.find((item) => item.id === this.cardId);
          if (target) {
            target.tags = ids;
            target.updatedAt = new Date().toISOString();
          }
        });
        this.refreshData();
        this.renderTagChips();
      },
      onCreateTag: (name) => {
        const created = ensureTag(name);
        this.refreshData();
        this.tagPicker.setAvailableTags(this.data.tags);
        return created;
      }
    });
  }

  finishTagEditing() {
    if (!this.tagEditorWrapper) return;
    this.tagEditorWrapper.remove();
    this.tagEditorWrapper = null;
    this.tagPicker = null;
    this.tagsDisplayEl.hidden = false;
    this.renderTagChips();
  }

  openSessionEditor(session) {
    const isEditing = Boolean(session);
    const modal = openModal({
      title: isEditing ? '编辑会话' : '添加新会话',
      size: 'large',
      content: ({ body, setActions, close }) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'editor-wrapper';
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        const editor = document.createElement('div');
        editor.className = 'editor-area';
        editor.contentEditable = 'true';
        editor.innerHTML = session ? session.content : '<p></p>';
        editor.addEventListener('input', () => editor.classList.remove('error'));

        const actions = [
          { label: '加粗', command: 'bold' },
          { label: '斜体', command: 'italic' },
          { label: '引用', command: 'formatBlock', value: 'blockquote' },
          { label: '项目符号', command: 'insertUnorderedList' },
          { label: '编号列表', command: 'insertOrderedList' },
          { label: '代码块', command: 'formatBlock', value: 'pre' }
        ];

        actions.forEach((item) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = item.label;
          button.addEventListener('click', () => {
            editor.focus();
            document.execCommand(item.command, false, item.value || null);
          });
          toolbar.appendChild(button);
        });

        wrapper.appendChild(toolbar);
        wrapper.appendChild(editor);
        body.appendChild(wrapper);

        setTimeout(() => editor.focus(), 50);

        setActions([
          {
            label: '取消',
            variant: 'ghost',
            onClick: () => close()
          },
          {
            label: '保存',
            variant: 'primary',
            onClick: () => {
              const html = editor.innerHTML.trim();
              if (!html) {
                editor.classList.add('error');
                return;
              }
              updateData((data) => {
                const targetCard = data.cards.find((item) => item.id === this.cardId);
                if (!targetCard) return;
                const timestamp = new Date().toISOString();
                if (session) {
                  const targetSession = targetCard.sessions.find((item) => item.id === session.id);
                  if (targetSession) {
                    targetSession.content = html;
                    targetSession.updatedAt = timestamp;
                  }
                } else {
                  targetCard.sessions.unshift({
                    id: createId('session'),
                    content: html,
                    updatedAt: timestamp
                  });
                }
                targetCard.updatedAt = timestamp;
              });
              this.refreshData();
              this.renderSessions();
              close();
            }
          }
        ]);
      }
    });
    return modal;
  }

  formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return `${formatDate(value)} ${time}`;
  }
}
