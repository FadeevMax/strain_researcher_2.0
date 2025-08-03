// DOM elements
const searchForm = document.getElementById('search-form');
const strainInput = document.getElementById('strain-input');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');
const suggestionsContainer = document.getElementById('suggestions-container');
const suggestionBtns = document.querySelectorAll('.suggestion-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const strainDashboard = document.getElementById('strain-dashboard');
const newSearchBtn = document.getElementById('new-search-btn');

// Chat state
let isTyping = false;
let conversationHistory = [];

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
    
    // Add new search button listener
    if (newSearchBtn) {
        newSearchBtn.addEventListener('click', resetToHome);
    }
    
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
    
    // Hide suggestions after first search
    if (conversationHistory.length === 0) {
        suggestionsContainer.style.display = 'none';
    }
    
    // Add user message
    addMessage(query, 'user');
    
    // Show typing indicator
    showTyping();
    
    try {
        let data;
        
        // Check if running locally (development mode)
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            // Use mock data for local testing
            data = { response: getMockStrainData(query) };
        } else {
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
            
            data = await response.json();
        }
        
        // Hide typing indicator
        hideTyping();
        
        // Try to parse structured data and show dashboard
        const parsedData = parseStrainData(data.response);
        if (parsedData) {
            showStrainDashboard(parsedData);
        } else {
            // Fallback to chat format
            addMessage(data.response, 'bot');
        }
        
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
    // Convert markdown-style formatting to HTML
    let formatted = content
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Bullet points
        .replace(/^- (.*$)/gim, '• $1');
    
    return formatted;
}

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
    // Reset to home view
    resetToHome();
    
    // Keep welcome message but remove others
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    chatMessages.innerHTML = '';
    if (welcomeMessage) {
        chatMessages.appendChild(welcomeMessage);
    }
    
    // Hide chat container if no messages
    if (chatMessages.children.length <= 1) {
        chatContainer.classList.remove('active');
    }
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

// Parse strain data from API response
function parseStrainData(response) {
    try {
        // Look for structured markdown data
        const lines = response.split('\n');
        const data = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Parse strain name
            if (line.startsWith('**Strain Name:**')) {
                data.name = line.replace('**Strain Name:**', '').trim();
            }
            // Parse alt names
            else if (line.startsWith('**Alt Name(s):**')) {
                const altNames = line.replace('**Alt Name(s):**', '').trim();
                data.altNames = altNames ? altNames.split(',').map(n => n.trim()) : [];
            }
            // Parse nicknames
            else if (line.startsWith('**Nickname(s):**')) {
                const nicknames = line.replace('**Nickname(s):**', '').trim();
                data.nicknames = nicknames ? nicknames.split(',').map(n => n.trim()) : [];
            }
            // Parse hybridization
            else if (line.startsWith('**Hybridization**')) {
                data.hybridization = line.replace(/\*\*Hybridization[:\s]*\*\*/i, '').trim();
            }
            // Parse lineage
            else if (line.startsWith('**Lineage') || line.startsWith('**Genetics')) {
                data.lineage = line.replace(/\*\*[^:]*:\*\*/i, '').trim();
            }
            // Parse trivia
            else if (line.startsWith('**Trivia')) {
                let triviaText = line.replace(/\*\*[^:]*:\*\*/i, '').trim();
                // Look for multi-line trivia
                let j = i + 1;
                while (j < lines.length && !lines[j].trim().startsWith('**') && lines[j].trim()) {
                    triviaText += ' ' + lines[j].trim();
                    j++;
                }
                data.trivia = triviaText;
            }
            // Parse flavors
            else if (line.startsWith('**Reported Flavors')) {
                data.flavors = [];
                let j = i + 1;
                while (j < lines.length && (lines[j].trim().startsWith('-') || lines[j].trim().startsWith('•'))) {
                    const flavor = lines[j].trim().replace(/^[-•]\s*/, '');
                    if (flavor) data.flavors.push(flavor);
                    j++;
                }
            }
            // Parse effects
            else if (line.startsWith('**Reported Effects')) {
                data.effects = [];
                let j = i + 1;
                while (j < lines.length && (lines[j].trim().startsWith('-') || lines[j].trim().startsWith('•'))) {
                    const effect = lines[j].trim().replace(/^[-•]\s*/, '');
                    if (effect) data.effects.push(effect);
                    j++;
                }
            }
            // Parse availability
            else if (line.startsWith('**Availability')) {
                data.availability = line.replace(/\*\*[^:]*:\*\*/i, '').trim();
            }
            // Parse awards
            else if (line.startsWith('**Awards')) {
                data.awards = [];
                let j = i + 1;
                while (j < lines.length && (lines[j].trim().startsWith('-') || lines[j].trim().startsWith('•'))) {
                    const award = lines[j].trim().replace(/^[-•]\s*/, '');
                    if (award) data.awards.push(award);
                    j++;
                }
            }
            // Parse release date
            else if (line.startsWith('**Original Release Date') || line.startsWith('**Release Date')) {
                data.releaseDate = line.replace(/\*\*[^:]*:\*\*/i, '').trim();
            }
            // Parse physical characteristics
            else if (line.startsWith('**Physical Characteristics')) {
                let physicalText = line.replace(/\*\*[^:]*:\*\*/i, '').trim();
                let j = i + 1;
                while (j < lines.length && !lines[j].trim().startsWith('**') && lines[j].trim()) {
                    physicalText += ' ' + lines[j].trim();
                    j++;
                }
                data.physicalCharacteristics = physicalText;
            }
            // Parse similar strains
            else if (line.startsWith('**Similar Strains')) {
                data.similarStrains = [];
                let j = i + 1;
                while (j < lines.length && (lines[j].trim().startsWith('-') || lines[j].trim().startsWith('•'))) {
                    const strain = lines[j].trim().replace(/^[-•]\s*/, '');
                    if (strain) data.similarStrains.push(strain);
                    j++;
                }
            }
            // Parse user rating
            else if (line.startsWith('**User Rating')) {
                let ratingText = line.replace(/\*\*[^:]*:\*\*/i, '').trim();
                let j = i + 1;
                while (j < lines.length && !lines[j].trim().startsWith('**') && lines[j].trim()) {
                    ratingText += ' ' + lines[j].trim();
                    j++;
                }
                data.userRating = ratingText;
            }
        }
        
        // Only return data if we have at least a strain name
        return data.name ? data : null;
    } catch (error) {
        console.error('Error parsing strain data:', error);
        return null;
    }
}

