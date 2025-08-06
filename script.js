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

// Add after the existing global variables
let isResultsView = false;

// Add a global variable to store physical characteristics:
let currentPhysicalCharacteristics = '';

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
    
    if (show) {
        header.classList.add('results-view');
        mainContent.classList.add('results-view');
        chatContainer.classList.add('results-view');
        
        // Add new search button if it doesn't exist
        if (!document.querySelector('.new-search-btn')) {
            const newSearchBtn = document.createElement('button');
            newSearchBtn.className = 'new-search-btn';
            newSearchBtn.textContent = 'New Search';
            newSearchBtn.addEventListener('click', resetToSearch);
            header.appendChild(newSearchBtn);
        }
    } else {
        header.classList.remove('results-view');
        mainContent.classList.remove('results-view');
        chatContainer.classList.remove('results-view');
        
        // Remove new search button
        const newSearchBtn = document.querySelector('.new-search-btn');
        if (newSearchBtn) {
            newSearchBtn.remove();
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
    
    return `
        <div class="strain-dashboard">
            <!-- Name Card -->
            <div class="strain-card">
                <div class="strain-card-header">
                    <h3 class="strain-card-title">
                        <img class="card-icon" src="icons/458-4589359_leaf-icon-green-leaf-icon.png.jpeg" alt="Name icon">
                        Name
                    </h3>
                </div>
                <div class="strain-card-content">
                    <h4 class="strain-name">${strainData.name}</h4>
                    ${strainData.altNames ? `
                        <div class="strain-field">
                            <h5>Alternative Names</h5>
                            <div class="strain-badges">
                                ${strainData.altNames.map(name => `<span class="strain-badge secondary">${name}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.nicknames ? `
                        <div class="strain-field">
                            <h5>Nicknames</h5>
                            <div class="strain-badges">
                                ${strainData.nicknames.map(name => `<span class="strain-badge outline">${name}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Attributes Card -->
            <div class="strain-card">
                <div class="strain-card-header">
                    <h3 class="strain-card-title">
                        <img class="card-icon" src="icons/images-2.jpeg" alt="Attributes icon">
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
                    ${strainData.flavors ? `
                        <div class="strain-field">
                            <h5>Top Flavors</h5>
                            <div class="strain-badges">
                                ${strainData.flavors.map(flavor => `<span class="strain-badge secondary">${flavor}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.effects ? `
                        <div class="strain-field">
                            <h5>Top Effects</h5>
                            <div class="strain-badges">
                                ${strainData.effects.map(effect => `<span class="strain-badge outline">${effect}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.physicalCharacteristics ? `
                        <div class="strain-field">
                            <h5>Physical Characteristics</h5>
                            <div class="physical-chars">
                                ${strainData.physicalCharacteristics.color ? `<p><strong>Color:</strong> ${strainData.physicalCharacteristics.color}</p>` : ''}
                                ${strainData.physicalCharacteristics.budStructure ? `<p><strong>Bud Structure:</strong> ${strainData.physicalCharacteristics.budStructure}</p>` : ''}
                                ${strainData.physicalCharacteristics.trichomes ? `<p><strong>Trichomes:</strong> ${strainData.physicalCharacteristics.trichomes}</p>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- History Card -->
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
                    ${strainData.lineage ? `
                        <div class="strain-field">
                            <h5>Lineage / Genetics</h5>
                            <p>${strainData.lineage}</p>
                        </div>
                    ` : ''}
                    ${strainData.trivia ? `
                        <div class="strain-field">
                            <h5>Trivia (Interesting Facts)</h5>
                            <p>${strainData.trivia}</p>
                        </div>
                    ` : ''}
                    ${strainData.awards ? `
                        <div class="strain-field">
                            <h5>Awards</h5>
                            <div class="awards-list">
                                ${strainData.awards.map(award => `<div class="award-item"><span class="award-icon">🏆</span>${award}</div>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.similarStrains ? `
                        <div class="strain-field">
                            <h5>Similar Strains</h5>
                            <div class="strain-badges">
                                ${strainData.similarStrains.map(strain => `<span class="strain-badge secondary">${strain}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Insights Card -->
            <div class="strain-card">
                <div class="strain-card-header">
                    <h3 class="strain-card-title">
                        <img class="card-icon" src="icons/icon_account_management.png" alt="Insights icon">
                        Insights
                    </h3>
                </div>
                <div class="strain-card-content">
                    ${strainData.availability ? `
                        <div class="strain-field">
                            <h5>Availability by State</h5>
                            <div class="availability-list">
                                ${strainData.availability.map(state => `<div class="availability-item"><span class="location-icon">📍</span><span class="strain-badge outline">${state}</span></div>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${strainData.rating ? `
                        <div class="strain-field">
                            <h5>User Rating</h5>
                            <div class="rating-info">
                                <div class="rating-score">
                                    <span class="star-icon">⭐</span>
                                    <span class="score">${strainData.rating.score}</span>
                                    <span class="review-count">(${strainData.rating.reviews} reviews)</span>
                                </div>
                                ${strainData.rating.commonComments ? `
                                    <div class="common-comments">
                                        <h6>Common Comments</h6>
                                        ${strainData.rating.commonComments.map(comment => `<div class="comment-item"><span class="bullet">•</span>"${comment}"</div>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
        <div class="image-generation-section">
            <button class="generate-image-btn" onclick="generateStrainImage()">
                Generate Strain Image
            </button>
            <div class="generated-image-container" id="generated-image-container">
                <img class="generated-image" id="generated-image" alt="Generated strain image">
            </div>
        </div>
    `;
}

function cleanMarkdown(text) {
    if (!text) return text;
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markdown
        .replace(/\[\d+\]/g, '')           // Remove reference numbers like [1], [2], etc.
        .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markdown
        .trim();                           // Remove extra whitespace
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
        physicalCharacteristics: {},
        releaseDate: '',
        lineage: '',
        trivia: '',
        awards: [],
        similarStrains: [],
        availability: [],
        rating: {}
    };

    // Extract strain name - handle both "Strain Name:" and "Name:" formats
    const nameMatch = content.match(/(?:Strain )?Name:\s*(.+)/i);
    if (nameMatch) data.name = nameMatch[1].trim();

    // Extract alt names
    const altNamesMatch = content.match(/Alt Name\(s\):\s*(.+)/);
    if (altNamesMatch) {
        data.altNames = altNamesMatch[1].split(',').map(name => name.trim()).filter(name => name && name !== 'None widely noted beyond "White Widow"');
    }

    // Extract nicknames
    const nicknamesMatch = content.match(/Nickname\(s\):\s*(.+)/);
    if (nicknamesMatch) {
        data.nicknames = nicknamesMatch[1].split(',').map(name => name.trim()).filter(name => name);
    }

    // Extract hybridization
    const hybridMatch = content.match(/Hybridization:\s*(.+)/);
    if (hybridMatch) data.hybridization = hybridMatch[1].trim();

    // Extract flavors
    const flavorsMatch = content.match(/Reported Flavors \(Top 3\):\s*((?:(?!Reported Effects).)+)/s);
    if (flavorsMatch) {
        const flavorsText = flavorsMatch[1].trim();
        data.flavors = flavorsText.split(/[-•]\s*/).slice(1).map(flavor => flavor.trim()).filter(flavor => flavor);
    }

    // Extract effects
    const effectsMatch = content.match(/Reported Effects \(Top 3\):\s*((?:(?!Physical Characteristics|Availability by State).)+)/s);
    if (effectsMatch) {
        const effectsText = effectsMatch[1].trim();
        data.effects = effectsText.split(/[-•]\s*/).slice(1).map(effect => effect.trim()).filter(effect => effect);
    }

    // Extract physical characteristics
    const physicalMatch = content.match(/Physical Characteristics[^:]*:\s*((?:(?!Original Release Date|History|Lineage|Similar Strains).)+)/si);
    if (physicalMatch) {
        const physicalText = physicalMatch[1].trim();
        currentPhysicalCharacteristics = physicalText;
        
        // Parse bud structure specifically
        const budMatch = physicalText.match(/Bud Structure:\s*([^.]+)/i);
        if (budMatch) {
            data.physicalCharacteristics.budStructure = budMatch[1].trim();
        }
        
        // Look for other characteristics in the text
        if (physicalText.includes('Color:')) {
            const colorMatch = physicalText.match(/Color:\s*([^.]+)/i);
            if (colorMatch) data.physicalCharacteristics.color = colorMatch[1].trim();
        }
        
        if (physicalText.includes('Trichome')) {
            const trichomeMatch = physicalText.match(/Trichome[^:]*:\s*([^.]+)/i);
            if (trichomeMatch) data.physicalCharacteristics.trichomes = trichomeMatch[1].trim();
        }
    }

    // Extract release date
    const releaseDateMatch = content.match(/Original Release Date:\s*(.+)/);
    if (releaseDateMatch) data.releaseDate = releaseDateMatch[1].trim();

    // Extract lineage
    const lineageMatch = content.match(/Lineage \/ Genetics:\s*(.+)/);
    if (lineageMatch) data.lineage = lineageMatch[1].trim();

    // Extract trivia
    const triviaMatch = content.match(/Trivia \(Interesting Facts\):\s*((?:(?!Awards).)+)/s);
    if (triviaMatch) {
        data.trivia = triviaMatch[1].trim().replace(/[-•]\s*/g, '').trim();
    }

    // Extract awards
    const awardsMatch = content.match(/Awards:\s*(.+)/);
    if (awardsMatch) {
        const awardsText = awardsMatch[1].trim();
        if (!awardsText.toLowerCase().includes('unknown')) {
            data.awards = awardsText.split(',').map(award => award.trim()).filter(award => award);
        }
    }

    // Extract similar strains
    const similarMatch = content.match(/Similar Strains \(Top 3 by effect\/genetics\):\s*((?:(?!User Rating|Insights).)+)/s);
    if (similarMatch) {
        const similarText = similarMatch[1].trim();
        data.similarStrains = similarText.split(/[-•]\s*/).slice(1).map(strain => strain.trim()).filter(strain => strain);
    }

    // Extract availability
    const availabilityMatch = content.match(/Availability by State:\s*(.+)/);
    if (availabilityMatch) {
        const availabilityText = availabilityMatch[1].trim();
        data.availability = availabilityText.split(',').map(state => state.trim()).filter(state => state);
    }

    // Extract user rating
    const ratingMatch = content.match(/User Rating \(Average Score, # of Reviews, Common Comments\):\s*((?:.|\n)+)/);
    if (ratingMatch) {
        const ratingText = ratingMatch[1].trim();
        
        // Extract score
        const scoreMatch = ratingText.match(/(\d+\.?\d*)/);
        if (scoreMatch) data.rating.score = parseFloat(scoreMatch[1]);
        
        // Extract review count
        const reviewMatch = ratingText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
        if (reviewMatch) data.rating.reviews = reviewMatch[1].replace(/,/g, '');
        
        // Extract common comments
        const commentsMatch = ratingText.match(/Common comments include (.+)/);
        if (commentsMatch) {
            data.rating.commonComments = commentsMatch[1].split(',').map(comment => comment.trim()).filter(comment => comment);
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
            newImageElement.src = `data:image/png;base64,${data.image}`;
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