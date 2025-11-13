// popup.js

// DOM refs
const profileSelectEl = document.getElementById('profileSelect');
const addProfileBtn = document.getElementById('addProfile');
const deleteProfileBtn = document.getElementById('deleteProfile');

const renameProfileBtn = document.getElementById('renameProfile');


const groupListEl = document.getElementById('groupList');
const addGroupBtn = document.getElementById('addGroup');

const groupNameInput = document.getElementById('groupName');
const groupLayoutSelect = document.getElementById('groupLayout');
const groupUrlsTextarea = document.getElementById('groupUrls');

const saveGroupBtn = document.getElementById('saveGroup');
const openGroupBtn = document.getElementById('openGroup');
const closeGroupBtn = document.getElementById('closeGroup');

const statusEl = document.getElementById('status');

const profileNameDisplay = document.getElementById('profileNameDisplay');
const profileNameInput = document.getElementById('profileNameInput');


// State
let profiles = [];
let activeProfileId = null;
let activeGroupId = null;

const DEFAULT_URLS = [
  'https://mail.google.com',
  'https://outlook.office.com'
];

function showStatus(message, type = '') {
  statusEl.textContent = message || '';
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

function createProfileId() {
  return 'profile-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

function createGroupId() {
  return 'group-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

function normalizeUrl(u) {
  if (!u) return null;
  let url = u.trim();
  if (!url) return null;

  if (!/^https?:\/\//i.test(url) &&
    !/^chrome:\/\//i.test(url) &&
    !/^mailto:/i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

function getUrlsFromText(text) {
  return text
    .split('\n')
    .map(line => normalizeUrl(line))
    .filter(Boolean);
}

function getActiveProfile() {
  return profiles.find(p => p.id === activeProfileId) || null;
}

function getCurrentGroups() {
  const p = getActiveProfile();
  return p ? p.groups : [];
}

function saveProfiles(callback) {
  chrome.storage.sync.set({ verticalProfilesV2: profiles }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Error saving: ' + chrome.runtime.lastError.message, 'error');
    } else if (callback) {
      callback();
    }
  });
}

/*********************
 * Rendering helpers *
 *********************/

function renderProfileSelector() {
  profileSelectEl.innerHTML = '';

  profiles.forEach(profile => {
    const opt = document.createElement('option');
    opt.value = profile.id;
    opt.textContent = profile.name || 'Untitled profile';
    profileSelectEl.appendChild(opt);
  });

  if (!activeProfileId || !profiles.some(p => p.id === activeProfileId)) {
    activeProfileId = profiles[0].id;
  }

  profileSelectEl.value = activeProfileId;

  // Update inline display
  const active = getActiveProfile();
  profileNameDisplay.textContent = active?.name || '';
}

function renderGroupList() {
  groupListEl.innerHTML = '';

  const groups = getCurrentGroups();

  if (!groups.length) {
    const li = document.createElement('li');
    li.textContent = 'No groups yet.';
    li.style.fontSize = '11px';
    li.style.color = '#6b7280';
    groupListEl.appendChild(li);
    return;
  }

  groups.forEach(group => {
    const li = document.createElement('li');
    li.className = 'group-item' + (group.id === activeGroupId ? ' active' : '');
    li.dataset.id = group.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'group-name';
    nameSpan.textContent = group.name || 'Untitled';

    const actions = document.createElement('div');
    actions.className = 'group-actions';

    const openMini = document.createElement('button');
    openMini.className = 'mini-btn';
    openMini.textContent = 'Open';
    openMini.title = 'Open this group';
    openMini.addEventListener('click', (e) => {
      e.stopPropagation();
      openGroupById(group.id);
    });

    const closeMini = document.createElement('button');
    closeMini.className = 'mini-btn danger';
    closeMini.textContent = '×';
    closeMini.title = 'Close this group’s windows';
    closeMini.addEventListener('click', (e) => {
      e.stopPropagation();
      closeGroupWindows(group.id);
    });

    actions.appendChild(openMini);
    actions.appendChild(closeMini);

    li.appendChild(nameSpan);
    li.appendChild(actions);

    li.addEventListener('click', () => {
      selectGroup(group.id);
    });

    groupListEl.appendChild(li);
  });
}

function renderEditor(group) {
  if (!group) {
    groupNameInput.value = '';
    groupLayoutSelect.value = 'vertical';
    groupUrlsTextarea.value = '';
    return;
  }

  groupNameInput.value = group.name || '';
  groupLayoutSelect.value = group.layout || 'vertical';
  groupUrlsTextarea.value = (group.urls || []).join('\n');
}

/*********************
 * Profile operations *
 *********************/

function addProfile() {
  const newProfile = {
    id: createProfileId(),
    name: 'New profile',
    groups: []
  };
  profiles.push(newProfile);
  activeProfileId = newProfile.id;
  activeGroupId = null;

  saveProfiles(() => {
    renderProfileSelector();
    renderGroupList();
    renderEditor(null);
    showStatus('Profile created', 'ok');
  });
}

function renameActiveProfile() {
  const profile = getActiveProfile();
  if (!profile) {
    showStatus('No active profile.', 'error');
    return;
  }

  const currentName = profile.name || 'Untitled profile';
  const newName = prompt('Profile name:', currentName);

  // User hit Cancel
  if (newName === null) return;

  const trimmed = newName.trim();
  if (!trimmed) {
    showStatus('Name cannot be empty.', 'error');
    return;
  }

  profile.name = trimmed;

  saveProfiles(() => {
    renderProfileSelector();
    // Keep same active profile selected in the dropdown
    profileSelectEl.value = profile.id;
    showStatus('Profile renamed', 'ok');
    setTimeout(() => showStatus(''), 1500);
  });
}


function deleteActiveProfile() {
  if (!activeProfileId) {
    showStatus('No active profile.', 'error');
    return;
  }

  if (profiles.length <= 1) {
    showStatus('Cannot delete the last profile.', 'error');
    return;
  }

  const profile = getActiveProfile();
  const ok = confirm(`Delete profile "${profile.name}" and all its groups?`);
  if (!ok) return;

  profiles = profiles.filter(p => p.id !== activeProfileId);
  activeProfileId = profiles[0]?.id || null;
  activeGroupId = getCurrentGroups()[0]?.id || null;

  saveProfiles(() => {
    renderProfileSelector();
    renderGroupList();
    renderEditor(getCurrentGroups().find(g => g.id === activeGroupId) || null);
    showStatus('Profile deleted', 'ok');
  });
}

/*******************
 * Group operations *
 *******************/

function createNewGroup() {
  const profile = getActiveProfile();
  if (!profile) {
    showStatus('Create a profile first.', 'error');
    return;
  }

  const newGroup = {
    id: createGroupId(),
    name: 'New group',
    layout: 'vertical',
    urls: [],
    windowIds: []
  };

  profile.groups.push(newGroup);
  activeGroupId = newGroup.id;

  saveProfiles(() => {
    renderGroupList();
    renderEditor(newGroup);
    showStatus('New group created', 'ok');
  });
}

function selectGroup(id) {
  activeGroupId = id;
  const group = getCurrentGroups().find(g => g.id === id);
  renderGroupList();
  renderEditor(group || null);
  showStatus('');
}

function saveCurrentGroup() {
  const profile = getActiveProfile();
  if (!profile) {
    showStatus('Create a profile first.', 'error');
    return;
  }

  if (!activeGroupId) {
    showStatus('Create a group first.', 'error');
    return;
  }

  const group = profile.groups.find(g => g.id === activeGroupId);
  if (!group) {
    showStatus('Group not found.', 'error');
    return;
  }

  group.name = groupNameInput.value.trim() || 'Untitled';
  group.layout = groupLayoutSelect.value || 'vertical';
  group.urls = getUrlsFromText(groupUrlsTextarea.value);

  saveProfiles(() => {
    renderGroupList();
    showStatus('Group saved', 'ok');
    setTimeout(() => showStatus(''), 1500);
  });
}

/*********************
 * Open / Close logic *
 *********************/

function openGroupById(groupId) {
  const profile = getActiveProfile();
  if (!profile) {
    showStatus('Create a profile first.', 'error');
    return;
  }

  const group = profile.groups.find(g => g.id === groupId);
  if (!group) {
    showStatus('Group not found.', 'error');
    return;
  }

  if (!group.urls || !group.urls.length) {
    showStatus('Add at least one URL to this group.', 'error');
    return;
  }

  chrome.windows.getCurrent({ populate: false }, (currentWin) => {
    if (!currentWin || typeof currentWin.width !== 'number' || typeof currentWin.height !== 'number') {
      showStatus('Could not detect current window size.', 'error');
      return;
    }

    const totalWidth = currentWin.width;
    const totalHeight = currentWin.height;
    const baseLeft = currentWin.left || 0;
    const baseTop = currentWin.top || 0;

    const count = group.urls.length;
    const layout = group.layout || 'vertical';

    // Reset tracked window IDs
    group.windowIds = [];

    group.urls.forEach((url, index) => {
      let left = baseLeft;
      let top = baseTop;
      let width = totalWidth;
      let height = totalHeight;

      if (layout === 'vertical') {
        // N vertical columns
        const colWidth = Math.max(Math.floor(totalWidth / count), 400);
        left = baseLeft + index * colWidth;
        width = (index === count - 1)
          ? totalWidth - colWidth * (count - 1)
          : colWidth;

      } else if (layout === 'horizontal') {
        // N horizontal rows
        const rowHeight = Math.max(Math.floor(totalHeight / count), 300);
        top = baseTop + index * rowHeight;
        height = (index === count - 1)
          ? totalHeight - rowHeight * (count - 1)
          : rowHeight;

      } else if (layout === 'grid2x2') {
        // 2-column grid (2×2 if count=4; 2×N otherwise)
        const cols = 2;
        const rows = Math.max(1, Math.ceil(count / cols));

        const cellWidth = Math.floor(totalWidth / cols);
        const cellHeight = Math.floor(totalHeight / rows);

        const colIndex = index % cols;
        const rowIndex = Math.floor(index / cols);

        left = baseLeft + colIndex * cellWidth;
        top = baseTop + rowIndex * cellHeight;

        // Last column/row stretch to fill any leftover pixels
        width = (colIndex === cols - 1)
          ? totalWidth - cellWidth * (cols - 1)
          : cellWidth;

        height = (rowIndex === rows - 1)
          ? totalHeight - cellHeight * (rows - 1)
          : cellHeight;
      }

      chrome.windows.create(
        {
          url,
          left,
          top,
          width,
          height,
          focused: index === 0
        },
        (newWin) => {
          if (chrome.runtime.lastError) {
            console.warn('Error creating window:', chrome.runtime.lastError.message);
          } else if (newWin && typeof newWin.id === 'number') {
            group.windowIds.push(newWin.id);
            saveProfiles(); // or saveGroups() in your version
          }
        }
      );
    });

    showStatus(`Opened ${count} windows for “${group.name}”`, 'ok');
  });

}

function closeGroupWindows(groupId) {
  const profile = getActiveProfile();
  if (!profile) {
    showStatus('Create a profile first.', 'error');
    return;
  }

  const group = profile.groups.find(g => g.id === groupId);
  if (!group) {
    showStatus('Group not found.', 'error');
    return;
  }

  const ids = group.windowIds || [];
  if (!ids.length) {
    showStatus('No tracked windows to close for this group.', 'error');
    return;
  }

  ids.forEach((winId) => {
    chrome.windows.remove(winId, () => {
      // Ignore errors (already closed, etc.)
    });
  });

  group.windowIds = [];
  saveProfiles(() => {
    if (groupId === activeGroupId) {
      showStatus(`Closed windows for “${group.name}”`, 'ok');
    }
  });
}

function closeCurrentGroupWindows() {
  if (!activeGroupId) {
    showStatus('Select a group first.', 'error');
    return;
  }
  closeGroupWindows(activeGroupId);
}

/************************
 * Initial load / migrate
 ************************/

function loadInitialProfiles() {
  chrome.storage.sync.get(
    ['verticalProfilesV2', 'verticalMailGroups', 'verticalMailUrls'],
    (result) => {
      const storedProfiles = result.verticalProfilesV2;

      if (Array.isArray(storedProfiles) && storedProfiles.length > 0) {
        profiles = storedProfiles;
      } else {
        // Migrate from old schema: verticalMailGroups or verticalMailUrls
        const legacyGroups = result.verticalMailGroups;
        let groups = [];

        if (Array.isArray(legacyGroups) && legacyGroups.length > 0) {
          groups = legacyGroups;
        } else {
          const legacyUrls = result.verticalMailUrls;
          const initialUrls = Array.isArray(legacyUrls) && legacyUrls.length
            ? legacyUrls
            : DEFAULT_URLS;

          groups = [
            {
              id: createGroupId(),
              name: 'Mail',
              layout: 'vertical',
              urls: initialUrls,
              windowIds: []
            }
          ];
        }

        profiles = [
          {
            id: createProfileId(),
            name: 'Default',
            groups
          }
        ];

        chrome.storage.sync.set({ verticalProfilesV2: profiles });
      }

      if (profiles.length) {
        activeProfileId = profiles[0].id;
        const firstGroups = profiles[0].groups || [];
        activeGroupId = firstGroups[0]?.id || null;
      }

      renderProfileSelector();
      renderGroupList();

      const activeProfile = getActiveProfile();
      const activeGroup = activeProfile?.groups.find(g => g.id === activeGroupId) || null;
      renderEditor(activeGroup);
    }
  );
}

/***************
 * Event hooks *
 ***************/
document.addEventListener('DOMContentLoaded', () => {
  loadInitialProfiles();
});

addProfileBtn.addEventListener('click', () => {
  addProfile();
});

// renameProfileBtn.addEventListener('click', () => {
//   renameActiveProfile();
// });


deleteProfileBtn.addEventListener('click', () => {
  deleteActiveProfile();
});

profileSelectEl.addEventListener('change', () => {
  activeProfileId = profileSelectEl.value || null;
  const groups = getCurrentGroups();
  activeGroupId = groups[0]?.id || null;

  renderGroupList();
  renderEditor(groups.find(g => g.id === activeGroupId));
  const active = getActiveProfile();
  profileNameDisplay.textContent = active?.name || '';
});

// Switch to edit mode when clicking the name
profileNameDisplay.addEventListener('click', () => {
  const active = getActiveProfile();
  if (!active) return;

  profileNameInput.value = active.name || '';
  profileNameDisplay.style.display = 'none';
  profileNameInput.style.display = 'block';
  profileNameInput.focus();
  profileNameInput.select();
});

// Save name on enter or blur
function saveInlineProfileName() {
  const active = getActiveProfile();
  if (!active) return;

  const newName = profileNameInput.value.trim();
  if (!newName) {
    showStatus('Name cannot be empty.', 'error');
    return;
  }

  active.name = newName;

  saveProfiles(() => {
    renderProfileSelector();
    profileNameInput.style.display = 'none';
    profileNameDisplay.style.display = 'block';
    showStatus('Profile renamed', 'ok');
    setTimeout(() => showStatus(''), 1200);
  });
}

profileNameInput.addEventListener('blur', saveInlineProfileName);

profileNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveInlineProfileName();
  if (e.key === 'Escape') {
    profileNameInput.style.display = 'none';
    profileNameDisplay.style.display = 'block';
  }
});


addGroupBtn.addEventListener('click', () => {
  createNewGroup();
});

saveGroupBtn.addEventListener('click', () => {
  saveCurrentGroup();
});

openGroupBtn.addEventListener('click', () => {
  saveCurrentGroup();
  if (activeGroupId) openGroupById(activeGroupId);
});

closeGroupBtn.addEventListener('click', () => {
  closeCurrentGroupWindows();
});
