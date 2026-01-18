// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Attach event listeners to buttons
    document.getElementById('extractEvents').addEventListener('click', extractEventList);
    document.getElementById('extractIntegration').addEventListener('click', extractIntegrationTask);
    document.getElementById('copyBtn').addEventListener('click', copyOutput);
    
    // Add keyboard shortcut for extraction (Ctrl/Cmd + Enter)
    document.getElementById('inputHTML').addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            extractEventList();
        }
    });
});

function extractEventList() {
    const input = document.getElementById('inputHTML').value.trim();
    
    // Check if input is empty
    if (!input) {
        alert('Please paste some HTML code first!');
        return;
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = input;

    // Array to store extracted events
    let events = [];
    
    // Strategy 1: Look for div elements with class "ant-typography" inside flex-1 containers
    // This matches the structure in your example
    const typographyDivs = tempDiv.querySelectorAll('div.flex-1 div.ant-typography');
    
    if (typographyDivs.length > 0) {
        typographyDivs.forEach(div => {
            const text = div.textContent.trim();
            // Filter out empty text and check if it's not secondary content
            if (text && !div.classList.contains('ant-typography-secondary')) {
                events.push(text);
            }
        });
    }
    
    // Strategy 2: Look for span elements with class "ant-typography"
    if (events.length === 0) {
        const typographySpans = tempDiv.querySelectorAll('span.ant-typography');
        typographySpans.forEach(span => {
            const text = span.textContent.trim();
            if (text) {
                events.push(text);
            }
        });
    }
    
    // Strategy 3: Look for img alt attributes (but skip "logo" entries)
    if (events.length === 0) {
        const images = tempDiv.querySelectorAll('img[alt]');
        images.forEach(img => {
            const altText = img.getAttribute('alt').trim();
            // Skip "logo" entries and empty text
            if (altText && altText.toLowerCase() !== 'logo') {
                events.push(altText);
            }
        });
    }
    
    // Strategy 4: Look for any text content in list items (fallback)
    if (events.length === 0) {
        const listItems = tempDiv.querySelectorAll('li');
        listItems.forEach(li => {
            // Get the main text content
            const text = li.textContent.trim();
            if (text) {
                // Clean up the text - remove extra whitespace and newlines
                const cleanText = text.replace(/\s+/g, ' ').trim();
                
                // Skip if it's just "logo" or contains integration request
                if (cleanText && 
                    !cleanText.toLowerCase().includes('have a integration request') &&
                    !cleanText.toLowerCase().includes('logo')) {
                    events.push(cleanText);
                }
            }
        });
    }
    
    // Strategy 5: Look for specific text content patterns in the entire HTML
    if (events.length === 0) {
        // Find all text nodes and filter them
        const textNodes = [];
        const walk = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walk.nextNode()) {
            const text = node.textContent.trim();
            if (text && text.length > 2) { // Filter very short texts
                // Look for texts that look like event names (capital letters, parentheses, etc.)
                if (/^[A-Z].*[A-Za-z0-9].*$/.test(text)) {
                    textNodes.push(text);
                }
            }
        }
        
        // Filter out duplicates and common unwanted patterns
        const uniqueTexts = [...new Set(textNodes)];
        uniqueTexts.forEach(text => {
            if (!text.toLowerCase().includes('logo') && 
                !text.toLowerCase().includes('css')) {
                events.push(text);
            }
        });
    }
    
    // Filter out any remaining "logo" entries and empty strings
    events = events.filter(event => {
        const trimmed = event.trim();
        return trimmed && 
               trimmed.toLowerCase() !== 'logo' &&
               !trimmed.match(/^css-[\w]+$/); // Filter out CSS class names
    });
    
    // Remove duplicates while preserving order
    const uniqueEvents = [];
    events.forEach(event => {
        if (!uniqueEvents.includes(event)) {
            uniqueEvents.push(event);
        }
    });
    
    // Display the extracted events or show message if none found
    if (uniqueEvents.length > 0) {
        document.getElementById('output').textContent = uniqueEvents.join('\n');
    } else {
        document.getElementById('output').textContent = 'No events found. Please check your HTML structure.\n\nTry using one of these formats:\n• <div class="ant-typography">Event Name</div>\n• <span class="ant-typography">Event Name</span>\n• <li>Event Name</li>';
    }
}

function extractIntegrationTask() {
    const input = document.getElementById('output').textContent;
    if(!input || input === 'Your converted output will appear here...' || input.includes('No events found')) {
        alert('Please extract Event List first!');
        return;
    }
    const lines = input.split('\n').map(line => line.trim()).filter(line => line);
    const singleLine = lines.join(' | ');

    document.getElementById('output').textContent = singleLine;
}

function copyOutput() {
    const outputText = document.getElementById('output').textContent;
    
    // Don't copy if output is empty or placeholder
    if (!outputText || outputText === 'Your converted output will appear here...') {
        alert('Nothing to copy! Please extract events first.');
        return;
    }
    
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = outputText;
    textArea.style.position = 'fixed';
    textArea.style.opacity = 0;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        // Try using the modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(outputText).then(function() {
                showSuccessMessage();
            }).catch(function() {
                // Fallback to execCommand if clipboard API fails
                fallbackCopyText(textArea);
            });
        } else {
            // Fallback for browsers that don't support clipboard API
            fallbackCopyText(textArea);
        }
    } catch (err) {
        console.error('Could not copy text: ', err);
        alert('Failed to copy text. Please try again.');
    } finally {
        // Clean up
        document.body.removeChild(textArea);
    }
}

function fallbackCopyText(textArea) {
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showSuccessMessage();
        } else {
            throw new Error('execCommand failed');
        }
    } catch (err) {
        console.error('Fallback copy failed: ', err);
        alert('Failed to copy text. Please try again.');
    }
}

function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.remove('hidden');
    
    // Clear any existing timeout
    if (window.successMessageTimeout) {
        clearTimeout(window.successMessageTimeout);
    }
    
    // Hide the message after 2 seconds
    window.successMessageTimeout = setTimeout(function() {
        successMessage.classList.add('hidden');
    }, 2000);
}