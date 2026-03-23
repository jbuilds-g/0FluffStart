// ui-logic.js

/* global links:writable, settings, isEditMode, isEditingId:writable, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions, clearHistory */
/* global fetchExternalSuggestions, selectSuggestion, saveBgToDB, getBgFromDB */

// --- NEW STATE ---
let currentFolderId = null; // Tracks if we are inside a folder

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    bindStaticEvents();
    renderLinks();
    loadSettings(); 
    renderEngineDropdown(); 
    updateClock(); 
    setInterval(updateClock, 1000);

    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.focus();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.engine-switcher')) {
            document.getElementById('engineDropdown')?.classList.add('hidden');
        }
        if (!e.target.closest('#searchInput') && !e.target.closest('#suggestionsContainer')) {
            document.getElementById('suggestionsContainer')?.classList.add('hidden');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('settingsModal')?.classList.remove('active');
            document.getElementById('engineDropdown')?.classList.add('hidden');
            document.getElementById('suggestionsContainer')?.classList.add('hidden');
            if(!document.getElementById('linkEditorContainer')?.classList.contains('hidden')) {
                cancelEdit();
            }
        }
    });
});

// --- CSP EVENT BINDING ---
function bindStaticEvents() {
    document.getElementById('settingsToggleBtn').addEventListener('click', toggleSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('settingsModal')) closeModal('settingsModal');
    });

    document.getElementById('engineDropdownBtn').addEventListener('click', toggleEngineDropdown);
    document.getElementById('searchSubmitBtn').addEventListener('click', () => handleSearch({ key: 'Enter', type: 'click', preventDefault: () => {} }));
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSuggestions);
    searchInput.addEventListener('keypress', handleSearch);

    document.getElementById('githubBtn').addEventListener('click', () => window.open('https://github.com/jbuilds-g/0FluffStart', '_blank'));
    
    // Links & Folders Binding
    document.getElementById('addLinkBtn').addEventListener('click', () => openEditor());
    const addFolderBtn = document.getElementById('addFolderBtn');
    if (addFolderBtn) addFolderBtn.addEventListener('click', addFolder);
    
    const activeFolderHeader = document.getElementById('activeFolderHeader');
    if (activeFolderHeader) activeFolderHeader.addEventListener('click', () => navigateToFolder(null));

    document.getElementById('saveLinkBtn').addEventListener('click', saveLink);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    
    // Settings Binding
    document.getElementById('userNameInput').addEventListener('input', autoSaveSettings);
    document.getElementById('themeSelect').addEventListener('change', autoSaveSettings);
    document.getElementById('clockStyleSelect').addEventListener('change', autoSaveSettings);
    
    const showTitlesToggle = document.getElementById('showTitlesToggle');
    if (showTitlesToggle) showTitlesToggle.addEventListener('change', autoSaveSettings);

    const bgInput = document.getElementById('bgImageInput');
    bgInput.addEventListener('change', () => handleImageUpload(bgInput));
    document.getElementById('resetBgBtn').addEventListener('click', clearBackground);

    document.getElementById('externalSuggestToggle').addEventListener('change', autoSaveSettings);
    document.getElementById('historyEnabledToggle').addEventListener('change', autoSaveSettings);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    document.getElementById('backupDataBtn').addEventListener('click', backupData);
    document.getElementById('restoreDataBtn').addEventListener('click', () => document.getElementById('restoreInput').click());
    document.getElementById('restoreInput').addEventListener('change', restoreData);

    document.querySelectorAll('.clock-radio').forEach(radio => {
        radio.addEventListener('change', autoSaveSettings);
    });

    // Tooltips
    document.querySelectorAll('.help-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const textEl = btn.parentElement.nextElementSibling;
            if (textEl && textEl.classList.contains('help-text')) {
                textEl.classList.toggle('show');
                btn.classList.toggle('active');
            }
        });
    });

    // Reset settings
    document.getElementById('resetSettingsBtn').addEventListener('click', () => {
        const warning = "Are you sure? This is going to delete all your preferences in settings. This action cannot be undone.";
        if (confirm(warning)) {
            localStorage.removeItem('0fluff_settings');
            alert("Settings have been reset to default.");
            window.location.reload();
        }
    });
}

// v1.3.1 - Accordion control handled implicitly by right-click logic
function toggleAdvanced() {}

