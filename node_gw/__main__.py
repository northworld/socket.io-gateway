from __init__ import NodeGateway

gw = NodeGateway()
gw.serve()

gw.thread.join()