// Show strain dashboard
function showStrainDashboard(data) {
    // Hide chat container and show dashboard
    chatContainer.style.display = 'none';
    suggestionsContainer.style.display = 'none';
    strainDashboard.style.display = 'block';
    
    // Hide main title and search when showing dashboard
    document.querySelector('.main-title').style.display = 'none';
    document.querySelector('.search-container').style.display = 'none';
    
    // Populate dashboard data
    populateDashboard(data);
}

// Populate dashboard with strain data
function populateDashboard(data) {
    // Strain name
    const strainNameEl = document.getElementById('strain-name');
    if (strainNameEl) strainNameEl.textContent = data.name || 'Unknown Strain';
    
    // Alt names
    const altNamesEl = document.getElementById('alt-names');
    if (altNamesEl) {
        altNamesEl.innerHTML = '';
        if (data.altNames && data.altNames.length > 0) {
            data.altNames.forEach(name => {
                const badge = document.createElement('span');
                badge.className = 'badge secondary';
                badge.textContent = name;
                altNamesEl.appendChild(badge);
            });
        } else {
            altNamesEl.innerHTML = '<span class="strain-info">Unknown</span>';
        }
    }
    
    // Nicknames
    const nicknamesEl = document.getElementById('nicknames');
    if (nicknamesEl) {
        nicknamesEl.innerHTML = '';
        if (data.nicknames && data.nicknames.length > 0) {
            data.nicknames.forEach(nickname => {
                const badge = document.createElement('span');
                badge.className = 'badge outline';
                badge.textContent = nickname;
                nicknamesEl.appendChild(badge);
            });
        } else {
            nicknamesEl.innerHTML = '<span class="strain-info">Unknown</span>';
        }
    }
    
    // Hybridization
    const hybridizationEl = document.getElementById('hybridization');
    if (hybridizationEl) hybridizationEl.textContent = data.hybridization || 'Unknown';
    
    // Flavors
    const flavorsEl = document.getElementById('flavors');
    if (flavorsEl) {
        flavorsEl.innerHTML = '';
        if (data.flavors && data.flavors.length > 0) {
            data.flavors.forEach(flavor => {
                const badge = document.createElement('span');
                badge.className = 'badge secondary';
                badge.textContent = flavor;
                flavorsEl.appendChild(badge);
            });
        } else {
            flavorsEl.innerHTML = '<span class="strain-info">Unknown</span>';
        }
    }
    
    // Effects
    const effectsEl = document.getElementById('effects');
    if (effectsEl) {
        effectsEl.innerHTML = '';
        if (data.effects && data.effects.length > 0) {
            data.effects.forEach(effect => {
                const badge = document.createElement('span');
                badge.className = 'badge outline';
                badge.textContent = effect;
                effectsEl.appendChild(badge);
            });
        } else {
            effectsEl.innerHTML = '<span class="strain-info">Unknown</span>';
        }
    }
    
    // Physical characteristics
    const physicalEl = document.getElementById('physical-characteristics');
    if (physicalEl) {
        physicalEl.innerHTML = '';
        if (data.physicalCharacteristics) {
            // Split by common separators and create items
            const characteristics = data.physicalCharacteristics.split(/[;\n-]/).filter(c => c.trim());
            characteristics.forEach(char => {
                const item = document.createElement('div');
                item.className = 'characteristic-item';
                item.textContent = char.trim();
                physicalEl.appendChild(item);
            });
        } else {
            physicalEl.innerHTML = '<span class="strain-info">Unknown</span>';
        }
    }
    
    // Release date
    const releaseDateEl = document.getElementById('release-date');
    if (releaseDateEl) releaseDateEl.textContent = data.releaseDate || 'Unknown';
    
    // Lineage
    const lineageEl = document.getElementById('lineage');
    if (lineageEl) lineageEl.textContent = data.lineage || 'Unknown';
    
    // Trivia
    const triviaEl = document.getElementById('trivia');
    if (triviaEl) triviaEl.textContent = data.trivia || 'Unknown';
    
    // Awards
    const awardsEl = document.getElementById('awards');
    if (awardsEl) {
        awardsEl.innerHTML = '';
        if (data.awards && data.awards.length > 0) {
            data.awards.forEach(award => {
                const item = document.createElement('div');
                item.className = 'award-item';
                item.innerHTML = `
                    <svg class="award-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${award}</span>
                `;
                awardsEl.appendChild(item);
            });
        } else {
            awardsEl.innerHTML = '<span class="strain-info">Unknown</span>';
        }
    }
    
    // Similar strains
    const similarStrainsEl = document.getElementById('similar-strains');
    if (similarStrainsEl) {
        similarStrainsEl.innerHTML = '';
        if (data.similarStrains && data.similarStrains.length > 0) {
            data.similarStrains.forEach(strain => {
                const badge = document.createElement('span');
                badge.className = 'badge secondary';
                badge.textContent = strain;
                similarStrainsEl.appendChild(badge);
            });
        } else {
            similarStrainsEl.innerHTML = '<span class="strain-info">Unknown</span>';
        }
    }
    
    // Availability
    const availabilityEl = document.getElementById('availability');
    if (availabilityEl) {
        availabilityEl.innerHTML = '';
        if (data.availability) {
            // Parse states from availability text
            const states = data.availability.split(/[,;]/).map(s => s.trim()).filter(s => s);
            states.forEach(state => {
                const item = document.createElement('div');
                item.className = 'availability-item';
                item.innerHTML = `
                    <svg class="location-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span class="badge outline">${state}</span>
                `;
                availabilityEl.appendChild(item);
            });
        } else {
            availabilityEl.innerHTML = '<span class="strain-info">Unknown</span>';
        }
    }
    
    // User rating
    const ratingScoreEl = document.getElementById('rating-score');
    const ratingReviewsEl = document.getElementById('rating-reviews');
    const commentsEl = document.getElementById('common-comments');
    
    if (data.userRating) {
        // Try to extract rating number and review count
        const ratingMatch = data.userRating.match(/([0-9.]+)\s*\/\s*5/);
        const reviewsMatch = data.userRating.match(/([0-9,]+)\s*(?:user\s*)?reviews?/i);
        
        if (ratingScoreEl && ratingMatch) {
            ratingScoreEl.innerHTML = `
                <svg class="star-icon" viewBox="0 0 24 24" fill="none">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${ratingMatch[1]}
            `;
        }
        
        if (ratingReviewsEl && reviewsMatch) {
            ratingReviewsEl.textContent = `(${reviewsMatch[1]} reviews)`;
        }
        
        // Extract comments (look for quoted text)
        if (commentsEl) {
            commentsEl.innerHTML = '';
            const commentMatches = data.userRating.match(/"([^"]+)"/g);
            if (commentMatches) {
                commentMatches.slice(0, 3).forEach(comment => {
                    const item = document.createElement('div');
                    item.className = 'comment-item';
                    item.innerHTML = `
                        <div class="comment-dot"></div>
                        <span>${comment}</span>
                    `;
                    commentsEl.appendChild(item);
                });
            } else {
                commentsEl.innerHTML = '<span class="strain-info">No comments available</span>';
            }
        }
    } else {
        if (ratingScoreEl) ratingScoreEl.innerHTML = '<span class="strain-info">Unknown</span>';
        if (ratingReviewsEl) ratingReviewsEl.textContent = '';
        if (commentsEl) commentsEl.innerHTML = '<span class="strain-info">Unknown</span>';
    }
}

