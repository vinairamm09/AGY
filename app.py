from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import time
import os

app = Flask(__name__)

# XML Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "updates": [],
    "last_fetched": 0
}
CACHE_TTL = 300 # 5 minutes cache

def parse_xml_feed(xml_data):
    """
    Parses the Atom XML feed data and splits entries into individual updates
    grouped by heading (e.g., Announcement, Feature, Issue, Changed, Deprecated).
    """
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        print(f"XML Parsing Error: {e}")
        return []

    entries = root.findall('atom:entry', ns)
    parsed_updates = []
    
    # Helper index for unique front-end keys
    index = 0
    for entry in entries:
        date_str = entry.find('atom:title', ns)
        date_str = date_str.text.strip() if date_str is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', ns)
        updated_str = updated_elem.text.strip() if updated_elem is not None else ""
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        link = link_elem.get('href') if link_elem is not None else ""
        
        id_elem = entry.find('atom:id', ns)
        id_str = id_elem.text.strip() if id_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_text = content_elem.text if content_elem is not None else ""
        
        soup = BeautifulSoup(content_text, 'html.parser')
        
        current_type = None
        current_html = []
        
        def add_update(type_name, html_nodes):
            nonlocal index
            normalized_type = type_name.strip().lower()
            if normalized_type in ['deprecation', 'deprecated']:
                return
                
            html_str = "".join(str(node) for node in html_nodes).strip()
            # Clean plain text for tweeting/display
            temp_soup = BeautifulSoup(html_str, 'html.parser')
            text_content = temp_soup.get_text().strip()
            
            parsed_updates.append({
                'id': f"update-{index}",
                'feed_entry_id': id_str,
                'date': date_str,
                'updated': updated_str,
                'link': link,
                'type': type_name,
                'html': html_str,
                'text': text_content
            })
            index += 1

        # Atom feed entries can contain multiple updates separated by h3 elements
        for child in soup.contents:
            if child.name == 'h3':
                if current_type is not None:
                    add_update(current_type, current_html)
                current_type = child.get_text().strip()
                current_html = []
            else:
                if current_type is not None:
                    current_html.append(child)
                elif str(child).strip():
                    current_type = "Announcement"
                    current_html.append(child)
                    
        if current_type is not None:
            add_update(current_type, current_html)
            
    return parsed_updates

def fetch_feed(force=False):
    """
    Fetches the BigQuery Release Notes feed.
    Uses in-memory cache unless cache is expired or force=True.
    """
    now = time.time()
    if not force and cache["updates"] and (now - cache["last_fetched"]) < CACHE_TTL:
        return cache["updates"], "cache"
        
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        updates = parse_xml_feed(response.content)
        if updates:
            cache["updates"] = updates
            cache["last_fetched"] = now
            return updates, "network"
        else:
            # Fallback to cache if feed parses to empty but cache contains data
            if cache["updates"]:
                return cache["updates"], "fallback_cache"
            raise ValueError("No updates parsed from XML feed.")
            
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # If we have cached updates, return them with an error-fallback status
        if cache["updates"]:
            return cache["updates"], "error_fallback_cache"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, source = fetch_feed(force=force_refresh)
        return jsonify({
            "status": "success",
            "source": source,
            "count": len(updates),
            "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
            "data": updates
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
