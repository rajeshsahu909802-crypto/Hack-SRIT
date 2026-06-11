import os
import feedparser
from flask import Flask, render_template, jsonify, request
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure Gemini API - reads GEMINI_API_KEY from .env file
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
    print(f"Gemini API key loaded successfully (starts with {API_KEY[:8]}...)")
else:
    print("WARNING: No GEMINI_API_KEY found in .env file!")

# Define a model for summarization
try:
    model = genai.GenerativeModel('gemini-2.0-flash')
except Exception as e:
    print(f"Warning: Failed to initialize GenerativeModel. {e}")
    model = None

RSS_FEEDS = {
    "BBC": "http://feeds.bbci.co.uk/news/rss.xml",
    "TechCrunch": "https://techcrunch.com/feed/",
    "CNN": "http://rss.cnn.com/rss/edition.rss",
    "NYT": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "HackerNews": "https://hnrss.org/frontpage",
    "TheVerge": "https://www.theverge.com/rss/index.xml",
    "AlJazeera": "https://www.aljazeera.com/xml/rss/all.xml",
    "ESPN": "https://www.espn.com/espn/rss/news"
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/news', methods=['GET'])
def get_news():
    source = request.args.get('source', 'BBC')
    feed_url = RSS_FEEDS.get(source, RSS_FEEDS['BBC'])
    
    try:
        feed = feedparser.parse(feed_url)
        articles = []
        # Get top 9 articles for a nice grid
        for entry in feed.entries[:9]:
            articles.append({
                'title': entry.title,
                'link': entry.link,
                'summary': entry.get('summary', ''),
                'published': entry.get('published', '')
            })
        return jsonify(articles)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/summarize', methods=['POST'])
def summarize_news():
    data = request.json
    article_title = data.get('title', '')
    article_summary = data.get('summary', '')
    tone = data.get('tone', 'professional')
    
    if not article_title:
        return jsonify({'error': 'Article title is required'}), 400
        
    if not API_KEY:
        return jsonify({'error': 'GEMINI_API_KEY not configured. Please add your key to the .env file and restart the server.'}), 500
        
    if not model:
        return jsonify({'error': 'Gemini model failed to initialize. Check server logs.'}), 500

    tone_instructions = {
        'professional': 'Provide a concise, professional, and well-structured summary.',
        'eli5': 'Explain the key points of this article simply, as if explaining to a 5-year-old.',
        'bullet': 'Summarize the article using exactly 3 crisp bullet points.'
    }
    
    instruction = tone_instructions.get(tone, tone_instructions['professional'])
    
    prompt = f"{instruction}\n\nTitle: {article_title}\n\nSnippet/Content: {article_summary}"
    
    try:
        response = model.generate_content(prompt)
        return jsonify({'summary': response.text})
    except Exception as e:
        return jsonify({'error': f"Failed to generate summary: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