// Reset to home view
function resetToHome() {
    // Show main elements
    document.querySelector('.main-title').style.display = 'block';
    document.querySelector('.search-container').style.display = 'block';
    suggestionsContainer.style.display = 'block';
    
    // Hide dashboard
    strainDashboard.style.display = 'none';
    chatContainer.style.display = 'none';
    
    // Clear input and focus
    strainInput.value = '';
    strainInput.focus();
    
    // Reset conversation history
    conversationHistory = [];
}

// Mock data function for local testing
function getMockStrainData(query) {
    const mockData = {
        "blue dream": `**Strain Name:** Blue Dream

**Alt Name(s):** Blueberry Dream, Azure Haze

**Nickname(s):** BD, The Dream

**Hybridization:** Sativa-dominant Hybrid (60% Sativa, 40% Indica)

**Lineage / Genetics:** Blueberry × Super Silver Haze

**Trivia (Interesting Facts):** One of the most popular strains in California dispensaries. Known for its balanced effects that provide both mental stimulation and physical relaxation.

**Reported Flavors:**
- Sweet Berry
- Vanilla 
- Herbal

**Reported Effects:**
- Euphoric
- Creative
- Relaxed

**Availability by State:** California, Colorado, Washington, Oregon, Nevada

**Awards:**
- Cannabis Cup Winner 2003
- Strain of the Year 2012

**Original Release Date:** 2003

**Physical Characteristics:** Deep green with blue undertones; Dense, medium-sized nugs; Abundant crystal coating

**Similar Strains:**
- Green Crack
- Sour Diesel
- Pineapple Express

**User Rating:** Leafly average: 4.6 / 5 from 2,847 user reviews; Common remarks: "Perfect balance", "Great for daytime", "Smooth smoke"`,

        "og kush": `**Strain Name:** OG Kush

**Alt Name(s):** Original Gangster, Ocean Grown

**Nickname(s):** OG, The Kush

**Hybridization:** Indica-dominant Hybrid (75% Indica, 25% Sativa)

**Lineage / Genetics:** Chemdawg × Lemon Thai × Pakistani Kush

**Trivia (Interesting Facts):** The backbone of West Coast cannabis culture. Many popular strains have OG Kush genetics.

**Reported Flavors:**
- Earthy
- Pine
- Woody

**Reported Effects:**
- Relaxed
- Happy
- Euphoric

**Availability by State:** California, Colorado, Washington, Oregon, Nevada, Michigan

**Awards:**
- High Times Cannabis Cup Winner 1996
- Medical Cannabis Cup 2014

**Original Release Date:** 1996

**Physical Characteristics:** Dense, sticky buds with orange hairs; Heavy trichome coverage; Forest green color

**Similar Strains:**
- SFV OG
- Fire OG
- Tahoe OG

**User Rating:** Leafly average: 4.3 / 5 from 3,214 user reviews; Common remarks: "Classic strain", "Strong effects", "Great for evening"`,

        "default": `**Strain Name:** ${query.charAt(0).toUpperCase() + query.slice(1)}

**Alt Name(s):** Unknown

**Nickname(s):** Unknown

**Hybridization:** Unknown

**Lineage / Genetics:** Unknown

**Trivia (Interesting Facts):** This is a demo strain for testing the dashboard layout.

**Reported Flavors:**
- Earthy
- Citrus
- Sweet

**Reported Effects:**
- Relaxed
- Happy
- Focused

**Availability by State:** Various states

**Awards:** Unknown

**Original Release Date:** Unknown

**Physical Characteristics:** Dense buds with good trichome coverage

**Similar Strains:**
- Similar Strain 1
- Similar Strain 2
- Similar Strain 3

**User Rating:** Demo rating: 4.2 / 5 from 1,500 user reviews; Common remarks: "Good strain", "Nice effects", "Smooth taste"`
    };
    
    const normalizedQuery = query.toLowerCase().trim();
    return mockData[normalizedQuery] || mockData.default;
}