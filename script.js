document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetch-btn');
    const sourceSelect = document.getElementById('source-select');
    const toneSelect = document.getElementById('tone-select');
    const newsGrid = document.getElementById('news-grid');
    const loader = document.getElementById('loader');

    // Initial fetch
    fetchNews(sourceSelect.value);

    fetchBtn.addEventListener('click', () => {
        const icon = fetchBtn.querySelector('svg');
        icon.style.animation = 'spin 1s linear infinite';
        
        fetchNews(sourceSelect.value).finally(() => {
            icon.style.animation = '';
        });
    });

    async function fetchNews(source) {
        newsGrid.innerHTML = '';
        loader.classList.remove('hidden');

        try {
            const response = await fetch(`/api/news?source=${source}`);
            const data = await response.json();
            
            loader.classList.add('hidden');
            
            if (response.ok) {
                renderNews(data);
            } else {
                showError(data.error || 'Failed to fetch news');
            }
        } catch (error) {
            console.error('Error fetching news:', error);
            loader.classList.add('hidden');
            showError('Network error. Make sure the server is running.');
        }
    }

    function renderNews(articles) {
        if (!articles || articles.length === 0) {
            showError('No news articles found for this source.');
            return;
        }

        articles.forEach((article, index) => {
            const card = document.createElement('article');
            card.className = 'news-card';
            
            // Format date
            const dateStr = article.published ? new Date(article.published).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Recent';

            // Clean summary HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = article.summary;
            const cleanSummary = tempDiv.textContent || tempDiv.innerText || '';

            card.innerHTML = `
                <div class="card-meta">${dateStr}</div>
                <h2 class="card-title">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a>
                </h2>
                <p class="card-excerpt">${cleanSummary}</p>
                
                <div class="ai-summary-box">
                    <div class="ai-summary-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        Gemini Summary
                    </div>
                    <div class="ai-summary-content"></div>
                </div>

                <div class="card-actions">
                    <a href="${article.link}" target="_blank" class="read-more">Read Original</a>
                    <button class="summarize-btn">
                        <span>✨ Summarize</span>
                    </button>
                </div>
            `;

            const summarizeBtn = card.querySelector('.summarize-btn');
            const summaryBox = card.querySelector('.ai-summary-box');
            const summaryContent = card.querySelector('.ai-summary-content');

            summarizeBtn.addEventListener('click', async () => {
                if (summaryBox.classList.contains('visible')) {
                    summaryBox.classList.remove('visible');
                    summarizeBtn.innerHTML = '<span>✨ Summarize</span>';
                    return;
                }

                summarizeBtn.classList.add('loading');
                summarizeBtn.innerHTML = '<span>Generating...</span>';

                try {
                    const response = await fetch('/api/summarize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: article.title,
                            summary: cleanSummary,
                            tone: toneSelect.value
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        summaryContent.innerHTML = `<span style="color: #f43f5e">Error: ${data.error}</span>`;
                    } else {
                        // Format the output properly (especially for bullet points)
                        const formattedText = data.summary
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br>');
                        summaryContent.innerHTML = formattedText;
                    }
                    
                    summaryBox.classList.add('visible');
                    summarizeBtn.innerHTML = '<span>Hide Summary</span>';
                } catch (error) {
                    summaryContent.innerHTML = `<span style="color: #f43f5e">Error connecting to server.</span>`;
                    summaryBox.classList.add('visible');
                    summarizeBtn.innerHTML = '<span>Hide Summary</span>';
                } finally {
                    summarizeBtn.classList.remove('loading');
                }
            });

            newsGrid.appendChild(card);

            // Staggered animation
            setTimeout(() => {
                card.classList.add('animate-in');
            }, 50 * index);
        });
    }

    function showError(message) {
        newsGrid.innerHTML = `<div class="error-message">${message}</div>`;
    }

    // Add spin keyframe dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});