// --- v1.3.0: APPLY CLOCK STYLE LOGIC ---
function applyClockStyle() {
    const clock = document.getElementById('clockDisplay');
    if(clock) {
        clock.className = 'clock'; // Reset
        clock.classList.add(`clock-style-${settings.clockStyle || 'default'}`);
    }
}

// --- FOLDER NAVIGATION & CREATION ---
function navigateToFolder(folderId) {
    currentFolderId = folderId;
    const header = document.getElementById('activeFolderHeader');
    if (header) {
        if (folderId) header.classList.remove('hidden');
        else header.classList.add('hidden');
    }
    renderLinks();
}

function addFolder() {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;
    
    const newFolderId = 'folder_' + Date.now().toString();
    
    // Find links that are NOT folders and are NOT already in a folder
    const rootLinks = links.filter(l => !l.isFolder && !l.parentId);
    
    // Ask if user wants to move existing dashboard links into it
    if (rootLinks.length > 0 && confirm(`Folder '${folderName}' created! Do you want to move any existing dashboard links into it right now?`)) {
        let promptText = "Type the numbers of the links you want to move (comma separated, e.g., 1, 3):\n\n";
        rootLinks.forEach((l, i) => {
            promptText += `${i + 1}: ${l.name}\n`;
        });
        
        const answers = prompt(promptText);
        if (answers) {
            const selectedNums = answers.split(',').map(n => parseInt(n.trim()) - 1);
            selectedNums.forEach(index => {
                if (rootLinks[index]) {
                    const mainIndex = links.findIndex(l => l.id === rootLinks[index].id);
                    if (mainIndex > -1) {
                        links[mainIndex].parentId = newFolderId;
                    }
                }
            });
        }
    }
    
    links.push({
        id: newFolderId,
        name: folderName,
        isFolder: true,
        parentId: currentFolderId
    });
    
    localStorage.setItem('0fluff_links', JSON.stringify(links));
    renderLinks();
    renderLinkManager();
}

