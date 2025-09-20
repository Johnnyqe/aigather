import { getData, updateData, createId, ensureTag, getProjectById, getTagById, formatDate } from './dataStore.js';
import { TagPicker } from './tagPicker.js';
import { openModal, openMenu, closeMenu } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  new DashboardApp();
});

class DashboardApp {
  constructor() {
    this.data = getData();
    this.state = {
      selectedProjectId: null,
      selectedTagId: null,
      searchTerm: ''
    };
    this.cacheElements();
    this.bindEvents();
    this.renderAll();
  }

  cacheElements() {
    this.projectListEl = document.getElementById('project-list');
    this.tagListEl = document.getElementById('tag-list');
    this.cardsContainer = document.getElementById('cards-container');
    this.viewTitleEl = document.getElementById('view-title');
    this.viewSubtitleEl = document.getElementById('view-subtitle');
    this.searchInput = document.getElementById('search-input');
    this.activeFilterEl = document.getElementById('active-filter');
    this.createProjectBtn = document.getElementById('create-project-btn');
    this.createCardBtn = document.getElementById('create-card-btn');
  }

  bindEvents() {
    this.searchInput.addEventListener('input', (event) => {
      this.setState({ searchTerm: event.target.value.trim() });
    });

    this.createProjectBtn.addEventListener('click', () => this.openCreateProjectModal());
    this.createCardBtn.addEventListener('click', () => this.openCreateCardModal());
  }

  refreshData() {
    this.data = getData();
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.renderCards();
    this.updateActiveFilter();
    this.highlightFilters();
  }

  renderAll() {
    this.refreshData();
    this.renderProjects();
    this.renderTags();
    this.renderCards();
    this.updateActiveFilter();
  }

