import socket
import unittest
from unittest.mock import patch
from article_service import ArticleError, ArticleParser, Limiter, extract_article, fetch_public, public_target, PinnedHTTPSConnection


def resolver(address):
    return lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (address, 443))]


class ArticleTests(unittest.TestCase):
    def test_private_and_special_networks_are_rejected(self):
        for address in ['127.0.0.1', '10.0.0.1', '192.168.1.1', '172.16.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fc00::1', '2001:db8::1', '::ffff:8.8.8.8']:
            with self.subTest(address=address), self.assertRaises(ArticleError):
                public_target('https://example.com/article', resolver(address))

    def test_bad_urls_and_ports_are_rejected(self):
        for url in ['file:///etc/passwd', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com:8443/', 'https://localhost/', 'https://box.local/', 'https://example.com/\r\nHeader:x', 'https://example.com\\@127.0.0.1', 'http://example.com:443']:
            with self.subTest(url=url), self.assertRaises(ArticleError): public_target(url, resolver('8.8.8.8'))

    def test_one_private_dns_answer_rejects_whole_host(self):
        def mixed(*args, **kwargs): return resolver('8.8.8.8')() + resolver('10.0.0.1')()
        with self.assertRaises(ArticleError): public_target('https://example.com/', mixed)

    def test_public_targets_preserve_query_and_strip_fragment(self):
        url, host, port, addresses = public_target('https://example.com/article?q=birds#part', resolver('8.8.8.8'))
        self.assertEqual(url, 'https://example.com/article?q=birds')
        self.assertEqual((host, port, addresses), ('example.com', 443, ['8.8.8.8']))

    def test_tls_uses_pinned_address_and_original_hostname(self):
        connection = PinnedHTTPSConnection('example.com', '8.8.8.8', 443, 4)
        with patch('article_service.socket.create_connection') as connect, patch.object(connection._context, 'wrap_socket') as wrap:
            connection.connect()
            connect.assert_called_once_with(('8.8.8.8', 443), 4)
            self.assertEqual(wrap.call_args.kwargs['server_hostname'], 'example.com')

    def test_redirect_is_checked_again(self):
        class Response:
            status = 302
            def getheader(self, _): return 'http://127.0.0.1/private'
        class Connection:
            def __init__(self, *args): pass
            def request(self, *args, **kwargs): pass
            def getresponse(self): return Response()
            def close(self): pass
        def dns(host, *args, **kwargs): return resolver('127.0.0.1' if host == '127.0.0.1' else '8.8.8.8')()
        with patch('article_service.socket.getaddrinfo', dns), patch('article_service.PinnedHTTPSConnection', Connection):
            with self.assertRaisesRegex(ArticleError, 'public'): fetch_public('https://example.com/')

    def test_only_article_text_is_extracted(self):
        paragraph = 'Starlings form large flocks at dusk. These birds gather in trees and travel together across the countryside. Their movements create beautiful patterns in the evening sky.'
        raw = f'<html class="vector-toc-available"><head><title>Birds</title></head><body><nav>Ignore this navigation</nav><main><h1>Starlings</h1><p>{paragraph}<sup>17</sup></p><script>sendSecrets()</script></main><footer>Site links</footer></body></html>'
        result = extract_article('https://example.com/birds', raw, 'text/html')
        self.assertEqual(result['title'], 'Starlings')
        self.assertIn(paragraph, result['text'])
        for unwanted in ['Ignore this', 'sendSecrets', 'Site links', '17']:
            self.assertNotIn(unwanted, result['text'])

    def test_rate_limit(self):
        limiter = Limiter()
        self.assertTrue(all(limiter.allow('client') for _ in range(12)))
        self.assertFalse(limiter.allow('client'))
        self.assertTrue(limiter.allow('different client'))


if __name__ == '__main__': unittest.main()
