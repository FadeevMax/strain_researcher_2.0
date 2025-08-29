// DOM elements
const searchForm = document.getElementById('search-form');
const strainInput = document.getElementById('strain-input');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');
const suggestionsContainer = document.getElementById('suggestions-container');
const suggestionBtns = document.querySelectorAll('.suggestion-btn');
const loadingOverlay = document.getElementById('loading-overlay');

// Chat state
let isTyping = false;
let conversationHistory = [];
let rawResponse = ''; // Store raw markdown response from Perplexity

// Add after the existing global variables
let isResultsView = false;

// Add global variables to store strain data for image generation:
let currentPhysicalCharacteristics = '';
let currentStrainName = '';
let currentHybridization = '';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Add event listeners
    searchForm.addEventListener('submit', handleSearch);
    
    // Add suggestion button listeners
    suggestionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const strain = this.getAttribute('data-strain');
            searchStrain(strain);
        });
    });
    
    // Focus on input
    strainInput.focus();
    
    // Add enter key listener for better UX
    strainInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch(e);
        }
    });
}

// Add this function after initializeApp()
function toggleResultsView(show) {
    isResultsView = show;
    const header = document.querySelector('.header');
    const mainContent = document.querySelector('.main-content');
    const chatContainer = document.getElementById('chat-container');
    const logo = document.querySelector('.logo');
    
    if (show) {
        header.classList.add('results-view');
        mainContent.classList.add('results-view');
        chatContainer.classList.add('results-view');
        
        // Make logo clickable for new search
        logo.style.cursor = 'pointer';
        logo.onclick = resetToSearch;
        
        // Add copy and download buttons to header if they don't exist
        if (!document.querySelector('.header-buttons')) {
            const headerButtons = document.createElement('div');
            headerButtons.className = 'header-buttons';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'response-btn download-btn';
            downloadBtn.title = 'Download Raw Response';
            downloadBtn.onclick = downloadRawResponse;
            downloadBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'response-btn copy-btn';
            copyBtn.title = 'Copy Raw Response';
            copyBtn.onclick = copyRawResponse;
            copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            
            headerButtons.appendChild(copyBtn);
            headerButtons.appendChild(downloadBtn);
            header.appendChild(headerButtons);
        }
        
    } else {
        header.classList.remove('results-view');
        mainContent.classList.remove('results-view');
        chatContainer.classList.remove('results-view');
        
        // Remove click handler from logo
        const logo = document.querySelector('.logo');
        logo.style.cursor = 'default';
        logo.onclick = null;
        
        // Remove header buttons
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            headerButtons.remove();
        }
        
        // Show search elements again
        suggestionsContainer.style.display = 'block';
    }
}

// Add reset function
function resetToSearch() {
    // Clear chat
    chatMessages.innerHTML = '';
    conversationHistory = [];
    
    // Hide chat container
    chatContainer.classList.remove('active');
    
    // Toggle back to search view
    toggleResultsView(false);
    
    // Focus on search input
    strainInput.focus();
}

async function handleSearch(e) {
    e.preventDefault();
    
    const query = strainInput.value.trim();
    if (!query) return;
    
    await searchStrain(query);
    strainInput.value = '';
}

async function searchStrain(query) {
    if (isTyping) return;
    
    // Show chat container if hidden
    chatContainer.classList.add('active');

    // Don't switch to results view immediately - wait for response
    // toggleResultsView(true); // REMOVE or comment out this line
    
    // Hide suggestions after first search
    if (conversationHistory.length === 0) {
        suggestionsContainer.style.display = 'none';
    }
    
    // Show typing indicator (skip adding user message)
    showTyping();
    
    try {
        // Make API call to backend
        const response = await fetch('/api/strain-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                conversation_history: conversationHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Hide typing indicator
        hideTyping();

        // NOW switch to results view after getting the response
        toggleResultsView(true);

        // Store raw response before formatting
        rawResponse = data.response;
        
        // Add bot response
        addMessage(data.response, 'bot');
        
        // Update conversation history
        conversationHistory.push({
            role: 'user',
            content: query
        });
        conversationHistory.push({
            role: 'assistant',
            content: data.response
        });
        
        // Keep conversation history manageable (last 10 exchanges)
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }
        
    } catch (error) {
        console.error('Error searching strain:', error);
        hideTyping();
        
        // Show error message
        const errorMessage = `Sorry, I'm having trouble connecting to the strain database right now. Please try again in a moment. 

If you're looking for "${query}", I'd normally provide information about its effects, THC/CBD levels, genetics, and user reviews.`;
        
        addMessage(errorMessage, 'bot');
    }
}

function addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // Process message content for better formatting
    if (sender === 'bot') {
        messageText.innerHTML = formatBotMessage(content);
    } else {
        messageText.textContent = content;
    }
    
    messageContent.appendChild(messageText);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animate message appearance
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        messageDiv.style.transition = 'all 0.3s ease-out';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 50);
}

function formatBotMessage(content) {
    // Check if this looks like strain data and format as cards
    if (content.includes('Strain Name:') || content.includes('Name:')) {
        return formatStrainDataAsCards(content);
    }
    
    // Clean and convert markdown-style formatting to HTML
    let formatted = content
        // First remove reference numbers
        .replace(/\[\d+\]/g, '')
        // Convert bold markdown to HTML
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Convert italic markdown to HTML (single asterisk)
        .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Bullet points
        .replace(/^- (.*$)/gim, '• $1')
        // Clean up any remaining double asterisks that weren't matched
        .replace(/\*\*/g, '');
    
    return formatted;
}

// Add this function before formatStrainDataAsCards
function createShowMoreContent(content, maxHeight = 200) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.maxHeight = maxHeight + 'px';
    wrapper.style.overflow = 'hidden';
    wrapper.innerHTML = content;
    
    // Check if content overflows
    setTimeout(() => {
        if (wrapper.scrollHeight > maxHeight) {
            wrapper.style.maxHeight = maxHeight + 'px';
            
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'show-more-btn';
            showMoreBtn.textContent = 'Show more';
            showMoreBtn.addEventListener('click', function() {
                if (wrapper.style.maxHeight === maxHeight + 'px') {
                    wrapper.style.maxHeight = 'none';
                    this.textContent = 'Show less';
                } else {
                    wrapper.style.maxHeight = maxHeight + 'px';
                    this.textContent = 'Show more';
                }
            });
            
            wrapper.appendChild(showMoreBtn);
        }
    }, 100);
    
    return wrapper.outerHTML;
}