  createSidebarItem({ name, meta, active, onClick }) {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    if (active) {
      item.classList.add('active');
    }
    item.tabIndex = 0;
    const label = document.createElement('div');
    label.className = 'item-label';
    const nameEl = document.createElement('span');
    nameEl.className = 'item-name';
    nameEl.textContent = name;
    label.appendChild(nameEl);
    if (meta) {
      const metaEl = document.createElement('span');
      metaEl.className = 'item-meta';
      metaEl.textContent = meta;
      label.appendChild(metaEl);
    }
    item.appendChild(label);
    if (onClick) {
      const handle = (event) => {
        onClick(event);
      };
      item.addEventListener('click', handle);
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handle(event);
        }
      });
    }
    return item;
  }

  renderProjects() {
    closeMenu();
    this.projectListEl.innerHTML = '';
    const allItem = this.createSidebarItem({
      name: '所有卡片',
      meta: `${this.data.cards.length} 张`,
      active: !this.state.selectedProjectId,
      onClick: () => this.setState({ selectedProjectId: null })
    });
    this.projectListEl.appendChild(allItem);

    this.data.projects.forEach((project) => {
      const count = this.data.cards.filter((card) => card.projectId === project.id).length;
      const item = this.createSidebarItem({
        name: project.name,
        meta: `${count} 张`,
        active: this.state.selectedProjectId === project.id,
        onClick: () => this.setState({ selectedProjectId: project.id })
      });
      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'icon-button';
      moreBtn.textContent = '⋯';
      moreBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openMenu(moreBtn, [
          {
            label: '修改名称',
            onSelect: () => this.openRenameProjectModal(project)
          }
        ]);
      });
      item.appendChild(moreBtn);
      this.projectListEl.appendChild(item);
    });
  }

  renderTags() {
    this.tagListEl.innerHTML = '';
    if (!this.data.tags.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = '暂无标签';
      this.tagListEl.appendChild(empty);
      return;
    }
    this.data.tags
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
      .forEach((tag) => {
        const count = this.data.cards.filter((card) => card.tags.includes(tag.id)).length;
        const item = this.createSidebarItem({
          name: tag.name,
          meta: `${count} 张`,
          active: this.state.selectedTagId === tag.id,
          onClick: () => {
            const next = this.state.selectedTagId === tag.id ? null : tag.id;
            this.setState({ selectedTagId: next });
          }
        });
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        if (tag.color) {
          badge.style.background = tag.color;
        }
        item.insertBefore(badge, item.firstChild);
        this.tagListEl.appendChild(item);
      });
  }

  renderCards() {
    this.refreshData();
    this.highlightFilters();
    const cards = this.getFilteredCards();
    const hasSearchOrFilter = this.state.selectedTagId || this.state.selectedProjectId || this.state.searchTerm;

    const title = this.state.selectedProjectId
      ? this.data.projects.find((project) => project.id === this.state.selectedProjectId)?.name || '项目'
      : '所有卡片';
    this.viewTitleEl.textContent = title;
    this.viewSubtitleEl.textContent = this.state.selectedProjectId
      ? '聚焦当前项目内的收集卡'
      : '浏览和管理所有收集卡';

    this.cardsContainer.innerHTML = '';

    if (!cards.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = hasSearchOrFilter
        ? '没有找到符合条件的收集卡。尝试调整筛选或搜索关键词。'
        : '当前还没有收集卡，点击右上角的“创建收集卡”开始吧！';
      this.cardsContainer.appendChild(empty);
      return;
    }

    cards.forEach((card) => {
      const cardEl = document.createElement('article');
      cardEl.className = 'card';

      const header = document.createElement('div');
      header.className = 'card-header';

      const titleEl = document.createElement('h3');
      titleEl.className = 'card-title';
      titleEl.textContent = card.title;
      header.appendChild(titleEl);

      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'icon-button';
      moreBtn.textContent = '⋯';
      moreBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openMenu(moreBtn, [
          {
            label: '编辑',
            onSelect: () => this.openEditCardModal(card)
          }
        ]);
      });
      header.appendChild(moreBtn);

      const meta = document.createElement('div');
      meta.className = 'card-meta';
      const project = getProjectById(card.projectId);
      const date = formatDate(card.updatedAt || card.createdAt);
      const projectSpan = document.createElement('span');
      projectSpan.textContent = project ? project.name : '未分配项目';
      const dateSpan = document.createElement('span');
      dateSpan.textContent = `更新：${date}`;
      meta.appendChild(projectSpan);
      meta.appendChild(dateSpan);

      const tagsEl = document.createElement('div');
      tagsEl.className = 'card-tags';
      card.tags.forEach((tagId) => {
        const tag = getTagById(tagId);
        if (!tag) return;
        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.textContent = tag.name;
        tagsEl.appendChild(pill);
      });

      const footer = document.createElement('div');
      footer.className = 'card-footer';
      const link = document.createElement('a');
      link.href = `./card.html?id=${encodeURIComponent(card.id)}`;
      link.textContent = '查看详情';
      link.target = '_blank';
      link.rel = 'noopener';
      footer.appendChild(link);

      cardEl.appendChild(header);
      cardEl.appendChild(meta);
      cardEl.appendChild(tagsEl);
      cardEl.appendChild(footer);
      this.cardsContainer.appendChild(cardEl);
    });
  }

  highlightFilters() {
    const projectItems = this.projectListEl.querySelectorAll('.sidebar-item');
    projectItems.forEach((item) => item.classList.remove('active'));
    if (!this.projectListEl.children.length) return;
    if (!this.state.selectedProjectId) {
      this.projectListEl.children[0].classList.add('active');
    } else {
      Array.from(projectItems)
        .slice(1)
        .forEach((item, index) => {
          const project = this.data.projects[index];
          if (project && project.id === this.state.selectedProjectId) {
            item.classList.add('active');
          }
        });
    }

    Array.from(this.tagListEl.children).forEach((item) => item.classList.remove('active'));
    this.data.tags
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
      .forEach((tag, index) => {
        const child = this.tagListEl.children[index];
        if (child && tag.id === this.state.selectedTagId) {
          child.classList.add('active');
        }
      });
  }

  getFilteredCards() {
    const searchTerm = this.state.searchTerm.toLowerCase();
    return this.data.cards
      .slice()
      .filter((card) => {
        const matchesProject = this.state.selectedProjectId ? card.projectId === this.state.selectedProjectId : true;
        const matchesTag = this.state.selectedTagId ? card.tags.includes(this.state.selectedTagId) : true;
        const matchesSearch = searchTerm ? card.title.toLowerCase().includes(searchTerm) : true;
        return matchesProject && matchesTag && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
  }

  updateActiveFilter() {
    const filters = [];
    if (this.state.selectedProjectId) {
      const project = this.data.projects.find((item) => item.id === this.state.selectedProjectId);
      if (project) filters.push(`项目：${project.name}`);
    }
    if (this.state.selectedTagId) {
      const tag = getTagById(this.state.selectedTagId);
      if (tag) filters.push(`标签：${tag.name}`);
    }
    if (this.state.searchTerm) {
      filters.push(`搜索：“${this.state.searchTerm}”`);
    }

    if (!filters.length) {
      this.activeFilterEl.hidden = true;
      this.activeFilterEl.innerHTML = '';
      return;
    }
    this.activeFilterEl.hidden = false;
    this.activeFilterEl.innerHTML = '';
    const text = document.createElement('span');
    text.textContent = `筛选条件：${filters.join(' · ')}`;
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = '清除';
    clearBtn.addEventListener('click', () => {
      this.setState({ selectedProjectId: null, selectedTagId: null, searchTerm: '' });
      this.searchInput.value = '';
    });
    this.activeFilterEl.appendChild(text);
    this.activeFilterEl.appendChild(clearBtn);
  }

  openCreateProjectModal() {
    const modal = openModal({
      title: '创建新项目',
      content: ({ body, close }) => {
        const form = document.createElement('form');
        const group = document.createElement('div');
        group.className = 'form-group';
        const label = document.createElement('label');
        label.textContent = '项目名称';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '例如：知识库搭建';
        input.required = true;
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '12px';
        actions.style.justifyContent = 'flex-end';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'secondary-button';
        cancelBtn.textContent = '取消';
        cancelBtn.addEventListener('click', () => close());
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'primary-button';
        submitBtn.textContent = '创建';

        group.appendChild(label);
        group.appendChild(input);
        form.appendChild(group);
        actions.appendChild(cancelBtn);
        actions.appendChild(submitBtn);
        form.appendChild(actions);

        input.addEventListener('input', () => {
          submitBtn.disabled = !input.value.trim();
        });
        submitBtn.disabled = true;

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const value = input.value.trim();
          if (!value) return;
          updateData((data) => {
            data.projects.push({ id: createId('project'), name: value });
          });
          this.renderAll();
          close();
        });

        body.appendChild(form);
        setTimeout(() => input.focus(), 50);
      }
    });
    return modal;
  }

  openRenameProjectModal(project) {
    openModal({
      title: '修改项目名称',
      content: ({ body, close }) => {
        const form = document.createElement('form');
        const group = document.createElement('div');
        group.className = 'form-group';
        const label = document.createElement('label');
        label.textContent = '项目名称';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = project.name;
        input.required = true;
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '12px';
        actions.style.justifyContent = 'flex-end';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'secondary-button';
        cancelBtn.textContent = '取消';
        cancelBtn.addEventListener('click', () => close());
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'primary-button';
        submitBtn.textContent = '保存';

        group.appendChild(label);
        group.appendChild(input);
        form.appendChild(group);
        actions.appendChild(cancelBtn);
        actions.appendChild(submitBtn);
        form.appendChild(actions);

        input.addEventListener('input', () => {
          submitBtn.disabled = !input.value.trim() || input.value.trim() === project.name;
        });
        submitBtn.disabled = true;

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const value = input.value.trim();
          if (!value) return;
          updateData((data) => {
            const target = data.projects.find((item) => item.id === project.id);
            if (target) target.name = value;
          });
          this.renderAll();
          close();
        });

        body.appendChild(form);
        setTimeout(() => input.select(), 50);
      }
    });
  }

  openCreateCardModal() {
    const defaultProject = this.state.selectedProjectId;
    const modal = openModal({
      title: '创建新的收集卡',
      size: 'large',
      content: ({ body, close }) => {
        const wrapper = document.createElement('div');
        const urlGroup = document.createElement('div');
        urlGroup.className = 'form-group';
        const urlLabel = document.createElement('label');
        urlLabel.textContent = '来源链接';
        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.placeholder = '粘贴文章、视频或资源链接';
        const analyzeBtn = document.createElement('button');
        analyzeBtn.type = 'button';
        analyzeBtn.className = 'primary-button';
        analyzeBtn.textContent = '分析链接';
        analyzeBtn.style.marginTop = '8px';
        analyzeBtn.style.alignSelf = 'flex-start';
        analyzeBtn.disabled = true;

        const errorBanner = document.createElement('div');
        errorBanner.className = 'error-banner';
        errorBanner.hidden = true;

        const infoSection = document.createElement('div');
        infoSection.style.marginTop = '24px';
        infoSection.hidden = true;

        const infoBanner = document.createElement('div');
        infoBanner.className = 'info-banner';
        infoBanner.textContent = '我们已自动填充关键信息，请确认后保存。';

        const manualBanner = document.createElement('div');
        manualBanner.className = 'error-banner';
        manualBanner.textContent = '无法从此链接自动识别信息，请手动输入。';
        manualBanner.style.marginBottom = '18px';

        const titleGroup = document.createElement('div');
        titleGroup.className = 'form-group';
        const titleLabel = document.createElement('label');
        titleLabel.textContent = '标题';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.placeholder = '输入卡片标题';

        const tagGroup = document.createElement('div');
        tagGroup.className = 'form-group';
        const tagLabel = document.createElement('label');
        tagLabel.textContent = '标签';
        const tagContainer = document.createElement('div');
        tagGroup.appendChild(tagLabel);
        tagGroup.appendChild(tagContainer);

        const projectGroup = document.createElement('div');
        projectGroup.className = 'form-group';
        const projectLabel = document.createElement('label');
        projectLabel.textContent = '归属项目';
        const projectSelect = document.createElement('select');
        this.data.projects.forEach((project) => {
          const option = document.createElement('option');
          option.value = project.id;
          option.textContent = project.name;
          projectSelect.appendChild(option);
        });
        if (defaultProject) {
          projectSelect.value = defaultProject;
        }
        projectGroup.appendChild(projectLabel);
        projectGroup.appendChild(projectSelect);

        const actionRow = document.createElement('div');
        actionRow.style.display = 'flex';
        actionRow.style.justifyContent = 'flex-end';
        actionRow.style.gap = '12px';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'secondary-button';
        cancelBtn.textContent = '取消';
        cancelBtn.addEventListener('click', () => close());
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'primary-button';
        saveBtn.textContent = '保存';
        saveBtn.disabled = true;
        actionRow.appendChild(cancelBtn);
        actionRow.appendChild(saveBtn);

        const tagPicker = new TagPicker(tagContainer, {
          availableTags: this.data.tags,
          selectedTagIds: [],
          onChange: (tagIds) => {
            currentTagIds = tagIds;
            this.toggleSaveAvailability(saveBtn, titleInput.value, currentTagIds);
          },
          onCreateTag: (name) => {
            const created = ensureTag(name);
            this.refreshData();
            tagPicker.setAvailableTags(this.data.tags);
            this.renderTags();
            return created;
          }
        });

        let currentTagIds = [];
        let lastAnalyzedUrl = '';

        titleInput.addEventListener('input', () => {
          this.toggleSaveAvailability(saveBtn, titleInput.value, currentTagIds);
        });

        const commitCard = () => {
          const trimmedTitle = titleInput.value.trim();
          if (!trimmedTitle) return;
          if (!projectSelect.value) return;
          const now = new Date().toISOString();
          const card = {
            id: createId('card'),
            title: trimmedTitle,
            link: urlInput.value.trim(),
            projectId: projectSelect.value,
            tags: currentTagIds,
            createdAt: now,
            updatedAt: now,
            sessions: []
          };
          updateData((data) => {
            data.cards.unshift(card);
          });
          this.renderAll();
          close();
        };

        saveBtn.addEventListener('click', () => {
          commitCard();
        });

        analyzeBtn.addEventListener('click', () => {
          closeMenu();
          if (!urlInput.value.trim()) return;
          if (!this.isValidUrl(urlInput.value.trim())) {
            errorBanner.textContent = '请输入正确的链接地址';
            errorBanner.hidden = false;
            return;
          }
          errorBanner.hidden = true;
          analyzeBtn.disabled = true;
          analyzeBtn.innerHTML = '<span class="loading">分析中</span>';
          urlInput.readOnly = true;
          this.simulateLinkAnalysis(urlInput.value.trim())
            .then((result) => {
              infoSection.hidden = false;
              manualBanner.remove();
              infoSection.prepend(infoBanner);
              titleInput.value = result.title || '';
              const tagIds = this.mapTagNamesToIds(result.tags || []);
              currentTagIds = tagIds;
              tagPicker.setAvailableTags(this.data.tags);
              tagPicker.setSelectedTagIds(tagIds);
              if (result.projectId && this.data.projects.some((p) => p.id === result.projectId)) {
                projectSelect.value = result.projectId;
              } else if (defaultProject) {
                projectSelect.value = defaultProject;
              }
              lastAnalyzedUrl = urlInput.value.trim();
              this.toggleSaveAvailability(saveBtn, titleInput.value, currentTagIds);
            })
            .catch(() => {
              infoSection.hidden = false;
              infoBanner.remove();
              if (!infoSection.contains(manualBanner)) {
                infoSection.prepend(manualBanner);
              }
              titleInput.value = '';
              currentTagIds = [];
              tagPicker.setSelectedTagIds([]);
              this.toggleSaveAvailability(saveBtn, titleInput.value, currentTagIds);
            })
            .finally(() => {
              analyzeBtn.disabled = false;
              analyzeBtn.textContent = '分析链接';
              urlInput.readOnly = false;
            });
        });

        urlInput.addEventListener('input', () => {
          errorBanner.hidden = true;
          analyzeBtn.disabled = !this.isValidUrl(urlInput.value.trim());
          if (urlInput.value.trim() !== lastAnalyzedUrl) {
            infoSection.hidden = true;
            titleInput.value = '';
            currentTagIds = [];
            tagPicker.setSelectedTagIds([]);
            this.toggleSaveAvailability(saveBtn, titleInput.value, currentTagIds);
          }
        });

        urlGroup.appendChild(urlLabel);
        urlGroup.appendChild(urlInput);
        urlGroup.appendChild(analyzeBtn);
        wrapper.appendChild(urlGroup);
        wrapper.appendChild(errorBanner);
        infoSection.appendChild(titleGroup);
        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(titleInput);
        infoSection.appendChild(tagGroup);
        infoSection.appendChild(projectGroup);
        infoSection.appendChild(actionRow);
        wrapper.appendChild(infoSection);
        body.appendChild(wrapper);
      }
    });
    return modal;
  }

  toggleSaveAvailability(button, title, tags) {
    button.disabled = !title.trim() || !tags.length;
  }

  isValidUrl(value) {
    try {
      const url = new URL(value);
      return !!url.protocol && !!url.host;
    } catch (error) {
      return false;
    }
  }

  mapTagNamesToIds(names) {
    const ids = [];
    names.forEach((name) => {
      const existing = this.data.tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        ids.push(existing.id);
      } else {
        const created = ensureTag(name);
        ids.push(created.id);
      }
    });
    this.refreshData();
    this.renderTags();
    return Array.from(new Set(ids));
  }

  simulateLinkAnalysis(url) {
    const samples = [
      {
        matcher: /openai.com\/research\//,
        result: {
          title: 'AI 研究深度解读',
          tags: ['AI', '研究', 'LLM'],
          projectId: 'project-research'
        }
      },
      {
        matcher: /voice-agent/,
        result: {
          title: '语音 Agent 快速搭建手册',
          tags: ['AI', '产品', '笔记'],
          projectId: 'project-product'
        }
      },
      {
        matcher: /dribbble.com/,
        result: {
          title: '视觉灵感精选：暗色模式卡片',
          tags: ['设计', '笔记'],
          projectId: 'project-design'
        }
      }
    ];
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const matched = samples.find((sample) => sample.matcher.test(url));
        if (matched) {
          resolve({ ...matched.result, url });
        } else {
          reject(new Error('分析失败'));
        }
      }, 800);
    });
  }

  openEditCardModal(card) {
    openModal({
      title: '编辑收集卡',
      content: ({ body, close }) => {
        const wrapper = document.createElement('div');
        const titleGroup = document.createElement('div');
        titleGroup.className = 'form-group';
        const titleLabel = document.createElement('label');
        titleLabel.textContent = '标题';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = card.title;
        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(titleInput);

        const tagGroup = document.createElement('div');
        tagGroup.className = 'form-group';
        const tagLabel = document.createElement('label');
        tagLabel.textContent = '标签';
        const tagContainer = document.createElement('div');
        tagGroup.appendChild(tagLabel);
        tagGroup.appendChild(tagContainer);

        const tagPicker = new TagPicker(tagContainer, {
          availableTags: this.data.tags,
          selectedTagIds: card.tags,
          onChange: (ids) => {
            selectedIds = ids;
          },
          onCreateTag: (name) => {
            const created = ensureTag(name);
            this.refreshData();
            tagPicker.setAvailableTags(this.data.tags);
            this.renderTags();
            return created;
          }
        });

        let selectedIds = card.tags.slice();

        const actionRow = document.createElement('div');
        actionRow.style.display = 'flex';
        actionRow.style.justifyContent = 'flex-end';
        actionRow.style.gap = '12px';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'secondary-button';
        cancelBtn.textContent = '取消';
        cancelBtn.addEventListener('click', () => close());
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'primary-button';
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', () => {
          const newTitle = titleInput.value.trim();
          if (!newTitle) return;
          updateData((data) => {
            const target = data.cards.find((item) => item.id === card.id);
            if (target) {
              target.title = newTitle;
              target.tags = selectedIds;
              target.updatedAt = new Date().toISOString();
            }
          });
          this.renderAll();
          close();
        });
        actionRow.appendChild(cancelBtn);
        actionRow.appendChild(saveBtn);

        wrapper.appendChild(titleGroup);
        wrapper.appendChild(tagGroup);
        wrapper.appendChild(actionRow);
        body.appendChild(wrapper);
        setTimeout(() => titleInput.focus(), 50);
      }
    });
  }
}
