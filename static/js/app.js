// Global State
let updatesData = [];
let filteredData = [];
const selectedUpdates = new Set();
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const notesGrid = document.getElementById('notesGrid');
const skeletonGrid = document.getElementById('skeletonGrid');
const emptyState = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterGroup = document.getElementById('filterGroup');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusDot = statusIndicator.querySelector('.status-dot');
const statusText = statusIndicator.querySelector('.status-text');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statLastChecked = document.getElementById('statLastChecked');
const statSelected = document.getElementById('statSelected');

// Floating Banner Elements
const actionBanner = document.getElementById('actionBanner');
const bannerText = document.getElementById('bannerText');
const bannerClearBtn = document.getElementById('bannerClearBtn');
const bannerTweetBtn = document.getElementById('bannerTweetBtn');

// Modal Elements
const tweetModal = document.getElementById('tweetModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const tweetTextArea = document.getElementById('tweetTextArea');
const charCount = document.getElementById('charCount');
const sendTweetBtn = document.getElementById('sendTweetBtn');
const progressCircle = document.getElementById('progressCircle');

// Progress Circle setup
const radius = 12;
const circumference = 2 * Math.PI * radius;
if (progressCircle) {
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh Button
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        applyFiltersAndSearch();
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        applyFiltersAndSearch();
    });

    // Category filters
    filterGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        // Update active class
        filterGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentFilter = btn.dataset.filter;
        applyFiltersAndSearch();
    });

    // Reset filters button in empty state
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        currentFilter = 'all';
        filterGroup.querySelectorAll('.filter-btn').forEach(b => {
            if (b.dataset.filter === 'all') b.classList.add('active');
            else b.classList.remove('active');
        });
        applyFiltersAndSearch();
    });

    // Banner buttons
    bannerClearBtn.addEventListener('click', clearAllSelection);
    bannerTweetBtn.addEventListener('click', openMultiTweetComposer);

    // Modal control
    closeModalBtn.addEventListener('click', closeComposer);
    tweetTextArea.addEventListener('input', handleTweetTextChange);
    sendTweetBtn.addEventListener('click', submitTweet);

    // Close modal on outside click
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeComposer();
        }
    });
}

