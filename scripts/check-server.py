"""Static server with CORS headers, like GitHub Pages, for the cross-origin Tilda block check."""
import functools,http.server,sys
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin','*');super().end_headers()
    def log_message(self,*a):pass
directory,port=sys.argv[1],int(sys.argv[2])
http.server.ThreadingHTTPServer(('127.0.0.1',port),functools.partial(Handler,directory=directory)).serve_forever()
