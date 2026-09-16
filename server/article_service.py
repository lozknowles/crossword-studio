#!/usr/bin/env python3
"""Bounded, public-web article reader. Uploaded documents never reach this service."""
from __future__ import annotations

import argparse
import collections
import concurrent.futures
import http.client
import ipaddress
import json
import re
import socket
import ssl
import threading
import time
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, urljoin, urlsplit, urlunsplit

MAX_BYTES = 2 * 1024 * 1024
MAX_TEXT = 180000
ALLOWED_ORIGINS = {
    'https://www.lozknowles.com', 'https://lozknowles.com',
    'https://lozknowles.github.io',
}
DNS_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=4)


class ArticleError(ValueError):
    pass


def public_target(url: str, resolver=None):
    if not isinstance(url, str) or not url or len(url) > 2000 or re.search(r'[\x00-\x20\x7f\\]', url):
        raise ArticleError('Enter a valid public article URL.')
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError()
        host = parsed.hostname.rstrip('.').encode('idna').decode('ascii').lower()
        port = parsed.port or (443 if parsed.scheme == 'https' else 80)
        if port != (443 if parsed.scheme == 'https' else 80) or '%' in host:
            raise ValueError()
    except (ValueError, UnicodeError):
        raise ArticleError('Use a public http or https URL without sign-in details or a custom port.') from None
    if host == 'localhost' or host.endswith(('.localhost', '.local', '.internal', '.home', '.lan')):
        raise ArticleError('Only public websites can be imported.')
    try:
        if resolver:
            records = resolver(host, port, type=socket.SOCK_STREAM)
        else:
            records = DNS_POOL.submit(socket.getaddrinfo, host, port, type=socket.SOCK_STREAM).result(timeout=4)
    except (OSError, concurrent.futures.TimeoutError):
        raise ArticleError('The website address could not be resolved. Check the URL and try again.') from None
    addresses = list(dict.fromkeys(record[4][0] for record in records))
    if not addresses:
        raise ArticleError('The website address could not be resolved.')
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global or ip.is_multicast or ip.is_unspecified or ip.is_reserved or (ip.version == 6 and (ip.ipv4_mapped or ip.sixtofour or ip.teredo)):
            raise ArticleError('Only public websites can be imported.')
    path = quote(parsed.path or '/', safe="/%:@!$&'()*+,;=-._~")
    query = quote(parsed.query, safe="/%?:@!$&'()*+,;=-._~")
    canonical = urlunsplit((parsed.scheme, parsed.netloc, path, query, ''))
    return canonical, host, port, addresses


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host, address, port, timeout):
        super().__init__(host, port, timeout=timeout, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        raw = socket.create_connection((self.address, self.port), self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except BaseException:
            raw.close()
            raise


class PinnedHTTPConnection(http.client.HTTPConnection):
    def __init__(self, host, address, port, timeout):
        super().__init__(host, port, timeout=timeout)
        self.address = address

    def connect(self):
        self.sock = socket.create_connection((self.address, self.port), self.timeout)


def fetch_public(url: str):
    deadline = time.monotonic() + 20
    for _ in range(5):
        url, host, port, addresses = public_target(url)
        parsed = urlsplit(url)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise ArticleError('The website took too long to respond. Please try again or paste its text.')
        cls = PinnedHTTPSConnection if parsed.scheme == 'https' else PinnedHTTPConnection
        connection = cls(host, addresses[0], port, min(7, remaining))
        try:
            path = parsed.path + ('?' + parsed.query if parsed.query else '')
            connection.request('GET', path, headers={
                'User-Agent': 'CrosswordStudio/2.0 (+https://www.lozknowles.com/crossword/)',
                'Accept': 'text/html, application/xhtml+xml, text/plain;q=0.8',
                'Accept-Encoding': 'identity',
            })
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader('Location')
                if not location:
                    raise ArticleError('The website returned an incomplete redirect.')
                url = urljoin(url, location)
                continue
            if response.status != 200:
                raise ArticleError('This website did not allow the article to be read. Try another URL or paste the text.')
            content_type = response.getheader('Content-Type', '').split(';')[0].strip().lower()
            if content_type not in ('text/html', 'application/xhtml+xml', 'text/plain'):
                raise ArticleError('Use an article page. For PDF or Word files, choose Upload document.')
            if response.getheader('Content-Encoding', 'identity').lower() not in ('', 'identity'):
                raise ArticleError('This website uses an unsupported response format. Please paste its text.')
            length = response.getheader('Content-Length')
            if length and (not length.isdigit() or int(length) > MAX_BYTES):
                raise ArticleError('This page is too large. Please paste a shorter extract.')
            body = bytearray()
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ArticleError('The website took too long to respond.')
                if connection.sock:
                    connection.sock.settimeout(min(7, remaining))
                chunk = response.read1(min(32768, MAX_BYTES + 1 - len(body)))
                if not chunk:
                    break
                body.extend(chunk)
                if len(body) > MAX_BYTES:
                    raise ArticleError('This page is too large. Please paste a shorter extract.')
            encoding = response.headers.get_content_charset() or 'utf-8'
            try:
                text = body.decode(encoding, errors='replace')
            except LookupError:
                text = body.decode('utf-8', errors='replace')
            return url, text, content_type
        except (OSError, http.client.HTTPException):
            raise ArticleError('The website could not be read. Please try another URL or paste the article text.') from None
        finally:
            connection.close()
    raise ArticleError('This URL redirects too many times. Please use the final article address.')


class ArticleParser(HTMLParser):
    SKIP = {'script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'button', 'noscript', 'svg', 'table', 'sup', 'figure'}
    BLOCK = {'p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote', 'section', 'div', 'br'}
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.all_text = []
        self.main_text = []
        self.title = []
        self.h1 = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        excluded = tag in self.SKIP or 'hidden' in attrs or attrs.get('aria-hidden') == 'true'
        class_text = attrs.get('class', '')
        excluded = excluded or bool(set(class_text.split()) & {'reference', 'reflist', 'mw-references-wrap', 'mw-editsection', 'navbox', 'infobox', 'toc', 'sidebar', 'cookie-banner', 'hatnote', 'catlinks', 'printfooter', 'metadata', 'mw-normal-catlinks', 'mw-hidden-catlinks'})
        excluded = excluded or attrs.get('id') in ('catlinks', 'mw-navigation')
        main = tag in ('main', 'article') or attrs.get('id') in ('mw-content-text', 'bodyContent') or 'mw-parser-output' in class_text
        parent = self.stack[-1] if self.stack else ('', False, False)
        state = (tag, parent[1] or excluded, parent[2] or main)
        if tag in self.BLOCK and not state[1]:
            self.all_text.append('\n')
            if state[2]: self.main_text.append('\n')
        if tag not in self.VOID:
            self.stack.append(state)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                if tag in self.BLOCK:
                    self.all_text.append('\n')
                    if self.stack[i][2]: self.main_text.append('\n')
                del self.stack[i:]
                break

    def handle_data(self, data):
        if any(item[0] == 'title' for item in self.stack): self.title.append(data)
        if any(item[0] == 'h1' for item in self.stack): self.h1.append(data)
        if not self.stack or self.stack[-1][1] or any(item[0] in ('head', 'title') for item in self.stack): return
        self.all_text.append(data)
        if self.stack[-1][2]: self.main_text.append(data)


def extract_article(url, raw, content_type):
    if content_type == 'text/plain':
        title = urlsplit(url).path.rsplit('/', 1)[-1] or urlsplit(url).hostname
        text = raw
    else:
        parser = ArticleParser()
        parser.feed(raw)
        main = ''.join(parser.main_text)
        text = main if len(main.strip()) >= 120 else ''.join(parser.all_text)
        title = ''.join(parser.h1).strip() or ''.join(parser.title).strip() or urlsplit(url).hostname
    text = '\n'.join(re.sub(r'\s+', ' ', part).strip() for part in text.splitlines() if part.strip())
    if len(text) < 120:
        raise ArticleError('This page has too little readable article text. It may require sign-in or JavaScript; please paste the text instead.')
    if len(text) > MAX_TEXT:
        # Keep complete sentences from the beginning and label the bounded extract.
        text = text[:MAX_TEXT].rsplit('. ', 1)[0] + '.'
        title = str(title)[:200] + ' (opening extract)'
    return {'url': url, 'title': re.sub(r'\s+', ' ', str(title)).strip()[:240], 'text': text}


class Limiter:
    def __init__(self):
        self.clients = {}
        self.lock = threading.Lock()

    def allow(self, client):
        now = time.monotonic()
        with self.lock:
            self.clients = {key: hits for key, hits in self.clients.items() if hits and hits[-1] > now - 600}
            hits = self.clients.setdefault(client, collections.deque())
            while hits and hits[0] <= now - 600: hits.popleft()
            if len(hits) >= 12 or len(self.clients) > 10000: return False
            hits.append(now)
            return True


class Handler(BaseHTTPRequestHandler):
    server_version = 'Crossword'
    sys_version = ''
    protocol_version = 'HTTP/1.0'
    limiter = Limiter()
    slots = threading.BoundedSemaphore(4)

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *_):
        pass  # Do not log submitted URLs or document-derived text.

    def send_json(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        origin = self.headers.get('Origin', '')
        if origin in self.server.allowed_origins:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.end_headers()
        try: self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError): pass

    def do_GET(self):
        self.send_json(200 if self.path == '/health' else 404, {'ok': True} if self.path == '/health' else {'error': 'Not found.'})

    def do_OPTIONS(self):
        if self.headers.get('Origin', '') not in self.server.allowed_origins:
            return self.send_json(403, {'error': 'This origin is not allowed.'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '600')
        self.send_header('Vary', 'Origin')
        self.end_headers()

    def do_POST(self):
        if self.path != '/article': return self.send_json(404, {'error': 'Not found.'})
        if self.headers.get('Origin', '') not in self.server.allowed_origins:
            return self.send_json(403, {'error': 'Open Crossword Studio to import an article.'})
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json' or self.headers.get('Transfer-Encoding'):
            return self.send_json(415, {'error': 'Use the article URL form.'})
        length = self.headers.get('Content-Length', '')
        if not length.isdigit() or not 0 < int(length) <= 4096:
            return self.send_json(413, {'error': 'The article request is too large.'})
        # Apache must overwrite this header; the service listens only on loopback.
        client = self.headers.get('X-Crossword-Client', self.client_address[0])[:80]
        if not self.limiter.allow(client):
            return self.send_json(429, {'error': 'Please wait a few minutes before importing another page. Document and pasted-text puzzles are still available.'})
        if not self.slots.acquire(blocking=False):
            return self.send_json(503, {'error': 'Article import is busy. Please try again shortly.'})
        try:
            try:
                payload = json.loads(self.rfile.read(int(length)))
                if not isinstance(payload, dict) or not isinstance(payload.get('url'), str): raise ValueError()
            except (ValueError, UnicodeError):
                return self.send_json(400, {'error': 'Enter a valid article URL.'})
            self.send_json(200, extract_article(*fetch_public(payload['url'])))
        except ArticleError as error:
            self.send_json(422, {'error': str(error)})
        except Exception:
            self.send_json(502, {'error': 'This page could not be read. Try another URL or paste its text.'})
        finally:
            self.slots.release()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8793)
    parser.add_argument('--dev-origin', action='append', default=[])
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.allowed_origins = ALLOWED_ORIGINS | set(args.dev_origin)
    server.serve_forever()


if __name__ == '__main__':
    main()