// Fetch data from API
async function fetchReleaseNotes(forceRefresh = false) {
    setLoadingState(true);
    try {
        const url = forceRefresh ? '/api/notes?refresh=true' : '/api/notes';
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const resData = await response.json();
        
        if (resData.status === 'success') {
            updatesData = resData.data;
            updateStats(resData);
            applyFiltersAndSearch();
            showToast('Release notes loaded successfully.', 'success');
            
            // Set status indicator
            statusIndicator.className = 'status-indicator';
            if (resData.source === 'cache') {
                statusText.textContent = 'Synced (Cache)';
            } else {
                statusText.textContent = 'Synced (Fresh)';
            }
        } else {
            throw new Error(resData.message || 'Unknown backend error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast(`Failed to fetch release notes: ${error.message}`, 'error');
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = 'Sync Error';
    } finally {
        setLoadingState(false);
    }
}

// Loading state handling
function setLoadingState(isLoading) {
    if (isLoading) {
        skeletonGrid.classList.remove('hidden');
        notesGrid.classList.add('hidden');
        emptyState.classList.add('hidden');
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        statusIndicator.className = 'status-indicator loading';
        statusText.textContent = 'Syncing...';
    } else {
        skeletonGrid.classList.add('hidden');
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Update App stats
function updateStats(data) {
    statTotal.textContent = data.count || updatesData.length;
    statLastChecked.textContent = data.last_fetched || '-';
}

// Render the updates in the grid
function renderNotes(data) {
    notesGrid.innerHTML = '';
    
    if (data.length === 0) {
        notesGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    notesGrid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    data.forEach(update => {
        const card = document.createElement('article');
        card.className = `note-card ${selectedUpdates.has(update.id) ? 'selected' : ''}`;
        card.setAttribute('data-type', update.type);
        card.setAttribute('data-id', update.id);
        
        // Generate clean plain text preview
        const shareText = cleanTextForShare(update);
        const isSelected = selectedUpdates.has(update.id);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="category-tag">${update.type}</span>
                    <div class="date-badge">
                        <i class="fa-regular fa-calendar"></i>
                        <span>${update.date}</span>
                    </div>
                </div>
                <label class="select-checkbox-container" title="Select to Tweet">
                    <input type="checkbox" class="card-select-checkbox" ${isSelected ? 'checked' : ''}>
                    <span class="custom-checkbox"></span>
                </label>
            </div>
            
            <div class="card-body">
                ${update.html}
            </div>
            
            <div class="card-footer">
                <button class="card-action-btn btn-card-copy" title="Copy text to clipboard">
                    <i class="fa-regular fa-copy"></i>
                    <span>Copy</span>
                </button>
                <button class="card-action-btn btn-card-tweet" title="Tweet about this specific update">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Handle Card Selection (clicking card selection checkbox or body)
        const checkbox = card.querySelector('.card-select-checkbox');
        checkbox.addEventListener('change', (e) => {
            toggleSelect(update.id, card, e.target.checked);
        });

        // Copy button
        card.querySelector('.btn-card-copy').addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(update.text, 'Update text copied to clipboard!');
        });

        // Tweet button
        card.querySelector('.btn-card-tweet').addEventListener('click', (e) => {
            e.stopPropagation();
            openSingleTweetComposer(update);
        });
        
        notesGrid.appendChild(card);
    });
}

// Toggle Selection logic
function toggleSelect(id, cardElement, checked) {
    if (checked) {
        selectedUpdates.add(id);
        cardElement.classList.add('selected');
    } else {
        selectedUpdates.delete(id);
        cardElement.classList.remove('selected');
    }
    
    updateSelectionUI();
}

function clearAllSelection() {
    selectedUpdates.clear();
    // Uncheck all checkboxes and remove classes
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('selected');
        const cb = card.querySelector('.card-select-checkbox');
        if (cb) cb.checked = false;
    });
    updateSelectionUI();
}

function updateSelectionUI() {
    const count = selectedUpdates.size;
    statSelected.textContent = count;
    
    if (count > 0) {
        actionBanner.classList.remove('hidden');
        bannerText.textContent = `${count} update${count > 1 ? 's' : ''} selected`;
    } else {
        actionBanner.classList.add('hidden');
    }
}

// Filter and Search logic combined
function applyFiltersAndSearch() {
    filteredData = updatesData.filter(update => {
        const matchesFilter = currentFilter === 'all' || update.type === currentFilter;
        
        const contentText = (update.text + ' ' + update.date + ' ' + update.type).toLowerCase();
        const matchesSearch = !searchQuery || contentText.includes(searchQuery);
        
        return matchesFilter && matchesSearch;
    });
    
    renderNotes(filteredData);
}

// Cleaning content text and truncating it for preview
function cleanTextForShare(update) {
    let cleanText = update.text;
    // Replace multiple spaces/newlines
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    return cleanText;
}

// Open tweet modal for single update
function openSingleTweetComposer(update) {
    const header = `📢 BigQuery Update: [${update.type}] (${update.date})\n\n`;
    const footer = `\n\nRead more: ${update.link}`;
    
    // Calculate how many characters we have for text
    const overhead = header.length + footer.length;
    const maxTextLen = 280 - overhead - 5; // buffer
    
    let textBody = update.text;
    if (textBody.length > maxTextLen) {
        textBody = textBody.substring(0, maxTextLen - 3) + '...';
    }
    
    const draft = `${header}${textBody}${footer}`;
    
    openComposer(draft);
}

// Open tweet modal for multiple updates
function openMultiTweetComposer() {
    if (selectedUpdates.size === 0) return;
    
    const selectedList = updatesData.filter(u => selectedUpdates.has(u.id));
    
    let draft = `📢 BigQuery Releases Summary (${selectedList.length} updates):\n\n`;
    
    selectedList.forEach(update => {
        let updateText = update.text;
        // Truncate individual items so they fit
        if (updateText.length > 80) {
            updateText = updateText.substring(0, 77) + '...';
        }
        draft += `• [${update.type}] ${updateText}\n`;
    });
    
    // Add link of the latest selected or main release notes URL
    const referenceLink = selectedList[0]?.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    draft += `\nDetails: ${referenceLink}`;
    
    openComposer(draft);
}

// Composer Modal Handling
function openComposer(defaultText) {
    tweetTextArea.value = defaultText;
    tweetModal.classList.remove('hidden');
    handleTweetTextChange();
    tweetTextArea.focus();
}

function closeComposer() {
    tweetModal.classList.add('hidden');
}

function handleTweetTextChange() {
    const text = tweetTextArea.value;
    const len = text.length;
    
    charCount.textContent = `${len}/280`;
    
    // Update progress ring
    const percent = Math.min((len / 280) * 100, 100);
    const offset = circumference - (percent / 100) * circumference;
    
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = offset;
        
        // Color transition based on character count
        if (len > 280) {
            progressCircle.style.stroke = 'var(--color-danger)';
            charCount.className = 'char-count danger';
            sendTweetBtn.disabled = true;
        } else if (len > 250) {
            progressCircle.style.stroke = 'var(--color-warning)';
            charCount.className = 'char-count warning';
            sendTweetBtn.disabled = false;
        } else {
            progressCircle.style.stroke = 'var(--color-primary)';
            charCount.className = 'char-count';
            sendTweetBtn.disabled = false;
        }
    }
}

function submitTweet() {
    const text = tweetTextArea.value;
    if (text.length > 280) {
        showToast("Tweet exceeds the 280 character limit!", "error");
        return;
    }
    
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeComposer();
    showToast("Opening X (Twitter) Share Intent in a new tab.", "info");
}

// Copy to Clipboard Utility
function copyToClipboard(text, successMessage) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => showToast(successMessage, 'success'))
            .catch(err => {
                console.error('Could not copy text: ', err);
                fallbackCopyToClipboard(text, successMessage);
            });
    } else {
        fallbackCopyToClipboard(text, successMessage);
    }
}

function fallbackCopyToClipboard(text, successMessage) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  // Avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast(successMessage, 'success');
        } else {
            showToast('Unable to copy text.', 'error');
        }
    } catch (err) {
        console.error('Fallback copy failed', err);
        showToast('Unable to copy text.', 'error');
    }
    document.body.removeChild(textArea);
}

// Toast Notifications Utility
function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    const toastContainer = document.getElementById('toastContainer');
    toastContainer.appendChild(toast);
    
    // Fade out and remove
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s reverse';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, duration);
}
