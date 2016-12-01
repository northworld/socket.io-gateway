import socket
import struct
import json

import threading

__version__ = '0.0.1'

class NodeGateway(object):

    def __init__(self, host='127.0.0.1', port=5005, handler=print):
        self.host = host
        self.port = port
        self.thread = threading.Thread(target=self._thread_main)
        self.thread.daemon = True
        self.handler = handler
        self.conn = None

    def serve(self):
        self.thread.start();

    def _thread_main(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind((self.host, self.port))
        sock.listen(1)
        while True:
            self._serve_one(sock)

    def _serve_one(self, sock):
        conn, addr = sock.accept()
        self.conn = conn
        while True:
            # receive data length as a little-endian 32-bit unsigned integer
            data = self._recv(conn, 4)
            if not data:
                self.conn = None
                return

            # convert to int
            data_len, = struct.unpack("<I", data)

            # recieve data string
            data = self._recv(conn, data_len)
            if not data:
                self.conn = None
                return

            # decode as UTF-8 json
            j = json.loads(data.decode("utf-8"))

            # handle message
            self.handler(j)

    def _recv(self, conn, n):
        try:
            data_remaining = n
            data = b""
            while data_remaining > 0:
                data_chunk = conn.recv(data_remaining)
                if not data_chunk:
                    return None
                data_remaining -= len(data_chunk)
                data += data_chunk
            return data
        except ConnectionResetError:
            return None

    def emit(self, message):
        jstr = json.dumps(message).encode("utf-8")
        nstr = struct.pack("<I", len(jstr));

        print(nstr + jstr)
        if self.conn:
            self.conn.send(nstr + jstr)
        #conn.close()