// --- BACKUP & RESTORE ---
function backupData() {
    const data = {
        links: JSON.parse(localStorage.getItem('0fluff_links') || '[]'),
        settings: JSON.parse(localStorage.getItem('0fluff_settings') || '{}'),
        history: JSON.parse(localStorage.getItem('0fluff_history') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `0FluffStart_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function restoreData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const rawText = event.target.result;
            const data = JSON.parse(rawText);
            
            if (confirm("This will overwrite your current settings, links, and history. Are you sure?")) {
                
                let linksData = data.links || data['0fluff_links'];
                if (!linksData && Array.isArray(data)) linksData = data; 
                if (linksData) {
                    let parsedLinks = linksData;
                    while(typeof parsedLinks === 'string') { try { parsedLinks = JSON.parse(parsedLinks); } catch(err){break;} }
                    if (Array.isArray(parsedLinks)) localStorage.setItem('0fluff_links', JSON.stringify(parsedLinks));
                }
                
                let settingsData = data.settings || data['0fluff_settings'];
                if (!settingsData && (data.theme || data.userName || data.clockFormat)) settingsData = data;
                if (settingsData) {
                    let importedSettings = settingsData;
                    while(typeof importedSettings === 'string') { try { importedSettings = JSON.parse(importedSettings); } catch(err){break;} }
                    if (typeof importedSettings === 'object' && importedSettings !== null) {
                        const validKeys = ['theme', 'clockStyle', 'userName', 'clockFormat', 'externalSuggest', 'historyEnabled', 'searchEngine', 'showTitles'];
                        const cleanSettings = {};
                        validKeys.forEach(key => { if (importedSettings[key] !== undefined) cleanSettings[key] = importedSettings[key]; });
                        localStorage.setItem('0fluff_settings', JSON.stringify({ ...settings, ...cleanSettings }));
                    }
                }
                
                let historyData = data.history || data['0fluff_history'];
                if (historyData) {
                    let parsedHistory = historyData;
                    while(typeof parsedHistory === 'string') { try { parsedHistory = JSON.parse(parsedHistory); } catch(err){break;} }
                    if (Array.isArray(parsedHistory)) localStorage.setItem('0fluff_history', JSON.stringify(parsedHistory));
                }
                
                alert("Restore successful! Reloading...");
                window.location.reload();
            }
        } catch (err) { alert("Error parsing backup file: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// --- LINKS ---
function renderLinks() {
    const grid = document.getElementById('linkGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    // Toggle show-titles class based on settings
    grid.classList.toggle('show-titles', !!settings.showTitles);

    // Filter by current folder
    const visibleLinks = links.filter(l => (l.parentId || null) === currentFolderId);
    
    const fragment = document.createDocumentFragment();
    visibleLinks.forEach(link => {
        const item = document.createElement('div');
        item.className = 'link-item';
        item.dataset.id = link.id;

        if (link.isFolder) {
            // Folder UI - Minimalist SVG
            item.innerHTML = `
                <div class="link-icon-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <div class="link-name">${link.name}</div>
            `;
            item.addEventListener('click', () => navigateToFolder(link.id));
        } else {
            // Standard Link UI with acronym logic
            const words = link.name.split(' ').filter(w => w.length > 0);
            let acronym = words.map(word => word.charAt(0).toUpperCase()).join('');
            if (words.length === 1 && acronym.length === 1 && link.name.length > 1) acronym = link.name.substring(0, 2).toUpperCase();
            const display = acronym.substring(0, 3);
            
            let fontSize = '1.5rem';
            let letterSpacing = '-1px';
            if (display.length === 1) fontSize = '2rem';
            else if (display.length === 2) fontSize = '1.6rem';
            else { fontSize = '1.2rem'; letterSpacing = '-0.5px'; }

            item.innerHTML = `
                <div class="link-icon-circle">
                    <span style="
                        font-size: ${fontSize}; 
                        color: var(--accent); 
                        font-weight: 800; 
                        letter-spacing: ${letterSpacing};
                        text-shadow: 0 2px 10px rgba(0,0,0,0.2);
                        font-family: var(--font-main);
                    ">${display}</span>
                </div>
                <div class="link-name">${link.name}</div>
            `;
            item.addEventListener('click', () => { window.location.href = link.url.startsWith('http') ? link.url : `https://${link.url}`; });
        }

        // Complete Right-Click Integration applies to both links AND folders
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault(); 
            
            const advContent = document.getElementById('advancedSettings');
            const advBtn = document.getElementById('advancedToggleBtn');
            if(advContent && advBtn) {
                advContent.classList.add('open');
                advBtn.classList.add('active');
            }
            toggleSettings(); 

            const linkListContainer = document.getElementById('linkListContainer');
            if (linkListContainer) {
                const parentDetails = linkListContainer.closest('details');
                if (parentDetails) parentDetails.open = true;
            }
            
            editLink(link.id);
        });

        fragment.appendChild(item);
    });

    // --- Add a physical "+" tile when inside a folder ---
    if (currentFolderId) {
        const addBtnItem = document.createElement('div');
        addBtnItem.className = 'link-item';
        addBtnItem.innerHTML = `
            <div class="link-icon-circle" style="background: transparent; border: 2px dashed var(--dim); display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <div class="link-name" style="color: var(--dim);">Add Link</div>
        `;
        // Clicking this opens settings straight to the "Add Link" menu
        addBtnItem.addEventListener('click', () => {
            toggleSettings(); 
            openEditor();     
        });
        fragment.appendChild(addBtnItem);
    }

    grid.appendChild(fragment);
}

function renderLinkManager() {
    const linkManagerContent = document.getElementById('linkManagerContent');
    if(!linkManagerContent) return;
    linkManagerContent.innerHTML = '';
    
    if (links.length === 0) {
        linkManagerContent.innerHTML = '<div style="color:var(--dim); text-align:center; padding:10px;">No links yet.</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    const editIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
    const deleteIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    
    links.forEach(link => {
        const item = document.createElement('div');
        item.className = 'link-manager-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'link-name';
        // Add a minimalist folder icon prefix if it's a folder
        const folderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
        nameSpan.innerHTML = (link.isFolder ? folderSvg : '') + link.name;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'link-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn secondary';
        editBtn.innerHTML = editIconSVG;
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', (e) => editLink(link.id, e));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete-btn';
        deleteBtn.innerHTML = deleteIconSVG;
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => deleteLink(link.id, e));
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        item.appendChild(nameSpan);
        item.appendChild(actionsDiv);
        fragment.appendChild(item);
    });
    linkManagerContent.appendChild(fragment);
}

