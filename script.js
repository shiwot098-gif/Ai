const API_CONFIG = {
    ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
    MODEL: 'google/gemini-2.5-flash',
    SYSTEM_PROMPT: 'You are EthioScholar AI, a helpful educational assistant for Ethiopian students.'
};

let conversations = JSON.parse(localStorage.getItem('ethioscholar_chats')) || [];
let currentChatId = localStorage.getItem('ethioscholar_current_id') || null;

// ኤለመንቶችን በደህንነት ለመያዝ
const getEl = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    // ክሊክ ማድረጊያዎችን ማያያዝ
    if (getEl('hamburger-btn')) {
        getEl('hamburger-btn').addEventListener('click', () => {
            getEl('sidebar')?.classList.toggle('open');
        });
    }
    
    if (getEl('theme-toggle')) {
        getEl('theme-toggle').addEventListener('click', () => document.body.classList.toggle('dark-mode'));
    }
    if (getEl('theme-toggle-mobile')) {
        getEl('theme-toggle-mobile').addEventListener('click', () => document.body.classList.toggle('dark-mode'));
    }
    
    if (getEl('new-chat-btn')) getEl('new-chat-btn').addEventListener('click', startNewConversation);
    if (getEl('clear-chats-btn')) getEl('clear-chats-btn').addEventListener('click', purgeAllConversations);
    
    if (getEl('user-input')) {
        getEl('user-input').addEventListener('input', () => {
            if (getEl('char-counter')) {
                getEl('char-counter').textContent = `${getEl('user-input').value.length} / 2000 chars`;
            }
        });
    }
    
    if (getEl('send-btn')) getEl('send-btn').addEventListener('click', executeMessageSubmission);
    if (getEl('open-settings-btn')) getEl('open-settings-btn').addEventListener('click', () => getEl('settings-modal')?.classList.add('open'));
    if (getEl('close-settings-btn')) getEl('close-settings-btn').addEventListener('click', () => getEl('settings-modal')?.classList.remove('open'));
    
    if (getEl('save-key-btn')) {
        getEl('save-key-btn').addEventListener('click', () => {
            const keyVal = getEl('api-key-input')?.value.trim();
            localStorage.setItem('ethioscholar_api_key', keyVal || '');
            alert('API Key Saved Successfully!');
            getEl('settings-modal')?.classList.remove('open');
        });
    }

    const savedKey = localStorage.getItem('ethioscholar_api_key');
    if (savedKey && getEl('api-key-input')) getEl('api-key-input').value = savedKey;

    renderChatHistory();
    if (currentChatId && conversations.find(c => c.id === currentChatId)) {
        loadConversation(currentChatId);
    }
});

function executeMessageSubmission() {
    const key = localStorage.getItem('ethioscholar_api_key');
    if (!key) {
        getEl('settings-modal')?.classList.add('open');
        alert('Please setup your OpenRouter API Key first!');
        return;
    }

    const queryText = getEl('user-input')?.value.trim();
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
    
    if (getEl('user-input')) getEl('user-input').value = '';
    if (getEl('welcome-view')) getEl('welcome-view').style.display = 'none';
    
    const indicatorId = 'loader_' + Date.now();
    const loader = document.createElement('div');
    loader.className = 'message bot';
    loader.id = indicatorId;
    loader.innerHTML = 'Thinking...';
    getEl('message-stream')?.appendChild(loader);
    
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
    getEl('message-stream')?.appendChild(div);
    if (getEl('chat-window')) {
        getEl('chat-window').scrollTop = getEl('chat-window').scrollHeight;
    }
}

function renderChatHistory() {
    if (!getEl('chat-history-list')) return;
    getEl('chat-history-list').innerHTML = '';
    conversations.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<div style="cursor:pointer;" class="history-click-target" data-id="${chat.id}">💬 ${chat.title}</div>`;
        getEl('chat-history-list').appendChild(item);
    });

    document.querySelectorAll('.history-click-target').forEach(el => {
        el.addEventListener('click', (e) => {
            const cid = e.target.getAttribute('data-id');
            if (cid) loadConversation(cid);
        });
    });
}

function loadConversation(id) {
    currentChatId = id;
    if (getEl('message-stream')) getEl('message-stream').innerHTML = '';
    if (getEl('welcome-view')) getEl('welcome-view').style.display = 'none';
    const chat = conversations.find(c => c.id === id);
    if (chat) chat.messages.forEach(msg => renderMessageBubble(msg));
}

function startNewConversation() {
    currentChatId = null;
    if (getEl('message-stream')) getEl('message-stream').innerHTML = '';
    if (getEl('welcome-view')) getEl('welcome-view').style.display = 'block';
}

function purgeAllConversations() {
    if (confirm('Delete all chats?')) {
        conversations = [];
        startNewConversation();
        renderChatHistory();
    }
}
