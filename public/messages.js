class MessagesApp {
    constructor() {
        this.socket = null;
        this.currentConversation = null;
        this.currentUser = { id: 'user123', name: 'John Doe' }; // Mock user
        this.conversations = [];
        this.messages = {};
        
        this.init();
    }

    init() {
        this.initSocketConnection();
        this.bindEvents();
        this.loadConversations();
        this.setupAutoResize();
    }

    initSocketConnection() {
        // Initialize Socket.IO connection
        this.socket = io('http://localhost:3001');
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('join', this.currentUser.id);
        });

        this.socket.on('newMessage', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('messageRead', (data) => {
            this.markMessageAsRead(data.messageId);
        });

        this.socket.on('userTyping', (data) => {
            this.showTypingIndicator(data.userId, data.isTyping);
        });
    }

    bindEvents() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.dataset.filter);
            });
        });

        // Search
        document.querySelector('.search-input').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Message input
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', () => {
            this.handleTyping();
            this.adjustTextareaHeight();
        });
        
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // File attachment
        document.getElementById('attachFileBtn').addEventListener('click', () => {
            this.showFileUploadModal();
        });

        // Project details
        document.getElementById('projectDetailsBtn').addEventListener('click', () => {
            this.toggleProjectSidebar();
        });

        // Close sidebar
        document.getElementById('closeSidebarBtn').addEventListener('click', () => {
            this.closeProjectSidebar();
        });

        // File upload modal
        document.getElementById('closeFileModal').addEventListener('click', () => {
            this.closeFileUploadModal();
        });

        document.getElementById('fileUploadArea').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Drag and drop
        const uploadArea = document.getElementById('fileUploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#0d9488';
            uploadArea.style.background = '#f0fdfa';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.background = 'transparent';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.background = 'transparent';
            this.handleFileUpload(e.dataTransfer.files);
        });
    }

    loadConversations() {
        // Mock data - replace with actual API call
        this.conversations = [
            {
                id: 'conv1',
                projectId: 'proj1',
                projectTitle: 'E-commerce Website Redesign',
                otherUser: {
                    id: 'user456',
                    name: 'Sarah Johnson',
                    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332b002?w=100&h=100&fit=crop&crop=face'
                },
                lastMessage: 'Great! I\'ll start working on the mockups tomorrow.',
                lastMessageTime: '2 min ago',
                unread: true,
                isOnline: true
            },
            {
                id: 'conv2',
                projectId: 'proj2',
                projectTitle: 'Mobile App Development',
                otherUser: {
                    id: 'user789',
                    name: 'Mike Chen',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
                },
                lastMessage: 'The API integration is complete. Ready for testing.',
                lastMessageTime: '1 hour ago',
                unread: false,
                isOnline: false
            },
            {
                id: 'conv3',
                projectId: 'proj3',
                projectTitle: 'Brand Identity Design',
                otherUser: {
                    id: 'user101',
                    name: 'Emma Wilson',
                    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
                },
                lastMessage: 'I\'ve attached the latest logo variations for your review.',
                lastMessageTime: '3 hours ago',
                unread: true,
                isOnline: true
            }
        ];

        this.renderConversations();
    }

    renderConversations() {
        const container = document.getElementById('conversationsList');
        container.innerHTML = '';

        this.conversations.forEach(conv => {
            const convElement = this.createConversationElement(conv);
            container.appendChild(convElement);
        });
    }

    createConversationElement(conversation) {
        const div = document.createElement('div');
        div.className = `conversation-item ${conversation.unread ? 'unread' : ''}`;
        div.dataset.conversationId = conversation.id;

        div.innerHTML = `
            <div class="conversation-avatar avatar">
                <img src="${conversation.otherUser.avatar}" alt="${conversation.otherUser.name}" />
            </div>
            <div class="conversation-info">
                <div class="conversation-user">${conversation.otherUser.name}</div>
                <div class="conversation-project">${conversation.projectTitle}</div>
                <div class="conversation-preview">${conversation.lastMessage}</div>
            </div>
            <div class="conversation-time">${conversation.lastMessageTime}</div>
        `;

        div.addEventListener('click', () => {
            this.selectConversation(conversation.id);
        });

        return div;
    }

    selectConversation(conversationId) {
        // Update active conversation
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelector(`[data-conversation-id="${conversationId}"]`).classList.add('active');

        // Load conversation
        this.currentConversation = this.conversations.find(c => c.id === conversationId);
        this.loadMessages(conversationId);
        this.showChatWindow();
        this.updateChatHeader();

        // Mark as read
        this.markConversationAsRead(conversationId);
    }

    showChatWindow() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('chatWindow').style.display = 'flex';
    }

    updateChatHeader() {
        if (!this.currentConversation) return;

        document.getElementById('chatUserAvatar').src = this.currentConversation.otherUser.avatar;
        document.getElementById('chatUserName').textContent = this.currentConversation.otherUser.name;
        document.getElementById('chatProjectTitle').textContent = this.currentConversation.projectTitle;
    }

    loadMessages(conversationId) {
        // Mock messages - replace with actual API call
        this.messages[conversationId] = [
            {
                id: 'msg1',
                senderId: 'user456',
                content: 'Hi! I saw your project posting for the e-commerce website redesign. I\'d love to discuss this opportunity with you.',
                timestamp: new Date(Date.now() - 3600000),
                read: true
            },
            {
                id: 'msg2',
                senderId: this.currentUser.id,
                content: 'Hello Sarah! Thank you for your interest. I\'ve reviewed your portfolio and I\'m impressed with your work. Would you like to discuss the project requirements?',
                timestamp: new Date(Date.now() - 3000000),
                read: true
            },
            {
                id: 'msg3',
                senderId: 'user456',
                content: 'Absolutely! I have some ideas for improving the user experience. Could you share more details about your current challenges?',
                timestamp: new Date(Date.now() - 2400000),
                read: true
            },
            {
                id: 'msg4',
                senderId: this.currentUser.id,
                content: 'The main issues are with the checkout process and mobile responsiveness. Our conversion rate has been declining, and we need a fresh, modern design.',
                timestamp: new Date(Date.now() - 1800000),
                read: true,
                attachments: [
                    {
                        name: 'current-website-screenshots.pdf',
                        size: '2.4 MB',
                        url: '/uploads/screenshots.pdf'
                    }
                ]
            },
            {
                id: 'msg5',
                senderId: 'user456',
                content: 'Great! I\'ll start working on the mockups tomorrow.',
                timestamp: new Date(Date.now() - 120000),
                read: false
            }
        ];

        this.renderMessages(conversationId);
    }

    renderMessages(conversationId) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        const messages = this.messages[conversationId] || [];
        
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isSent = message.senderId === this.currentUser.id;
        div.className = `message ${isSent ? 'sent' : 'received'}`;

        const otherUser = this.currentConversation.otherUser;
        
        div.innerHTML = `
            ${!isSent ? `<div class="message-avatar avatar">
                <img src="${otherUser.avatar}" alt="${otherUser.name}" />
            </div>` : ''}
            <div class="message-bubble">
                <div class="message-content">${message.content}</div>
                ${message.attachments ? this.renderAttachments(message.attachments) : ''}
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        return div;
    }

    renderAttachments(attachments) {
        return attachments.map(attachment => `
            <div class="attachment">
                <i class="ri-file-line attachment-icon"></i>
                <div class="attachment-info">
                    <div class="attachment-name">${attachment.name}</div>
                    <div class="attachment-size">${attachment.size}</div>
                </div>
            </div>
        `).join('');
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentConversation) return;

        const message = {
            id: 'msg_' + Date.now(),
            conversationId: this.currentConversation.id,
            senderId: this.currentUser.id,
            receiverId: this.currentConversation.otherUser.id,
            content: content,
            timestamp: new Date(),
            read: false
        };

        // Add to local messages
        if (!this.messages[this.currentConversation.id]) {
            this.messages[this.currentConversation.id] = [];
        }
        this.messages[this.currentConversation.id].push(message);

        // Re-render messages
        this.renderMessages(this.currentConversation.id);

        // Clear input
        input.value = '';
        this.adjustTextareaHeight();

        // Send via socket
        this.socket.emit('sendMessage', message);

        // Update conversation preview
        this.updateConversationPreview(this.currentConversation.id, content);
    }

    updateConversationPreview(conversationId, lastMessage) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.lastMessage = lastMessage;
            conversation.lastMessageTime = 'now';
            this.renderConversations();
            // Re-select current conversation
            document.querySelector(`[data-conversation-id="${conversationId}"]`).classList.add('active');
        }
    }

    handleNewMessage(message) {
        // Add to messages
        if (!this.messages[message.conversationId]) {
            this.messages[message.conversationId] = [];
        }
        this.messages[message.conversationId].push(message);

        // Update conversation preview
        this.updateConversationPreview(message.conversationId, message.content);

        // If this is the current conversation, re-render messages
        if (this.currentConversation && this.currentConversation.id === message.conversationId) {
            this.renderMessages(message.conversationId);
        }

        // Mark conversation as unread if not current
        if (!this.currentConversation || this.currentConversation.id !== message.conversationId) {
            const conversation = this.conversations.find(c => c.id === message.conversationId);
            if (conversation) {
                conversation.unread = true;
                this.renderConversations();
            }
        }
    }

    handleTyping() {
        if (!this.currentConversation) return;
        
        // Emit typing event
        this.socket.emit('typing', {
            conversationId: this.currentConversation.id,
            receiverId: this.currentConversation.otherUser.id,
            isTyping: true
        });

        // Stop typing after 2 seconds of inactivity
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('typing', {
                conversationId: this.currentConversation.id,
                receiverId: this.currentConversation.otherUser.id,
                isTyping: false
            });
        }, 2000);
    }

    showTypingIndicator(userId, isTyping) {
        const container = document.getElementById('messagesContainer');
        const existingIndicator = container.querySelector('.typing-indicator');
        
        if (isTyping && !existingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            indicator.innerHTML = `
                <div class="message-avatar avatar">
                    <img src="${this.currentConversation.otherUser.avatar}" alt="${this.currentConversation.otherUser.name}" />
                </div>
                <span>${this.currentConversation.otherUser.name} is typing</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            container.appendChild(indicator);
            container.scrollTop = container.scrollHeight;
        } else if (!isTyping && existingIndicator) {
            existingIndicator.remove();
        }
    }

    adjustTextareaHeight() {
        const textarea = document.getElementById('messageInput');
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    setupAutoResize() {
        const textarea = document.getElementById('messageInput');
        textarea.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });
    }

    handleFilterChange(filter) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // Filter conversations
        let filteredConversations = [...this.conversations];
        
        switch (filter) {
            case 'unread':
                filteredConversations = this.conversations.filter(c => c.unread);
                break;
            case 'archived':
                filteredConversations = this.conversations.filter(c => c.archived);
                break;
            // 'all' shows everything
        }

        this.renderFilteredConversations(filteredConversations);
    }

    renderFilteredConversations(conversations) {
        const container = document.getElementById('conversationsList');
        container.innerHTML = '';

        conversations.forEach(conv => {
            const convElement = this.createConversationElement(conv);
            container.appendChild(convElement);
        });
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.renderConversations();
            return;
        }

        const filtered = this.conversations.filter(conv => 
            conv.otherUser.name.toLowerCase().includes(query.toLowerCase()) ||
            conv.projectTitle.toLowerCase().includes(query.toLowerCase()) ||
            conv.lastMessage.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredConversations(filtered);
    }

    markConversationAsRead(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation && conversation.unread) {
            conversation.unread = false;
            this.renderConversations();
            // Re-select current conversation
            document.querySelector(`[data-conversation-id="${conversationId}"]`).classList.add('active');
        }
    }

    toggleProjectSidebar() {
        const sidebar = document.getElementById('projectSidebar');
        sidebar.classList.toggle('show');
        
        if (sidebar.classList.contains('show')) {
            this.loadProjectDetails();
        }
    }

    closeProjectSidebar() {
        document.getElementById('projectSidebar').classList.remove('show');
    }

    loadProjectDetails() {
        if (!this.currentConversation) return;

        // Mock project data
        const projectData = {
            id: this.currentConversation.projectId,
            title: this.currentConversation.projectTitle,
            description: 'We need a complete redesign of our e-commerce website to improve user experience and increase conversions. The current site has issues with mobile responsiveness and the checkout process.',
            budget: '$2,500',
            deadline: '4 weeks',
            status: 'In Progress',
            category: 'Web Development',
            skills: ['React', 'Node.js', 'UI/UX Design', 'E-commerce'],
            client: {
                name: 'TechCorp Solutions',
                rating: 4.8,
                projectsCompleted: 23
            }
        };

        this.renderProjectDetails(projectData);
    }

    renderProjectDetails(project) {
        const container = document.getElementById('projectDetails');
        container.innerHTML = `
            <div class="project-info">
                <h4>${project.title}</h4>
                <p>${project.description}</p>
            </div>
            
            <div class="project-meta">
                <div class="meta-item">
                    <span class="meta-label">Budget</span>
                    <span class="meta-value">${project.budget}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Deadline</span>
                    <span class="meta-value">${project.deadline}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Status</span>
                    <span class="meta-value">${project.status}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Category</span>
                    <span class="meta-value">${project.category}</span>
                </div>
            </div>
            
            <div class="project-actions">
                <button class="project-btn primary">View Full Project</button>
                <button class="project-btn secondary">Submit Proposal</button>
            </div>
        `;
    }

    showFileUploadModal() {
        document.getElementById('fileUploadModal').classList.add('show');
    }

    closeFileUploadModal() {
        document.getElementById('fileUploadModal').classList.remove('show');
        document.getElementById('uploadProgress').style.display = 'none';
        document.querySelector('.progress-fill').style.width = '0%';
    }

    handleFileUpload(files) {
        if (!files.length) return;

        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');

        progressContainer.style.display = 'block';

        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                // Simulate successful upload
                setTimeout(() => {
                    this.sendFileMessage(files[0]);
                    this.closeFileUploadModal();
                }, 500);
            }
            
            progressFill.style.width = progress + '%';
            progressText.textContent = `Uploading... ${Math.round(progress)}%`;
        }, 200);
    }

    sendFileMessage(file) {
        if (!this.currentConversation) return;

        const message = {
            id: 'msg_' + Date.now(),
            conversationId: this.currentConversation.id,
            senderId: this.currentUser.id,
            receiverId: this.currentConversation.otherUser.id,
            content: `Shared a file: ${file.name}`,
            timestamp: new Date(),
            read: false,
            attachments: [{
                name: file.name,
                size: this.formatFileSize(file.size),
                url: '/uploads/' + file.name
            }]
        };

        // Add to local messages
        if (!this.messages[this.currentConversation.id]) {
            this.messages[this.currentConversation.id] = [];
        }
        this.messages[this.currentConversation.id].push(message);

        // Re-render messages
        this.renderMessages(this.currentConversation.id);

        // Send via socket
        this.socket.emit('sendMessage', message);

        // Update conversation preview
        this.updateConversationPreview(this.currentConversation.id, `📎 ${file.name}`);
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MessagesApp();
});