function openEditor(id = null) {
    const linkListContainer = document.getElementById('linkListContainer');
    const linkEditorContainer = document.getElementById('linkEditorContainer');
    if (linkListContainer) linkListContainer.classList.add('hidden');
    if (linkEditorContainer) linkEditorContainer.classList.remove('hidden');
    
    const titleEl = document.getElementById('editorTitle');
    const nameInput = document.getElementById('editName');
    const urlInput = document.getElementById('editUrl');
    
    isEditingId = id;
    if (id) {
        const link = links.find(l => l.id === id);
        if(link) {
            if(titleEl) titleEl.innerText = link.isFolder ? "Edit Folder" : "Edit Link";
            if(nameInput) nameInput.value = link.name;
            // Hide URL field if it's a folder
            if(urlInput) {
                if (link.isFolder) {
                    urlInput.style.display = 'none';
                    urlInput.value = '';
                } else {
                    urlInput.style.display = 'block';
                    urlInput.value = link.url || '';
                }
            }
        }
    } else {
        if(titleEl) titleEl.innerText = "Add New Link";
        if(nameInput) nameInput.value = '';
        if(urlInput) {
            urlInput.style.display = 'block';
            urlInput.value = '';
        }
    }
}

function cancelEdit() {
    const linkEditorContainer = document.getElementById('linkEditorContainer');
    const linkListContainer = document.getElementById('linkListContainer');
    if (linkEditorContainer) linkEditorContainer.classList.add('hidden');
    if (linkListContainer) linkListContainer.classList.remove('hidden');
    isEditingId = null;
}

function saveLink() {
    const nameInput = document.getElementById('editName');
    const urlInput = document.getElementById('editUrl');
    if (!nameInput || !urlInput) return;
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!name) return alert("Please fill in the name.");
    
    if (isEditingId) {
        const idx = links.findIndex(l => l.id === isEditingId);
        if (idx > -1) { 
            links[idx].name = name; 
            if (!links[idx].isFolder) links[idx].url = url; 
        }
    } else {
        if (!url) return alert("Please fill in the URL.");
        // Make sure new link respects the current folder
        links.push({ id: Date.now().toString(), name, url, isFolder: false, parentId: currentFolderId });
    }
    localStorage.setItem('0fluff_links', JSON.stringify(links));
    renderLinks(); 
    renderLinkManager(); 
    cancelEdit();        
}

function editLink(id, e) { if(e) e.stopPropagation(); openEditor(id); }

function deleteLink(id, e) {
    if(e) e.stopPropagation();
    if(confirm("Delete this item?")) {
        // Cascade delete: Remove the item AND any children if it was a folder
        links = links.filter(l => l.id !== id && l.parentId !== id);
        localStorage.setItem('0fluff_links', JSON.stringify(links));
        
        // If we deleted the folder we were currently looking inside, return to dashboard
        if (currentFolderId === id) navigateToFolder(null);
        else renderLinks();
        
        renderLinkManager();
    }
}

