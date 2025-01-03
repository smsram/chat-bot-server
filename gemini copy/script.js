const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
const API_KEY = process.env.GEMINI_API; // Use Render's environment variable

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Typing Animation
var typed = new Typed('#typed1', {
    strings: ['Type something...'],
    typeSpeed: 50,
    loop: false
});

// Stop cursor blinking after 3 seconds
setTimeout(() => {
    const typedCursor = document.querySelector('.typed-cursor');
    if (typedCursor) {
        typedCursor.style.display = 'none'; // Hide the blinking cursor
    }
}, 3000); // 3 seconds

// Auto-scroll to the bottom of the chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function generateResponse(prompt) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`, // Use the API key from the environment variable
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate response');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Rest of the code remains unchanged...


function cleanMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "$1") // Replace **text** with span for bold styling
        .replace(/^\*\s+/gm, '• ') // Replace '*' at the start of new lines with '•'
        .trim();
}

function addMessage(message, isUser) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isUser ? 'user-message' : 'bot-message');

    const profileImage = document.createElement('img');
    profileImage.classList.add('profile-image');
    profileImage.src = isUser ? 'user.jpg' : 'bot.jpg';
    profileImage.alt = isUser ? 'User' : 'Bot';

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    if (isUser) {
        // For user messages, sanitize input to prevent XSS
        messageContent.textContent = sanitizeHTML(message);
    } else {
        // For bot messages, allow rendering of clean HTML
        messageContent.innerHTML = message; // Render as HTML

        // Add "Copy" button inside the message-content container
        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
            // Copy the message text to the clipboard
            copyToClipboard(messageContent.textContent || messageContent.innerText, copyButton);
        });

        // Append the button to the message content
        messageContent.appendChild(copyButton);
    }

    messageElement.appendChild(profileImage);
    messageElement.appendChild(messageContent);
    messageContainer.appendChild(messageElement); // Append the message element to the container
    chatMessages.appendChild(messageContainer); // Append the container to the chat messages

    scrollToBottom(); // Auto-scroll to the bottom

    return messageContent; // Return the message content element
}

// Function to copy text to the clipboard and update the button text
function copyToClipboard(text, copyButton) {
    const cleanedText = text.replace(/^Copy|Copy$/g, '').trim();

    navigator.clipboard.writeText(cleanedText).then(
        () => {
            // Update the button text to "Copied!"
            copyButton.textContent = 'Copied!';
            copyButton.disabled = true; // Temporarily disable the button

            // Revert the button text to "Copy" after 2 seconds
            setTimeout(() => {
                copyButton.textContent = 'Copy';
                copyButton.disabled = false; // Re-enable the button
            }, 2000);
        },
        (err) => {
            console.error('Failed to copy:', err);
        }
    );
}

function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function showTypingAnimation() {
    const typingElement = document.createElement('div');
    typingElement.classList.add('typing-indicator');
    typingElement.innerHTML = `
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
    `;
    chatMessages.appendChild(typingElement);
    scrollToBottom(); // Auto-scroll to the bottom
    return typingElement; // Return the typing indicator element to remove it later.
}

function removeTypingAnimation(typingElement) {
    if (typingElement && chatMessages.contains(typingElement)) {
        chatMessages.removeChild(typingElement);
    }
}

function formatResponse(text) {
    const lines = text.split('\n');
    let formattedResponse = [];

    lines.forEach((line) => {
        if (/^(Heading|Title|Section):/i.test(line.trim())) {
            // Bold Heading
            const headingText = line.replace(/^(Heading|Title|Section):/i, '').trim();
            formattedResponse.push({ type: 'heading', text: headingText });
        } else if (line.trim()) {
            // Regular Text
            formattedResponse.push({ type: 'text', text: line.trim() });
        }
    });

    return formattedResponse;
}

async function displayTypingEffect(element, formattedResponse) {
    for (const segment of formattedResponse) {
        if (segment.type === 'heading') {
            const headingElement = document.createElement('strong');
            element.appendChild(headingElement);

            for (let i = 0; i < segment.text.length; i++) {
                headingElement.textContent += segment.text[i];
                await new Promise((resolve) => setTimeout(resolve, 10)); // Typing speed: 10ms per character
                scrollToBottom(); // Ensure the new content stays in view
            }

            element.appendChild(document.createElement('br'));
        } else if (segment.type === 'text') {
            const textElement = document.createElement('span');
            element.appendChild(textElement);

            for (let i = 0; i < segment.text.length; i++) {
                textElement.textContent += segment.text[i];
                await new Promise((resolve) => setTimeout(resolve, 10)); // Typing speed: 10ms per character
                scrollToBottom(); // Ensure the new content stays in view
            }

            element.appendChild(document.createElement('br'));
        }
    }
}

async function handleUserInput() {
    const userMessage = userInput.value.trim();

    if (userMessage) {
        addMessage(userMessage, true);
        userInput.value = '';
        sendButton.disabled = true;
        userInput.disabled = true;

        const typingIndicator = showTypingAnimation();

        try {
            const botResponse = await generateResponse(userMessage);
            removeTypingAnimation(typingIndicator);

            const cleanedResponse = cleanMarkdown(botResponse);
            const formattedResponse = formatResponse(cleanedResponse);
            const botMessageElement = addMessage('', false); // Add an empty bot message element.
            await displayTypingEffect(botMessageElement, formattedResponse);
        } catch (error) {
            console.error('Error:', error);
            removeTypingAnimation(typingIndicator);
            const errorMessage = addMessage('Sorry, I encountered an error. Please try again.', false);
            const formattedError = formatResponse('Sorry, I encountered an error. Please try again.');
            await displayTypingEffect(errorMessage, formattedError);
        } finally {
            sendButton.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    }
}

sendButton.addEventListener('click', handleUserInput);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserInput();
    }
});

