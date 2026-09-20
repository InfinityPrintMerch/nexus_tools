from http.server import HTTPServer, SimpleHTTPRequestHandler
import os


PORT = 8080


class FFmpegHandler(SimpleHTTPRequestHandler):

    def end_headers(self):
        # Permite SharedArrayBuffer para FFmpeg.wasm
        self.send_header(
            "Cross-Origin-Opener-Policy",
            "same-origin"
        )

        self.send_header(
            "Cross-Origin-Embedder-Policy",
            "require-corp"
        )

        # Evita problemas con caché durante desarrollo
        self.send_header(
            "Cache-Control",
            "no-store"
        )

        super().end_headers()


if __name__ == "__main__":

    print("=" * 50)
    print(" Servidor Eduardo Workspace iniciado")
    print("=" * 50)
    print(f" Puerto: {PORT}")
    print(f" URL: http://localhost:{PORT}")
    print(" Presiona CTRL + C para detener")
    print("=" * 50)

    server = HTTPServer(
        ("localhost", PORT),
        FFmpegHandler
    )

    try:
        server.serve_forever()

    except KeyboardInterrupt:
        print("\nServidor detenido.")

        server.server_close()