// --- SETTINGS ---
async function loadSettings() {
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = settings.theme || 'dark';
    
    const clockStyleSelect = document.getElementById('clockStyleSelect');
    if (clockStyleSelect) clockStyleSelect.value = settings.clockStyle || 'default';

    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) userNameInput.value = settings.userName || '';
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) if(r.value === (settings.clockFormat || '24h')) r.checked = true;
    
    const externalSuggestToggle = document.getElementById('externalSuggestToggle');
    if (externalSuggestToggle) externalSuggestToggle.checked = !!settings.externalSuggest;
    
    const historyEnabledToggle = document.getElementById('historyEnabledToggle');
    if (historyEnabledToggle) historyEnabledToggle.checked = settings.historyEnabled !== false;

    const showTitlesToggle = document.getElementById('showTitlesToggle');
    if (showTitlesToggle) showTitlesToggle.checked = !!settings.showTitles;

    document.body.className = settings.theme || 'dark'; 
    applyClockStyle();

    const overlay = document.getElementById('bgOverlay');
    const resetBtn = document.getElementById('resetBgBtn');
    const fileNameInfo = document.getElementById('bgFileName');

    if (settings.backgroundImage === 'indexeddb') {
        try {
            const bgData = await getBgFromDB();
            if (bgData) {
                const url = (bgData instanceof Blob || bgData instanceof File) ? URL.createObjectURL(bgData) : bgData;
                document.body.style.backgroundImage = `url('${url}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
                if(overlay) overlay.style.opacity = '1';
                if(resetBtn) resetBtn.style.display = 'block';
                if(fileNameInfo) fileNameInfo.innerText = "Custom image active";
            } else { settings.backgroundImage = null; autoSaveSettings(); }
        } catch(e) { console.error("Failed to load background from DB:", e); }
    } else {
        document.body.style.backgroundImage = ''; 
        if(overlay) overlay.style.opacity = '0';
        if(resetBtn) resetBtn.style.display = 'none';
        if(fileNameInfo) fileNameInfo.innerText = "No image selected.";
    }
    
    updateClock(); renderEngineDropdown();
}

function autoSaveSettings() {
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) settings.theme = themeSelect.value;
    
    const clockStyleSelect = document.getElementById('clockStyleSelect');
    if (clockStyleSelect) {
        settings.clockStyle = clockStyleSelect.value;
        applyClockStyle();
    }

    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) settings.userName = userNameInput.value.trim();
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) if(r.checked) settings.clockFormat = r.value;
    
    const externalSuggestToggle = document.getElementById('externalSuggestToggle');
    if (externalSuggestToggle) settings.externalSuggest = externalSuggestToggle.checked;
    
    const historyEnabledToggle = document.getElementById('historyEnabledToggle');
    if (historyEnabledToggle) settings.historyEnabled = historyEnabledToggle.checked;
    
    const showTitlesToggle = document.getElementById('showTitlesToggle');
    if (showTitlesToggle) {
        settings.showTitles = showTitlesToggle.checked;
        document.getElementById('linkGrid')?.classList.toggle('show-titles', settings.showTitles);
    }
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    document.body.className = settings.theme;
}

function toggleSettings() { 
    cancelEdit(); renderLinkManager(); 
    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) userNameInput.value = settings.userName;
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) settingsModal.classList.add('active'); 
}
function closeModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active'); 
}

// --- SEARCH ---
function renderEngineDropdown() {
    const dropdown = document.getElementById('engineDropdown');
    if(!dropdown) return;
    dropdown.innerHTML = '';
    const current = searchEngines.find(s => s.name === settings.searchEngine) || searchEngines[0];
    const iconEl = document.getElementById('currentEngineIcon');
    if(iconEl) iconEl.innerText = current.initial;
    
    searchEngines.forEach(e => {
        const div = document.createElement('div');
        div.className = `engine-option ${e.name === settings.searchEngine ? 'selected' : ''}`;
        div.innerHTML = `<span>${e.name}</span> <span>${e.initial}</span>`;
        div.addEventListener('click', () => selectEngine(e.name));
        dropdown.appendChild(div);
    });
}

function toggleEngineDropdown() { 
    const dropdown = document.getElementById('engineDropdown');
    if (dropdown) dropdown.classList.toggle('hidden'); 
}
function selectEngine(name) {
    settings.searchEngine = name;
    autoSaveSettings(); renderEngineDropdown(); toggleEngineDropdown(); 
}

function handleSearch(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        const val = searchInput.value.trim();
        if (!val) return;
        logSearch(val); 
        const engine = searchEngines.find(s => s.name === settings.searchEngine) || searchEngines[0];
        if (val.includes('.') && !val.includes(' ')) { window.location.href = val.startsWith('http') ? val : `https://${val}`; } 
        else { window.location.href = `${engine.url}${encodeURIComponent(val)}`; }
    }
}

function selectSuggestion(suggestion) {
    const inputEl = document.getElementById('searchInput');
    if (inputEl) inputEl.value = suggestion.name;
    if (suggestion.type === 'Link') {
        const finalUrl = suggestion.url.startsWith('http') ? suggestion.url : `https://${suggestion.url}`;
        window.location.href = finalUrl;
    } else {
        const suggestionsContainer = document.getElementById('suggestionsContainer');
        if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
        handleSearch({ key: 'Enter', type: 'synthetic', preventDefault: () => {} });
    }
}

// Exports
window.handleImageUpload = handleImageUpload;
window.clearBackground = clearBackground;
window.renderLinks = renderLinks;
window.renderEngineDropdown = renderEngineDropdown;
window.toggleEngineDropdown = toggleEngineDropdown;
window.selectEngine = selectEngine;
window.openEditor = openEditor;
window.saveLink = saveLink;
window.editLink = editLink;
window.deleteLink = deleteLink;
window.toggleSettings = toggleSettings;
window.closeModal = closeModal;
window.handleSearch = handleSearch;
window.selectSuggestion = selectSuggestion;
window.cancelEdit = cancelEdit;
window.autoSaveSettings = autoSaveSettings;
window.toggleAdvanced = toggleAdvanced;
window.clearHistory = clearHistory;
window.backupData = backupData;
window.restoreData = restoreData;
window.navigateToFolder = navigateToFolder;
window.addFolder = addFolder;