function formatStrainDataAsCards(content) {
    // Clean the content first
    content = cleanMarkdown(content);
    
    const strainData = parseStrainData(content);
    
    // Build HTML only for sections that have data
    let nameCardContent = '';
    let attributesCardContent = '';
    let historyCardContent = '';
    let recognitionCardContent = '';
    
    // NAME CARD - Always show if we have a name
    if (strainData.name) {
        nameCardContent = `
            <div class="strain-card">
                <div class="strain-card-header">
                    <h3 class="strain-card-title">
                        <img class="card-icon" src="icons/clipart4589359.png" alt="Name icon">
                        Name
                    </h3>
                </div>
                <div class="strain-card-content">
                    <h4 class="strain-name">${strainData.name}</h4>
                    ${strainData.altNames.length > 0 ? `
                        <div class="strain-field">
                            <h5>Alternative Names</h5>
                            <div class="strain-badges">
                                ${strainData.altNames.map(name => `<span class="strain-badge secondary">${name}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.nicknames.length > 0 ? `
                        <div class="strain-field">
                            <h5>Nicknames</h5>
                            <div class="strain-badges">
                                ${strainData.nicknames.map(name => `<span class="strain-badge outline">${name}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // ATTRIBUTES CARD - Show if we have any attribute data
    const hasAttributes = strainData.hybridization || strainData.flavors.length > 0 || 
                         strainData.effects.length > 0 || strainData.physicalCharacteristics.length > 0;
    
    if (hasAttributes) {
        attributesCardContent = `
            <div class="strain-card">
                <div class="strain-card-header">
                    <h3 class="strain-card-title">
                        <img class="card-icon" src="icons/star.png" alt="Attributes icon">
                        Attributes
                    </h3>
                </div>
                <div class="strain-card-content">
                    ${strainData.hybridization ? `
                        <div class="strain-field">
                            <h5>Hybridization</h5>
                            <p>${strainData.hybridization}</p>
                        </div>
                    ` : ''}
                    ${strainData.flavors.length > 0 ? `
                        <div class="strain-field">
                            <h5>Reported Flavors (Top 3)</h5>
                            <div class="strain-badges">
                                ${strainData.flavors.map(flavor => `<span class="strain-badge secondary">${flavor}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.effects.length > 0 ? `
                        <div class="strain-field">
                            <h5>Reported Effects (Top 3)</h5>
                            <div class="strain-badges">
                                ${strainData.effects.map(effect => `<span class="strain-badge outline">${effect}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.physicalCharacteristics.length > 0 ? `
                        <div class="strain-field">
                            <h5>Physical Characteristics</h5>
                            <ul class="physical-chars-list">
                                ${strainData.physicalCharacteristics.map(char => `<li>${char}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // HISTORY CARD - Show if we have any history data
    const hasHistory = strainData.releaseDate || strainData.trivia.length > 0;
    
    if (hasHistory) {
        historyCardContent = `
            <div class="strain-card">
                <div class="strain-card-header">
                    <h3 class="strain-card-title">
                        <img class="card-icon" src="icons/14720179.png" alt="History icon">
                        History
                    </h3>
                </div>
                <div class="strain-card-content">
                    ${strainData.releaseDate ? `
                        <div class="strain-field">
                            <h5>Original Release Date</h5>
                            <p>${strainData.releaseDate}</p>
                        </div>
                    ` : ''}
                    ${strainData.trivia.length > 0 ? `
                        <div class="strain-field">
                            <h5>Trivia (Interesting Facts)</h5>
                            <ul class="trivia-list">
                                ${strainData.trivia.map(fact => `<li>${fact}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // RECOGNITION CARD - Show if we have any recognition data
    const hasRecognition = strainData.awards.length > 0 || strainData.redditRemarks.length > 0;
    
    if (hasRecognition) {
        recognitionCardContent = `
            <div class="strain-card">
                <div class="strain-card-header">
                    <h3 class="strain-card-title">
                        <img class="card-icon" src="icons/icon_account_management.png" alt="Recognition icon">
                        Recognition
                    </h3>
                </div>
                <div class="strain-card-content">
                    ${strainData.awards.length > 0 ? `
                        <div class="strain-field">
                            <h5>Awards</h5>
                            <div class="awards-list">
                                ${strainData.awards.map(award => `<div class="award-item"><span class="award-icon">🏆</span>${award}</div>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.redditRemarks.length > 0 ? `
                        <div class="strain-field">
                            <h5>Common Reddit Remarks</h5>
                            <ul class="reddit-remarks">
                                ${strainData.redditRemarks.map(remark => `<li class="reddit-item">${remark}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Only return cards that have content
    const allCards = [nameCardContent, attributesCardContent, historyCardContent, recognitionCardContent]
        .filter(card => card !== '')
        .join('');
    
    return `
        <div class="strain-content-wrapper">
            <div class="strain-dashboard">
                ${allCards}
            </div>
        </div>
        ${strainData.physicalCharacteristics.length > 0 ? `
            <div class="image-generation-section">
                <button class="generate-image-btn" onclick="generateStrainImage()">
                    Generate Strain Image
                </button>
                <div class="generated-image-container" id="generated-image-container">
                    <img class="generated-image" id="generated-image" alt="Generated strain image">
                </div>
            </div>
        ` : ''}
    `;
}

function cleanMarkdown(text) {
    if (!text) return text;
    return text
        // Strip block headers like "=== HISTORY ==="
        .replace(/^\s*===.*?===\s*$/gm, '')
        // Remove bold markdown more aggressively
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Remove reference numbers
        .replace(/\[\d+\]/g, '')
        // Remove sources/references section
        .replace(/Sources?:\s*\[\d+\].*$/gm, '')
        .replace(/References?:\s*\[\d+\].*$/gm, '')
        // Remove italic markdown
        .replace(/\*([^*]+)\*/g, '$1')
        .trim();
}

function parseStrainData(content) {
    // First, clean the entire content
    content = cleanMarkdown(content);
    
    const data = {
        name: '',
        altNames: [],
        nicknames: [],
        hybridization: '',
        flavors: [],
        effects: [],
        physicalCharacteristics: [],
        releaseDate: '',
        trivia: [],
        awards: [],
        redditRemarks: []
    };

    // Extract strain name
    const nameMatch = content.match(/Strain Name:\s*(.+)/i);
    if (nameMatch) {
        data.name = nameMatch[1].trim();
        currentStrainName = data.name;
    }

    // Extract alt names
    const altNamesMatch = content.match(/Alt Name\(s\):\s*(.+)/i);
    if (altNamesMatch && altNamesMatch[1].trim()) {
        data.altNames = altNamesMatch[1].split(',').map(name => name.trim()).filter(name => name);
    }

    // Extract nicknames
    const nicknamesMatch = content.match(/Nickname\(s\):\s*(.+)/i);
    if (nicknamesMatch && nicknamesMatch[1].trim()) {
        data.nicknames = nicknamesMatch[1].split(',').map(name => name.replace(/['"]/g, '').trim()).filter(name => name);
    }

    // Extract hybridization
    const hybridMatch = content.match(/Hybridization:\s*(.+)/i);
    if (hybridMatch) {
        data.hybridization = hybridMatch[1].trim();
        currentHybridization = data.hybridization;
    }

    // Extract flavors - look for the section and get exactly 3 bullets
    const flavorsMatch = content.match(/Reported Flavors[^:]*:\s*((?:(?!Reported Effects|Physical Characteristics|===).)+)/si);
    if (flavorsMatch) {
        const flavorsText = flavorsMatch[1].trim();
        data.flavors = flavorsText.split(/^[-•]\s*/m)
            .filter(f => f.trim())
            .map(f => f.trim())
            .slice(0, 3);
    }

    // Extract effects - look for the section and get exactly 3 bullets
    const effectsMatch = content.match(/Reported Effects[^:]*:\s*((?:(?!Physical Characteristics|===|HISTORY).)+)/si);
    if (effectsMatch) {
        const effectsText = effectsMatch[1].trim();
        data.effects = effectsText.split(/^[-•]\s*/m)
            .filter(e => e.trim())
            .map(e => e.trim())
            .slice(0, 3);
    }

    // Extract physical characteristics - now just a simple bullet list
    const physicalMatch = content.match(/Physical Characteristics:\s*((?:(?!===|HISTORY|Original Release).)+)/si);
    if (physicalMatch) {
        const physicalText = physicalMatch[1].trim();
        data.physicalCharacteristics = physicalText.split(/^[-•]\s*/m)
            .filter(p => p.trim())
            .map(p => p.trim());
        // Store for image generation
        currentPhysicalCharacteristics = data.physicalCharacteristics.join('. ');
    }

    // Extract release date
    const releaseDateMatch = content.match(/Original Release Date:\s*(.+)/i);
    if (releaseDateMatch && releaseDateMatch[1].trim()) {
        data.releaseDate = releaseDateMatch[1].trim();
    }

    // Extract trivia
    const triviaMatch = content.match(/Trivia[^:]*:\s*((?:(?!===|RECOGNITION|Awards).)+)/si);
    if (triviaMatch) {
        const triviaText = triviaMatch[1].trim();
        data.trivia = triviaText.split(/^[-•]\s*/m)
            .filter(t => t.trim())
            .map(t => t.replace(/\n/g, ' ').trim());
    }

    // Extract awards
    const awardsMatch = content.match(/Awards:\s*([\s\S]*?)(?=\n(?![-•])\S|Common Reddit|$)/i);
    if (awardsMatch) {
    const awardsBlock = awardsMatch[1].trim();

    // If the entire block is literally "unknown" or "none", skip.
    if (!/^\s*(unknown|none)\s*$/i.test(awardsBlock) && awardsBlock) {
        const lines = awardsBlock.split(/\r?\n/);

        const items = [];
        let current = "";

        for (const line of lines) {
        if (/^\s*[-•]\s+/.test(line)) {
            // New bullet starts
            if (current) items.push(current.trim());
            current = line.replace(/^\s*[-•]\s+/, "").trim();
        } else if (line.trim()) {
            // Continuation of previous bullet
            current += (current ? " " : "") + line.trim();
        }
        // empty lines are ignored
        }
        if (current) items.push(current.trim());

        if (items.length) {
        // Optionally drop bullets that are literally "unknown"/"none"
        data.awards = items.filter(x => !/^\s*(unknown|none)\s*$/i.test(x));
        } else {
        // Fallback: no bullets found — try comma/semicolon separated list
        data.awards = awardsBlock
            .split(/[,;]\s*/)
            .map(s => s.trim())
            .filter(Boolean);
        }
    }
    }

    // Extract Reddit remarks (NEW)
    const redditMatch = content.match(/Common Reddit remarks:\s*((?:.|\n)+?)(?=\n\n|$)/si);
    if (redditMatch) {
        const redditText = redditMatch[1].trim();
        data.redditRemarks = redditText.split(/^[-•]\s*/m)
            .filter(r => r.trim())
            .map(r => r.replace(/["""]/g, '').trim());
    }

    // Clean up any trailing content
    for (const key in data) {
        if (typeof data[key] === 'string') {
            data[key] = data[key].replace(/\s*===\s*$/, '').trim();
        } else if (Array.isArray(data[key])) {
            data[key] = data[key].map(v => typeof v === 'string' ? v.replace(/\s*===\s*$/, '').trim() : v);
        }
    }
    
    return data;
}

// Add this function after formatStrainDataAsCards
async function generateStrainImage() {
    const button = document.querySelector('.generate-image-btn');
    const imageContainer = document.getElementById('generated-image-container');
    
    // Disable button and show loading
    button.disabled = true;
    button.classList.add('loading');
    button.innerHTML = '<span class="image-loading-spinner"></span> Generating...';
    
    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                strainName: currentStrainName || '',
                hybridization: currentHybridization || '',
                physicalCharacteristics: currentPhysicalCharacteristics
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.image) {
            // Reset container to show image
            imageContainer.innerHTML = '<img class="generated-image" id="generated-image" alt="Generated strain image">';
            const newImageElement = document.getElementById('generated-image');
            newImageElement.src = `data:${data.mime || 'image/png'};base64,${data.image}`;
            imageContainer.classList.add('active');
        } else {
            throw new Error(data.error || 'Failed to generate image');
        }
        
    } catch (error) {
        console.error('Error generating image:', error);
        alert('Failed to generate image. Please try again.');
    } finally {
        // Re-enable button
        button.disabled = false;
        button.classList.remove('loading');
        button.innerHTML = 'Generate Strain Image';
    }
}

// Make the function globally accessible
window.generateStrainImage = generateStrainImage;

function showTyping() {
    isTyping = true;
    typingIndicator.classList.add('active');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    isTyping = false;
    typingIndicator.classList.remove('active');
}

// Add some interactive features
function addQuickReplies(replies) {
    const quickRepliesDiv = document.createElement('div');
    quickRepliesDiv.className = 'quick-replies';
    
    replies.forEach(reply => {
        const button = document.createElement('button');
        button.className = 'quick-reply-btn';
        button.textContent = reply;
        button.addEventListener('click', () => {
            searchStrain(reply);
            quickRepliesDiv.remove();
        });
        quickRepliesDiv.appendChild(button);
    });
    
    chatMessages.appendChild(quickRepliesDiv);
}

// Handle network status
window.addEventListener('online', function() {
    console.log('Connection restored');
});

window.addEventListener('offline', function() {
    console.log('Connection lost');
    addMessage('⚠️ Connection lost. Please check your internet connection and try again.', 'bot');
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Focus input with Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        strainInput.focus();
        strainInput.select();
    }
    
    // Clear chat with Ctrl/Cmd + Shift + C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        clearChat();
    }
});

function clearChat() {
    // Remove all messages
    chatMessages.innerHTML = '';
    
    // Reset conversation history
    conversationHistory = [];
    
    // Show suggestions again
    suggestionsContainer.style.display = 'block';
    
    // Hide chat container if no messages
    chatContainer.classList.remove('active');
}

// Add smooth scroll behavior for better UX
function smoothScrollToBottom() {
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

// Debounce function for search suggestions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add search suggestions as user types (optional feature)
const debouncedSuggestions = debounce(function(query) {
    if (query.length > 2) {
        // Could add live search suggestions here
        console.log('Getting suggestions for:', query);
    }
}, 300);

strainInput.addEventListener('input', function() {
    debouncedSuggestions(this.value);
});

// Test function for card layout (can be removed in production)
function testCardLayout() {
    const sampleStrainData = `Strain Name: Sour Diesel

Alt Name(s): Sour D, Sour Deez

Nickname(s): Sour D

Hybridization: Sativa-dominant hybrid (approximately 90% Sativa, 10% Indica)

Lineage / Genetics: Cross of Chemdawg, Northern Lights, and Skunk No. 1

Trivia (Interesting Facts):
- Sour Diesel is renowned for its sharp, diesel-like aroma and energizing effects
- The strain is often associated with creativity, motivation, and mental clarity
- Its pungent aroma is sometimes compared to the smell of opening a new can of tennis balls

Reported Flavors (Top 3):
- Diesel/fuel
- Citrus (tangy, fresh pine, crisp citrus)
- Earthy/skunky with herbal and spicy undertones

Reported Effects (Top 3):
- Uplifting euphoria
- Energizing and motivating
- Mental clarity and creativity boost

Availability by State: California, Colorado, Washington, Oregon, Michigan, Massachusetts, Illinois, Arizona, New Jersey, New York

Awards: Cannabis Cup Winner 2003, Strain of the Year 2012

Original Release Date: Popularized in the early 1990s

Physical Characteristics (Color, Bud Structure, Trichomes):
- Tall, lanky plants with long, thin-fingered leaves
- Loose, wispy, bright green buds with rusty/orange pistils
- Moderate trichome coverage, less frosty than many modern strains

Similar Strains (Top 3 by effect/genetics):
- Chemdawg (shared parent)
- Super Skunk (part of lineage)  
- Northern Lights (part of lineage)

User Rating (Average Score, # of Reviews, Common Comments):
- Leafly shows a high popularity with thousands of reviews (8,500+), generally rated very positively for its energizing and creative effects
- Common comments include praise for its fast-acting cerebral high, distinctive diesel aroma, and effectiveness for stress, depression, and anxiety relief`;
    
    return formatBotMessage(sampleStrainData);
}

// Download and Copy Functions for Raw Response
function downloadRawResponse() {
    if (!rawResponse) {
        alert('No response data available to download.');
        return;
    }
    
    const blob = new Blob([rawResponse], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `strain-response-${timestamp}.md`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // Visual feedback
    const btn = document.querySelector('.download-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    setTimeout(() => {
        btn.innerHTML = originalContent;
    }, 2000);
}

async function copyRawResponse() {
    if (!rawResponse) {
        alert('No response data available to copy.');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(rawResponse);
        
        // Visual feedback
        const btn = document.querySelector('.copy-btn');
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        setTimeout(() => {
            btn.innerHTML = originalContent;
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = rawResponse;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        alert('Response copied to clipboard!');
    }
}
