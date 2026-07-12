const API_CONFIG = {
    ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
    MODEL: 'google/gemini-2.5-flash',
    SYSTEM_PROMPT: `You are EthioScholar AI, a helpful educational assistant for Ethiopian students. Help with programming, mathematics, and university courses.`
};

let conversations = JSON.parse(localStorage.getItem('ethioscholar_chats')) || [];
let currentChatId = localStorage.getItem('ethioscholar_current_id') || null;

const dom = {
    sidebar: document.getElementById('sidebar'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    themeToggleMobile: document.getElementById('theme-toggle-mobile'),
    newChatBtn: document.getElementById('new-chat-btn'),
    clearChatsBtn: document.getElementById('clear-chats-btn'),
    chatHistoryList: document.getElementById('chat-history-list'),
    welcomeView: document.getElementById('welcome-view'),
    messageStream: document.getElementById('message-stream'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    charCounter: document.getElementById('char-counter'),
    settingsModal: document.getElementById('settings-modal'),
    openSettingsBtn: document.getElementById('open-settings-btn'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveKeyBtn: document.getElementById('save-key-btn'),
    chatWindow: document.getElementById('chat-window')
};

document.addEventListener('DOMContentLoaded', () => {
    initializeEventHandlers();
    renderChatHistory();
    
    const savedKey = localStorage.getItem('ethioscholar_api_key');
    if (savedKey) dom.apiKeyInput.value = savedKey;

    if (currentChatId && conversations.find(c => c.id === currentChatId)) {
        loadConversation(currentChatId);
    }
});

function initializeEventHandlers() {
    dom.hamburgerBtn.addEventListener('click', () => dom.sidebar.classList.toggle('open'));
    dom.newChatBtn.addEventListener('click', startNewConversation);
    dom.clearChatsBtn.addEventListener('click', purgeAllConversations);
    
    dom.userInput.addEventListener('input', () => {
        dom.charCounter.textContent = `${dom.userInput.value.length} / 2000 chars`;
    });
    
    dom.sendBtn.addEventListener('click', executeMessageSubmission);
    dom.openSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.add('open'));
    dom.closeSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.remove('open'));
    
    dom.saveKeyBtn.addEventListener('click', () => {
        localStorage.setItem('ethioscholar_api_key', dom.apiKeyInput.value.trim());
        alert('API Key Saved Successfully!');
        dom.settingsModal.classList.remove('open');
    });
}

function executeMessageSubmission() {
    const key = localStorage.getItem('ethioscholar_api_key');
    if (!key) {
        dom.settingsModal.classList.add('open');
        return alert('Please setup your OpenRouter API Key first!');
    }

    const queryText = dom.userInput.value.trim();
    if (!queryText) return;
    
    if (!currentChatId) {
        currentChatId = 'chat_' + Date.now();
        conversations.unshift({ id: currentChatId, title: queryText.substring(0, 30), messages: [] });
    }
    
    const activeChat = conversations.find(c => c.id === currentChatId);
    const userMessage = { role: 'user', content: queryText };
    activeChat.messages.push(userMessage);
    
    renderMessageBubble(userMessage);
    localStorage.setItem('ethioscholar_chats', JSON.stringify(conversations));
    renderChatHistory();
    
    dom.userInput.value = '';
    dom.welcomeView.style.display = 'none';
    
    const indicatorId = 'loader_' + Date.now();
    const loader = document.createElement('div');
    loader.className = 'message bot';
    loader.id = indicatorId;
    loader.innerHTML = 'Thinking...';
    dom.messageStream.appendChild(loader);
    
    fetchOpenRouterAIResponse(activeChat.messages, indicatorId, key);
}

async function fetchOpenRouterAIResponse(historyPayload, indicatorId, key) {
    try {
        const res = await fetch(API_CONFIG.ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: API_CONFIG.MODEL,
                messages: [{ role: 'system', content: API_CONFIG.SYSTEM_PROMPT }, ...historyPayload]
            })
        });
        
        const data = await res.json();
        document.getElementById(indicatorId)?.remove();
        
        const assistantMessage = {
            role: 'bot',
            content: data.choices[0].message.content
        };
        
        conversations.find(c => c.id === currentChatId).messages.push(assistantMessage);
        localStorage.setItem('ethioscholar_chats', JSON.stringify(conversations));
        renderMessageBubble(assistantMessage);
    } catch (e) {
        document.getElementById(indicatorId)?.remove();
        alert('Error connecting to AI.');
    }
}

function renderMessageBubble(msgObj) {
    const div = document.createElement('div');
    div.className = `message ${msgObj.role}`;
    div.innerHTML = `<div class="msg-body">${msgObj.content}</div>`;
    dom.messageStream.appendChild(div);
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
}

function renderChatHistory() {
    dom.chatHistoryList.innerHTML = '';
    conversations.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<div onclick="loadConversation('${chat.id}')">💬 ${chat.title}</div>`;
        dom.chatHistoryList.appendChild(item);
    });
}

function loadConversation(id) {
    currentChatId = id;
    dom.messageStream.innerHTML = '';
    dom.welcomeView.style.display = 'none';
    conversations.find(c => c.id === id).messages.forEach(msg => renderMessageBubble(msg));
}

function startNewConversation() {
    currentChatId = null;
    dom.messageStream.innerHTML = '';
    dom.welcomeView.style.display = 'block';
}

function purgeAllConversations() {
    if (confirm('Delete all chats?')) {
        conversations = [];
        startNewConversation();
        renderChatHistory();
    }
}
