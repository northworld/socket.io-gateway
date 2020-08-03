#!/bin/bash
echo $CERTBOT_VALIDATION > /home/justin/socket.io-gateway/app/static/acme-challenge/$CERTBOT_TOKEN
